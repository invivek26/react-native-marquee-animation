import QuartzCore
import UIKit

@objc public protocol MarqueeRendererDelegate: AnyObject {
  func marqueeRenderer(_ renderer: MarqueeRenderer, didChangeState state: String)
  func marqueeRenderer(
    _ renderer: MarqueeRenderer,
    didLayoutContentWidth contentWidth: CGFloat,
    containerWidth: CGFloat
  )
}

@objcMembers public final class MarqueeConfiguration: NSObject {
  public var contentWidth: CGFloat = 0
  public var spacing: CGFloat = 0
  public var active = true
  public var reduceMotion = false
  public var speed: CGFloat = 25
  public var direction = "left"
  public var shortContentMode = "static"
  public var contentAlignment = "start"
  public var maxFlingVelocity: CGFloat = 3_200
  public var deceleration: CGFloat = 0.9985
  public var pauseOnPress = true
  public var resumeDelay: TimeInterval = 0
}

enum MarqueeMath {
  static func positiveModulo(_ value: CGFloat, modulus: CGFloat) -> CGFloat {
    guard modulus.isFinite, modulus > 0, value.isFinite else { return 0 }
    let result = value.truncatingRemainder(dividingBy: modulus)
    return result >= 0 ? result : result + modulus
  }

  static func blendedVelocity(from: CGFloat, to: CGFloat, progress: CGFloat) -> CGFloat {
    let clamped = min(1, max(0, progress))
    let eased = clamped * clamped * (3 - 2 * clamped)
    return from + (to - from) * eased
  }

  static func clampedFrameElapsed(
    elapsed: CFTimeInterval,
    frameInterval: CFTimeInterval
  ) -> CFTimeInterval {
    let safeInterval = frameInterval.isFinite && frameInterval > 0
      ? frameInterval
      : 1 / 60
    return min(max(0, elapsed), safeInterval * 1.25)
  }

  static func shouldBeginPan(
    velocity: CGPoint,
    startX: CGFloat,
    containerWidth: CGFloat,
    edgeInset: CGFloat = 24
  ) -> Bool {
    guard containerWidth > edgeInset * 2,
      startX > edgeInset,
      startX < containerWidth - edgeInset else {
      return false
    }
    return abs(velocity.x) >= 20 && abs(velocity.x) > abs(velocity.y) * 1.15
  }
}

private enum MarqueeState: String {
  case idle
  case running
  case paused
  case reducedMotion = "reducedMotion"
}

private enum InteractiveDisplayMode {
  case dragging
  case inertia
}

@objcMembers public final class MarqueeRenderer: UIView, UIGestureRecognizerDelegate {
  public weak var delegate: MarqueeRendererDelegate?

  public override class var layerClass: AnyClass { CAReplicatorLayer.self }

  private var replicatorLayer: CAReplicatorLayer { layer as! CAReplicatorLayer }
  private var contentView: UIView? { subviews.first }
  private var configuration = MarqueeConfiguration()
  private var period: CGFloat = 0
  private var sourceBaseX: CGFloat = 0
  private var isApplicationActive = true
  private var isHolding = false
  private var isDragging = false
  private var panStartOffset: CGFloat = 0
  private var pendingDragOffset: CGFloat?
  private var displayLink: CADisplayLink?
  private var interactiveDisplayMode: InteractiveDisplayMode?
  private var lastDisplayTimestamp: CFTimeInterval = 0
  private var inertiaVelocity: CGFloat = 0
  private var isBlendingToAuto = false
  private var blendStartVelocity: CGFloat = 0
  private var blendElapsed: CFTimeInterval = 0
  private var resumeWorkItem: DispatchWorkItem?
  private var notificationTokens: [NSObjectProtocol] = []
  private var contentBoundsObservation: NSKeyValueObservation?
  private var sessionGeneration = 0
  private var lastState: MarqueeState?
  private var lastLayoutWidth: CGFloat = -1
  private var lastContainerWidth: CGFloat = -1
  private var lastReplicationContainerWidth: CGFloat = -1
  private var autoAnimationRestartCount = 0
  private var layoutEmissionCount = 0

