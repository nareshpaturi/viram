import ExpoModulesCore

/// The JS face of CompanionLink (modules/viram-companion/index.ts).
public class ViramCompanionModule: Module {
  private var observer: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("ViramCompanion")

    Events("onSessions")

    OnCreate {
      CompanionLink.shared.activate()
    }

    OnStartObserving {
      self.observer = NotificationCenter.default.addObserver(forName: CompanionLink.sessionsChanged, object: nil, queue: .main) { [weak self] _ in
        self?.sendEvent("onSessions", [:])
      }
    }

    OnStopObserving {
      if let observer = self.observer { NotificationCenter.default.removeObserver(observer) }
      self.observer = nil
    }

    AsyncFunction("watchState") { () -> String in
      CompanionLink.shared.state
    }

    AsyncFunction("sendContext") { (json: String) in
      try CompanionLink.shared.send(context: json)
    }

    Function("pendingSessions") { () -> [String] in
      CompanionLink.shared.pending()
    }

    Function("acknowledge") { (ids: [String]) in
      CompanionLink.shared.acknowledge(ids)
    }
  }
}
