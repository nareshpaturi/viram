import ExpoModulesCore
import WidgetKit

/// Shares the widget's JSON with targets/widget through the app group, then reloads it.
public class ViramWidgetModule: Module {
  static let appGroup = "group.app.viram"
  static let key = "widget"

  public func definition() -> ModuleDefinition {
    Name("ViramWidget")

    Function("setWidget") { (json: String) in
      guard let defaults = UserDefaults(suiteName: ViramWidgetModule.appGroup) else { return }
      if defaults.string(forKey: ViramWidgetModule.key) == json { return }
      defaults.set(json, forKey: ViramWidgetModule.key)
      WidgetCenter.shared.reloadAllTimelines()
    }
  }
}
