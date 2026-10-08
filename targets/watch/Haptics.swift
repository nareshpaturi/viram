import WatchKit

/**
 * The phone's per-phase patterns (src/haptics/patterns.ts) in the watch's
 * own haptic vocabulary, which has no strength, only shape:
 *
 *   Marks              inhale: rising · hold: two taps · exhale: falling · rest: a click
 *   Through the breath also clicks through the inhale (quick) and the exhale (slow)
 */
enum Haptics {
  /// Taps through a step stop this long before it ends, as on the phone.
  static let tailMs: Double = 350
  static let inhaleEveryMs: Double = 450
  static let exhaleEveryMs: Double = 1000

  static func mark(_ kind: StepKind) -> WKHapticType {
    switch kind {
    case .inhale: return .directionUp
    case .hold: return .stop
    case .exhale: return .directionDown
    case .rest: return .click
    }
  }

  /// Offsets within a step for the "through the breath" clicks after its mark.
  static func taps(_ kind: StepKind, durationMs: Double, style: HapticStyle) -> [Double] {
    guard style == .through else { return [] }
    let every: Double
    let first: Double
    switch kind {
    case .inhale:
      every = inhaleEveryMs
      first = inhaleEveryMs
    case .exhale:
      every = exhaleEveryMs
      first = 320 + exhaleEveryMs
    default:
      return []
    }
    var out: [Double] = []
    var at = first
    while at + 60 <= durationMs - tailMs {
      out.append(at)
      at += every
    }
    return out
  }

  static func play(_ type: WKHapticType) {
    WKInterfaceDevice.current().play(type)
  }
}
