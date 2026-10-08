import Foundation
import WatchConnectivity

/**
 * The link to Viram on the iPhone. The phone sends its practices and haptic
 * settings as the application context (the latest replaces the last, and it
 * arrives even if this app wasn't running); finished practices go back with
 * transferUserInfo, which queues until the phone can take them.
 */
@MainActor
final class Connectivity: NSObject, ObservableObject {
  static let shared = Connectivity()

  @Published private(set) var context: CompanionContext?

  private let storeKey = "viram.companionContext"

  override init() {
    super.init()
    if let data = UserDefaults.standard.data(forKey: storeKey) {
      context = try? JSONDecoder().decode(CompanionContext.self, from: data)
    }
  }

  func activate() {
    guard WCSession.isSupported() else { return }
    WCSession.default.delegate = self
    WCSession.default.activate()
  }

  var haptics: HapticSettings { context?.haptics ?? .standard }

  func send(_ session: WatchSession) {
    guard WCSession.isSupported(), let data = try? JSONEncoder().encode(session), let json = String(data: data, encoding: .utf8) else { return }
    WCSession.default.transferUserInfo(["session": json])
  }

  fileprivate func apply(_ payload: [String: Any]) {
    guard let json = payload["context"] as? String, let data = json.data(using: .utf8) else { return }
    guard let decoded = try? JSONDecoder().decode(CompanionContext.self, from: data), decoded.v == 1 else { return }
    context = decoded
    UserDefaults.standard.set(data, forKey: storeKey)
  }
}

extension Connectivity: WCSessionDelegate {
  nonisolated func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {
    let payload = session.receivedApplicationContext
    Task { @MainActor in self.apply(payload) }
  }

  nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    Task { @MainActor in self.apply(applicationContext) }
  }
}
