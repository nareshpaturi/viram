package app.viram.wear

import android.app.Activity
import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.os.SystemClock
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.wear.widget.BoxInsetLayout
import com.google.android.gms.wearable.DataClient
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.Wearable
import kotlin.math.ceil

/**
 * The practices the phone sent, Breathe's ready practice first; one tap
 * begins after three seconds to settle. While a practice runs, the guide,
 * the step, and the time left; then a short completion.
 */
class MainActivity : Activity() {
  private lateinit var root: BoxInsetLayout
  private var companion: CompanionContext? = null
  private var shown: String? = null
  private var guide: GuideView? = null
  private var label: TextView? = null
  private var line: TextView? = null

  private val dataListener = DataClient.OnDataChangedListener { events ->
    if (events.any { it.type == DataEvent.TYPE_CHANGED && Link.isContext(it.dataItem.uri.path) }) refresh()
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    root = BoxInsetLayout(this).apply { setBackgroundColor(Color.BLACK) }
    setContentView(root)
    companion = Link.cached(this)
  }

  override fun onResume() {
    super.onResume()
    Wearable.getDataClient(this).addListener(dataListener)
    PracticeService.listener = { render(it) }
    refresh()
    render(PracticeService.state)
  }

  override fun onPause() {
    Wearable.getDataClient(this).removeListener(dataListener)
    PracticeService.listener = null
    super.onPause()
  }

  private fun refresh() {
    Link.refresh(this) { context ->
      companion = context
      if (PracticeService.state == null) {
        shown = null
        render(null)
      }
    }
  }

  // MARK: Screens

  private fun render(state: PracticeService.State?) {
    val stage = state?.stage
    when {
      state == null -> showList()
      stage is PracticeService.Stage.Finished && stage.cancelled -> {
        PracticeService.clear()
      }
      stage is PracticeService.Stage.Finished -> showDone(stage)
      stage is PracticeService.Stage.Settling -> showSettle(stage)
      else -> showPractice(state)
    }
  }

