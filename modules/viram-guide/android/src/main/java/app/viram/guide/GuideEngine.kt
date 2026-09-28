package app.viram.guide

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTimestamp
import android.media.AudioTrack
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.VibrationAttributes
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import java.util.concurrent.ConcurrentHashMap
import kotlin.math.roundToLong

data class GuideCue(val atMs: Double, val sound: String?, val haptic: Int, val nowPlaying: String?)

/**
 * Plays one practice segment's cues on the audio clock (PRD FR-02, FR-04).
 *
 * A writer thread mixes cue sounds into a continuous AudioTrack stream, so
 * each cue lands on an exact frame and the clock is the frames actually
 * played. The stream keeps running (as silence) between cues, which, with the
 * mediaPlayback foreground service, keeps guidance going with the screen
 * locked, in Doze, and in battery saver.
 */
object GuideEngine {
  private const val RATE = 44_100
  private const val BLOCK = 512
  private const val RELEASE_AFTER_END_MS = 3_000.0
  private const val STALE_MS = 50.0

  private class Voice(val samples: FloatArray, val startFrame: Long, val gain: Float)

  private lateinit var context: Context
  private var emit: ((String, Map<String, Any?>) -> Unit)? = null
  private val buffers = ConcurrentHashMap<String, FloatArray>()
  private val lock = Any()
  private val events: Handler by lazy { Handler(HandlerThread("viram-guide").apply { start() }.looper) }
  private val audioManager: AudioManager get() = context.getSystemService(AudioManager::class.java)

  // Guarded by lock.
  private var track: AudioTrack? = null
  private var writer: Thread? = null
  private var framesWritten = 0L
  private var segmentActive = false
  private var segmentStartFrame = 0L
  private var frozenMs: Double? = null
  private var endMs = 0.0
  private var cues: List<GuideCue> = emptyList()
  private var nextCue = 0
  private val voices = ArrayList<Voice>()
  private var volume = 1f
  private var mixWithOthers = true
  private var generation = 0
  private var focusRequest: AudioFocusRequest? = null
  private var noisyRegistered = false

  var title = ""
    private set
  var subtitle = ""
    private set
  val isPaused: Boolean get() = synchronized(lock) { frozenMs != null }
  /** A segment is playing or paused; the service stays in the foreground while true. */
  val isActive: Boolean get() = synchronized(lock) { segmentActive }
  /** Set by finish(): an interruption in the ring-out releases instead of pausing. */
  private var finishing = false

