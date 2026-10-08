package app.viram.guide

import android.content.Context
import android.media.AudioManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class CueRecord : Record {
  @Field val atMs: Double = 0.0
  @Field val sound: String? = null
  /** 0 none, 1 light, 2 medium, 3 strong: one tap when there are no pulses. */
  @Field val haptic: Int = 0
  /** The step's haptic pattern as [atMs, ms, amplitude 0–1, …] (src/haptics/patterns.ts). */
  @Field val pulses: List<Double> = emptyList()
  /** Lock-screen subtitle from this cue on, e.g. “Round 6 of 15 · 3:12 left”. */
  @Field val nowPlaying: String? = null
}

class SegmentOptions : Record {
  @Field val cues: List<CueRecord> = emptyList()
  @Field val endMs: Double = 0.0
  @Field val volume: Double = 1.0
  @Field val mixWithOthers: Boolean = true
  /** Automatic: play along only if other audio is already playing as the segment starts. */
  @Field val mixIfOthersPlaying: Boolean = false
  /** “Lower it”: dip other audio briefly under each cue while playing along. */
  @Field val lowerOthers: Boolean = false
  @Field val title: String = ""
  @Field val subtitle: String = ""
  /** Music bed looped under the segment. */
  @Field val bed: String? = null
  @Field val bedVolume: Double = 0.0
}

/** JS surface of the guide. All timing lives in GuideEngine on the audio clock. */
class ViramGuideModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ViramGuide")

    Events("onRemoteCommand", "onInterruption", "onSegmentEnded", "onCueTiming", "onPreviewEnded")

    OnCreate {
      val context = appContext.reactContext ?: return@OnCreate
      GuideEngine.attach(context) { name, body -> sendEvent(name, body) }
    }

    OnDestroy {
      GuideEngine.stop()
    }

    AsyncFunction("preload") { sounds: Map<String, String> ->
      GuideEngine.preload(sounds)
    }

    Function("startSegment") { options: SegmentOptions ->
      val othersPlaying = appContext.reactContext?.getSystemService(Context.AUDIO_SERVICE)?.let { (it as AudioManager).isMusicActive } ?: false
      GuideEngine.lowerOthers = options.lowerOthers
      GuideEngine.start(
        options.cues.map { GuideCue(it.atMs, it.sound, it.haptic, it.nowPlaying, it.pulses.toDoubleArray()) },
        options.endMs,
        options.volume.toFloat(),
        options.mixWithOthers || (options.mixIfOthersPlaying && othersPlaying),
        options.title,
        options.subtitle,
        options.bed,
        options.bedVolume.toFloat(),
      )
    }

    Function("positionMs") { GuideEngine.positionMs() }

    Function("pause") {
      // A pattern still playing (taps through a long exhale) stops with the practice.
      appContext.reactContext?.let { PhaseHaptics.cancel(it) }
      GuideEngine.pause()
    }

    Function("finish") { GuideEngine.finish() }

    Function("stop") {
      appContext.reactContext?.let { PhaseHaptics.cancel(it) }
      GuideEngine.stop()
    }

    Function("setVolume") { volume: Double -> GuideEngine.setVolume(volume.toFloat()) }

    Function("setNowPlaying") { title: String, subtitle: String -> GuideEngine.setNowPlaying(title, subtitle) }

    Function("setTimingLog") { enabled: Boolean -> GuideEngine.timingLog = enabled }

    Function("playOnce") { sound: String, volume: Double, maxMs: Double? -> GuideEngine.playOnce(sound, volume.toFloat(), maxMs) }

    Function("stopOnce") { GuideEngine.stopOnce() }
  }
}
