import ExpoModulesCore
import UIKit

/// Activates the watch link at launch, before JS, so queued sessions arrive.
public class CompanionAppDelegate: ExpoAppDelegateSubscriber {
  public func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
    CompanionLink.shared.activate()
    return true
  }
}