  private lazy var panGesture = UIPanGestureRecognizer(target: self, action: #selector(handlePan(_:)))
  private lazy var holdGesture = UILongPressGestureRecognizer(
    target: self,
    action: #selector(handleHold(_:))
  )

  public override init(frame: CGRect) {
    super.init(frame: frame)
    setup()
  }

  public required init?(coder: NSCoder) {
    super.init(coder: coder)
    setup()
  }

  deinit {
    notificationTokens.forEach(NotificationCenter.default.removeObserver)
  }

  public func applyConfiguration(_ value: MarqueeConfiguration) {
    sanitizeConfiguration(value)
    if let actualWidth = contentView?.bounds.width, actualWidth > geometryEpsilon {
      value.contentWidth = actualWidth
    }
    let previous = configuration
    let oldOffset = currentPhysicalOffset()
    let geometryChanged = abs(previous.contentWidth - value.contentWidth) > geometryEpsilon
      || abs(previous.spacing - value.spacing) > geometryEpsilon
      || previous.direction != value.direction
      || previous.shortContentMode != value.shortContentMode
      || previous.contentAlignment != value.contentAlignment
    let motionChanged = previous.speed != value.speed
      || previous.active != value.active
      || previous.reduceMotion != value.reduceMotion
      || previous.pauseOnPress != value.pauseOnPress

    configuration = value
    holdGesture.isEnabled = value.pauseOnPress
    if geometryChanged {
      freezeMotion()
      configureReplication(preservingOffset: oldOffset)
    }
    emitLayoutIfNeeded(force: geometryChanged)
    if !geometryChanged,
      !motionChanged,
      contentView?.layer.animation(forKey: animationKey) != nil {
      emitState(.running)
      return
    }
    evaluateMotion()
  }

  public func resetForReuse() {
    sessionGeneration += 1
    cancelResume()
    freezeMotion()
    configuration = MarqueeConfiguration()
    period = 0
    sourceBaseX = 0
    isHolding = false
    isDragging = false
    lastState = nil
    lastLayoutWidth = -1
    lastContainerWidth = -1
    lastReplicationContainerWidth = -1
    autoAnimationRestartCount = 0
    layoutEmissionCount = 0
    replicatorLayer.instanceCount = 1
    replicatorLayer.instanceTransform = CATransform3DIdentity
    contentView?.layer.transform = CATransform3DIdentity
  }

  public func invalidateRenderer() {
    resetForReuse()
    notificationTokens.forEach(NotificationCenter.default.removeObserver)
    notificationTokens.removeAll()
    contentBoundsObservation = nil
  }

  public override func didAddSubview(_ subview: UIView) {
    super.didAddSubview(subview)
    precondition(subviews.count <= 1, "Marquee accepts exactly one package-owned content container.")
    subview.isUserInteractionEnabled = false
    subview.accessibilityElementsHidden = true
    contentBoundsObservation = subview.observe(\.bounds, options: [.new]) { [weak self, weak subview] _, _ in
      DispatchQueue.main.async {
        guard let self, let subview, subview.superview === self else { return }
        self.synchronizeContentWidth(subview.bounds.width)
      }
    }
    DispatchQueue.main.async { [weak self] in
      guard let self, subview.superview === self else { return }
      self.configureReplication(preservingOffset: self.currentPhysicalOffset())
      self.evaluateMotion()
    }
  }

  public override func willRemoveSubview(_ subview: UIView) {
    if subview === contentView {
      contentBoundsObservation = nil
      freezeMotion()
      period = 0
      replicatorLayer.instanceCount = 1
    }
    super.willRemoveSubview(subview)
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
    let containerWidthChanged = abs(bounds.width - lastReplicationContainerWidth) > geometryEpsilon
    if containerWidthChanged {
      let offset = currentPhysicalOffset()
      freezeMotion()
      lastReplicationContainerWidth = bounds.width
      configureReplication(preservingOffset: offset)
    }
    emitLayoutIfNeeded()
    if containerWidthChanged { evaluateMotion() }
  }

  public override func didMoveToWindow() {
    super.didMoveToWindow()
    if window == nil {
      cancelResume()
      freezeMotion()
      emitCurrentState()
      return
    }
    evaluateMotion()
  }

  public func gestureRecognizer(
    _ gestureRecognizer: UIGestureRecognizer,
    shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer
  ) -> Bool {
    gestureRecognizer === holdGesture || otherGestureRecognizer === holdGesture
  }

  public override func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
    guard gestureRecognizer === panGesture else { return true }
    let velocity = panGesture.velocity(in: self)
    return MarqueeMath.shouldBeginPan(
      velocity: velocity,
      startX: panGesture.location(in: self).x,
      containerWidth: bounds.width
    )
  }

