package app.viram.wear

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.SystemClock
import android.os.VibrationEffect
import android.os.VibratorManager
import androidx.core.app.NotificationCompat
import androidx.wear.ongoing.OngoingActivity
import androidx.wear.ongoing.Status
import java.util.UUID
import kotlin.math.roundToInt

/**
 * Runs one practice as the phone does (src/breathing/session.ts): three
 * seconds to settle, whole rounds, pause and resume (the step starts again
 * after a three-second settle), end early, and a record either way.
 *
 * A foreground service with a partial wake lock keeps it going with the
 * screen off; each step's haptics are one waveform, timed by the vibrator,
 * so they stay crisp. The clock is elapsedRealtime, read on every tick.
 */
class PracticeService : Service() {
  sealed class Stage {
    data class Settling(val untilMs: Long, val first: Boolean) : Stage()
    data object Running : Stage()
    data object Paused : Stage()
    data class Finished(val completed: Boolean, val activeMs: Long, val cancelled: Boolean) : Stage()
  }

  data class State(val practice: WatchPractice, val plan: Plan, val stage: Stage, val position: StepPosition?, val planMs: Long)

  companion object {
    private const val SETTLE_MS = 3000L
    private const val TICK_MS = 50L
    private const val MINIMUM_MS = 1000L
    /** Pulses this early in a step belong to its mark. */
    private const val MARK_MS = 150L
    private const val CHANNEL = "practice"
    private const val NOTIFICATION_ID = 1

    @Volatile var state: State? = null
      private set
    var listener: ((State?) -> Unit)? = null

    private var pending: Pair<WatchPractice, HapticSettings>? = null

    fun start(context: Context, practice: WatchPractice, haptics: HapticSettings) {
      pending = practice to haptics
      context.startForegroundService(Intent(context, PracticeService::class.java))
    }

    fun command(context: Context, action: String) {
      context.startService(Intent(context, PracticeService::class.java).setAction(action))
    }

    fun clear() {
      state = null
      listener?.invoke(null)
    }

    const val PAUSE = "pause"
    const val RESUME = "resume"
    const val END = "end"
    const val CANCEL = "cancel"
  }

  private val handler = Handler(Looper.getMainLooper())
  private lateinit var practice: WatchPractice
  private lateinit var plan: Plan
  private lateinit var haptics: HapticSettings
  private var stage: Stage = Stage.Paused
  private var position: StepPosition? = null
  private var runFromMs = 0L
  private var runStart = 0L
  private var activeMs = 0L
  private val startedAt = System.currentTimeMillis()
  private var lastStep: Pair<Int, Int>? = null
  private var wakeLock: PowerManager.WakeLock? = null