  private val attributes: AudioAttributes =
    AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_MEDIA)
      .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
      .build()

  fun attach(context: Context, emit: (String, Map<String, Any?>) -> Unit) {
    this.context = context.applicationContext
    this.emit = emit
  }

  // ——— Loading ———

  fun preload(sounds: Map<String, String>): Map<String, Double> {
    val lengths = HashMap<String, Double>()
    for ((id, uri) in sounds) {
      // One unreadable file skips that sound only; its cue falls back to a tone or haptic.
      val samples = buffers[id] ?: runCatching { WavDecoder.decode(context, uri, RATE) }.getOrNull()?.also { buffers[id] = it } ?: continue
      lengths[id] = samples.size * 1000.0 / RATE
    }
    return lengths
  }

  // ——— Clock ———

  private fun msToFrames(ms: Double): Long = (ms * RATE / 1000.0).roundToLong()

  /** Frames heard so far, interpolated from the track's timestamp when available. */
  private fun playedFramesLocked(): Long {
    val t = track ?: return framesWritten
    val stamp = AudioTimestamp()
    val played =
      if (t.getTimestamp(stamp)) stamp.framePosition + (System.nanoTime() - stamp.nanoTime) * RATE / 1_000_000_000L
      else t.playbackHeadPosition.toLong() and 0xffffffffL
    return played.coerceAtMost(framesWritten)
  }

  private fun positionMsLocked(): Double {
    if (!segmentActive) return -1.0
    frozenMs?.let { return it }
    return ((playedFramesLocked() - segmentStartFrame) * 1000.0 / RATE).coerceAtLeast(0.0)
  }

  fun positionMs(): Double = synchronized(lock) { positionMsLocked() }

  // ——— Segment lifecycle ———

  fun start(cues: List<GuideCue>, endMs: Double, volume: Float, mixWithOthers: Boolean, title: String, subtitle: String) {
    cues.forEach { cue -> cue.sound?.let { require(buffers.containsKey(it)) { "Sound $it was not preloaded" } } }
    synchronized(lock) {
      generation += 1
      ensureTrackLocked()
      voices.clear()
      this.cues = cues.sortedBy { it.atMs }
      this.nextCue = 0
      this.endMs = endMs
      this.volume = volume
      this.mixWithOthers = mixWithOthers
      this.title = title
      this.subtitle = subtitle
      segmentStartFrame = framesWritten
      frozenMs = null
      segmentActive = true
      finishing = false
    }
    requestFocus(mixWithOthers)
    registerNoisy()
    GuidePlaybackService.show(context)
  }

  /** Freezes the clock and drops pending cues. Returns the position. */
  fun pause(): Double {
    val position = synchronized(lock) { pauseLocked() }
    GuidePlaybackService.refresh()
    return position
  }

  private fun pauseLocked(): Double {
    val position = positionMsLocked()
    if (position < 0) return -1.0
    frozenMs = position
    generation += 1
    voices.clear()
    return position
  }

  /** Lets the completion cue play out, then releases. */
  fun finish() {
    synchronized(lock) {
      val position = positionMsLocked()
      if (position >= 0) {
        endMs = minOf(endMs, position)
        finishing = true
      }
    }
  }

  fun stop() {
    val thread: Thread?
    synchronized(lock) {
      generation += 1
      segmentActive = false
      frozenMs = null
      cues = emptyList()
      voices.clear()
      thread = writer
      writer = null
    }
    thread?.let {
      it.interrupt()
      it.join(500)
    }
    synchronized(lock) {
      track?.let {
        it.pause()
        it.flush()
        it.release()
      }
      track = null
      framesWritten = 0
    }
    abandonFocus()
    unregisterNoisy()
    if (::context.isInitialized) GuidePlaybackService.hide(context)
  }

  fun setVolume(value: Float) {
    synchronized(lock) { volume = value }
  }

  fun setNowPlaying(title: String, subtitle: String) {
    synchronized(lock) {
      this.title = title
      this.subtitle = subtitle
    }
    GuidePlaybackService.refresh()
  }

  /** A single sound outside a practice: “Hear it” and “Hear a sample”. */
  fun playOnce(sound: String, volume: Float) {
    val samples = buffers[sound] ?: throw IllegalArgumentException("Sound $sound was not preloaded")
    synchronized(lock) {
      ensureTrackLocked()
      voices.add(Voice(samples, framesWritten, volume))
    }
  }

  /** From the lock-screen notification or media buttons. */
  fun remote(command: String) {
    emit?.invoke("onRemoteCommand", mapOf("command" to command))
  }

  // ——— Writer ———

  private fun ensureTrackLocked() {
    if (track != null) return
    val min = AudioTrack.getMinBufferSize(RATE, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT)
    val created =
      AudioTrack.Builder()
        .setAudioAttributes(attributes)
        .setAudioFormat(
          AudioFormat.Builder()
            .setSampleRate(RATE)
            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
            .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
            .build()
        )
        .setBufferSizeInBytes(maxOf(min * 2, BLOCK * 4))
        .setTransferMode(AudioTrack.MODE_STREAM)
        .build()
    created.play()
    track = created
    framesWritten = 0
    writer = Thread(::writeLoop, "viram-guide-writer").apply {
      priority = Thread.MAX_PRIORITY
      start()
    }
  }

  private fun writeLoop() {
    val mix = FloatArray(BLOCK)
    val pcm = ShortArray(BLOCK)
    var blocks = 0
    while (!Thread.currentThread().isInterrupted) {
      val output: AudioTrack
      var finished = false
      var segmentEnded = false
      synchronized(lock) {
        output = track ?: return
        mixBlockLocked(mix)
        val guidanceDone = segmentActive && frozenMs == null && positionMsLocked() >= endMs + RELEASE_AFTER_END_MS
        // Release atomically with the decision, so a new start() gets a fresh track.
        if (guidanceDone || (!segmentActive && voices.isEmpty())) {
          finished = true
          segmentEnded = guidanceDone
          segmentActive = false
          cues = emptyList()
          track = null
          writer = null
          framesWritten = 0
        }
      }
      for (i in 0 until BLOCK) pcm[i] = (mix[i].coerceIn(-1f, 1f) * 32767f).toInt().toShort()
      output.write(pcm, 0, BLOCK)
      if (finished) {
        // Play out what is still buffered before releasing, so the last sound isn't clipped.
        val silence = ShortArray(output.bufferSizeInFrames)
        output.write(silence, 0, silence.size)
        output.pause()
        output.flush()
        output.release()
        events.post { release(segmentEnded) }
        return
      }
      if (++blocks % 25 == 0) checkForCall()
    }
  }

  private fun release(segmentEnded: Boolean) {
    if (synchronized(lock) { segmentActive }) return
    abandonFocus()
    unregisterNoisy()
    GuidePlaybackService.hide(context)
    if (segmentEnded) emit?.invoke("onSegmentEnded", emptyMap())
  }

  private fun mixBlockLocked(mix: FloatArray) {
    mix.fill(0f)
    val blockStart = framesWritten
    if (segmentActive && frozenMs == null) {
      while (nextCue < cues.size) {
        val cue = cues[nextCue]
        val frame = segmentStartFrame + msToFrames(cue.atMs)
        if (frame >= blockStart + BLOCK) break
        if (frame >= blockStart - msToFrames(STALE_MS)) {
          cue.sound?.let { buffers[it] }?.let { voices.add(Voice(it, maxOf(frame, blockStart), volume)) }
          sideEffects(cue, frame)
        }
        nextCue += 1
      }
    }
    val iterator = voices.iterator()
    while (iterator.hasNext()) {
      val voice = iterator.next()
      for (i in 0 until BLOCK) {
        val index = blockStart + i - voice.startFrame
        if (index >= 0 && index < voice.samples.size) mix[i] += voice.samples[index.toInt()] * voice.gain
      }
      if (blockStart + BLOCK - voice.startFrame >= voice.samples.size) iterator.remove()
    }
    framesWritten += BLOCK
  }

  /** Haptics and the brief duck land when the cue is heard, not when it is written. */
  private fun sideEffects(cue: GuideCue, frame: Long) {
    val delayMs = ((frame - playedFramesLocked()) * 1000 / RATE).coerceAtLeast(0)
    val expected = generation
    if (cue.haptic > 0) {
      events.postDelayed({ if (synchronized(lock) { generation } == expected) vibrate(cue.haptic) }, delayMs)
    }
    cue.nowPlaying?.let { text ->
      events.postDelayed({
        if (synchronized(lock) { generation } == expected) {
          synchronized(lock) { subtitle = text }
          GuidePlaybackService.refresh()
        }
      }, delayMs)
    }
    val length = cue.sound?.let { buffers[it] }?.size ?: return
    if (mixWithOthers) duckOthers(delayMs, length * 1000L / RATE)
  }

  // ——— Interruptions (FR-04) ———

  private fun interrupt(reason: String) {
    val position = synchronized(lock) {
      if (!segmentActive || frozenMs != null) return
      if (finishing) null else pauseLocked()
    } ?: return stop()
    GuidePlaybackService.refresh()
    emit?.invoke("onInterruption", mapOf("reason" to reason, "positionMs" to position))
  }

  private fun inCall(): Boolean =
    audioManager.mode.let {
      it == AudioManager.MODE_IN_CALL || it == AudioManager.MODE_IN_COMMUNICATION || it == AudioManager.MODE_RINGTONE
    }

  /** “Play alongside” holds no audio focus, so calls are detected from the audio mode. */
  private fun checkForCall() {
    if (inCall()) events.post { interrupt("call") }
  }

  private val focusListener =
    AudioManager.OnAudioFocusChangeListener { change ->
      if (change == AudioManager.AUDIOFOCUS_LOSS || change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) {
        interrupt(if (inCall()) "call" else "audio")
      }
    }

  /** “Pause other audio” takes focus for the session; losing it pauses the practice. */
  @Synchronized
  private fun requestFocus(mixWithOthers: Boolean) {
    abandonFocus()
    if (mixWithOthers) return
    val request =
      AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
        .setAudioAttributes(attributes)
        .setOnAudioFocusChangeListener(focusListener, events)
        .setWillPauseWhenDucked(false)
        .build()
    focusRequest = request
    audioManager.requestAudioFocus(request)
  }

  @Synchronized
  private fun abandonFocus() {
    if (!::context.isInitialized) return
    focusRequest?.let { audioManager.abandonAudioFocusRequest(it) }
    focusRequest = null
  }

  /** “Play alongside”: other audio dips for the length of the cue, then returns. */
  private fun duckOthers(delayMs: Long, lengthMs: Long) {
    val request =
      AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
        .setAudioAttributes(attributes)
        .setOnAudioFocusChangeListener({}, events)
        .build()
    events.postDelayed({ audioManager.requestAudioFocus(request) }, (delayMs - 150).coerceAtLeast(0))
    events.postDelayed({ audioManager.abandonAudioFocusRequest(request) }, delayMs + lengthMs + 300)
  }

  private val noisyReceiver =
    object : BroadcastReceiver() {
      override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == AudioManager.ACTION_AUDIO_BECOMING_NOISY) interrupt("headphones")
      }
    }

  @Synchronized
  private fun registerNoisy() {
    if (noisyRegistered) return
    val filter = IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY)
    if (Build.VERSION.SDK_INT >= 33) context.registerReceiver(noisyReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
    else context.registerReceiver(noisyReceiver, filter)
    noisyRegistered = true
  }

  @Synchronized
  private fun unregisterNoisy() {
    if (!noisyRegistered) return
    runCatching { context.unregisterReceiver(noisyReceiver) }
    noisyRegistered = false
  }

  // ——— Haptics ———

  private fun vibrate(level: Int) {
    val vibrator =
      if (Build.VERSION.SDK_INT >= 31) context.getSystemService(VibratorManager::class.java).defaultVibrator
      else @Suppress("DEPRECATION") context.getSystemService(Vibrator::class.java)
    if (vibrator == null || !vibrator.hasVibrator()) return
    val (ms, amplitude) = when (level) {
      1 -> 18L to 70
      2 -> 28L to 150
      else -> 45L to 255
    }
    val effect = VibrationEffect.createOneShot(ms, if (vibrator.hasAmplitudeControl()) amplitude else VibrationEffect.DEFAULT_AMPLITUDE)
    if (Build.VERSION.SDK_INT >= 33) vibrator.vibrate(effect, VibrationAttributes.createForUsage(VibrationAttributes.USAGE_MEDIA))
    else vibrator.vibrate(effect)
  }
}
