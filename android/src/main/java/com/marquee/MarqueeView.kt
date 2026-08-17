package com.marquee

import android.content.Context
import android.graphics.Canvas
import android.graphics.Rect
import android.util.AttributeSet
import android.view.Choreographer
import android.view.MotionEvent
import android.view.VelocityTracker
import android.view.View
import android.view.ViewConfiguration
import android.view.ViewGroup
import com.facebook.react.uimanager.PixelUtil
import kotlin.math.abs

class MarqueeView : ViewGroup, Choreographer.FrameCallback {
  constructor(context: Context) : super(context)
  constructor(context: Context, attrs: AttributeSet?) : super(context, attrs)
  constructor(context: Context, attrs: AttributeSet?, defStyleAttr: Int) : super(context, attrs, defStyleAttr)

  internal val pendingProps = MarqueeProps()
  private var committedProps = MarqueeProps()
  private val motion = MarqueeMotion()
  private val visibleRect = Rect()
  private var framePosted = false
  private var attachedAndVisible = false
  private var eventListener: MarqueeEventListener? = null
  private var lastReportedState: MotionState? = null
  private var lastLayoutReport: LayoutReport? = null
  private var velocityTracker: VelocityTracker? = null
  private val touchSlop = ViewConfiguration.get(context).scaledTouchSlop.toFloat()
  private var pointerDownX = 0f
  private var pointerDownY = 0f
  private var previousPointerX = 0f
  private var didPan = false
  private val resumeRunnable = Runnable { reconcileMotionState() }

  init {
    setWillNotDraw(false)
    clipChildren = false
    isClickable = true
    isFocusable = false
    importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_YES
  }

  internal fun setEventListener(listener: MarqueeEventListener?) {
    eventListener = listener
  }

  internal fun commitProps() {
    val previousPeriod = periodPx()
    committedProps = pendingProps.copy()
    val nextPeriod = periodPx()
    configureMotion(preservePhase = previousPeriod > 0.0 && nextPeriod > 0.0)
    reportContentLayout()
    reconcileMotionState()
    invalidate()
  }

  internal fun resetForRecycle() {
    removeCallbacks(resumeRunnable)
    stopFrames()
    velocityTracker?.recycle()
    velocityTracker = null
    pendingProps.copyFrom(MarqueeProps())
    committedProps = MarqueeProps()
    motion.configure(0.0, 0.0, preservePhase = false)
    motion.pause()
    lastReportedState = null
    lastLayoutReport = null
    eventListener = null
    contentDescription = null
    invalidate()
  }

