package app.viram.companion

import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.gms.wearable.CapabilityClient
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** The JS face of the Wear OS link (modules/viram-companion/index.ts). */
class ViramCompanionModule : Module() {
  private val context
    get() = requireNotNull(appContext.reactContext) { "No context" }

  private fun playServices(): Boolean =
    GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(context) == ConnectionResult.SUCCESS

  override fun definition() = ModuleDefinition {
    Name("ViramCompanion")

    Events("onSessions")

    OnStartObserving {
      CompanionStore.onChange = { sendEvent("onSessions", emptyMap<String, Any>()) }
    }

    OnStopObserving {
      CompanionStore.onChange = null
    }

    AsyncFunction("watchState") { promise: Promise ->
      if (!playServices()) return@AsyncFunction promise.resolve("none")
      Wearable.getCapabilityClient(context)
        .getCapability(CompanionStore.WEAR_CAPABILITY, CapabilityClient.FILTER_ALL)
        .addOnSuccessListener { info ->
          if (info.nodes.isNotEmpty()) return@addOnSuccessListener promise.resolve("installed")
          Wearable.getNodeClient(context).connectedNodes
            .addOnSuccessListener { nodes -> promise.resolve(if (nodes.isEmpty()) "none" else "paired") }
            .addOnFailureListener { promise.resolve("none") }
        }
        .addOnFailureListener { promise.resolve("none") }
    }

    AsyncFunction("sendContext") { json: String, promise: Promise ->
      if (!playServices()) return@AsyncFunction promise.resolve(false)
      val request = PutDataMapRequest.create(CompanionStore.CONTEXT_PATH).apply {
        dataMap.putString(CompanionStore.KEY_JSON, json)
        // A changed item is what the watch hears about; the same JSON twice is a no-op.
      }.asPutDataRequest().setUrgent()
      Wearable.getDataClient(context).putDataItem(request)
        .addOnSuccessListener { promise.resolve(true) }
        // No watch, or the Data Layer is unavailable: tried again next time.
        .addOnFailureListener { promise.resolve(false) }
    }

    Function("pendingSessions") {
      CompanionStore.pending(context)
    }

    Function("acknowledge") { ids: List<String> ->
      CompanionStore.acknowledge(context, ids)
    }
  }
}
