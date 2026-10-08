# iOS interaction contract

- A horizontal drag beginning more than 24 points from either screen edge takes control of the marquee.
- Vertical-dominant movement leaves control with the containing `UIScrollView`, `UITableView`, or FlashList.
- Edge-originating horizontal movement leaves control with navigation's interactive-back gesture.
- A stationary press pauses on touch-down when `pauseOnPress` is enabled and resumes after `resumeDelayMs` on end, cancellation, or failure.
- A tap (no pan, movement under 10 points) reports the touch-down position in one copy's content coordinates; taps in the spacing gap, after a drag, or after cancellation report nothing.
- A press recognizer may run simultaneously with parent gestures and never cancels their touches.
- Drag events store only the latest position; the renderer applies at most one layer mutation per display refresh and flushes the final position before inertia.
- Interactive display links prefer the active screen's maximum refresh rate.
- A released horizontal drag clamps velocity to `maxFlingVelocity`, decelerates natively, then resumes auto motion without changing visible phase.
- Backgrounding, detaching, recycling, Reduce Motion changes, and `active={false}` cancel inertia and scheduled resumes.