  private var geometryEpsilon: CGFloat {
    0.5 / max(1, window?.screen.scale ?? UIScreen.main.scale)
  }

  private var directionSign: CGFloat {
    configuration.direction == "right" ? 1 : -1
  }

  private var effectiveReduceMotion: Bool {
    configuration.reduceMotion || UIAccessibility.isReduceMotionEnabled
  }

  private var shouldRepeatShortContent: Bool {
    configuration.shortContentMode == "repeat"
  }

  private var canScrollGeometry: Bool {
    period > 0 && contentView != nil
      && (configuration.contentWidth > bounds.width + geometryEpsilon || shouldRepeatShortContent)
  }

  private var shouldAnimate: Bool {
    configuration.active && isApplicationActive && window != nil && !effectiveReduceMotion
      && canScrollGeometry && configuration.speed > 0
  }

  private func setup() {
    clipsToBounds = true
    isAccessibilityElement = false
    accessibilityElementsHidden = true
    panGesture.delegate = self
    holdGesture.delegate = self
    holdGesture.minimumPressDuration = 0
    holdGesture.cancelsTouchesInView = false
    addGestureRecognizer(panGesture)
    addGestureRecognizer(holdGesture)
    registerNotifications()
  }

  private func sanitizeConfiguration(_ value: MarqueeConfiguration) {
    value.contentWidth = finiteNonnegative(value.contentWidth, fallback: 0)
    value.spacing = finiteNonnegative(value.spacing, fallback: 0)
    value.speed = finiteNonnegative(value.speed, fallback: 0)
    value.maxFlingVelocity = finiteNonnegative(value.maxFlingVelocity, fallback: 0)
    value.resumeDelay = value.resumeDelay.isFinite ? max(0, value.resumeDelay) : 0
    value.deceleration = value.deceleration.isFinite
      && value.deceleration > 0 && value.deceleration < 1
      ? value.deceleration
      : 0.9985
    value.direction = value.direction == "right" ? "right" : "left"
    value.shortContentMode = value.shortContentMode == "repeat" ? "repeat" : "static"
    value.contentAlignment = ["center", "end"].contains(value.contentAlignment)
      ? value.contentAlignment
      : "start"
  }

  private func finiteNonnegative(_ value: CGFloat, fallback: CGFloat) -> CGFloat {
    value.isFinite ? max(0, value) : fallback
  }

  private func synchronizeContentWidth(_ width: CGFloat) {
    guard width.isFinite, width >= 0,
      abs(configuration.contentWidth - width) > geometryEpsilon else {
      return
    }
    let offset = currentPhysicalOffset()
    freezeMotion()
    configuration.contentWidth = width
    configureReplication(preservingOffset: offset)
    emitLayoutIfNeeded(force: true)
    evaluateMotion()
  }

  private func configureReplication(preservingOffset offset: CGFloat) {
    period = configuration.contentWidth > 0
      ? configuration.contentWidth + configuration.spacing
      : 0
    guard contentView != nil, period > 0 else {
      replicatorLayer.instanceCount = 1
      replicatorLayer.instanceTransform = CATransform3DIdentity
      sourceBaseX = 0
      setContentOffset(0)
      return
    }

    let needsLoop = configuration.contentWidth > bounds.width + geometryEpsilon
      || shouldRepeatShortContent
    let repeatCount = needsLoop
      ? max(2, Int(ceil(max(0, bounds.width) / period)) + 2)
      : 1
    CATransaction.begin()
    CATransaction.setDisableActions(true)
    replicatorLayer.instanceCount = repeatCount
    if configuration.direction == "right" && needsLoop {
      replicatorLayer.instanceTransform = CATransform3DMakeTranslation(-period, 0, 0)
      sourceBaseX = CGFloat(max(0, repeatCount - 2)) * period
    } else {
      replicatorLayer.instanceTransform = needsLoop
        ? CATransform3DMakeTranslation(period, 0, 0)
        : CATransform3DIdentity
      sourceBaseX = needsLoop ? 0 : staticContentOffset()
    }
    setContentOffset(needsLoop ? offset : 0)
    CATransaction.commit()
  }