  override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    setMeasuredDimension(
      resolveSize(suggestedMinimumWidth, widthMeasureSpec),
      resolveSize(suggestedMinimumHeight, heightMeasureSpec),
    )
  }

  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    synchronizeContentWidthFromChild()
    if (changed) {
      configureMotion(preservePhase = true)
      reportContentLayout()
      reconcileMotionState()
    }
  }

  override fun onViewAdded(child: View) {
    super.onViewAdded(child)
    require(childCount <= 1) { "Marquee accepts exactly one package-owned content container." }
    invalidate()
  }

  override fun dispatchDraw(canvas: Canvas) {
    val child = getChildAt(0) ?: return
    synchronizeContentWidthFromChild()
    val contentWidth = contentWidthPx()
    if (width <= 0 || height <= 0 || contentWidth <= 0f) return

    canvas.save()
    canvas.clipRect(paddingLeft, paddingTop, width - paddingRight, height - paddingBottom)
    if (!shouldRepeat()) {
      drawChildAt(canvas, child, staticContentX(contentWidth))
      canvas.restore()
      return
    }

    val period = periodPx().toFloat()
    if (period <= 0f) {
      canvas.restore()
      return
    }
    val viewportLeft = paddingLeft.toFloat()
    val viewportRight = (width - paddingRight).toFloat()
    var x = viewportLeft - motion.phasePx.toFloat()
    while (x + contentWidth < viewportLeft) x += period
    while (x > viewportLeft) x -= period
    while (x < viewportRight) {
      drawChildAt(canvas, child, x)
      x += period
    }
    canvas.restore()
  }

  private fun drawChildAt(canvas: Canvas, child: View, x: Float) {
    canvas.save()
    canvas.translate(x - child.left, paddingTop.toFloat() - child.top)
    drawChild(canvas, child, drawingTime)
    canvas.restore()
  }

  override fun doFrame(frameTimeNanos: Long) {
    framePosted = false
    if (!attachedAndVisible || !getGlobalVisibleRect(visibleRect) || visibleRect.isEmpty) return
    if (motion.advance(frameTimeNanos)) invalidate()
    reportMotionState()
    if (motion.isFrameDriven() && shouldScheduleMotion()) postFrame()
  }

  override fun onTouchEvent(event: MotionEvent): Boolean {
    if (!committedProps.active || committedProps.reduceMotion || !shouldRepeat()) return false
    when (event.actionMasked) {
      MotionEvent.ACTION_DOWN -> {
        val edgeInset = PixelUtil.toPixelFromDIP(EDGE_GESTURE_INSET_DP)
        if (event.x <= edgeInset || event.x >= width - edgeInset) return false
        removeCallbacks(resumeRunnable)
        velocityTracker?.recycle()
        velocityTracker = VelocityTracker.obtain().also { it.addMovement(event) }
        pointerDownX = event.x
        pointerDownY = event.y
        previousPointerX = event.x
        didPan = false
        if (committedProps.pauseOnPress) motion.beginHold()
        reportMotionState()
        return true
      }
      MotionEvent.ACTION_MOVE -> {
        velocityTracker?.addMovement(event)
        val totalDeltaX = event.x - pointerDownX
        val totalDeltaY = event.y - pointerDownY
        if (!didPan && abs(totalDeltaY) >= touchSlop &&
          abs(totalDeltaY) * PAN_DOMINANCE_RATIO > abs(totalDeltaX)) {
          finishGesture(0.0, canceled = true)
          return false
        }
        if (!didPan && abs(totalDeltaX) >= touchSlop &&
          abs(totalDeltaX) > abs(totalDeltaY) * PAN_DOMINANCE_RATIO) {
          didPan = true
          parent?.requestDisallowInterceptTouchEvent(true)
        }
        if (didPan) {
          motion.panBy((event.x - previousPointerX).toDouble())
          invalidate()
          reportMotionState()
        }
        previousPointerX = event.x
        return true
      }
      MotionEvent.ACTION_UP -> {
        velocityTracker?.addMovement(event)
        velocityTracker?.computeCurrentVelocity(1000)
        val velocity = if (didPan) velocityTracker?.xVelocity?.toDouble() ?: 0.0 else 0.0
        finishGesture(velocity, canceled = false)
        performClick()
        return true
      }
      MotionEvent.ACTION_CANCEL -> {
        finishGesture(0.0, canceled = true)
        return true
      }
      MotionEvent.ACTION_POINTER_DOWN -> {
        finishGesture(0.0, canceled = true)
        return false
      }
    }
    return super.onTouchEvent(event)
  }

  override fun performClick(): Boolean = super.performClick()

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    attachedAndVisible = isShown
    reconcileMotionState()
  }

  override fun onDetachedFromWindow() {
    attachedAndVisible = false
    removeCallbacks(resumeRunnable)
    stopFrames()
    motion.pause()
    reportMotionState()
    super.onDetachedFromWindow()
  }

  override fun onVisibilityAggregated(isVisible: Boolean) {
    super.onVisibilityAggregated(isVisible)
    attachedAndVisible = isVisible && isAttachedToWindow
    if (!attachedAndVisible) {
      stopFrames()
      motion.pause()
    }
    reconcileMotionState()
  }

  private fun configureMotion(preservePhase: Boolean) {
    val direction = if (committedProps.direction == "right") -1.0 else 1.0
    motion.configure(
      periodPx = periodPx(),
      speedPxPerSecond = PixelUtil.toPixelFromDIP(committedProps.speed).toDouble() * direction,
      preservePhase = preservePhase,
    )
    motion.configureInteraction(
      PixelUtil.toPixelFromDIP(committedProps.maxFlingVelocity).toDouble(),
      committedProps.deceleration.toDouble(),
    )
  }

  private fun reconcileMotionState() {
    removeCallbacks(resumeRunnable)
    when {
      committedProps.reduceMotion -> motion.reduceMotion()
      !committedProps.active || !attachedAndVisible || !shouldRepeat() -> motion.pause()
      motion.mode == MarqueeMotion.Mode.HOLD ||
        motion.mode == MarqueeMotion.Mode.PAN ||
        motion.mode == MarqueeMotion.Mode.FLING ||
        motion.mode == MarqueeMotion.Mode.BLEND ||
        motion.mode == MarqueeMotion.Mode.AUTO -> Unit
      else -> motion.startAuto()
    }
    if (motion.isFrameDriven() && shouldScheduleMotion()) postFrame() else stopFrames()
    reportMotionState()
  }

  private fun finishGesture(velocity: Double, canceled: Boolean) {
    velocityTracker?.recycle()
    velocityTracker = null
    parent?.requestDisallowInterceptTouchEvent(false)
    if (canceled) {
      motion.release(0.0)
      reconcileMotionState()
    } else if (didPan && abs(velocity) > 0.0) {
      motion.release(velocity)
      postFrame()
    } else if (committedProps.resumeDelayMs > 0.0) {
      motion.pause()
      postDelayed(resumeRunnable, committedProps.resumeDelayMs.toLong())
    } else {
      motion.startAuto()
      postFrame()
    }
    reportMotionState()
  }

  private fun contentWidthPx(): Float = PixelUtil.toPixelFromDIP(committedProps.contentWidth)

  private fun synchronizeContentWidthFromChild() {
    val childWidth = getChildAt(0)?.width?.toFloat() ?: return
    if (childWidth <= 0f || abs(childWidth - contentWidthPx()) <= WIDTH_EPSILON) return
    val widthInDip = PixelUtil.toDIPFromPixel(childWidth)
    committedProps.contentWidth = widthInDip
    pendingProps.contentWidth = widthInDip
    configureMotion(preservePhase = true)
    reportContentLayout()
  }

  private fun periodPx(): Double = contentWidthPx().toDouble() +
    PixelUtil.toPixelFromDIP(committedProps.spacing).toDouble()

  private fun viewportWidthPx(): Float = (width - paddingLeft - paddingRight).coerceAtLeast(0).toFloat()

  private fun shouldRepeat(): Boolean {
    val contentWidth = contentWidthPx()
    return contentWidth > 0f &&
      (contentWidth > viewportWidthPx() || committedProps.shortContentMode == ShortContentMode.REPEAT)
  }

  private fun staticContentX(contentWidth: Float): Float {
    val available = (viewportWidthPx() - contentWidth).coerceAtLeast(0f)
    return paddingLeft + when (committedProps.contentAlignment) {
      ContentAlignment.CENTER -> available / 2f
      ContentAlignment.END -> available
      ContentAlignment.START -> 0f
    }
  }

  private fun shouldScheduleMotion(): Boolean = attachedAndVisible && committedProps.active &&
    !committedProps.reduceMotion && shouldRepeat() &&
    (committedProps.speed != 0.0 || motion.mode == MarqueeMotion.Mode.FLING ||
      motion.mode == MarqueeMotion.Mode.BLEND)

  private fun postFrame() {
    if (framePosted || !isAttachedToWindow) return
    framePosted = true
    Choreographer.getInstance().postFrameCallback(this)
  }

  private fun stopFrames() {
    if (!framePosted) return
    Choreographer.getInstance().removeFrameCallback(this)
    framePosted = false
  }

  private fun reportMotionState() {
    val state = when {
      committedProps.reduceMotion -> MotionState.REDUCED_MOTION
      !committedProps.active -> MotionState.PAUSED
      !shouldRepeat() -> MotionState.IDLE
      committedProps.speed == 0.0 && motion.mode != MarqueeMotion.Mode.FLING -> MotionState.IDLE
      motion.mode == MarqueeMotion.Mode.HOLD ||
        motion.mode == MarqueeMotion.Mode.PAN ||
        motion.mode == MarqueeMotion.Mode.PAUSED -> MotionState.PAUSED
      else -> MotionState.RUNNING
    }
    if (lastReportedState == state) return
    lastReportedState = state
    eventListener?.onAnimationStateChange(state)
  }

  private fun reportContentLayout() {
    val report = LayoutReport(contentWidthPx(), viewportWidthPx())
    val previous = lastLayoutReport
    if (previous != null &&
      abs(report.contentWidth - previous.contentWidth) <= WIDTH_EPSILON &&
      abs(report.containerWidth - previous.containerWidth) <= WIDTH_EPSILON) return
    lastLayoutReport = report
    eventListener?.onContentLayout(report.contentWidth, report.containerWidth)
  }

  private data class LayoutReport(val contentWidth: Float, val containerWidth: Float)

  private companion object {
    const val WIDTH_EPSILON = 0.5f
    const val EDGE_GESTURE_INSET_DP = 24f
    const val PAN_DOMINANCE_RATIO = 1.15f
  }
}

private fun MarqueeProps.copyFrom(other: MarqueeProps) {
  contentWidth = other.contentWidth
  spacing = other.spacing
  speed = other.speed
  direction = other.direction
  active = other.active
  reduceMotion = other.reduceMotion
  shortContentMode = other.shortContentMode
  contentAlignment = other.contentAlignment
  maxFlingVelocity = other.maxFlingVelocity
  deceleration = other.deceleration
  pauseOnPress = other.pauseOnPress
  resumeDelayMs = other.resumeDelayMs
}
