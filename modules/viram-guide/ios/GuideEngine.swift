import AVFoundation
import CallKit
import MediaPlayer
import UIKit

struct GuideCue {
  let atMs: Double
  let sound: String?
  let haptic: Int
  /// The step's haptic pattern as [atMs, ms, amplitude, …]; empty plays `haptic` as one tap.
  var pulses: [Double] = []
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
/// the app) alive in the background between cues, and an optional music bed
/// loops under them. Cues are scheduled on host time since the segment
/// started; the position JS reads is that clock less the output's latency, so
/// the screen changes step when the cue is heard.
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
  /// Created on the main thread with the engine; used only there.
  private let haptics = PhaseHaptics()

  private var engine = AVAudioEngine()
  private var voices = [AVAudioPlayerNode(), AVAudioPlayerNode()]
  private var once = AVAudioPlayerNode()
  private var keepAlive = AVAudioPlayerNode()
  private var bed = AVAudioPlayerNode()
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
  /// How far behind the scheduling clock the sound is heard: about 5–20 ms on
  /// the speaker, 150–250 ms over Bluetooth. Read under clockLock.
  private var outputLatencyMs = 0.0
  /// The looping music bed, and the level it is heading to.
  private var bedSound: String?
  private var bedLevel: Float = 0
  private var bedFade: DispatchSourceTimer?
  /// Bumped whenever scheduled work must be abandoned (pause, stop, restart).
  /// Written on `queue` under clockLock, so the main thread can read it without waiting on `queue`.
  private var generation = 0
  /// Set by finish(): an interruption in the ring-out releases instead of pausing.
  private var finishing = false
  /// Identifies the current one-shot sound, so a replaced one can't stop the new one.
  private var onceToken = 0
  /// Developer timing log: report when each cue actually played out.
  var timingLog = false
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
    // A pattern still running (taps through a long exhale) ends with its segment.
    DispatchQueue.main.async { [haptics] in haptics.stop() }
  }

  private func locked<T>(_ read: () -> T) -> T {
    clockLock.lock()
    defer { clockLock.unlock() }
    return read()
  }

  /// The scheduling clock: host time since the segment started, or the frozen position.
  private func clockMs() -> Double {
    clockLock.lock()
    defer { clockLock.unlock() }
    guard active else { return -1 }
    if let frozenMs { return frozenMs }
    let now = mach_absolute_time()
    return now <= startHost ? 0 : Self.ms(ticks: now - startHost)
  }

  /// What has been heard so far: the clock less the output's presentation
  /// latency, as Apple's HelloMetronome sample times its visual beat.
  /// A paused position is already what was heard.
  func positionMs() -> Double {
    let clock = clockMs()
    return locked { clock > 0 && frozenMs == nil ? max(0, clock - outputLatencyMs) : clock }
  }

  private func measureOutputLatency() {
    let latency = engine.outputNode.presentationLatency * 1000
    clockLock.lock()
    outputLatencyMs = latency.isFinite ? max(0, latency) : 0
    clockLock.unlock()
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

  func start(
    cues: [GuideCue], endMs: Double, volume: Float, mixWithOthers: Bool, title: String, subtitle: String, bed: String?, bedVolume: Float
  ) throws {
    try queue.sync {
      for cue in cues where cue.sound != nil && buffers[cue.sound!] == nil {
        throw GuideError.unknownSound(cue.sound!)
      }
      try activateSession(mixWithOthers: mixWithOthers)
      bumpGeneration()
      finishing = false
      try startEngine()
      measureOutputLatency()
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
      // With Play along, the bed stays quiet while another app's music plays.
      let othersPlaying = mixWithOthers && AVAudioSession.sharedInstance().isOtherAudioPlaying
      startBed(othersPlaying ? nil : bed, volume: bedVolume)
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
    bedLevel = 0
    fadeBed(to: 0, seconds: 1.2)
    publishNowPlaying()
    return position
  }

  /// Lets already-scheduled audio (the completion cue) play, then releases.
  func finish() {
    queue.sync {
      let position = clockMs()
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
    bedFade?.cancel()
    bedFade = nil
    bed.stop()
    bedSound = nil
    bedLevel = 0
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

  /// A single sound outside a practice: “Hear it” and “Hear a sample”. With
  /// `maxMs`, only the start plays, fading in and out: a music bed's preview.
  func playOnce(_ sound: String, volume: Float, maxMs: Double?) throws {
    try queue.sync {
      guard let full = buffers[sound] else { throw GuideError.unknownSound(sound) }
      let buffer = maxMs.flatMap { excerpt(full, ms: $0) } ?? full
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

  private func excerpt(_ buffer: AVAudioPCMBuffer, ms: Double) -> AVAudioPCMBuffer? {
    let frames = Int(min(Double(buffer.frameLength), ms / 1000 * Self.sampleRate))
    guard frames > 0, frames < Int(buffer.frameLength),
      let out = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(frames))
    else { return nil }
    out.frameLength = AVAudioFrameCount(frames)
    let fadeIn = Int(Self.sampleRate * 0.3)
    let fadeOut = min(frames, Int(Self.sampleRate * 1.5))
    let source = buffer.floatChannelData![0]
    let target = out.floatChannelData![0]
    for i in 0..<frames {
      target[i] = source[i] * min(1, Float(i) / Float(fadeIn), Float(frames - i) / Float(fadeOut))
    }
    return out
  }

  // MARK: Music bed

  /// Loops the bed under the segment and fades it in. The same bed carries on
  /// across segments (introduction, settle, resume) without restarting.
  private func startBed(_ sound: String?, volume: Float) {
    guard let sound, let buffer = buffers[sound] else {
      bedLevel = 0
      fadeBed(to: 0, seconds: 1.2)
      return
    }
    if bedSound != sound || !bed.isPlaying {
      bed.stop()
      bed.volume = 0
      bed.scheduleBuffer(buffer, at: nil, options: .loops)
      bed.play()
      bedSound = sound
    }
    bedLevel = volume
    fadeBed(to: volume, seconds: 3)
  }

  /// Ramps the bed's volume in small steps on the guide's queue.
  private func fadeBed(to target: Float, seconds: Double) {
    bedFade?.cancel()
    let start = bed.volume
    let steps = max(1, Int(seconds / 0.03))
    var step = 0
    let fade = DispatchSource.makeTimerSource(queue: queue)
    fade.schedule(deadline: .now(), repeating: .milliseconds(30))
    // A newer fade cancels this one first, so bedFade is always this fade here.
    fade.setEventHandler { [weak self] in
      guard let self else { return }
      step += 1
      self.bed.volume = start + (target - start) * min(1, Float(step) / Float(steps))
      if step >= steps {
        self.bedFade?.cancel()
        self.bedFade = nil
      }
    }
    fade.resume()
    bedFade = fade
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
      for node in voices + [once, keepAlive, bed] {
        engine.attach(node)
        engine.connect(node, to: engine.mainMixerNode, format: format)
      }
      graphReady = true
    }
    if !engine.isRunning {
      engine.prepare()
      try engine.start()
      // A stopped engine (an interruption, a route change) drops the bed's loop.
      bed.stop()
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
    bed = AVAudioPlayerNode()
    bedSound = nil
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
    clockMs() >= 0 && frozenMs == nil
  }

  private func scheduleWindow() {
    guard isRunningSegment else { return }
    let now = clockMs()
    while nextCue < cues.count, cues[nextCue].atMs < now + Self.window {
      let cue = cues[nextCue]
      let host = startHost + Self.ticks(ms: cue.atMs)
      if cue.atMs >= now - 50 {
        if let sound = cue.sound, let buffer = buffers[sound] {
          let node = voices[nextCue % voices.count]
          let at = AVAudioTime(hostTime: host)
          if timingLog {
            node.scheduleBuffer(
              buffer, at: at, options: [], completionCallbackType: .dataPlayedBack,
              completionHandler: timingHandler(cue: cue, sound: sound, buffer: buffer))
          } else {
            node.scheduleBuffer(buffer, at: at, options: [], completionHandler: nil)
          }
        }
        scheduleHaptic(cue, host: host)
        if let text = cue.nowPlaying { scheduleNowPlaying(text, host: host) }
      }
      nextCue += 1
    }
  }

  /// When the buffer has played out, its start is now minus its length; drift
  /// is that start against the cue's planned time on the segment clock.
  private func timingHandler(cue: GuideCue, sound: String, buffer: AVAudioPCMBuffer) -> AVAudioPlayerNodeCompletionHandler {
    let expected = generation
    let segmentStart = startHost
    let lengthMs = Double(buffer.frameLength) / Self.sampleRate * 1000
    return { [weak self] _ in
      let now = mach_absolute_time()
      guard let self, self.locked({ self.generation }) == expected, now > segmentStart else { return }
      let startedMs = Self.ms(ticks: now - segmentStart) - lengthMs
      self.emit?("onCueTiming", ["atMs": cue.atMs, "driftMs": startedMs - cue.atMs, "sound": sound])
    }
  }

  private func scheduleHaptic(_ cue: GuideCue, host: UInt64) {
    guard cue.haptic > 0 || !cue.pulses.isEmpty else { return }
    let expected = generation
    let deadline = DispatchTime(uptimeNanoseconds: UInt64(Self.ms(ticks: host) * 1_000_000))
    // iOS only allows haptics in the foreground; locked practice relies on audio.
    DispatchQueue.main.asyncAfter(deadline: deadline) { [weak self] in
      guard let self, UIApplication.shared.applicationState == .active else { return }
      guard self.locked({ self.generation }) == expected else { return }
      if cue.pulses.isEmpty { self.haptics.impact(cue.haptic) } else { self.haptics.play(cue.pulses, fallbackLevel: cue.haptic) }
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
    // The bed fades out under the completion cue.
    if isRunningSegment, bedLevel > 0, clockMs() >= endMs {
      bedLevel = 0
      fadeBed(to: 0, seconds: 2.5)
    }
    if isRunningSegment, clockMs() >= endMs + Self.releaseAfterEndMs {
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
  /// re-schedule the cues that haven't played yet on the same clock, with the
  /// new output's latency.
  private func handleConfigurationChange() {
    guard isRunningSegment else { return }
    bumpGeneration()
    // Drop anything still queued so re-scheduling can't play a cue twice.
    voices.forEach { $0.stop() }
    keepAlive.stop()
    bed.stop()
    do {
      try startEngine()
    } catch {
      interrupt("audio")
      return
    }
    measureOutputLatency()
    let now = clockMs()
    nextCue = cues.firstIndex { $0.atMs >= now } ?? cues.count
    scheduleWindow()
    if let sound = bedSound, bedLevel > 0 { startBed(sound, volume: bedLevel) }
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
