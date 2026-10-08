import AVFoundation
import ExpoModulesCore

struct CueRecord: Record {
  @Field var atMs: Double = 0
  @Field var sound: String? = nil
  /// 0 none, 1 light, 2 medium, 3 strong: one tap when there are no pulses.
  @Field var haptic: Int = 0
  /// The step's haptic pattern as [atMs, ms, amplitude 0–1, …] (src/haptics/patterns.ts).
  @Field var pulses: [Double] = []
  /// Lock-screen subtitle from this cue on, e.g. “Round 6 of 15 · 3:12 left”.
  @Field var nowPlaying: String? = nil
}

struct SegmentOptions: Record {
  @Field var cues: [CueRecord] = []
  /// Segment time when guidance ends; the module releases audio shortly after.
  @Field var endMs: Double = 0
  @Field var volume: Double = 1
  @Field var mixWithOthers: Bool = true
  /// Automatic: play along only if other audio is already playing as the segment starts.
  @Field var mixIfOthersPlaying: Bool = false
  /// Android only: iOS can't lower other audio per cue (docs/decisions/locked-audio.md).
  @Field var lowerOthers: Bool = false
  @Field var title: String = ""
  @Field var subtitle: String = ""
  /// Music bed looped under the segment.
  @Field var bed: String? = nil
  @Field var bedVolume: Double = 0
}

/// JS surface of the guide. All timing lives in GuideEngine on the audio clock.
public class ViramGuideModule: Module {
  private let engine = GuideEngine()

  public func definition() -> ModuleDefinition {
    Name("ViramGuide")

    Events("onRemoteCommand", "onInterruption", "onSegmentEnded", "onCueTiming")

    OnCreate {
      self.engine.emit = { [weak self] name, body in
        self?.sendEvent(name, body)
      }
    }

    OnDestroy {
      self.engine.stop()
    }

    AsyncFunction("preload") { (sounds: [String: String]) -> [String: Double] in
      self.engine.preload(sounds)
    }

    Function("startSegment") { (options: SegmentOptions) in
      try self.engine.start(
        cues: options.cues.map { GuideCue(atMs: $0.atMs, sound: $0.sound, haptic: $0.haptic, pulses: $0.pulses, nowPlaying: $0.nowPlaying) },
        endMs: options.endMs,
        volume: Float(options.volume),
        // Automatic never stops music that's already playing, and otherwise
        // takes the audio so the lock screen shows the practice's controls.
        mixWithOthers: options.mixWithOthers || (options.mixIfOthersPlaying && AVAudioSession.sharedInstance().isOtherAudioPlaying),
        title: options.title,
        subtitle: options.subtitle,
        bed: options.bed,
        bedVolume: Float(options.bedVolume)
      )
    }

    Function("positionMs") { () -> Double in
      self.engine.positionMs()
    }

    Function("pause") { () -> Double in
      self.engine.pause()
    }

    Function("finish") {
      self.engine.finish()
    }

    Function("stop") {
      self.engine.stop()
    }

    Function("setVolume") { (volume: Double) in
      self.engine.setVolume(Float(volume))
    }

    Function("setNowPlaying") { (title: String, subtitle: String) in
      self.engine.setNowPlaying(title: title, subtitle: subtitle)
    }

    Function("setTimingLog") { (enabled: Bool) in
      self.engine.timingLog = enabled
    }

    Function("playOnce") { (sound: String, volume: Double, maxMs: Double?) in
      try self.engine.playOnce(sound, volume: Float(volume), maxMs: maxMs)
    }
  }
}