  private fun screen(name: String, build: () -> View) {
    if (shown == name) return
    shown = name
    guide = null
    label = null
    line = null
    root.removeAllViews()
    // Everything stays inside the round screen's square.
    root.addView(build(), BoxInsetLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT, Gravity.NO_GRAVITY, BoxInsetLayout.LayoutParams.BOX_ALL))
  }

  private fun showList() {
    val practices = companion?.practices.orEmpty()
    screen("list:${practices.joinToString { it.key + it.detail }}") {
      ScrollView(this).apply {
        addView(column().apply {
          addView(text("Viram", 18f, bold = true, color = MIST))
          if (practices.isEmpty()) {
            addView(text("Open Viram on your phone once to bring your practices here.", 13f, color = MUTED))
          }
          practices.forEachIndexed { index, practice ->
            addView(column(padding = 10).apply {
              background = rounded(CARD)
              contentDescription = "${practice.name}, ${practice.detail}. Begins after three seconds to settle."
              isClickable = true
              setOnClickListener { begin(practice) }
              if (index == 0) addView(text("Ready when you are", 11f, color = MUTED))
              addView(text(practice.name, 15f, bold = true, color = Color.WHITE))
              addView(text(practice.detail, 12f, color = MIST))
            }, spaced())
          }
          if (practices.isNotEmpty()) addView(text("Haptics follow Viram’s settings on your phone.", 11f, color = MUTED), spaced())
        })
      }
    }
  }

  private fun begin(practice: WatchPractice) {
    PracticeService.start(this, practice, companion?.haptics ?: HapticSettings.STANDARD)
  }

  private fun showSettle(stage: PracticeService.Stage.Settling) {
    screen("settle:${stage.first}") {
      column(gravity = Gravity.CENTER).apply {
        addView(text(if (stage.first) "Settle in" else "Resuming", 16f, bold = true, color = Color.WHITE))
        addView(text("", 40f, color = GuideView.COLORS.getValue(StepKind.INHALE)).also { label = it })
        addView(text("Eyes closed is fine. The taps will guide you.", 12f, color = MIST))
        if (stage.first) addView(button("Cancel") { PracticeService.command(this@MainActivity, PracticeService.CANCEL) }, spaced())
      }
    }
    val left = ceil((stage.untilMs - SystemClock.elapsedRealtime()) / 1000.0).toInt().coerceAtLeast(1)
    label?.text = left.toString()
  }

  private fun showPractice(state: PracticeService.State) {
    val paused = state.stage == PracticeService.Stage.Paused
    screen("practice:$paused") {
      column(gravity = Gravity.CENTER).apply {
        addView(GuideView(this@MainActivity).also { guide = it; it.importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f))
        addView(text("", 15f, bold = true, color = Color.WHITE).also { label = it; it.accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE })
        addView(text("", 12f, color = MIST).also { line = it })
        if (paused) {
          addView(LinearLayout(this@MainActivity).apply {
            gravity = Gravity.CENTER
            addView(button("End") { PracticeService.command(this@MainActivity, PracticeService.END) })
            addView(button("Resume") { PracticeService.command(this@MainActivity, PracticeService.RESUME) }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { leftMargin = dp(8) })
          })
        } else {
          addView(button("Pause", quiet = true) { PracticeService.command(this@MainActivity, PracticeService.PAUSE) })
        }
      }
    }
    val position = state.position
    guide?.show(position?.step?.kind ?: StepKind.REST, position?.let { ((state.planMs - it.startMs).toFloat() / it.durationMs) } ?: 0f)
    label?.text = if (paused) "Paused" else position?.step?.label.orEmpty()
    val left = clock(state.plan.durationMs - state.planMs)
    line?.text = position?.let { "Round ${it.round + 1} of ${state.plan.rounds} · $left" } ?: left
  }

  private fun showDone(stage: PracticeService.Stage.Finished) {
    screen("done") {
      ScrollView(this).apply {
        addView(column(gravity = Gravity.CENTER).apply {
          addView(text("✓", 22f, color = GuideView.COLORS.getValue(StepKind.INHALE)))
          addView(text(if (stage.completed) "A little space, made." else "A pause still counts.", 16f, bold = true, color = Color.WHITE))
          addView(text(clock(stage.activeMs), 18f, color = Color.WHITE))
          addView(text("Saved to History on your phone when it’s nearby.", 12f, color = MIST))
          addView(button("Done") { PracticeService.clear() }, spaced())
        })
      }
    }
  }

  // MARK: Little view helpers

  private fun dp(value: Int) = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value.toFloat(), resources.displayMetrics).toInt()

  private fun column(gravity: Int = Gravity.START, padding: Int = 0) = LinearLayout(this).apply {
    orientation = LinearLayout.VERTICAL
    this.gravity = gravity
    setPadding(dp(padding), dp(padding), dp(padding), dp(padding))
  }

  private fun spaced() = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(8) }

  private fun text(value: String, size: Float, bold: Boolean = false, color: Int) = TextView(this).apply {
    text = value
    setTextSize(TypedValue.COMPLEX_UNIT_SP, size)
    setTextColor(color)
    if (bold) setTypeface(typeface, Typeface.BOLD)
    gravity = Gravity.CENTER_HORIZONTAL
    textAlignment = View.TEXT_ALIGNMENT_GRAVITY
  }

  private fun button(title: String, quiet: Boolean = false, onClick: () -> Unit) = TextView(this).apply {
    text = title
    setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
    setTextColor(if (quiet) MUTED else Color.BLACK)
    if (!quiet) background = rounded(GuideView.COLORS.getValue(StepKind.INHALE))
    gravity = Gravity.CENTER
    minHeight = dp(40)
    minWidth = dp(64)
    setPadding(dp(14), dp(6), dp(14), dp(6))
    isClickable = true
    contentDescription = title
    setOnClickListener { onClick() }
  }

  private fun rounded(color: Int) = android.graphics.drawable.GradientDrawable().apply {
    setColor(color)
    cornerRadius = dp(20).toFloat()
  }

  companion object {
    private val MIST = Color.parseColor("#C9D6D0")
    private val MUTED = Color.parseColor("#9FB2AA")
    private val CARD = Color.parseColor("#1B2A25")

    fun clock(ms: Long): String {
      val total = (maxOf(0L, ms) + 500) / 1000
      return "%d:%02d".format(total / 60, total % 60)
    }
  }
}