  private val vibrator by lazy { (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator }

  private val tick = object : Runnable {
    override fun run() {
      step()
      if (stage is Stage.Settling || stage == Stage.Running) handler.postDelayed(this, TICK_MS)
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    // A command for a practice this service never began (it was stopped): nothing to do.
    if (intent?.action != null && !::practice.isInitialized) {
      stopSelf()
      return START_NOT_STICKY
    }
    when (intent?.action) {
      PAUSE -> pause()
      RESUME -> resume()
      END -> if (stage == Stage.Paused) finish(completed = false)
      CANCEL -> cancel()
      else -> begin()
    }
    return START_NOT_STICKY
  }

  private fun begin() {
    val (p, h) = pending ?: return stopSelf()
    pending = null
    practice = p
    plan = Plan(p)
    haptics = h
    goForeground()
    wakeLock = (getSystemService(Context.POWER_SERVICE) as PowerManager)
      .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "viram:practice")
      // Never past the longest plan with room for pauses.
      .apply { acquire(3 * 60 * 60_000L) }
    stage = Stage.Settling(SystemClock.elapsedRealtime() + SETTLE_MS, first = true)
    publish()
    handler.post(tick)
  }

  private fun planMs(now: Long = SystemClock.elapsedRealtime()) = if (stage == Stage.Running) runFromMs + (now - runStart) else runFromMs

  private fun step() {
    val now = SystemClock.elapsedRealtime()
    (stage as? Stage.Settling)?.let { if (now >= it.untilMs) { runStart = now; stage = Stage.Running } }
    if (stage != Stage.Running) return publish()
    val t = planMs(now)
    val current = plan.position(t) ?: return finish(completed = true)
    position = current
    if (lastStep != current.round to current.index) {
      lastStep = current.round to current.index
      vibrate(current, t - current.startMs)
    }
    publish()
  }

  private fun vibrate(position: StepPosition, elapsedInStep: Long) {
    // The tick finds a step up to 50 ms late: its mark plays at once, and taps through the step stay on time.
    val pulses = Patterns.forStep(position.step.kind, position.durationMs, haptics)
      .map { if (it.atMs < MARK_MS) it else it.copy(atMs = it.atMs - elapsedInStep) }
      .filter { it.atMs >= 0 }
    if (pulses.isEmpty()) return
    val timings = mutableListOf<Long>()
    val amplitudes = mutableListOf<Int>()
    var at = 0L
    for (p in pulses.sortedBy { it.atMs }) {
      val gap = p.atMs - at
      if (gap < 0) continue
      timings += gap
      amplitudes += 0
      timings += p.ms
      amplitudes += (p.amplitude * 255).roundToInt().coerceIn(1, 255)
      at = p.atMs + p.ms
    }
    val effect =
      if (vibrator.hasAmplitudeControl()) VibrationEffect.createWaveform(timings.toLongArray(), amplitudes.toIntArray(), -1)
      else VibrationEffect.createWaveform(timings.toLongArray(), -1)
    vibrator.vibrate(effect)
  }

  private fun pause() {
    if (stage != Stage.Running) return
    val now = SystemClock.elapsedRealtime()
    activeMs += now - runStart
    // Resume starts the step again.
    runFromMs = position?.startMs ?: planMs(now)
    lastStep = null
    vibrator.cancel()
    stage = Stage.Paused
    publish()
  }

  private fun resume() {
    if (stage != Stage.Paused) return
    stage = Stage.Settling(SystemClock.elapsedRealtime() + SETTLE_MS, first = false)
    publish()
    handler.removeCallbacks(tick)
    handler.post(tick)
  }

  private fun cancel() {
    val settling = stage as? Stage.Settling
    if (settling?.first != true) return
    end(Stage.Finished(completed = false, activeMs = 0, cancelled = true))
  }

  private fun finish(completed: Boolean) {
    if (stage == Stage.Running) activeMs += SystemClock.elapsedRealtime() - runStart
    if (completed) {
      activeMs = maxOf(activeMs, plan.durationMs)
      vibrator.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 40, 120, 40, 120, 160), intArrayOf(0, 160, 0, 200, 0, 120), -1))
    } else {
      vibrator.cancel()
    }
    val rounds = if (completed) plan.rounds else position?.round ?: 0
    if (activeMs >= MINIMUM_MS) {
      val id = UUID.randomUUID().toString()
      Link.send(this, id, Format.session(id, startedAt, activeMs, rounds, completed, practice.practiceJson))
    }
    end(Stage.Finished(completed, activeMs, cancelled = false))
  }

  private fun end(finished: Stage.Finished) {
    handler.removeCallbacks(tick)
    stage = finished
    publish()
    wakeLock?.takeIf { it.isHeld }?.release()
    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  private fun publish() {
    val next = State(practice, plan, stage, position, planMs())
    state = next
    handler.post { listener?.invoke(next) }
  }

  private fun goForeground() {
    val manager = getSystemService(NotificationManager::class.java)
    manager.createNotificationChannel(NotificationChannel(CHANNEL, "Practice", NotificationManager.IMPORTANCE_LOW))
    val open = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
    val builder = NotificationCompat.Builder(this, CHANNEL)
      .setSmallIcon(R.drawable.ic_mark)
      .setContentTitle(practice.name)
      .setContentText(practice.detail)
      .setOngoing(true)
      .setCategory(NotificationCompat.CATEGORY_WORKOUT)
      .setContentIntent(open)
    // Shows on the watch face while the practice runs.
    OngoingActivity.Builder(this, NOTIFICATION_ID, builder)
      .setStaticIcon(R.drawable.ic_mark)
      .setTouchIntent(open)
      .setStatus(Status.Builder().addTemplate(practice.name).build())
      .build()
      .apply(this)
    val notification: Notification = builder.build()
    if (Build.VERSION.SDK_INT >= 34) startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    else startForeground(NOTIFICATION_ID, notification)
  }

  override fun onDestroy() {
    handler.removeCallbacks(tick)
    wakeLock?.takeIf { it.isHeld }?.release()
    super.onDestroy()
  }
}
