package com.marquee

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class MarqueeMotionTest {
  @Test
  fun missedFrameUsesVisualContinuityLimitInsteadOfWallClockCatchUp() {
    val motion = MarqueeMotion()
    motion.configure(periodPx = 1_000.0, speedPxPerSecond = 60.0, preservePhase = false)
    motion.startAuto()
    motion.advance(1_000_000_000L, maximumDeltaSeconds = 1.0 / 60.0)

    motion.advance(1_100_000_000L, maximumDeltaSeconds = 1.0 / 60.0)

    assertEquals(1.0, motion.phasePx, 0.0001)
  }

  @Test
  fun continuityLimitTracksCommonDisplayRefreshRates() {
    listOf(60.0, 90.0, 120.0).forEach { refreshRate ->
      val motion = MarqueeMotion()
      motion.configure(periodPx = 1_000.0, speedPxPerSecond = 120.0, preservePhase = false)
      motion.startAuto()
      val maximumDeltaSeconds = 1.25 / refreshRate
      motion.advance(1_000_000_000L, maximumDeltaSeconds)

      motion.advance(1_100_000_000L, maximumDeltaSeconds)

      assertEquals(120.0 * maximumDeltaSeconds, motion.phasePx, 0.0001)
    }
  }

  @Test
  fun autoMotionUsesFractionalMonotonicTimeAndWraps() {
    val motion = MarqueeMotion()
    motion.configure(periodPx = 10.0, speedPxPerSecond = 25.0, preservePhase = false)
    motion.startAuto()

    motion.advance(1_000_000_000L)
    repeat(8) { index -> motion.advance(1_000_000_000L + (index + 1) * 50_000_000L) }

    assertEquals(0.0, motion.phasePx, 0.0001)
    assertTrue(motion.crossedLoopBoundary)
  }

  @Test
  fun reconfigurationCanPreserveOrResetPhysicalPhase() {
    val motion = MarqueeMotion()
    motion.configure(100.0, 20.0, preservePhase = false)
    motion.startAuto()
    motion.advance(1_000_000_000L)
    motion.advance(1_050_000_000L)
    assertEquals(1.0, motion.phasePx, 0.0001)

    motion.configure(80.0, 20.0, preservePhase = true)
    assertEquals(1.0, motion.phasePx, 0.0001)
    motion.configure(80.0, 20.0, preservePhase = false)
    assertEquals(0.0, motion.phasePx, 0.0001)
  }

  @Test
  fun sameGeometryContentUpdateDoesNotDropAFrameOfAutoMotion() {
    val motion = MarqueeMotion()
    motion.configure(100.0, 25.0, preservePhase = false)
    motion.startAuto()
    motion.advance(1_000_000_000L)
    motion.advance(1_050_000_000L)
    assertEquals(1.25, motion.phasePx, 0.0001)

    motion.configure(100.0, 25.0, preservePhase = true)
    motion.advance(1_100_000_000L)

    assertEquals(2.5, motion.phasePx, 0.0001)
  }

  @Test
  fun panAndFlingFollowTheFingerThenReturnToAuto() {
    val motion = MarqueeMotion()
    motion.configure(200.0, 30.0, preservePhase = false)
    motion.configureInteraction(maxFlingVelocityPxPerSecond = 100.0, deceleration = 0.5)
    motion.startAuto()
    motion.beginHold()
    motion.panBy(12.5)
    assertEquals(187.5, motion.phasePx, 0.0001)

    motion.release(1_000.0)
    assertEquals(MarqueeMotion.Mode.FLING, motion.mode)
    motion.advance(1_000_000_000L)
    motion.advance(1_050_000_000L)
    motion.advance(1_100_000_000L)
    assertEquals(MarqueeMotion.Mode.BLEND, motion.mode)
    repeat(7) { index ->
      motion.advance(1_150_000_000L + index * 50_000_000L)
    }
    assertEquals(MarqueeMotion.Mode.AUTO, motion.mode)
  }

  @Test
  fun flingMatchesPerMillisecondRetentionAtFixedTimestamps() {
    val motion = MarqueeMotion()
    motion.configure(1_000.0, 30.0, preservePhase = false)
    motion.configureInteraction(maxFlingVelocityPxPerSecond = 2_000.0, deceleration = 0.9985)
    motion.release(-1_000.0)

    motion.advance(1_000_000_000L)
    motion.advance(1_050_000_000L)
    motion.advance(1_100_000_000L)

    assertEquals(96.3845625, motion.phasePx, 0.0001)
  }

  @Test
  fun sameGeometryContentUpdateDoesNotInterruptFlingVelocity() {
    val motion = MarqueeMotion()
    motion.configure(1_000.0, 25.0, preservePhase = false)
    motion.configureInteraction(maxFlingVelocityPxPerSecond = 2_000.0, deceleration = 0.9985)
    motion.release(-1_000.0)
    motion.advance(1_000_000_000L)
    motion.advance(1_050_000_000L)
    val phaseBeforeUpdate = motion.phasePx

    motion.configure(1_000.0, 25.0, preservePhase = true)
    motion.advance(1_100_000_000L)

    assertEquals(MarqueeMotion.Mode.FLING, motion.mode)
    assertTrue(motion.phasePx > phaseBeforeUpdate + 40)
  }

  @Test
  fun oppositeDirectionFlingBlendsBeforeReturningToAutoVelocity() {
    val motion = MarqueeMotion()
    motion.configure(1_000.0, 25.0, preservePhase = false)
    motion.configureInteraction(maxFlingVelocityPxPerSecond = 2_400.0, deceleration = 0.9)
    motion.release(100.0)

    motion.advance(1_000_000_000L)
    motion.advance(1_050_000_000L)

    assertFalse(motion.mode == MarqueeMotion.Mode.AUTO)

    repeat(10) { index ->
      motion.advance(1_100_000_000L + index * 50_000_000L)
    }
    assertEquals(MarqueeMotion.Mode.AUTO, motion.mode)
  }

  @Test
  fun reducedMotionStopsFrameWorkAndResetsPresentation() {
    val motion = MarqueeMotion()
    motion.configure(100.0, 20.0, preservePhase = false)
    motion.startAuto()
    assertTrue(motion.isFrameDriven())

    motion.reduceMotion()

    assertFalse(motion.isFrameDriven())
    assertEquals(0.0, motion.phasePx, 0.0)
    assertEquals(MarqueeMotion.Mode.REDUCED_MOTION, motion.mode)
  }
}
