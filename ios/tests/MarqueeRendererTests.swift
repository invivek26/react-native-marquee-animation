import UIKit
import XCTest
@testable import RNMarquee

@MainActor
final class MarqueeRendererTests: XCTestCase {
  func testPauseOnPressBeginsOnTouchDown() {
    let renderer = MarqueeRenderer(frame: CGRect(x: 0, y: 0, width: 200, height: 64))

    XCTAssertEqual(renderer.testingHoldMinimumPressDuration, 0)
    XCTAssertFalse(renderer.testingHoldCancelsTouchesInView)
  }

  func testPauseOnPressFalseDisablesStationaryPressRecognizer() {
    let (_, renderer) = attachedRenderer(width: 200)
    let config = configuration(contentWidth: 600)
    config.pauseOnPress = false

    renderer.applyConfiguration(config)

    XCTAssertFalse(renderer.testingHoldEnabled)
  }

  func testDragUpdatesAreCoalescedUntilDisplayRefresh() {
    let (_, renderer) = attachedRenderer(width: 200)
    renderer.applyConfiguration(configuration(contentWidth: 600))
    renderer.testingSetOffset(-100)
    renderer.testingBeginDrag()
    let initialOffset = renderer.testingPhysicalOffset

    renderer.testingQueueDrag(translation: 35)

    XCTAssertEqual(renderer.testingPhysicalOffset, initialOffset, accuracy: 0.5)
    renderer.testingStepDrag()
    XCTAssertEqual(renderer.testingPhysicalOffset, initialOffset + 35, accuracy: 0.5)
    renderer.resetForReuse()
  }

  func testDragEndFlushesFinalPositionBeforeInertia() {
    let (_, renderer) = attachedRenderer(width: 200)
    renderer.applyConfiguration(configuration(contentWidth: 600))
    renderer.testingSetOffset(-100)
    renderer.testingBeginDrag()

    renderer.testingEndDrag(translation: 60, velocity: 200)

    XCTAssertEqual(renderer.testingPhysicalOffset, -40, accuracy: 0.5)
    XCTAssertTrue(renderer.testingHasDisplayLink)
    renderer.resetForReuse()
  }

  func testInteractiveDisplayLinkPrefersActiveScreenRefreshRate() {
    let (window, renderer) = attachedRenderer(width: 200)
    renderer.applyConfiguration(configuration(contentWidth: 600))

    renderer.testingBeginInertia(200)

    XCTAssertEqual(
      renderer.testingDisplayLinkPreferredFrameRate,
      Float(window.screen.maximumFramesPerSecond)
    )
    renderer.resetForReuse()
  }

  func testRecycleStopsInteractiveDisplayLink() {
    let (_, renderer) = attachedRenderer(width: 200)
    renderer.applyConfiguration(configuration(contentWidth: 600))
    renderer.testingBeginDrag()

    renderer.resetForReuse()

    XCTAssertFalse(renderer.testingHasDisplayLink)
  }

  func testShortContentRemainsIdle() {
    let (_, renderer) = attachedRenderer(width: 320, contentWidth: 100)
    renderer.applyConfiguration(configuration(contentWidth: 100))

    XCTAssertEqual(renderer.testingContentWidth, 100)
    XCTAssertEqual(renderer.testingState, "idle")
    XCTAssertFalse(renderer.testingHasAutoAnimation)
  }

  func testOverflowingContentRunsOnCoreAnimation() {
    let (_, renderer) = attachedRenderer(width: 200)
    renderer.applyConfiguration(configuration(contentWidth: 600))

    XCTAssertEqual(renderer.testingState, "running")
    XCTAssertTrue(renderer.testingHasAutoAnimation)
  }

  func testReplicationNeverMutatesFabricChildFrame() {
    let (_, renderer) = attachedRenderer(width: 200)
    let child = try! XCTUnwrap(renderer.subviews.first)
    let fabricAnchorPoint = child.layer.anchorPoint
    let fabricPosition = child.layer.position

    renderer.applyConfiguration(configuration(contentWidth: 600))
    renderer.testingSetOffset(-487)

    XCTAssertEqual(child.layer.anchorPoint, fabricAnchorPoint)
    XCTAssertEqual(child.layer.position, fabricPosition)
  }

