package app.viram.guide

import android.content.Context
import android.os.Build
import android.os.VibrationAttributes
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import kotlin.math.roundToInt

/**
 * Plays a step's haptic pattern (src/haptics/patterns.ts) as one vibrator
 * waveform, so the vibrator keeps its timing even with the screen locked.
 * Without amplitude control, strength is lost but rhythm and length remain,
 * which is what tells the phases apart.
 */
object PhaseHaptics {
  private fun vibrator(context: Context): Vibrator? =
    if (Build.VERSION.SDK_INT >= 31) context.getSystemService(VibratorManager::class.java)?.defaultVibrator
    else @Suppress("DEPRECATION") context.getSystemService(Vibrator::class.java)

  /** `flat` is [atMs, ms, amplitude 0–1, …], relative to now. */
  fun play(context: Context, flat: DoubleArray) {
    val vibrator = vibrator(context)?.takeIf { it.hasVibrator() } ?: return
    val timings = mutableListOf<Long>()
    val amplitudes = mutableListOf<Int>()
    var at = 0L
    for (i in 0 until flat.size / 3) {
      val start = flat[i * 3].toLong()
      val length = flat[i * 3 + 1].toLong()
      if (start < at || length <= 0) continue
      timings += start - at
      amplitudes += 0
      timings += length
      amplitudes += (flat[i * 3 + 2] * 255).roundToInt().coerceIn(1, 255)
      at = start + length
    }
    if (timings.isEmpty()) return
    val effect =
      if (vibrator.hasAmplitudeControl()) VibrationEffect.createWaveform(timings.toLongArray(), amplitudes.toIntArray(), -1)
      else VibrationEffect.createWaveform(timings.toLongArray(), -1)
    if (Build.VERSION.SDK_INT >= 33) vibrator.vibrate(effect, VibrationAttributes.createForUsage(VibrationAttributes.USAGE_MEDIA))
    else vibrator.vibrate(effect)
  }

  /** Ends a pattern still playing, e.g. taps through an exhale when the practice pauses. */
  fun cancel(context: Context) {
    vibrator(context)?.cancel()
  }
}
