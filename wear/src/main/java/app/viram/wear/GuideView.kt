package app.viram.wear

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.view.View
import kotlin.math.min

/** The disc: grows with the inhale, full on a hold, shrinks with the exhale, small at rest; the phase's color. */
class GuideView(context: Context) : View(context) {
  private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
  private var kind = StepKind.REST
  private var progress = 0f
  var dimmed = false

  fun show(kind: StepKind, progress: Float) {
    this.kind = kind
    this.progress = progress.coerceIn(0f, 1f)
    invalidate()
  }

  override fun onDraw(canvas: Canvas) {
    // With Remove animations on, a still disc in the phase's color, as on the phone.
    val scale = if (!ValueAnimator.areAnimatorsEnabled()) STILL else when (kind) {
      StepKind.INHALE -> SMALL + (1 - SMALL) * progress
      StepKind.EXHALE -> 1 - (1 - SMALL) * progress
      StepKind.HOLD -> 1f
      StepKind.REST -> SMALL
    }
    paint.color = COLORS.getValue(kind)
    paint.alpha = if (dimmed) 110 else 255
    val radius = min(width, height) / 2f * scale
    canvas.drawCircle(width / 2f, height / 2f, radius, paint)
  }

  companion object {
    /** As on the phone (src/components/BreathingGuide.tsx). */
    private const val SMALL = 0.56f
    private const val STILL = 0.8f
    val COLORS = mapOf(
      StepKind.INHALE to Color.parseColor("#A8CFD0"),
      StepKind.HOLD to Color.parseColor("#E4B84A"),
      StepKind.EXHALE to Color.parseColor("#E46F51"),
      StepKind.REST to Color.parseColor("#EEF4EF"),
    )
  }
}