  func testSameWidthContentUpdatesDoNotRestartMotion() {
    let (_, renderer) = attachedRenderer(width: 200)
    let initial = configuration(contentWidth: 600)
    renderer.applyConfiguration(initial)
    let restartCount = renderer.testingAutoAnimationRestartCount

    let update = configuration(contentWidth: 600)
    renderer.applyConfiguration(update)

    XCTAssertEqual(renderer.testingAutoAnimationRestartCount, restartCount)
    XCTAssertTrue(renderer.testingHasAutoAnimation)
  }

  func testRedundantLayoutPassDoesNotRestartMotion() {
    let (_, renderer) = attachedRenderer(width: 200)
    renderer.applyConfiguration(configuration(contentWidth: 600))
    let restartCount = renderer.testingAutoAnimationRestartCount

    renderer.layoutSubviews()

    XCTAssertEqual(renderer.testingAutoAnimationRestartCount, restartCount)
  }

  func testWidthChangesPreservePhysicalPosition() {
    let (_, renderer) = attachedRenderer(width: 200)
    renderer.applyConfiguration(configuration(contentWidth: 600))
    renderer.testingSetOffset(-137)
    let before = renderer.testingPhysicalOffset

    renderer.subviews.first?.bounds.size.width = 720
    renderer.applyConfiguration(configuration(contentWidth: 720))

    XCTAssertEqual(renderer.testingPhysicalOffset, before, accuracy: 0.5)
  }

  func testManualOffsetsReadTheModelLayerImmediately() {
    let (_, renderer) = attachedRenderer(width: 200)
    renderer.applyConfiguration(configuration(contentWidth: 600))

    renderer.testingSetOffset(-135)
    renderer.testingSetOffset(-232)

    XCTAssertEqual(renderer.testingPhysicalOffset, -232, accuracy: 0.5)
  }

  func testRightwardReplicationStagesAFullCopyLeftOfViewport() {
    let (_, renderer) = attachedRenderer(width: 200, contentWidth: 100)
    let config = configuration(contentWidth: 100)
    config.direction = "right"
    config.shortContentMode = "repeat"
    config.spacing = 12

    renderer.applyConfiguration(config)

    XCTAssertLessThanOrEqual(
      renderer.testingReplicaOrigins.min() ?? 0,
      -renderer.testingPeriod
    )
  }

  func testReducedMotionStopsAnimation() {
    let (_, renderer) = attachedRenderer(width: 200)
    renderer.applyConfiguration(configuration(contentWidth: 600))
    let reduced = configuration(contentWidth: 600)
    reduced.reduceMotion = true
    renderer.applyConfiguration(reduced)

    XCTAssertEqual(renderer.testingState, "reducedMotion")
    XCTAssertFalse(renderer.testingHasAutoAnimation)
  }

  func testRecycleClearsState() {
    let (_, renderer) = attachedRenderer(width: 200)
    renderer.applyConfiguration(configuration(contentWidth: 600))
    renderer.resetForReuse()

    XCTAssertEqual(renderer.testingContentWidth, 0)
    XCTAssertFalse(renderer.testingHasAutoAnimation)
  }

  private func attachedRenderer(
    width: CGFloat,
    contentWidth: CGFloat = 600
  ) -> (UIWindow, MarqueeRenderer) {
    let window = UIWindow(frame: CGRect(x: 0, y: 0, width: width, height: 64))
    let renderer = MarqueeRenderer(frame: window.bounds)
    let content = UIView(frame: CGRect(x: 0, y: 0, width: contentWidth, height: 64))
    renderer.addSubview(content)
    window.addSubview(renderer)
    window.makeKeyAndVisible()
    renderer.layoutIfNeeded()
    return (window, renderer)
  }

  private func configuration(contentWidth: CGFloat) -> MarqueeConfiguration {
    let config = MarqueeConfiguration()
    config.contentWidth = contentWidth
    config.spacing = 32
    config.speed = 25
    config.reduceMotion = false
    return config
  }
}
