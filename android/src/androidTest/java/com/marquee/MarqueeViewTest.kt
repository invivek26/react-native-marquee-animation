package com.marquee

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.view.MotionEvent
import android.view.View
import android.widget.FrameLayout
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.facebook.react.uimanager.DisplayMetricsHolder
import com.facebook.react.uimanager.PixelUtil
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class MarqueeViewTest {
  @Before
  fun initializeReactNativeDisplayMetrics() {
    DisplayMetricsHolder.initDisplayMetricsIfNotInitialized(
      ApplicationProvider.getApplicationContext(),
    )
  }

  @Test
  fun rendersOneArbitraryChildTree() {
    val context = ApplicationProvider.getApplicationContext<android.content.Context>()
    val view = MarqueeView(context)
    val content = FrameLayout(context).apply { setBackgroundColor(Color.MAGENTA) }
    view.addView(content)
    content.measure(exactly(600), exactly(64))
    content.layout(0, 0, 600, 64)
    view.pendingProps.contentWidth = 600f
    view.commitProps()
    view.measure(exactly(320), exactly(64))
    view.layout(0, 0, 320, 64)
    val bitmap = Bitmap.createBitmap(320, 64, Bitmap.Config.ARGB_8888)

    view.draw(Canvas(bitmap))

    assertEquals(1, view.childCount)
    assertEquals(View.IMPORTANT_FOR_ACCESSIBILITY_YES, view.importantForAccessibility)
    assertNotNull(bitmap)
  }

  @Test(expected = IllegalArgumentException::class)
  fun rejectsMoreThanOneMountedContentContainer() {
    val context = ApplicationProvider.getApplicationContext<android.content.Context>()
    val view = MarqueeView(context)
    view.addView(FrameLayout(context))
    view.addView(FrameLayout(context))
  }

  @Test
  fun recycleClearsMotionProps() {
    val context = ApplicationProvider.getApplicationContext<android.content.Context>()
    val view = MarqueeView(context)
    view.pendingProps.contentWidth = 600f
    view.commitProps()

    view.resetForRecycle()

    assertEquals(0f, view.pendingProps.contentWidth)
  }

  @Test
  fun layoutSynchronizesNativeChildWidthWithoutDrawing() {
    val context = ApplicationProvider.getApplicationContext<android.content.Context>()
    val view = MarqueeView(context)
    val content = FrameLayout(context)
    view.addView(content)
    content.measure(exactly(600), exactly(64))
    content.layout(0, 0, 600, 64)
    view.pendingProps.contentWidth = 100f
    view.commitProps()
    view.measure(exactly(320), exactly(64))

    view.layout(0, 0, 320, 64)

    assertEquals(PixelUtil.toDIPFromPixel(600f), view.pendingProps.contentWidth)
  }

  @Test
  fun verticalGestureIsReleasedForParentScrolling() {
    val view = overflowingView()
    val down = MotionEvent.obtain(0, 0, MotionEvent.ACTION_DOWN, 160f, 20f, 0)
    val verticalMove = MotionEvent.obtain(0, 16, MotionEvent.ACTION_MOVE, 162f, 50f, 0)

    assertEquals(true, view.onTouchEvent(down))
    assertEquals(false, view.onTouchEvent(verticalMove))
    down.recycle()
    verticalMove.recycle()
  }

  @Test
  fun horizontalGestureAtScreenEdgeIsNotClaimed() {
    val view = overflowingView()
    val edgeDown = MotionEvent.obtain(0, 0, MotionEvent.ACTION_DOWN, 1f, 20f, 0)

    assertEquals(false, view.onTouchEvent(edgeDown))
    edgeDown.recycle()
  }

  @Test
  fun staticContentIgnoresTouchesWithoutContentPress() {
    val view = staticView(contentPressEnabled = false)
    val down = MotionEvent.obtain(0, 0, MotionEvent.ACTION_DOWN, 160f, 20f, 0)
    val up = MotionEvent.obtain(0, 16, MotionEvent.ACTION_UP, 160f, 20f, 0)

    assertEquals(false, view.onTouchEvent(down))
    assertEquals(false, view.onTouchEvent(up))
    down.recycle()
    up.recycle()
  }

  @Test
  fun edgeTapIsTrackedButEdgeDragIsNotClaimedWithContentPress() {
    val view = overflowingView(contentPressEnabled = true)
    val presses = recordPresses(view)
    val edgeDown = MotionEvent.obtain(0, 0, MotionEvent.ACTION_DOWN, 1f, 20f, 0)
    val edgeMove = MotionEvent.obtain(0, 16, MotionEvent.ACTION_MOVE, 60f, 20f, 0)
    val edgeUp = MotionEvent.obtain(0, 32, MotionEvent.ACTION_UP, 60f, 20f, 0)

    assertEquals(true, view.onTouchEvent(edgeDown))
    assertEquals(false, view.onTouchEvent(edgeMove))
    view.onTouchEvent(edgeUp)

    assertEquals(emptyList<Float>(), presses)
    edgeDown.recycle()
    edgeMove.recycle()
    edgeUp.recycle()
  }

  @Test
  fun tapReportsContentPositionAndDragDoesNot() {
    val view = overflowingView(contentPressEnabled = true)
    val presses = recordPresses(view)
    val down = MotionEvent.obtain(0, 0, MotionEvent.ACTION_DOWN, 160f, 20f, 0)
    val up = MotionEvent.obtain(0, 16, MotionEvent.ACTION_UP, 161f, 20f, 0)
    val dragDown = MotionEvent.obtain(0, 32, MotionEvent.ACTION_DOWN, 160f, 20f, 0)
    val dragMove = MotionEvent.obtain(0, 48, MotionEvent.ACTION_MOVE, 220f, 20f, 0)
    val dragUp = MotionEvent.obtain(0, 64, MotionEvent.ACTION_UP, 220f, 20f, 0)

    assertEquals(true, view.onTouchEvent(down))
    view.onTouchEvent(up)
    view.onTouchEvent(dragDown)
    view.onTouchEvent(dragMove)
    view.onTouchEvent(dragUp)

    assertEquals(listOf(160f), presses)
    listOf(down, up, dragDown, dragMove, dragUp).forEach { it.recycle() }
  }

  @Test
  fun staticTapUsesAlignmentOffsetAndIgnoresOutsideContent() {
    val view = staticView(contentPressEnabled = true)
    val presses = recordPresses(view)
    val inside = MotionEvent.obtain(0, 0, MotionEvent.ACTION_DOWN, 160f, 20f, 0)
    val insideUp = MotionEvent.obtain(0, 16, MotionEvent.ACTION_UP, 160f, 20f, 0)
    val outside = MotionEvent.obtain(0, 32, MotionEvent.ACTION_DOWN, 20f, 20f, 0)

    view.onTouchEvent(inside)
    view.onTouchEvent(insideUp)

    assertEquals(false, view.onTouchEvent(outside))
    assertEquals(listOf(50f), presses)
    listOf(inside, insideUp, outside).forEach { it.recycle() }
  }

  private fun recordPresses(view: MarqueeView): MutableList<Float> {
    val presses = mutableListOf<Float>()
    view.setEventListener(object : MarqueeEventListener {
      override fun onAnimationStateChange(state: MotionState) = Unit
      override fun onContentLayout(contentWidth: Float, containerWidth: Float) = Unit
      override fun onContentPress(xPx: Float) {
        presses.add(xPx)
      }
    })
    return presses
  }

  private fun staticView(contentPressEnabled: Boolean): MarqueeView {
    val context = ApplicationProvider.getApplicationContext<android.content.Context>()
    return MarqueeView(context).apply {
      pendingProps.contentWidth = PixelUtil.toDIPFromPixel(100f)
      pendingProps.contentAlignment = ContentAlignment.CENTER
      pendingProps.contentPressEnabled = contentPressEnabled
      commitProps()
      measure(exactly(320), exactly(64))
      layout(0, 0, 320, 64)
    }
  }

  private fun overflowingView(contentPressEnabled: Boolean = false): MarqueeView {
    val context = ApplicationProvider.getApplicationContext<android.content.Context>()
    return MarqueeView(context).apply {
      pendingProps.contentWidth = 600f
      pendingProps.contentPressEnabled = contentPressEnabled
      commitProps()
      measure(exactly(320), exactly(64))
      layout(0, 0, 320, 64)
    }
  }

  private fun exactly(size: Int): Int =
    View.MeasureSpec.makeMeasureSpec(size, View.MeasureSpec.EXACTLY)
}
