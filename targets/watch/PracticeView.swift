import SwiftUI

/// The guide: a disc that grows with the inhale and shrinks with the exhale, in the phase's color.
struct PracticeView: View {
  @ObservedObject var runner: PracticeRunner
  let onDone: () -> Void
  @Environment(\.isLuminanceReduced) private var dimmed
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var confirmingEnd = false

  var body: some View {
    Group {
      switch runner.stage {
      case .settling(let until, let first):
        SettleView(until: until, first: first, onCancel: runner.canCancel ? { runner.cancel() } : nil)
      case .paused where confirmingEnd:
        EndView(onKeepBreathing: { confirmingEnd = false }, onEnd: { runner.endEarly() })
      case .running, .paused:
        guide
      case .finished(let completed):
        if runner.cancelled {
          Color.clear.onAppear(perform: onDone)
        } else {
          DoneView(completed: completed, activeMs: runner.activeMs, onDone: onDone)
        }
      }
    }
    // Every stage has its own way out (Cancel, Pause then End, Done), so the
    // system's close button can't drop a practice under way (QA W01).
    .toolbar(.hidden, for: .navigationBar)
  }

  private var guide: some View {
    // With Reduce Motion, a still disc that changes color with the phase, as on the phone (QA W04).
    TimelineView(.animation(minimumInterval: reduceMotion ? 1 : 1.0 / 30, paused: dimmed || runner.stage != .running)) { context in
      let t = runner.planMs(at: context.date)
      let position = runner.position
      let paused = runner.stage == .paused
      VStack(spacing: 6) {
        Circle()
          .fill(Color(position.map { $0.step.kind.rawValue } ?? "rest"))
          .scaleEffect(reduceMotion ? 0.8 : scale(position, t))
          .opacity(dimmed || paused ? 0.45 : 1)
          .frame(maxWidth: .infinity, maxHeight: .infinity)
          .accessibilityHidden(true)
        // Under the disc, never on it, so it reads at every size (QA W02).
        Text(paused ? "Paused" : position?.step.label ?? "")
          .font(.headline)
          .accessibilityAddTraits(.updatesFrequently)
        Text(line(position, t))
          .font(.footnote.monospacedDigit())
          .foregroundStyle(Color("mist"))
        if paused {
          // Side by side at every text size: the words shrink before they'd be cut off.
          HStack {
            Button { confirmingEnd = true } label: { Text("End").lineLimit(1).minimumScaleFactor(0.6) }
            Button { runner.resume() } label: { Text("Resume").lineLimit(1).minimumScaleFactor(0.6) }
              .tint(Color("inhale"))
          }
        } else {
          Button("Pause") { runner.pause() }
            .buttonStyle(.plain)
            .font(.footnote)
            .foregroundStyle(Color("muted"))
        }
      }
    }
  }

  /// As on the phone (src/components/BreathingGuide.tsx): small 0.56, full 1.
  private func scale(_ position: StepPosition?, _ t: Double) -> CGFloat {
    guard let position else { return 0.56 }
    let p = min(1, max(0, (t - position.startMs) / position.durationMs))
    switch position.step.kind {
    case .inhale: return 0.56 + 0.44 * p
    case .exhale: return 1 - 0.44 * p
    case .hold: return 1
    case .rest: return 0.56
    }
  }

  private func line(_ position: StepPosition?, _ t: Double) -> String {
    let left = clock(max(0, runner.plan.durationMs - t))
    guard let position else { return left }
    return "Round \(position.round + 1) of \(runner.plan.rounds) · \(left)"
  }
}

func clock(_ ms: Double) -> String {
  let total = Int((ms / 1000).rounded())
  return String(format: "%d:%02d", total / 60, total % 60)
}

struct SettleView: View {
  let until: Date
  let first: Bool
  let onCancel: (() -> Void)?

  var body: some View {
    // Scrolls rather than cutting the guidance short (QA W03).
    ScrollView {
      VStack(spacing: 8) {
        Text(first ? "Settle in" : "Resuming").font(.headline)
        TimelineView(.periodic(from: .now, by: 0.25)) { context in
          Text("\(max(1, Int(ceil(until.timeIntervalSince(context.date)))))")
            .font(.system(size: 44, weight: .medium).monospacedDigit())
            .foregroundStyle(Color("inhale"))
        }
        Text("Eyes closed is fine. The taps will guide you.")
          .font(.footnote)
          .multilineTextAlignment(.center)
          .foregroundStyle(Color("mist"))
          .fixedSize(horizontal: false, vertical: true)
        if let onCancel {
          Button("Cancel", action: onCancel)
        }
      }
    }
  }
}

/// Ending is asked once, as on the phone; the time so far is kept.
struct EndView: View {
  let onKeepBreathing: () -> Void
  let onEnd: () -> Void

  var body: some View {
    ScrollView {
      VStack(spacing: 8) {
        Text("End this practice?")
          .font(.headline)
          .multilineTextAlignment(.center)
          .accessibilityAddTraits(.isHeader)
        Text("Your time so far goes to History on your iPhone as “Ended early.”")
          .font(.footnote)
          .multilineTextAlignment(.center)
          .foregroundStyle(Color("mist"))
          .fixedSize(horizontal: false, vertical: true)
        Button("Keep breathing", action: onKeepBreathing).tint(Color("inhale"))
        Button("End session", action: onEnd)
      }
    }
  }
}

struct DoneView: View {
  let completed: Bool
  let activeMs: Double
  let onDone: () -> Void

  var body: some View {
    ScrollView {
      VStack(spacing: 8) {
        Image(systemName: "checkmark.circle").font(.title2).foregroundStyle(Color("inhale"))
        Text(completed ? "A little space, made." : "A pause still counts.")
          .font(.headline)
          .multilineTextAlignment(.center)
        Text(clock(activeMs)).font(.title3.monospacedDigit())
        Text("Saved to History on your iPhone when it’s nearby.")
          .font(.footnote)
          .multilineTextAlignment(.center)
          .foregroundStyle(Color("mist"))
        Button("Done", action: onDone)
      }
    }
  }
}