  private func staticContentOffset() -> CGFloat {
    let available = max(0, bounds.width - configuration.contentWidth)
    switch configuration.contentAlignment {
    case "center": return available / 2
    case "end": return available
    default: return 0
    }
  }

  private func currentPhysicalOffset() -> CGFloat {
    guard period > 0, let contentView else { return 0 }
    let transform = contentView.layer.animation(forKey: animationKey) != nil
      ? contentView.layer.presentation()?.transform ?? contentView.layer.transform
      : contentView.layer.transform
    return directionSign * MarqueeMath.positiveModulo(
      directionSign * (transform.m41 - sourceBaseX),
      modulus: period
    )
  }

  private func setContentOffset(_ offset: CGFloat) {
    guard let contentView else { return }
    let normalized = canScrollGeometry && period > 0
      ? directionSign * MarqueeMath.positiveModulo(directionSign * offset, modulus: period)
      : 0
    CATransaction.begin()
    CATransaction.setDisableActions(true)
    contentView.layer.transform = CATransform3DMakeTranslation(sourceBaseX + normalized, 0, 0)
    CATransaction.commit()
  }

  private func startAutoAnimation() {
    guard shouldAnimate, !isHolding, !isDragging, displayLink == nil, let contentView else {
      emitCurrentState()
      return
    }
    let offset = currentPhysicalOffset()
    contentView.layer.removeAnimation(forKey: animationKey)
    setContentOffset(offset)
    let animation = CABasicAnimation(keyPath: "transform.translation.x")
    animation.fromValue = sourceBaseX + offset
    animation.toValue = sourceBaseX + offset + directionSign * period
    animation.duration = CFTimeInterval(period / max(1, configuration.speed))
    animation.repeatCount = .infinity
    animation.timingFunction = CAMediaTimingFunction(name: .linear)
    animation.isRemovedOnCompletion = true
    contentView.layer.add(animation, forKey: animationKey)
    autoAnimationRestartCount += 1
    emitState(.running)
  }

  private func removeAutoAnimation(preservePresentation: Bool) {
    let offset = preservePresentation ? currentPhysicalOffset() : 0
    contentView?.layer.removeAnimation(forKey: animationKey)
    setContentOffset(offset)
  }

  private func freezeMotion() {
    stopDisplayLink()
    removeAutoAnimation(preservePresentation: true)
  }

  private func evaluateMotion() {
    guard !effectiveReduceMotion else {
      cancelResume()
      freezeMotion()
      setContentOffset(0)
      emitState(.reducedMotion)
      return
    }
    guard canScrollGeometry else {
      freezeMotion()
      sourceBaseX = staticContentOffset()
      setContentOffset(0)
      emitState(.idle)
      return
    }
    guard configuration.speed > 0 else {
      freezeMotion()
      emitState(.idle)
      return
    }
    guard configuration.active, isApplicationActive, window != nil else {
      freezeMotion()
      emitState(.paused)
      return
    }
    guard !isHolding, !isDragging else {
      emitState(.paused)
      return
    }
    startAutoAnimation()
  }

  @objc private func handleHold(_ gesture: UILongPressGestureRecognizer) {
    guard configuration.pauseOnPress, canScrollGeometry, !effectiveReduceMotion else { return }
    switch gesture.state {
    case .began:
      cancelResume()
      isHolding = true
      freezeMotion()
      emitState(.paused)
    case .ended, .cancelled, .failed:
      isHolding = false
      if !isDragging { scheduleResume() }
    default:
      break
    }
  }

  @objc private func handlePan(_ gesture: UIPanGestureRecognizer) {
    guard canScrollGeometry, !effectiveReduceMotion else { return }
    switch gesture.state {
    case .began:
      beginDrag()
    case .changed:
      queueDrag(translation: gesture.translation(in: self).x)
    case .ended:
      endDrag(
        translation: gesture.translation(in: self).x,
        velocity: gesture.velocity(in: self).x
      )
    case .cancelled, .failed:
      cancelDrag()
    default:
      break
    }
  }

