import AVFoundation
import CallKit
import MediaPlayer
import UIKit

struct GuideCue {
  let atMs: Double
  let sound: String?
  let haptic: Int
  let nowPlaying: String?
}

enum GuideError: LocalizedError {
  case unreadable(String)
  case unknownSound(String)

  var errorDescription: String? {
    switch self {
    case .unreadable(let uri): return "Couldn't read audio at \(uri)"
    case .unknownSound(let id): return "Sound \(id) was not preloaded"
    }
  }
}

/// Plays one practice segment's cues on the audio clock (PRD FR-02, FR-04).
///
/// Every cue is scheduled on an AVAudioPlayerNode at an absolute host time,
/// so guidance keeps its timing with the screen locked and never depends on
/// JavaScript timers. A looping silent buffer keeps the audio session (and so
/// the app) alive in the background between cues. Position is host time since
/// the segment started, the same clock the cues are scheduled on.
final class GuideEngine {
  var emit: ((String, [String: Any]) -> Void)?

  private static let sampleRate = 44_100.0
  private static let window = 8_000.0
  private static let releaseAfterEndMs = 3_000.0
  private static let timebase: mach_timebase_info_data_t = {
    var info = mach_timebase_info_data_t()
    mach_timebase_info(&info)
    return info
  }()

  private let queue = DispatchQueue(label: "app.viram.guide", qos: .userInteractive)
  private let clockLock = NSLock()
  private let format = AVAudioFormat(standardFormatWithSampleRate: GuideEngine.sampleRate, channels: 1)!
  private let callObserver = CXCallObserver()

  private var engine = AVAudioEngine()
  private var voices = [AVAudioPlayerNode(), AVAudioPlayerNode()]
  private var once = AVAudioPlayerNode()
  private var keepAlive = AVAudioPlayerNode()
  private var graphReady = false
  private var buffers: [String: AVAudioPCMBuffer] = [:]

  // Segment state. Clock fields are read by positionMs() from the JS thread.
  private var active = false
  private var startHost: UInt64 = 0
  private var frozenMs: Double?
  private var endMs = 0.0
  private var cues: [GuideCue] = []
  private var nextCue = 0
  private var volume: Float = 1
  /// Bumped whenever scheduled work must be abandoned (pause, stop, restart).
  /// Written on `queue` under clockLock, so the main thread can read it without waiting on `queue`.
  private var generation = 0
  /// Set by finish(): an interruption in the ring-out releases instead of pausing.
  private var finishing = false
  /// Identifies the current one-shot sound, so a replaced one can't stop the new one.
  private var onceToken = 0
  private var timer: DispatchSourceTimer?
  private var observers: [NSObjectProtocol] = []
  private var remoteTargets: [(MPRemoteCommand, Any)] = []
  private var nowPlaying = (title: "", subtitle: "")

  // MARK: Clock

  private static func ticks(ms: Double) -> UInt64 {
    UInt64(max(0, ms) * 1_000_000 * Double(timebase.denom) / Double(timebase.numer))
  }

  private static func ms(ticks: UInt64) -> Double {
    Double(ticks) * Double(timebase.numer) / Double(timebase.denom) / 1_000_000
  }

  private func bumpGeneration() {
    clockLock.lock()
    generation += 1
    clockLock.unlock()
  }

  private func locked<T>(_ read: () -> T) -> T {
    clockLock.lock()
    defer { clockLock.unlock() }
    return read()
  }

  func positionMs() -> Double {
    clockLock.lock()
    defer { clockLock.unlock() }
    guard active else { return -1 }
    if let frozenMs { return frozenMs }
    let now = mach_absolute_time()
    return now <= startHost ? 0 : Self.ms(ticks: now - startHost)
  }

  // MARK: Loading

  func preload(_ sounds: [String: String]) -> [String: Double] {
    queue.sync {
      var lengths: [String: Double] = [:]
      for (id, uri) in sounds {
        // One unreadable file skips that sound only; its cue falls back to a tone or haptic.
        if buffers[id] == nil { buffers[id] = try? load(uri) }
        if let buffer = buffers[id] { lengths[id] = Double(buffer.frameLength) / Self.sampleRate * 1000 }
      }
      return lengths
    }
  }

