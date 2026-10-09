import Foundation
import WatchConnectivity

/**
 * Owns the WatchConnectivity session for the app's lifetime. Activated at
 * launch (CompanionAppDelegate) so sessions the watch queued are delivered
 * even when JS isn't running yet; each is kept in UserDefaults until JS
 * acknowledges it.
 */
final class CompanionLink: NSObject, WCSessionDelegate {
  static let shared = CompanionLink()
  static let sessionsChanged = Notification.Name("ViramCompanionSessionsChanged")

  private let storeKey = "viram.companion.pendingSessions"
  private let lock = NSLock()

  func activate() {
    guard WCSession.isSupported(), WCSession.default.delegate == nil else { return }
    WCSession.default.delegate = self
    WCSession.default.activate()
  }

  var state: String {
    guard WCSession.isSupported(), WCSession.default.activationState == .activated else { return "none" }
    if !WCSession.default.isPaired { return "none" }
    return WCSession.default.isWatchAppInstalled ? "installed" : "paired"
  }

  /// False when there's nothing to send to yet, so the caller tries again later.
  func send(context json: String) throws -> Bool {
    guard WCSession.isSupported(), WCSession.default.activationState == .activated, WCSession.default.isPaired else { return false }
    try WCSession.default.updateApplicationContext(["context": json])
    return true
  }

  // MARK: Pending sessions

  func pending() -> [String] {
    lock.lock()
    defer { lock.unlock() }
    return UserDefaults.standard.stringArray(forKey: storeKey) ?? []
  }

  func acknowledge(_ ids: [String]) {
    lock.lock()
    defer { lock.unlock() }
    let remove = Set(ids.map { $0.lowercased() })
    let kept = (UserDefaults.standard.stringArray(forKey: storeKey) ?? []).filter { json in
      guard let id = CompanionLink.id(of: json) else { return false }
      return !remove.contains(id.lowercased())
    }
    UserDefaults.standard.set(kept, forKey: storeKey)
  }

  private func keep(_ json: String) {
    lock.lock()
    var all = UserDefaults.standard.stringArray(forKey: storeKey) ?? []
    // A resent session replaces nothing and is kept once.
    if let id = CompanionLink.id(of: json), !all.contains(where: { CompanionLink.id(of: $0) == id }) {
      all.append(json)
      // A watch can't flood the phone: keep the most recent 200.
      UserDefaults.standard.set(Array(all.suffix(200)), forKey: storeKey)
    }
    lock.unlock()
    NotificationCenter.default.post(name: CompanionLink.sessionsChanged, object: nil)
  }

  private static func id(of json: String) -> String? {
    guard let data = json.data(using: .utf8), let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
    return object["id"] as? String
  }

  // MARK: WCSessionDelegate

  func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {}
  func sessionDidBecomeInactive(_ session: WCSession) {}
  func sessionDidDeactivate(_ session: WCSession) {
    // A different watch was paired; carry on with it.
    WCSession.default.activate()
  }

  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
    // Small and bounded: a session is a few hundred bytes.
    guard let json = userInfo["session"] as? String, json.utf8.count < 16_384 else { return }
    keep(json)
  }
}
