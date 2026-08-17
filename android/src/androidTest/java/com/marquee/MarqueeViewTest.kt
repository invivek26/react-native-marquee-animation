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

  private fun overflowingView(): MarqueeView {
    val context = ApplicationProvider.getApplicationContext<android.content.Context>()
    return MarqueeView(context).apply {
      pendingProps.contentWidth = 600f
      commitProps()
      measure(exactly(320), exactly(64))
      layout(0, 0, 320, 64)
    }
  }

  private fun exactly(size: Int): Int =
    View.MeasureSpec.makeMeasureSpec(size, View.MeasureSpec.EXACTLY)
}
