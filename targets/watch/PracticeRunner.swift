import Foundation
import WatchKit

/**
 * Runs one practice on the watch, as the phone does (src/breathing/session.ts):
 * three seconds to settle, whole rounds, pause and resume (the step starts
 * again after a three-second settle), end early, and a record either way.
 *
 * A mindfulness extended runtime session keeps it running with the wrist
 * down, so the haptics carry the practice eyes closed. The clock is the
 * wall clock, read on every tick; nothing accumulates timer error.
 */
@MainActor
final class PracticeRunner: NSObject, ObservableObject, Identifiable {
  enum Stage: Equatable {
    case settling(until: Date, first: Bool)
    case running
    case paused
    case finished(completed: Bool)
  }

  static let settleSeconds: TimeInterval = 3
  /// Shorter than this and there's nothing worth keeping.
  static let minimumMs: Double = 1000

  let id = UUID()
  let practice: WatchPractice
  let plan: Plan
  private let haptics: HapticSettings
  private let send: (WatchSession) -> Void

  @Published private(set) var stage: Stage
  @Published private(set) var position: StepPosition?
  @Published private(set) var activeMs: Double = 0
  /// Cancelled before any practice time: nothing to show or keep.
  @Published private(set) var cancelled = false

  private let startedAt = Date()
  /// Plan time where the current run starts, and the wall time it started.
  private var runFromMs: Double = 0
  private var runStart: Date?
  private var timer: Timer?
  /// Bumped on pause and finish, so taps scheduled for a step that's gone never play.
  private var generation = 0
  private var lastStep: (round: Int, index: Int)?
  private var runtime: WKExtendedRuntimeSession?

  init(practice: WatchPractice, haptics: HapticSettings, send: @escaping (WatchSession) -> Void) {
    self.practice = practice
    self.plan = Plan(practice)
    self.haptics = haptics
    self.send = send
    self.stage = .settling(until: Date().addingTimeInterval(Self.settleSeconds), first: true)
    super.init()
  }

  func begin() {
    let session = WKExtendedRuntimeSession()
    session.delegate = self
    session.start()
    runtime = session
    startTimer()
  }

  /// Plan time at `date`: where the practice is, or where it stopped.
  func planMs(at date: Date) -> Double {
    guard stage == .running, let runStart else { return runFromMs }
    return runFromMs + date.timeIntervalSince(runStart) * 1000
  }

  var remainingMs: Double { max(0, plan.durationMs - planMs(at: Date())) }

  /// Cancel is offered only before any practice time, as on the phone.
  var canCancel: Bool {
    if case .settling(_, let first) = stage { return first }
    return false
  }

  func pause() {
    guard stage == .running else { return }
    let now = Date()
    if let runStart { activeMs += now.timeIntervalSince(runStart) * 1000 }
    // Resume starts the step again.
    runFromMs = position?.startMs ?? planMs(at: now)
    runStart = nil
    generation += 1
    lastStep = nil
    stage = .paused
  }

  func resume() {
    guard stage == .paused else { return }
    stage = .settling(until: Date().addingTimeInterval(Self.settleSeconds), first: false)
  }

  func endEarly() {
    guard stage == .paused else { return }
    finish(completed: false)
  }

  func cancel() {
    guard canCancel else { return }
    stopTimer()
    generation += 1
    runtime?.invalidate()
    runtime = nil
    cancelled = true
    stage = .finished(completed: false)
  }

  // MARK: - Clock

  private func startTimer() {
    let timer = Timer(timeInterval: 0.05, repeats: true) { [weak self] _ in
      Task { @MainActor in self?.tick() }
    }
    RunLoop.main.add(timer, forMode: .common)
    self.timer = timer
  }

  private func stopTimer() {
    timer?.invalidate()
    timer = nil
  }

  private func tick() {
    let now = Date()
    if case .settling(let until, _) = stage, now >= until {
      runStart = now
      stage = .running
    }
    guard stage == .running else { return }
    let t = planMs(at: now)
    guard let current = plan.position(at: t) else {
      finish(completed: true)
      return
    }
    if position != current { position = current }
    if lastStep?.round != current.round || lastStep?.index != current.index {
      lastStep = (current.round, current.index)
      stepBegan(current, elapsedInStep: t - current.startMs)
    }
  }

  private func stepBegan(_ position: StepPosition, elapsedInStep: Double) {
    let kind = position.step.kind
    guard haptics.phases.isOn(kind) else { return }
    // A step joined late (after a resume settles) still gets its mark.
    Haptics.play(Haptics.mark(kind))
    let token = generation
    for offset in Haptics.taps(kind, durationMs: position.durationMs, style: haptics.style) where offset > elapsedInStep {
      DispatchQueue.main.asyncAfter(deadline: .now() + (offset - elapsedInStep) / 1000) { [weak self] in
        guard let self, self.generation == token, self.stage == .running else { return }
        Haptics.play(.click)
      }
    }
  }

  private func finish(completed: Bool) {
    if stage == .running, let runStart { activeMs += Date().timeIntervalSince(runStart) * 1000 }
    runStart = nil
    stopTimer()
    generation += 1
    if completed {
      activeMs = max(activeMs, plan.durationMs)
      Haptics.play(.success)
    }
    let rounds = completed ? plan.rounds : (position?.round ?? 0)
    stage = .finished(completed: completed)
    if activeMs >= Self.minimumMs {
      send(
        WatchSession(
          id: UUID().uuidString,
          startedAt: Int64(startedAt.timeIntervalSince1970 * 1000),
          activeMs: Int64(activeMs.rounded()),
          completedRounds: rounds,
          outcome: completed ? "completed" : "ended",
          practiceJson: practice.practiceJson))
    }
    runtime?.invalidate()
    runtime = nil
  }
}

extension PracticeRunner: WKExtendedRuntimeSessionDelegate {
  nonisolated func extendedRuntimeSessionDidStart(_ session: WKExtendedRuntimeSession) {}

  nonisolated func extendedRuntimeSessionWillExpire(_ session: WKExtendedRuntimeSession) {
    Task { @MainActor in self.stopForSystem() }
  }

  nonisolated func extendedRuntimeSession(
    _ session: WKExtendedRuntimeSession, didInvalidateWith reason: WKExtendedRuntimeSessionInvalidationReason, error: Error?
  ) {
    Task { @MainActor in self.stopForSystem() }
  }

  /// The system is ending the session: keep what was practiced.
  private func stopForSystem() {
    switch stage {
    case .running, .paused: finish(completed: false)
    case .settling(_, let first):
      if first { cancel() } else { finish(completed: false) }
    case .finished: break
    }
  }
}
