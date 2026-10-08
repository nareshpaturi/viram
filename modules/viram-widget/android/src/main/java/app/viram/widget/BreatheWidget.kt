package app.viram.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * “Breathe”: the ready practice, and a tap that opens its settle countdown
 * (src/widget/widget.ts writes what it shows). “Practiced today” is decided
 * when it's drawn, from the day of the last practice; no streaks.
 */
class BreatheWidget : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    val data = read(context)
    for (id in ids) manager.updateAppWidget(id, views(context, data))
  }

  companion object {
    private const val PREFS = "viram.widget"
    private const val KEY = "widget"

    fun save(context: Context, json: String) {
      val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      if (prefs.getString(KEY, null) == json) return
      prefs.edit().putString(KEY, json).apply()
      redraw(context)
    }

    fun redraw(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, BreatheWidget::class.java))
      if (ids.isEmpty()) return
      val data = read(context)
      for (id in ids) manager.updateAppWidget(id, views(context, data))
    }

    private fun read(context: Context): JSONObject? =
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null)?.let { runCatching { JSONObject(it) }.getOrNull() }

    private fun views(context: Context, data: JSONObject?): RemoteViews {
      val views = RemoteViews(context.packageName, R.layout.viram_widget)
      val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
      val practiced = data?.optString("lastPracticeDay") == today
      views.setTextViewText(R.id.viram_widget_eyebrow, if (practiced) "Practiced today ✓" else "Breathe")
      views.setTextViewText(R.id.viram_widget_name, data?.optString("name")?.takeIf { it.isNotEmpty() } ?: "Viram")
      views.setTextViewText(R.id.viram_widget_detail, data?.optString("detail")?.takeIf { it.isNotEmpty() } ?: "A little space to breathe")
      val url = data?.optString("url")?.takeIf { it.startsWith("viram://") }
      val intent = if (url != null) Intent(Intent.ACTION_VIEW, Uri.parse(url)).setPackage(context.packageName)
        else context.packageManager.getLaunchIntentForPackage(context.packageName)
      if (intent != null) {
        views.setOnClickPendingIntent(
          R.id.viram_widget_root,
          PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT),
        )
      }
      views.setContentDescription(
        R.id.viram_widget_root,
        "Begin ${data?.optString("name") ?: "Viram"}, ${data?.optString("detail") ?: ""}${if (practiced) ". Practiced today." else ""}",
      )
      return views
    }
  }
}
