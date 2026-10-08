package app.viram.companion

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * Sessions from the watch, kept until JS acknowledges them (the same
 * contract as iOS's CompanionLink). Paths and keys are shared with the Wear
 * OS app in wear/.
 */
object CompanionStore {
  const val CONTEXT_PATH = "/viram/context"
  const val SESSION_PREFIX = "/viram/session/"
  const val KEY_JSON = "json"
  const val WEAR_CAPABILITY = "viram_wear"

  private const val PREFS = "viram.companion"
  private const val KEY_PENDING = "pendingSessions"
  private const val MAX_PENDING = 200

  /** Called when sessions arrive; the module sets it while JS is listening. */
  @Volatile var onChange: (() -> Unit)? = null

  @Synchronized
  fun pending(context: Context): List<String> {
    val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_PENDING, null) ?: return emptyList()
    val array = runCatching { JSONArray(raw) }.getOrNull() ?: return emptyList()
    return (0 until array.length()).map { array.getString(it) }
  }

  @Synchronized
  fun keep(context: Context, json: String) {
    val id = idOf(json) ?: return
    val all = pending(context).toMutableList()
    if (all.any { idOf(it) == id }) return
    all.add(json)
    save(context, all.takeLast(MAX_PENDING))
    onChange?.invoke()
  }

  @Synchronized
  fun acknowledge(context: Context, ids: List<String>) {
    val remove = ids.map { it.lowercase() }.toSet()
    save(context, pending(context).filter { json -> idOf(json)?.lowercase()?.let { it !in remove } ?: false })
  }

  private fun save(context: Context, items: List<String>) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_PENDING, JSONArray(items).toString()).apply()
  }

  private fun idOf(json: String): String? = runCatching { JSONObject(json).getString("id") }.getOrNull()
}
