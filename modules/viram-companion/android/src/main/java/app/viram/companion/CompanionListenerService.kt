package app.viram.companion

import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.Wearable
import com.google.android.gms.wearable.WearableListenerService

/**
 * Takes each session the watch put in the Data Layer, keeps it for JS, and
 * deletes the data item so the Data Layer doesn't grow.
 */
class CompanionListenerService : WearableListenerService() {
  override fun onDataChanged(events: DataEventBuffer) {
    for (event in events) {
      if (event.type != DataEvent.TYPE_CHANGED) continue
      val item = event.dataItem
      if (item.uri.path?.startsWith(CompanionStore.SESSION_PREFIX) != true) continue
      val json = DataMapItem.fromDataItem(item).dataMap.getString(CompanionStore.KEY_JSON) ?: continue
      // Small and bounded: a session is a few hundred bytes.
      if (json.length < 16_384) CompanionStore.keep(applicationContext, json)
      Wearable.getDataClient(this).deleteDataItems(item.uri)
    }
  }
}
