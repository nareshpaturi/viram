package app.viram.wear

import org.json.JSONObject
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToLong

// The companion format from the phone (src/companion/companion.ts). Keep the
// two in step: the phone checks everything a watch sends back.

enum class StepKind { INHALE, HOLD, EXHALE, REST }

data class WatchStep(val kind: StepKind, val seconds: Double, val label: String)

data class Slowing(val inhale: Double, val exhale: Double)

data class WatchPractice(
  val key: String,
  val name: String,
  val detail: String,
  val steps: List<WatchStep>,
  val rounds: Int,
  val slowing: Slowing?,
  /** The phone's one short caution, shown before practice; absent from older contexts. */
  val caution: String?,
  /** Echoed back verbatim with the session. */
  val practiceJson: String,
)

enum class HapticStyle { MARKS, THROUGH }

data class HapticSettings(val style: HapticStyle, val phases: Map<StepKind, Boolean>) {
  fun isOn(kind: StepKind) = phases[kind] ?: true

  companion object {
    val STANDARD = HapticSettings(HapticStyle.MARKS, StepKind.entries.associateWith { true })
  }
}

data class CompanionContext(val practices: List<WatchPractice>, val haptics: HapticSettings)

object Format {
  private fun kind(text: String) = StepKind.valueOf(text.uppercase())

  /** Null for anything this version doesn't understand. */
  fun parseContext(json: String): CompanionContext? = runCatching {
    val root = JSONObject(json)
    if (root.getInt("v") != 1) return null
    val practices = root.getJSONArray("practices").let { array ->
      (0 until array.length()).map { i ->
        val p = array.getJSONObject(i)
        val steps = p.getJSONArray("steps").let { s ->
          (0 until s.length()).map { j ->
            val step = s.getJSONObject(j)
            WatchStep(kind(step.getString("kind")), step.getDouble("seconds"), step.getString("label"))
          }
        }
        val slowing = p.optJSONObject("slowing")?.let { Slowing(it.getDouble("inhale"), it.getDouble("exhale")) }
        val caution = p.optString("caution").ifEmpty { null }
        WatchPractice(p.getString("key"), p.getString("name"), p.getString("detail"), steps, p.getInt("rounds"), slowing, caution, p.getString("practiceJson"))
      }
    }
    val haptics = root.getJSONObject("haptics").let { h ->
      val phases = h.getJSONObject("phases")
      HapticSettings(
        if (h.getString("style") == "through") HapticStyle.THROUGH else HapticStyle.MARKS,
        StepKind.entries.associateWith { phases.optBoolean(it.name.lowercase(), true) },
      )
    }
    CompanionContext(practices, haptics)
  }.getOrNull()

  fun session(id: String, startedAt: Long, activeMs: Long, completedRounds: Int, completed: Boolean, practiceJson: String): String =
    JSONObject()
      .put("v", 1)
      .put("id", id)
      .put("startedAt", startedAt)
      .put("activeMs", activeMs)
      .put("completedRounds", completedRounds)
      .put("outcome", if (completed) "completed" else "ended")
      .put("practiceJson", practiceJson)
      .toString()
}

/** One step as it plays: its round, where it starts in plan time, and how long it lasts. */
data class StepPosition(val round: Int, val index: Int, val step: WatchStep, val startMs: Long, val durationMs: Long)

/**
 * The phone's plan math (src/breathing/rhythm.ts): whole rounds, 0-second
 * steps skipped, and gradual slowing moving the inhale and exhale evenly,
 * round by round, in tenths of a second.
 */
class Plan(val practice: WatchPractice) {
  /** Where each round starts, then the end. */
  private val starts: LongArray

  init {
    val rounds = max(1, practice.rounds)
    starts = LongArray(rounds + 1)
    for (r in 0 until rounds) starts[r + 1] = starts[r] + steps(r).sumOf { ms(it.seconds) }
  }

  val rounds get() = starts.size - 1
  val durationMs get() = starts[rounds]

  fun steps(round: Int): List<WatchStep> {
    val slowing = practice.slowing ?: return practice.steps
    val f = if (practice.rounds > 1) min(1.0, round.toDouble() / (practice.rounds - 1)) else 0.0
    return practice.steps.map { step ->
      val end = when (step.kind) {
        StepKind.INHALE -> slowing.inhale
        StepKind.EXHALE -> slowing.exhale
        else -> null
      } ?: return@map step
      step.copy(seconds = Math.round((step.seconds + (end - step.seconds) * f) * 10) / 10.0)
    }
  }

  /** The step playing at `elapsedMs` of plan time; null once the plan is over. */
  fun position(elapsedMs: Long): StepPosition? {
    if (elapsedMs >= durationMs) return null
    val t = max(0L, elapsedMs)
    var lo = 0
    var hi = rounds - 1
    while (lo < hi) {
      val mid = (lo + hi + 1) / 2
      if (starts[mid] <= t) lo = mid else hi = mid - 1
    }
    var at = starts[lo]
    steps(lo).forEachIndexed { index, step ->
      val duration = ms(step.seconds)
      if (duration == 0L) return@forEachIndexed
      if (t < at + duration) return StepPosition(lo, index, step, at, duration)
      at += duration
    }
    return null
  }

  companion object {
    fun ms(seconds: Double): Long = (seconds * 1000).roundToLong()
  }
}

/** One vibration within a step: start, length, strength 0–1. */
data class Pulse(val atMs: Long, val ms: Long, val amplitude: Double)

/**
 * The phone's per-phase patterns (src/haptics/patterns.ts), at the watch's
 * full strength: a rising double tap for the inhale, a light tap for a hold,
 * one long soft buzz for the exhale, a faint tap for rest; "through the
 * breath" adds quick taps growing through the inhale and slow taps fading
 * through the exhale.
 */
object Patterns {
  private const val TAIL_MS = 350L
  private const val LONG_MS = 320L

  private val MARKS = mapOf(
    StepKind.INHALE to listOf(Pulse(0, 22, 0.5), Pulse(90, 30, 1.0)),
    StepKind.HOLD to listOf(Pulse(0, 18, 0.6)),
    StepKind.EXHALE to listOf(Pulse(0, LONG_MS, 0.7)),
    StepKind.REST to listOf(Pulse(0, 16, 0.4)),
  )

  private fun taps(stepMs: Long, startMs: Long, everyMs: Long, ms: Long, first: Double, last: Double): List<Pulse> {
    val end = stepMs - TAIL_MS
    val count = floor((end - startMs).toDouble() / everyMs).toInt() + 1
    if (count <= 0) return emptyList()
    return (0 until count)
      .map { i ->
        val f = if (count > 1) i.toDouble() / (count - 1) else 0.0
        Pulse(startMs + i * everyMs, ms, Math.round((first + (last - first) * f) * 100) / 100.0)
      }
      .filter { it.atMs + it.ms <= end }
  }

  fun forStep(kind: StepKind, stepMs: Long, settings: HapticSettings): List<Pulse> {
    if (!settings.isOn(kind) || stepMs <= 0) return emptyList()
    var pulses = MARKS.getValue(kind)
    if (settings.style == HapticStyle.THROUGH && kind == StepKind.INHALE) pulses = pulses + taps(stepMs, 450, 450, 20, 0.35, 0.9)
    if (settings.style == HapticStyle.THROUGH && kind == StepKind.EXHALE) pulses = pulses + taps(stepMs, LONG_MS + 1000, 1000, 60, 0.6, 0.25)
    return pulses.filter { it.atMs < stepMs }
  }
}