  private func beginDrag() {
    cancelResume()
    isDragging = true
    freezeMotion()
    panStartOffset = currentPhysicalOffset()
    pendingDragOffset = panStartOffset
    startDisplayLink(mode: .dragging)
    emitState(.paused)
  }

  private func queueDrag(translation: CGFloat) {
    pendingDragOffset = panStartOffset + translation
  }

  private func applyPendingDragOffset() {
    guard let pendingDragOffset else { return }
    setContentOffset(pendingDragOffset)
    self.pendingDragOffset = nil
  }

  private func endDrag(translation: CGFloat, velocity: CGFloat) {
    queueDrag(translation: translation)
    applyPendingDragOffset()
    stopDisplayLink()
    isDragging = false
    isHolding = false
    beginInertia(velocity: velocity)
  }

  private func cancelDrag() {
    applyPendingDragOffset()
    stopDisplayLink()
    isDragging = false
    isHolding = false
    scheduleResume()
  }

  private func beginInertia(velocity: CGFloat) {
    let maximum = max(0, configuration.maxFlingVelocity)
    let clampedVelocity = min(maximum, max(-maximum, velocity))
    guard shouldAnimate else {
      scheduleResume()
      return
    }
    stopDisplayLink()
    inertiaVelocity = clampedVelocity
    isBlendingToAuto = false
    blendElapsed = 0
    lastDisplayTimestamp = 0
    if abs(inertiaVelocity) < 8 {
      blendStartVelocity = inertiaVelocity
      isBlendingToAuto = true
    }
    startDisplayLink(mode: .inertia)
    emitState(.running)
  }