  private func load(_ uri: String) throws -> AVAudioPCMBuffer {
    let url = uri.hasPrefix("/") ? URL(fileURLWithPath: uri) : URL(string: uri)
    guard let url, let file = try? AVAudioFile(forReading: url),
      let buffer = AVAudioPCMBuffer(pcmFormat: file.processingFormat, frameCapacity: AVAudioFrameCount(file.length))
    else { throw GuideError.unreadable(uri) }
    try file.read(into: buffer)
    return buffer.format == format ? buffer : try convert(buffer, uri: uri)
  }

  private func convert(_ input: AVAudioPCMBuffer, uri: String) throws -> AVAudioPCMBuffer {
    let ratio = format.sampleRate / input.format.sampleRate
    guard let converter = AVAudioConverter(from: input.format, to: format),
      let output = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(Double(input.frameLength) * ratio) + 1024)
    else { throw GuideError.unreadable(uri) }
    var consumed = false
    var error: NSError?
    converter.convert(to: output, error: &error) { _, status in
      if consumed {
        status.pointee = .endOfStream
        return nil
      }
      consumed = true
      status.pointee = .haveData
      return input
    }
    if error != nil { throw GuideError.unreadable(uri) }
    return output
  }

  // MARK: Segment lifecycle

  func start(cues: [GuideCue], endMs: Double, volume: Float, mixWithOthers: Bool, title: String, subtitle: String) throws {
    try queue.sync {
      for cue in cues where cue.sound != nil && buffers[cue.sound!] == nil {
        throw GuideError.unknownSound(cue.sound!)
      }
      try activateSession(mixWithOthers: mixWithOthers)
      bumpGeneration()
      finishing = false
      try startEngine()
      self.cues = cues.sorted { $0.atMs < $1.atMs }
      self.nextCue = 0
      self.endMs = endMs
      self.volume = volume
      voices.forEach { $0.volume = volume }
      clockLock.lock()
      // A short lead lets the first cue be scheduled ahead of its time.
      startHost = mach_absolute_time() + Self.ticks(ms: 60)
      frozenMs = nil
      active = true
      clockLock.unlock()
      scheduleWindow()
      startTimer()
      observeSession()
      enableRemoteCommands()
      nowPlaying = (title, subtitle)
      publishNowPlaying()
    }
  }

  /// Freezes the clock and drops every pending cue. Returns the position.
  func pause() -> Double {
    queue.sync { pauseOnQueue() }
  }

  private func pauseOnQueue() -> Double {
    let position = positionMs()
    guard position >= 0 else { return -1 }
    clockLock.lock()
    frozenMs = position
    generation += 1
    clockLock.unlock()
    resetVoices()
    publishNowPlaying()
    return position
  }

  /// Lets already-scheduled audio (the completion cue) play, then releases.
  func finish() {
    queue.sync {
      let position = positionMs()
      guard position >= 0 else { return }
      endMs = min(endMs, position)
      finishing = true
    }
  }

  func stop() {
    queue.sync { stopOnQueue() }
  }

  private func stopOnQueue() {
    clockLock.lock()
    generation += 1
    active = false
    frozenMs = nil
    clockLock.unlock()
    timer?.cancel()
    timer = nil
    cues = []
    voices.forEach { $0.stop() }
    once.stop()
    keepAlive.stop()
    engine.stop()
    observers.forEach(NotificationCenter.default.removeObserver)
    observers = []
    disableRemoteCommands()
    DispatchQueue.main.async { MPNowPlayingInfoCenter.default().nowPlayingInfo = nil }
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
  }

  func setVolume(_ value: Float) {
    queue.sync {
      volume = value
      voices.forEach { $0.volume = value }
    }
  }

  func setNowPlaying(title: String, subtitle: String) {
    queue.async {
      self.nowPlaying = (title, subtitle)
      self.publishNowPlaying()
    }
  }

  /// A single sound outside a practice: “Hear it” and “Hear a sample”.
  func playOnce(_ sound: String, volume: Float) throws {
    try queue.sync {
      guard let buffer = buffers[sound] else { throw GuideError.unknownSound(sound) }
      if !active { try activateSession(mixWithOthers: true) }
      try startEngine()
      once.stop()
      once.volume = volume
      onceToken += 1
      let token = onceToken
      once.scheduleBuffer(buffer, at: nil, options: []) { [weak self] in
        self?.queue.asyncAfter(deadline: .now() + 0.2) {
          guard let self, !self.active, self.onceToken == token else { return }
          self.stopOnQueue()
        }
      }
      once.play()
    }
  }

  // MARK: Engine

  private func activateSession(mixWithOthers: Bool) throws {
    let session = AVAudioSession.sharedInstance()
    // .playback plays with the silent switch on: a breathing guide that goes
    // mute is a broken guide (the prototype's locked decision, kept).
    try session.setCategory(.playback, mode: .default, options: mixWithOthers ? [.mixWithOthers] : [])
    try session.setActive(true)
  }

  private func startEngine() throws {
    if !graphReady {
      for node in voices + [once, keepAlive] {
        engine.attach(node)
        engine.connect(node, to: engine.mainMixerNode, format: format)
      }
      graphReady = true
    }
    if !engine.isRunning {
      engine.prepare()
      try engine.start()
    }
    if !keepAlive.isPlaying {
      let frames = AVAudioFrameCount(Self.sampleRate / 10)
      if let silence = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frames) {
        silence.frameLength = frames
        memset(silence.floatChannelData![0], 0, Int(frames) * MemoryLayout<Float>.size)
        keepAlive.scheduleBuffer(silence, at: nil, options: .loops)
      }
      keepAlive.play()
    }
    voices.forEach { if !$0.isPlaying { $0.play() } }
  }

  /// Rebuilds the graph after the media services reset.
  private func rebuildGraph() {
    engine.stop()
    engine = AVAudioEngine()
    voices = [AVAudioPlayerNode(), AVAudioPlayerNode()]
    once = AVAudioPlayerNode()
    keepAlive = AVAudioPlayerNode()
    graphReady = false
  }

  private func resetVoices() {
    voices.forEach {
      $0.stop()
      if engine.isRunning { $0.play() }
    }
  }

  // MARK: Scheduling

  private var isRunningSegment: Bool {
    positionMs() >= 0 && frozenMs == nil
  }

  private func scheduleWindow() {
    guard isRunningSegment else { return }
    let now = positionMs()
    while nextCue < cues.count, cues[nextCue].atMs < now + Self.window {
      let cue = cues[nextCue]
      let host = startHost + Self.ticks(ms: cue.atMs)
      if cue.atMs >= now - 50 {
        if let sound = cue.sound, let buffer = buffers[sound] {
          voices[nextCue % voices.count].scheduleBuffer(buffer, at: AVAudioTime(hostTime: host), options: [], completionHandler: nil)
        }
        scheduleHaptic(cue.haptic, host: host)
        if let text = cue.nowPlaying { scheduleNowPlaying(text, host: host) }
      }
      nextCue += 1
    }
  }

  private func scheduleHaptic(_ level: Int, host: UInt64) {
    guard level > 0 else { return }
    let expected = generation
    let deadline = DispatchTime(uptimeNanoseconds: UInt64(Self.ms(ticks: host) * 1_000_000))
    // iOS only allows haptics in the foreground; locked practice relies on audio.
    DispatchQueue.main.asyncAfter(deadline: deadline) { [weak self] in
      guard let self, UIApplication.shared.applicationState == .active else { return }
      guard self.locked({ self.generation }) == expected else { return }
      let style: UIImpactFeedbackGenerator.FeedbackStyle = level == 1 ? .light : level == 2 ? .medium : .heavy
      UIImpactFeedbackGenerator(style: style).impactOccurred()
    }
  }

  private func scheduleNowPlaying(_ subtitle: String, host: UInt64) {
    let expected = generation
    let deadline = DispatchTime(uptimeNanoseconds: UInt64(Self.ms(ticks: host) * 1_000_000))
    queue.asyncAfter(deadline: deadline) { [weak self] in
      guard let self, self.generation == expected else { return }
      self.nowPlaying.subtitle = subtitle
      self.publishNowPlaying()
    }
  }

  private func startTimer() {
    timer?.cancel()
    let timer = DispatchSource.makeTimerSource(queue: queue)
    timer.schedule(deadline: .now(), repeating: .milliseconds(500))
    timer.setEventHandler { [weak self] in self?.tick() }
    timer.resume()
    self.timer = timer
  }

  private func tick() {
    scheduleWindow()
    if isRunningSegment, positionMs() >= endMs + Self.releaseAfterEndMs {
      stopOnQueue()
      emit?("onSegmentEnded", [:])
    }
  }

  // MARK: Interruptions (FR-04)

  private func observeSession() {
    guard observers.isEmpty else { return }
    let center = NotificationCenter.default
    let session = AVAudioSession.sharedInstance()
    observers = [
      center.addObserver(forName: AVAudioSession.interruptionNotification, object: session, queue: nil) { [weak self] note in
        self?.queue.async { self?.handleInterruption(note) }
      },
      center.addObserver(forName: AVAudioSession.routeChangeNotification, object: session, queue: nil) { [weak self] note in
        self?.queue.async { self?.handleRouteChange(note) }
      },
      center.addObserver(forName: AVAudioSession.mediaServicesWereResetNotification, object: session, queue: nil) { [weak self] _ in
        self?.queue.async { self?.handleReset() }
      },
      center.addObserver(forName: .AVAudioEngineConfigurationChange, object: nil, queue: nil) { [weak self] _ in
        self?.queue.async { self?.handleConfigurationChange() }
      },
    ]
  }

  private func interrupt(_ reason: String) {
    guard isRunningSegment else { return }
    if finishing {
      stopOnQueue()
      return
    }
    let position = pauseOnQueue()
    emit?("onInterruption", ["reason": reason, "positionMs": position])
  }

  private func handleInterruption(_ note: Notification) {
    guard let info = note.userInfo,
      let raw = info[AVAudioSessionInterruptionTypeKey] as? UInt,
      AVAudioSession.InterruptionType(rawValue: raw) == .began
    else { return }
    // Calls (including VoIP through CallKit) are named; Siri, alarms, and
    // other apps' audio share the general reason.
    interrupt(callObserver.calls.contains { !$0.hasEnded } ? "call" : "audio")
  }

  private func handleRouteChange(_ note: Notification) {
    guard let raw = note.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt,
      AVAudioSession.RouteChangeReason(rawValue: raw) == .oldDeviceUnavailable
    else { return }
    interrupt("headphones")
  }

  private func handleReset() {
    interrupt("audio")
    rebuildGraph()
  }

  /// The output changed (for example headphones connected). Restart and
  /// re-schedule the cues that haven't played yet on the same clock.
  private func handleConfigurationChange() {
    guard isRunningSegment else { return }
    bumpGeneration()
    // Drop anything still queued so re-scheduling can't play a cue twice.
    voices.forEach { $0.stop() }
    keepAlive.stop()
    do {
      try startEngine()
    } catch {
      interrupt("audio")
      return
    }
    let now = positionMs()
    nextCue = cues.firstIndex { $0.atMs >= now } ?? cues.count
    scheduleWindow()
  }

  // MARK: Lock screen

  private func enableRemoteCommands() {
    guard remoteTargets.isEmpty else { return }
    let center = MPRemoteCommandCenter.shared()
    let send: (String) -> MPRemoteCommandHandlerStatus = { [weak self] command in
      self?.emit?("onRemoteCommand", ["command": command])
      return .success
    }
    remoteTargets = [
      (center.pauseCommand, center.pauseCommand.addTarget { _ in send("pause") }),
      (center.playCommand, center.playCommand.addTarget { _ in send("play") }),
      (
        center.togglePlayPauseCommand,
        center.togglePlayPauseCommand.addTarget { [weak self] _ in
          send(self?.locked { self?.frozenMs != nil } == true ? "play" : "pause")
        }
      ),
    ]
    remoteTargets.forEach { $0.0.isEnabled = true }
  }

  private func disableRemoteCommands() {
    remoteTargets.forEach { command, target in command.removeTarget(target) }
    remoteTargets = []
  }

  private func publishNowPlaying() {
    let info: [String: Any] = [
      MPMediaItemPropertyTitle: nowPlaying.title,
      MPMediaItemPropertyArtist: nowPlaying.subtitle,
      MPNowPlayingInfoPropertyIsLiveStream: true,
      MPNowPlayingInfoPropertyPlaybackRate: frozenMs == nil ? 1.0 : 0.0,
    ]
    DispatchQueue.main.async { MPNowPlayingInfoCenter.default().nowPlayingInfo = info }
  }
}
