package app.viram.health

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.HealthConnectFeatures
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.feature.ExperimentalMindfulnessSessionApi
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.MindfulnessSessionRecord
import androidx.health.connect.client.records.metadata.Device
import androidx.health.connect.client.records.metadata.Metadata
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.ZoneId

private const val REQUEST_CODE = 0x5641 // "VA"

/**
 * Health Connect session writing (PRD FR-18). Write-only: Viram requests the
 * mindfulness write permission and nothing else. Each local practice is its
 * record's client ID, so writing it again updates rather than duplicates.
 */
@OptIn(ExperimentalMindfulnessSessionApi::class)
class ViramHealthModule : Module() {
  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
  private val permission = HealthPermission.getWritePermission(MindfulnessSessionRecord::class)
  private var pending: Promise? = null

  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("No context")

  /** "available", "needsUpdate" (Health Connect must be installed or updated), or "unavailable". */
  private fun availability(): String {
    val sdk = HealthConnectClient.getSdkStatus(context)
    if (sdk == HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return "needsUpdate"
    if (sdk != HealthConnectClient.SDK_AVAILABLE) return "unavailable"
    val client = HealthConnectClient.getOrCreate(context)
    val feature = client.features.getFeatureStatus(HealthConnectFeatures.FEATURE_MINDFULNESS_SESSION)
    return if (feature == HealthConnectFeatures.FEATURE_STATUS_AVAILABLE) "available" else "unavailable"
  }

  private suspend fun status(): String {
    if (availability() != "available") return "unavailable"
    val granted = HealthConnectClient.getOrCreate(context).permissionController.getGrantedPermissions()
    return if (permission in granted) "authorized" else "notDetermined"
  }

  override fun definition() = ModuleDefinition {
    Name("ViramHealth")

    Function("availability") { availability() }

    AsyncFunction("authorization") { promise: Promise ->
      scope.launch { promise.resolve(runCatching { status() }.getOrDefault("unavailable")) }
    }

    AsyncFunction("requestAuthorization") { promise: Promise ->
      scope.launch {
        val current = runCatching { status() }.getOrDefault("unavailable")
        val activity = appContext.currentActivity
        if (current != "notDetermined" || activity == null) return@launch promise.resolve(current)
        val intent = PermissionController.createRequestPermissionResultContract().createIntent(activity, setOf(permission))
        pending?.resolve("notDetermined")
        pending = promise
        activity.startActivityForResult(intent, REQUEST_CODE)
      }
    }

    OnActivityResult { _, payload ->
      if (payload.requestCode != REQUEST_CODE) return@OnActivityResult
      val promise = pending ?: return@OnActivityResult
      pending = null
      // Health Connect doesn't distinguish "not now" from "don't allow"; both read as denied here.
      scope.launch { promise.resolve(if (runCatching { status() }.getOrDefault("unavailable") == "authorized") "authorized" else "denied") }
    }

    /** Resolves "written" only after Health Connect confirms the insert. */
    AsyncFunction("writeSession") { id: String, startMs: Double, endMs: Double, promise: Promise ->
      scope.launch {
        val result = runCatching {
          when (status()) {
            "unavailable" -> "unavailable"
            "authorized" -> {
              val start = Instant.ofEpochMilli(startMs.toLong())
              val end = Instant.ofEpochMilli(endMs.toLong())
              val zone = ZoneId.systemDefault().rules
              val record = MindfulnessSessionRecord(
                startTime = start,
                startZoneOffset = zone.getOffset(start),
                endTime = end,
                endZoneOffset = zone.getOffset(end),
                metadata = Metadata.activelyRecorded(Device(type = Device.TYPE_PHONE), "viram.session.$id", 1),
                mindfulnessSessionType = MindfulnessSessionRecord.MINDFULNESS_SESSION_TYPE_BREATHING,
                title = null,
                notes = null,
              )
              HealthConnectClient.getOrCreate(context).insertRecords(listOf(record))
              "written"
            }
            else -> "declined"
          }
        }.getOrDefault("failed")
        promise.resolve(result)
      }
    }

    OnDestroy {
      pending?.resolve("notDetermined")
      pending = null
      scope.cancel()
    }
  }
}
