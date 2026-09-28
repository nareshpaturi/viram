import ExpoModulesCore
import HealthKit

/**
 * Apple Health session writing (PRD FR-18). Write-only: Viram asks to
 * share mindful sessions and never asks to read anything. Each local
 * practice carries a sync identifier, so writing it again never adds a
 * second session.
 */
public class ViramHealthModule: Module {
  private let store = HKHealthStore()
  private let mindful = HKObjectType.categoryType(forIdentifier: .mindfulSession)!

  public func definition() -> ModuleDefinition {
    Name("ViramHealth")

    /// "available", "unavailable" (no HealthKit, e.g. iPad restrictions or managed devices).
    Function("availability") { () -> String in
      HKHealthStore.isHealthDataAvailable() ? "available" : "unavailable"
    }

    /// Write access only: "notDetermined", "denied", or "authorized".
    Function("authorization") { () -> String in
      self.status()
    }

    AsyncFunction("requestAuthorization") { (promise: Promise) in
      guard HKHealthStore.isHealthDataAvailable() else { return promise.resolve("unavailable") }
      self.store.requestAuthorization(toShare: [self.mindful], read: nil) { _, _ in
        promise.resolve(self.status())
      }
    }

    /// Resolves "written" only after HealthKit confirms the save.
    AsyncFunction("writeSession") { (id: String, startMs: Double, endMs: Double, promise: Promise) in
      guard HKHealthStore.isHealthDataAvailable() else { return promise.resolve("unavailable") }
      guard self.status() == "authorized" else { return promise.resolve("declined") }
      let sample = HKCategorySample(
        type: self.mindful,
        value: HKCategoryValue.notApplicable.rawValue,
        start: Date(timeIntervalSince1970: startMs / 1000),
        end: Date(timeIntervalSince1970: endMs / 1000),
        metadata: [
          HKMetadataKeySyncIdentifier: "viram.session.\(id)",
          HKMetadataKeySyncVersion: 1,
          HKMetadataKeyExternalUUID: id,
        ]
      )
      self.store.save(sample) { success, _ in
        promise.resolve(success ? "written" : "failed")
      }
    }
  }

  private func status() -> String {
    guard HKHealthStore.isHealthDataAvailable() else { return "unavailable" }
    switch store.authorizationStatus(for: mindful) {
    case .sharingAuthorized: return "authorized"
    case .sharingDenied: return "denied"
    default: return "notDetermined"
    }
  }
}
