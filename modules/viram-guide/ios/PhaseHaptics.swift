import CoreHaptics
import UIKit

/// Plays a step's haptic pattern (src/haptics/patterns.ts) with Core Haptics:
/// short pulses as taps, longer ones as a soft continuous buzz. Falls back to
/// a single impact where Core Haptics isn't available. Main thread only; iOS
/// plays haptics only while the app is in the foreground.
final class PhaseHaptics {
  /// Pulses this short or shorter are taps; longer ones are buzzes.
  private static let tapMs = 40.0

  private var engine: CHHapticEngine?
  private var player: CHHapticPatternPlayer?

  private func readyEngine() -> CHHapticEngine? {
    if let engine { return engine }
    guard CHHapticEngine.capabilitiesForHardware().supportsHaptics, let created = try? CHHapticEngine() else { return nil }
    // Haptics only: the guide's audio session is left alone.
    created.playsHapticsOnly = true
    created.isAutoShutdownEnabled = true
    created.resetHandler = { [weak created] in try? created?.start() }
    engine = created
    return created
  }

  /// `flat` is [atMs, ms, amplitude 0–1, …], relative to now.
  func play(_ flat: [Double], fallbackLevel: Int) {
    guard flat.count >= 3, let engine = readyEngine() else {
      impact(fallbackLevel)
      return
    }
    var events: [CHHapticEvent] = []
    for i in stride(from: 0, to: flat.count - 2, by: 3) {
      let at = flat[i] / 1000
      let ms = flat[i + 1]
      let intensity = CHHapticEventParameter(parameterID: .hapticIntensity, value: Float(min(1, max(0, flat[i + 2]))))
      if ms <= Self.tapMs {
        let sharpness = CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.5)
        events.append(CHHapticEvent(eventType: .hapticTransient, parameters: [intensity, sharpness], relativeTime: at))
      } else {
        let sharpness = CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.15)
        events.append(CHHapticEvent(eventType: .hapticContinuous, parameters: [intensity, sharpness], relativeTime: at, duration: ms / 1000))
      }
    }
    do {
      try engine.start()
      stop()
      let next = try engine.makePlayer(with: CHHapticPattern(events: events, parameters: []))
      try next.start(atTime: CHHapticTimeImmediate)
      player = next
    } catch {
      impact(fallbackLevel)
    }
  }

  /// Ends a pattern still playing, e.g. taps through an exhale when the practice pauses.
  func stop() {
    try? player?.stop(atTime: CHHapticTimeImmediate)
    player = nil
  }

  func impact(_ level: Int) {
    guard level > 0 else { return }
    let style: UIImpactFeedbackGenerator.FeedbackStyle = level == 1 ? .light : level == 2 ? .medium : .heavy
    UIImpactFeedbackGenerator(style: style).impactOccurred()
  }
}
