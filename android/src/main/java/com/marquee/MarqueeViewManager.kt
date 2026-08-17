package com.marquee

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.PixelUtil
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.RNMarqueeViewManagerDelegate
import com.facebook.react.viewmanagers.RNMarqueeViewManagerInterface

@ReactModule(name = MarqueeViewManager.NAME)
class MarqueeViewManager : ViewGroupManager<MarqueeView>(),
  RNMarqueeViewManagerInterface<MarqueeView> {
  private val delegate: ViewManagerDelegate<MarqueeView> = RNMarqueeViewManagerDelegate(this)

  override fun getDelegate(): ViewManagerDelegate<MarqueeView> = delegate
  override fun getName(): String = NAME
  public override fun createViewInstance(context: ThemedReactContext) = MarqueeView(context)

  override fun addEventEmitters(context: ThemedReactContext, view: MarqueeView) {
    super.addEventEmitters(context, view)
    val dispatcher = UIManagerHelper.getEventDispatcher(context)
    val surfaceId = UIManagerHelper.getSurfaceId(context)
    view.setEventListener(object : MarqueeEventListener {
      override fun onAnimationStateChange(state: MotionState) {
        dispatcher?.dispatchEvent(
          AnimationStateChangeEvent(surfaceId, view.id, state.toEventValue()),
        )
      }

      override fun onContentLayout(contentWidth: Float, containerWidth: Float) {
        dispatcher?.dispatchEvent(
          ContentLayoutEvent(
            surfaceId,
            view.id,
            PixelUtil.toDIPFromPixel(contentWidth),
            PixelUtil.toDIPFromPixel(containerWidth),
          ),
        )
      }
    })
  }

  override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> =
    (super.getExportedCustomDirectEventTypeConstants() ?: mutableMapOf()).apply {
      put(AnimationStateChangeEvent.EVENT_NAME, mapOf("registrationName" to "onAnimationStateChange"))
      put(ContentLayoutEvent.EVENT_NAME, mapOf("registrationName" to "onContentLayout"))
    }

  override fun onAfterUpdateTransaction(view: MarqueeView) {
    super.onAfterUpdateTransaction(view)
    view.commitProps()
  }

  override fun onDropViewInstance(view: MarqueeView) {
    view.resetForRecycle()
    super.onDropViewInstance(view)
  }

  @ReactProp(name = "contentWidth")
  override fun setContentWidth(view: MarqueeView, value: Float) {
    view.pendingProps.contentWidth = value.finiteOr(0f).coerceAtLeast(0f)
  }

  @ReactProp(name = "spacing")
  override fun setSpacing(view: MarqueeView, value: Float) {
    view.pendingProps.spacing = value.finiteOr(0f).coerceAtLeast(0f)
  }

  @ReactProp(name = "active")
  override fun setActive(view: MarqueeView, value: Boolean) {
    view.pendingProps.active = value
  }

  @ReactProp(name = "reduceMotion")
  override fun setReduceMotion(view: MarqueeView, value: Boolean) {
    view.pendingProps.reduceMotion = value
  }

  @ReactProp(name = "speed")
  override fun setSpeed(view: MarqueeView, value: Double) {
    view.pendingProps.speed = value.finiteOr(25.0).coerceAtLeast(0.0)
  }

  @ReactProp(name = "direction")
  override fun setDirection(view: MarqueeView, value: String?) {
    view.pendingProps.direction = if (value == "right") "right" else "left"
  }

  @ReactProp(name = "shortContentMode")
  override fun setShortContentMode(view: MarqueeView, value: String?) {
    view.pendingProps.shortContentMode = shortContentModeFrom(value)
  }

  @ReactProp(name = "contentAlignment")
  override fun setContentAlignment(view: MarqueeView, value: String?) {
    view.pendingProps.contentAlignment = contentAlignmentFrom(value)
  }

  @ReactProp(name = "maxFlingVelocity")
  override fun setMaxFlingVelocity(view: MarqueeView, value: Float) {
    view.pendingProps.maxFlingVelocity = value.finiteOr(3200f).coerceAtLeast(0f)
  }

  @ReactProp(name = "deceleration")
  override fun setDeceleration(view: MarqueeView, value: Float) {
    view.pendingProps.deceleration = value.finiteOr(0.9985f)
  }

  @ReactProp(name = "pauseOnPress")
  override fun setPauseOnPress(view: MarqueeView, value: Boolean) {
    view.pendingProps.pauseOnPress = value
  }

  @ReactProp(name = "resumeDelayMs")
  override fun setResumeDelayMs(view: MarqueeView, value: Double) {
    view.pendingProps.resumeDelayMs = value.finiteOr(0.0).coerceAtLeast(0.0)
  }

  companion object {
    const val NAME = "RNMarqueeView"
  }
}

private fun MotionState.toEventValue(): String = when (this) {
  MotionState.IDLE -> "idle"
  MotionState.RUNNING -> "running"
  MotionState.PAUSED -> "paused"
  MotionState.REDUCED_MOTION -> "reducedMotion"
}

private fun Double.finiteOr(fallback: Double): Double = if (isFinite()) this else fallback
private fun Float.finiteOr(fallback: Float): Float = if (isFinite()) this else fallback
