# iOS interaction contract

- A horizontal drag beginning more than 24 points from either screen edge takes control of the marquee.
- Vertical-dominant movement leaves control with the containing `UIScrollView`, `UITableView`, or FlashList.
- Edge-originating horizontal movement leaves control with navigation's interactive-back gesture.
- A stationary press pauses when `pauseOnPress` is enabled and resumes after `resumeDelayMs` on end, cancellation, or failure.
- A press recognizer may run simultaneously with parent gestures and never cancels their touches.
- A released horizontal drag clamps velocity to `maxFlingVelocity`, decelerates natively, then resumes auto motion without changing visible phase.
- Backgrounding, detaching, recycling, Reduce Motion changes, and `active={false}` cancel inertia and scheduled resumes.
