package app.viram.guide

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class CueRecord : Record {
  @Field val atMs: Double = 0.0
  @Field val sound: String? = null
  /** 0 none, 1 light, 2 medium, 3 strong. */
  @Field val haptic: Int = 0
  /** Lock-screen subtitle from this cue on, e.g. “Round 6 of 15 · 3:12 left”. */
  @Field val nowPlaying: String? = null
}

class SegmentOptions : Record {
  @Field val cues: List<CueRecord> = emptyList()
  @Field val endMs: Double = 0.0
  @Field val volume: Double = 1.0
  @Field val mixWithOthers: Boolean = true
  @Field val title: String = ""
  @Field val subtitle: String = ""
}

/** JS surface of the guide. All timing lives in GuideEngine on the audio clock. */
class ViramGuideModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ViramGuide")

    Events("onRemoteCommand", "onInterruption", "onSegmentEnded")

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
      GuideEngine.start(
        options.cues.map { GuideCue(it.atMs, it.sound, it.haptic, it.nowPlaying) },
        options.endMs,
        options.volume.toFloat(),
        options.mixWithOthers,
        options.title,
        options.subtitle,
      )
    }

    Function("positionMs") { GuideEngine.positionMs() }

    Function("pause") { GuideEngine.pause() }

    Function("finish") { GuideEngine.finish() }

    Function("stop") { GuideEngine.stop() }

    Function("setVolume") { volume: Double -> GuideEngine.setVolume(volume.toFloat()) }

    Function("setNowPlaying") { title: String, subtitle: String -> GuideEngine.setNowPlaying(title, subtitle) }

    Function("playOnce") { sound: String, volume: Double -> GuideEngine.playOnce(sound, volume.toFloat()) }
  }
}