  private func startDisplayLink(mode: InteractiveDisplayMode) {
    let link = CADisplayLink(target: self, selector: #selector(stepDisplayLink(_:)))
    let maximum = Float(max(1, window?.screen.maximumFramesPerSecond ?? 60))
    link.preferredFrameRateRange = CAFrameRateRange(
      minimum: min(60, maximum),
      maximum: maximum,
      preferred: maximum
    )
    interactiveDisplayMode = mode
    displayLink = link
    link.add(to: .main, forMode: .common)
  }

  @objc private func stepDisplayLink(_ link: CADisplayLink) {
    guard interactiveDisplayMode == .inertia else {
      applyPendingDragOffset()
      return
    }
    if lastDisplayTimestamp == 0 {
      lastDisplayTimestamp = link.timestamp
      return
    }
    let elapsed = MarqueeMath.clampedFrameElapsed(
      elapsed: link.timestamp - lastDisplayTimestamp,
      frameInterval: link.targetTimestamp - link.timestamp
    )
    lastDisplayTimestamp = link.timestamp
    if isBlendingToAuto {
      blendElapsed = min(autoBlendDuration, blendElapsed + elapsed)
      let velocity = MarqueeMath.blendedVelocity(
        from: blendStartVelocity,
        to: directionSign * configuration.speed,
        progress: blendElapsed / autoBlendDuration
      )
      setContentOffset(currentPhysicalOffset() + velocity * elapsed)
      if blendElapsed >= autoBlendDuration {
        stopDisplayLink()
        startAutoAnimation()
      }
      return
    }
    setContentOffset(currentPhysicalOffset() + inertiaVelocity * elapsed)
    inertiaVelocity *= pow(configuration.deceleration, elapsed * 1_000)
    if abs(inertiaVelocity) < max(8, configuration.speed * 2) {
      blendStartVelocity = inertiaVelocity
      blendElapsed = 0
      isBlendingToAuto = true
    }
  }

  private func stopDisplayLink() {
    displayLink?.invalidate()
    displayLink = nil
    interactiveDisplayMode = nil
    pendingDragOffset = nil
    lastDisplayTimestamp = 0
    inertiaVelocity = 0
    isBlendingToAuto = false
    blendStartVelocity = 0
    blendElapsed = 0
  }

  private func scheduleResume() {
    cancelResume()
    let generation = sessionGeneration
    let work = DispatchWorkItem { [weak self] in
      guard let self, self.sessionGeneration == generation else { return }
      self.evaluateMotion()
    }
    resumeWorkItem = work
    DispatchQueue.main.asyncAfter(
      deadline: .now() + max(0, configuration.resumeDelay),
      execute: work
    )
  }

  private func cancelResume() {
    resumeWorkItem?.cancel()
    resumeWorkItem = nil
  }

  private func emitCurrentState() {
    if effectiveReduceMotion {
      emitState(.reducedMotion)
      return
    }
    if !canScrollGeometry || configuration.speed <= 0 {
      emitState(.idle)
      return
    }
    if !configuration.active || !isApplicationActive || window == nil {
      emitState(.paused)
      return
    }
    emitState(isHolding || isDragging ? .paused : .running)
  }

  private func emitState(_ state: MarqueeState) {
    guard state != lastState else { return }
    lastState = state
    delegate?.marqueeRenderer(self, didChangeState: state.rawValue)
  }

  private func emitLayoutIfNeeded(force: Bool = false) {
    let containerWidth = bounds.width
    guard force || abs(configuration.contentWidth - lastLayoutWidth) > geometryEpsilon
      || abs(containerWidth - lastContainerWidth) > geometryEpsilon else {
      return
    }
    lastLayoutWidth = configuration.contentWidth
    lastContainerWidth = containerWidth
    layoutEmissionCount += 1
    delegate?.marqueeRenderer(
      self,
      didLayoutContentWidth: configuration.contentWidth,
      containerWidth: containerWidth
    )
  }

  private func registerNotifications() {
    let center = NotificationCenter.default
    notificationTokens.append(center.addObserver(
      forName: UIApplication.didEnterBackgroundNotification,
      object: nil,
      queue: .main
    ) { [weak self] _ in
      self?.isApplicationActive = false
      self?.cancelResume()
      self?.freezeMotion()
      self?.emitCurrentState()
    })
    notificationTokens.append(center.addObserver(
      forName: UIApplication.didBecomeActiveNotification,
      object: nil,
      queue: .main
    ) { [weak self] _ in
      self?.isApplicationActive = true
      self?.evaluateMotion()
    })
    notificationTokens.append(center.addObserver(
      forName: UIAccessibility.reduceMotionStatusDidChangeNotification,
      object: nil,
      queue: .main
    ) { [weak self] _ in
      self?.evaluateMotion()
    })
  }

  var testingContentWidth: CGFloat { configuration.contentWidth }
  var testingHoldEnabled: Bool { holdGesture.isEnabled }
  var testingHoldMinimumPressDuration: TimeInterval { holdGesture.minimumPressDuration }
  var testingHoldCancelsTouchesInView: Bool { holdGesture.cancelsTouchesInView }
  var testingDisplayLinkPreferredFrameRate: Float? {
    displayLink?.preferredFrameRateRange.preferred
  }
  var testingHasDisplayLink: Bool { displayLink != nil }
  var testingState: String? { lastState?.rawValue }
  var testingHasAutoAnimation: Bool {
    contentView?.layer.animation(forKey: animationKey) != nil
  }
  var testingAutoAnimationRestartCount: Int { autoAnimationRestartCount }
  var testingPhysicalOffset: CGFloat { currentPhysicalOffset() }
  var testingInertiaVelocity: CGFloat { inertiaVelocity }
  var testingLayoutEmissionCount: Int { layoutEmissionCount }
  var testingPeriod: CGFloat { period }
  var testingReplicaOrigins: [CGFloat] {
    (0..<replicatorLayer.instanceCount).map { instance in
      sourceBaseX + CGFloat(instance) * replicatorLayer.instanceTransform.m41
    }
  }
  func testingBeginInertia(_ velocity: CGFloat) { beginInertia(velocity: velocity) }
  func testingBeginDrag() { beginDrag() }
  func testingQueueDrag(translation: CGFloat) { queueDrag(translation: translation) }
  func testingStepDrag() { applyPendingDragOffset() }
  func testingEndDrag(translation: CGFloat, velocity: CGFloat) {
    endDrag(translation: translation, velocity: velocity)
  }
  func testingSetOffset(_ offset: CGFloat) {
    contentView?.layer.removeAnimation(forKey: animationKey)
    setContentOffset(offset)
  }

  private let autoBlendDuration: CFTimeInterval = 0.35
  private let animationKey = "marquee.auto"
}
