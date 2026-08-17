package com.marquee

internal enum class ShortContentMode {
  STATIC,
  REPEAT,
}

internal enum class ContentAlignment {
  START,
  CENTER,
  END,
}

internal data class MarqueeProps(
  var contentWidth: Float = 0f,
  var spacing: Float = 0f,
  var speed: Double = 25.0,
  var direction: String = "left",
  var active: Boolean = true,
  var reduceMotion: Boolean = false,
  var shortContentMode: ShortContentMode = ShortContentMode.STATIC,
  var contentAlignment: ContentAlignment = ContentAlignment.START,
  var maxFlingVelocity: Float = 3200f,
  var deceleration: Float = 0.9985f,
  var pauseOnPress: Boolean = true,
  var resumeDelayMs: Double = 0.0,
)

internal enum class MotionState {
  IDLE,
  RUNNING,
  PAUSED,
  REDUCED_MOTION,
}

internal fun shortContentModeFrom(value: String?): ShortContentMode = when (value) {
  "repeat" -> ShortContentMode.REPEAT
  else -> ShortContentMode.STATIC
}

internal fun contentAlignmentFrom(value: String?): ContentAlignment = when (value) {
  "center" -> ContentAlignment.CENTER
  "end" -> ContentAlignment.END
  else -> ContentAlignment.START
}
