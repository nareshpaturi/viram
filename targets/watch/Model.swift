import Foundation

// The companion format from the phone (src/companion/companion.ts). Keep the
// two in step: the phone checks everything a watch sends back.

enum StepKind: String, Codable {
  case inhale, hold, exhale, rest
}

struct WatchStep: Codable, Hashable {
  let kind: StepKind
  let seconds: Double
  /// The phone's own label: "Inhale left", "Hum", "Hold after inhale".
  let label: String
}

struct Slowing: Codable, Hashable {
  let inhale: Double
  let exhale: Double
}

struct WatchPractice: Codable, Hashable, Identifiable {
  let key: String
  let name: String
  let detail: String
  let steps: [WatchStep]
  let rounds: Int
  let durationMs: Double
  let slowing: Slowing?
  /// Echoed back verbatim with the session.
  let practiceJson: String

  var id: String { key }
}

enum HapticStyle: String, Codable {
  case marks, through
}

struct HapticPhases: Codable, Hashable {
  let inhale: Bool
  let hold: Bool
  let exhale: Bool
  let rest: Bool

  func isOn(_ kind: StepKind) -> Bool {
    switch kind {
    case .inhale: return inhale
    case .hold: return hold
    case .exhale: return exhale
    case .rest: return rest
    }
  }

  static let all = HapticPhases(inhale: true, hold: true, exhale: true, rest: true)
}

struct HapticSettings: Codable, Hashable {
  let style: HapticStyle
  let phases: HapticPhases

  static let standard = HapticSettings(style: .marks, phases: .all)
}

struct CompanionContext: Codable {
  let v: Int
  let practices: [WatchPractice]
  let haptics: HapticSettings
  let sentAt: Double
}

struct WatchSession: Codable {
  var v = 1
  let id: String
  let startedAt: Int64
  let activeMs: Int64
  let completedRounds: Int
  /// "completed" or "ended"
  let outcome: String
  let practiceJson: String
}

/// One step as it plays: its round, where it starts in plan time, and how long it lasts.
struct StepPosition: Equatable {
  let round: Int
  let index: Int
  let step: WatchStep
  let startMs: Double
  let durationMs: Double
}

/**
 * The phone's plan math (src/breathing/rhythm.ts): whole rounds, 0-second
 * steps skipped, and gradual slowing moving the inhale and exhale evenly,
 * round by round, in tenths of a second.
 */
struct Plan {
  let practice: WatchPractice
  /// Where each round starts, then the end.
  let roundStartsMs: [Double]

  init(_ practice: WatchPractice) {
    self.practice = practice
    var starts: [Double] = [0]
    for round in 0..<max(1, practice.rounds) {
      starts.append(starts[round] + Plan.steps(practice, round: round).reduce(0) { $0 + Plan.ms($1.seconds) })
    }
    roundStartsMs = starts
  }

  var rounds: Int { roundStartsMs.count - 1 }
  var durationMs: Double { roundStartsMs[rounds] }

  static func ms(_ seconds: Double) -> Double { (seconds * 1000).rounded() }

  static func steps(_ practice: WatchPractice, round: Int) -> [WatchStep] {
    guard let slowing = practice.slowing else { return practice.steps }
    let f = practice.rounds > 1 ? min(1, Double(round) / Double(practice.rounds - 1)) : 0
    return practice.steps.map { step in
      let end: Double? = step.kind == .inhale ? slowing.inhale : step.kind == .exhale ? slowing.exhale : nil
      guard let end else { return step }
      let seconds = ((step.seconds + (end - step.seconds) * f) * 10).rounded() / 10
      return WatchStep(kind: step.kind, seconds: seconds, label: step.label)
    }
  }

  /// The step playing at `elapsedMs` of plan time; nil once the plan is over.
  func position(at elapsedMs: Double) -> StepPosition? {
    guard elapsedMs < durationMs else { return nil }
    let t = max(0, elapsedMs)
    var lo = 0
    var hi = rounds - 1
    while lo < hi {
      let mid = (lo + hi + 1) / 2
      if roundStartsMs[mid] <= t { lo = mid } else { hi = mid - 1 }
    }
    var at = roundStartsMs[lo]
    for (index, step) in Plan.steps(practice, round: lo).enumerated() {
      let duration = Plan.ms(step.seconds)
      if duration == 0 { continue }
      if t < at + duration {
        return StepPosition(round: lo, index: index, step: step, startMs: at, durationMs: duration)
      }
      at += duration
    }
    return nil
  }
}
