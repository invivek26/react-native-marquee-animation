package com.marquee

import kotlin.math.abs
import kotlin.math.pow

internal class MarqueeMotion {
  var phasePx: Double = 0.0
    private set
  var mode: Mode = Mode.PAUSED
    private set
  var crossedLoopBoundary: Boolean = false
    private set

  private var periodPx = 0.0
  private var autoVelocityPxPerSecond = 0.0
  private var flingVelocityPxPerSecond = 0.0
  private var blendStartVelocityPxPerSecond = 0.0
  private var blendElapsedSeconds = 0.0
  private var lastFrameNanos = 0L
  private var maxFlingVelocityPxPerSecond = 8_000.0
  private var decelerationPerMillisecond = 0.9985

  fun configure(periodPx: Double, speedPxPerSecond: Double, preservePhase: Boolean) {
    val nextPeriodPx = periodPx.coerceAtLeast(0.0)
    val timingChanged = this.periodPx != nextPeriodPx ||
      autoVelocityPxPerSecond != speedPxPerSecond
    this.periodPx = nextPeriodPx
    autoVelocityPxPerSecond = speedPxPerSecond
    phasePx = if (preservePhase) wrap(phasePx) else 0.0
    if (!preservePhase || timingChanged) lastFrameNanos = 0L
  }

  fun startAuto() {
    if (periodPx <= 0.0 || autoVelocityPxPerSecond == 0.0) {
      mode = Mode.PAUSED
      return
    }
    mode = Mode.AUTO
    blendElapsedSeconds = 0.0
    lastFrameNanos = 0L
  }

  fun configureInteraction(maxFlingVelocityPxPerSecond: Double, deceleration: Double) {
    this.maxFlingVelocityPxPerSecond = maxFlingVelocityPxPerSecond.coerceAtLeast(0.0)
    decelerationPerMillisecond = deceleration.takeIf { it > 0.0 && it < 1.0 } ?: DEFAULT_DECELERATION
  }

  fun pause() {
    mode = Mode.PAUSED
    blendElapsedSeconds = 0.0
    lastFrameNanos = 0L
  }

  fun reduceMotion() {
    mode = Mode.REDUCED_MOTION
    phasePx = 0.0
    lastFrameNanos = 0L
    blendElapsedSeconds = 0.0
  }

  fun beginHold() {
    if (mode == Mode.REDUCED_MOTION) return
    mode = Mode.HOLD
    lastFrameNanos = 0L
  }

  fun panBy(deltaXPx: Double) {
    if (mode == Mode.REDUCED_MOTION || periodPx <= 0.0) return
    mode = Mode.PAN
    phasePx = wrap(phasePx - deltaXPx)
  }

  fun release(velocityXPxPerSecond: Double) {
    if (mode == Mode.REDUCED_MOTION) return
    flingVelocityPxPerSecond = -velocityXPxPerSecond.coerceIn(
      -maxFlingVelocityPxPerSecond,
      maxFlingVelocityPxPerSecond,
    )
    if (abs(flingVelocityPxPerSecond) >= MIN_FLING_VELOCITY) {
      mode = Mode.FLING
    } else {
      beginAutoBlend(flingVelocityPxPerSecond)
    }
    lastFrameNanos = 0L
  }

  fun advance(frameTimeNanos: Long): Boolean {
    crossedLoopBoundary = false
    if (mode != Mode.AUTO && mode != Mode.FLING && mode != Mode.BLEND) {
      lastFrameNanos = frameTimeNanos
      return false
    }
    if (lastFrameNanos == 0L) {
      lastFrameNanos = frameTimeNanos
      return true
    }

    val deltaSeconds = ((frameTimeNanos - lastFrameNanos).coerceAtLeast(0L) / NANOS_PER_SECOND)
      .coerceAtMost(MAX_FRAME_DELTA_SECONDS)
    lastFrameNanos = frameTimeNanos
    val velocity = when (mode) {
      Mode.FLING -> flingVelocityPxPerSecond
      Mode.BLEND -> {
        blendElapsedSeconds = (blendElapsedSeconds + deltaSeconds).coerceAtMost(AUTO_BLEND_DURATION_SECONDS)
        val progress = blendElapsedSeconds / AUTO_BLEND_DURATION_SECONDS
        val eased = progress * progress * (3.0 - 2.0 * progress)
        blendStartVelocityPxPerSecond +
          (autoVelocityPxPerSecond - blendStartVelocityPxPerSecond) * eased
      }
      else -> autoVelocityPxPerSecond
    }
    val previous = phasePx
    val unwrapped = previous + velocity * deltaSeconds
    phasePx = wrap(unwrapped)
    crossedLoopBoundary = periodPx > 0.0 && (unwrapped < 0.0 || unwrapped >= periodPx)

    if (mode == Mode.FLING) {
      flingVelocityPxPerSecond *= decelerationPerMillisecond.pow(deltaSeconds * MILLIS_PER_SECOND)
      val transitionVelocity = maxOf(MIN_FLING_VELOCITY, abs(autoVelocityPxPerSecond) * 2.0)
      if (abs(flingVelocityPxPerSecond) < transitionVelocity) {
        beginAutoBlend(flingVelocityPxPerSecond)
      }
    }
    if (mode == Mode.BLEND && blendElapsedSeconds >= AUTO_BLEND_DURATION_SECONDS) {
      mode = Mode.AUTO
      lastFrameNanos = 0L
    }
    return phasePx != previous || mode == Mode.AUTO || mode == Mode.FLING || mode == Mode.BLEND
  }

  fun isFrameDriven(): Boolean = mode == Mode.AUTO || mode == Mode.FLING || mode == Mode.BLEND

  private fun beginAutoBlend(velocityPxPerSecond: Double) {
    blendStartVelocityPxPerSecond = velocityPxPerSecond
    blendElapsedSeconds = 0.0
    mode = Mode.BLEND
  }

  private fun wrap(value: Double): Double {
    if (periodPx <= 0.0) return 0.0
    val remainder = value % periodPx
    return if (remainder < 0.0) remainder + periodPx else remainder
  }

  internal enum class Mode {
    AUTO,
    HOLD,
    PAN,
    FLING,
    BLEND,
    PAUSED,
    REDUCED_MOTION,
  }

  private companion object {
    const val NANOS_PER_SECOND = 1_000_000_000.0
    const val MAX_FRAME_DELTA_SECONDS = 0.05
    const val MILLIS_PER_SECOND = 1_000.0
    const val DEFAULT_DECELERATION = 0.9985
    const val AUTO_BLEND_DURATION_SECONDS = 0.35
    const val MIN_FLING_VELOCITY = 12.0
  }
}
