package benchmark.integration

import android.app.Activity
import androidx.metrics.performance.FrameData
import androidx.metrics.performance.JankStats
import androidx.metrics.performance.PerformanceMetricsState

/**
 * Copy this adapter into the example app when field-style JankStats capture is needed.
 * Keep the callback lightweight: JankStats invokes it for every reported frame.
 */
class MarqueeJankStats(
  activity: Activity,
  onFrame: (FrameData) -> Unit,
) {
  private val stateHolder = PerformanceMetricsState.getHolderForHierarchy(activity.window.decorView)
  private val jankStats = JankStats.createAndTrack(activity.window) { frameData ->
    onFrame(frameData)
  }

  fun setScenario(scenario: String, count: Int) {
    stateHolder.state?.putState("marqueeScenario", scenario)
    stateHolder.state?.putState("marqueeCount", count.toString())
  }

  fun setEnabled(enabled: Boolean) {
    jankStats.isTrackingEnabled = enabled
  }
}
