package app.viram.wear

import android.content.Context
import android.net.Uri
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable

/**
 * The Data Layer link to Viram on the phone (modules/viram-companion): the
 * phone's practices arrive as one data item; each finished practice goes
 * back as its own, which the phone deletes once it has kept it.
 */
object Link {
  private const val CONTEXT_PATH = "/viram/context"
  private const val SESSION_PREFIX = "/viram/session/"
  private const val KEY_JSON = "json"
  private const val PREFS = "viram.wear"
  private const val KEY_CONTEXT = "context"

  fun cached(context: Context): CompanionContext? =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_CONTEXT, null)?.let(Format::parseContext)

  /** Reads the phone's latest practices, keeps them for offline use, and hands them back. */
  fun refresh(context: Context, done: (CompanionContext?) -> Unit) {
    val uri = Uri.Builder().scheme("wear").path(CONTEXT_PATH).build()
    Wearable.getDataClient(context).getDataItems(uri)
      .addOnSuccessListener { items ->
        val json = items.firstOrNull()?.let { DataMapItem.fromDataItem(it).dataMap.getString(KEY_JSON) }
        items.release()
        val parsed = json?.let(Format::parseContext)
        if (parsed != null) context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_CONTEXT, json).apply()
        done(parsed ?: cached(context))
      }
      .addOnFailureListener { done(cached(context)) }
  }

  fun isContext(path: String?) = path == CONTEXT_PATH

  /** Queued by the Data Layer until the phone is in reach. */
  fun send(context: Context, id: String, json: String) {
    val request = PutDataMapRequest.create(SESSION_PREFIX + id).apply { dataMap.putString(KEY_JSON, json) }.asPutDataRequest().setUrgent()
    Wearable.getDataClient(context).putDataItem(request)
  }
}
