package com.marquee

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

internal class AnimationStateChangeEvent(
  surfaceId: Int,
  viewId: Int,
  private val state: String,
) : Event<AnimationStateChangeEvent>(surfaceId, viewId) {
  override fun getEventName(): String = EVENT_NAME

  override fun getEventData(): WritableMap = Arguments.createMap().apply {
    putString("state", state)
  }

  companion object {
    const val EVENT_NAME = "topAnimationStateChange"
  }
}

internal class ContentLayoutEvent(
  surfaceId: Int,
  viewId: Int,
  private val contentWidth: Float,
  private val containerWidth: Float,
) : Event<ContentLayoutEvent>(surfaceId, viewId) {
  override fun getEventName(): String = EVENT_NAME

  override fun getEventData(): WritableMap = Arguments.createMap().apply {
    putDouble("contentWidth", contentWidth.toDouble())
    putDouble("containerWidth", containerWidth.toDouble())
  }

  companion object {
    const val EVENT_NAME = "topContentLayout"
  }
}

internal interface MarqueeEventListener {
  fun onAnimationStateChange(state: MotionState)
  fun onContentLayout(contentWidth: Float, containerWidth: Float)
}
