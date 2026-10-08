import XCTest
@testable import RNMarquee

final class MarqueeMathTests: XCTestCase {
  func testPositiveModuloWrapsBothDirections() {
    XCTAssertEqual(MarqueeMath.positiveModulo(-1, modulus: 10), 9)
    XCTAssertEqual(MarqueeMath.positiveModulo(11, modulus: 10), 1)
  }

  func testPositiveModuloRejectsInvalidGeometry() {
    XCTAssertEqual(MarqueeMath.positiveModulo(12, modulus: 0), 0)
    XCTAssertEqual(MarqueeMath.positiveModulo(.infinity, modulus: 10), 0)
  }

  func testPanRequiresHorizontalDominanceAndAvoidsSystemEdges() {
    XCTAssertTrue(MarqueeMath.shouldBeginPan(
      velocity: CGPoint(x: 200, y: 20),
      startX: 100,
      containerWidth: 300
    ))
    XCTAssertFalse(MarqueeMath.shouldBeginPan(
      velocity: CGPoint(x: 20, y: 200),
      startX: 100,
      containerWidth: 300
    ))
    XCTAssertFalse(MarqueeMath.shouldBeginPan(
      velocity: CGPoint(x: 200, y: 20),
      startX: 8,
      containerWidth: 300
    ))
  }

  func testContentPressMapsEveryCopyToOneContentCoordinate() {
    let press = { (touchX: CGFloat, contentLeft: CGFloat) in
      MarqueeMath.contentPressX(
        touchX: touchX,
        contentLeft: contentLeft,
        contentWidth: 100,
        period: 120,
        repeats: true
      )
    }
    XCTAssertEqual(press(30, 0), 30)
    XCTAssertEqual(press(150, 0), 30)
    XCTAssertEqual(press(-90, 0), 30)
    XCTAssertEqual(press(30, -2_490), 0)
    XCTAssertEqual(press(30, 1_210), 20)
    XCTAssertEqual(press(10, 0), 10)
  }

  func testContentPressInSpacingGapIsIgnored() {
    XCTAssertNil(MarqueeMath.contentPressX(
      touchX: 110, contentLeft: 0, contentWidth: 100, period: 120, repeats: true
    ))
    XCTAssertNil(MarqueeMath.contentPressX(
      touchX: -15, contentLeft: 0, contentWidth: 100, period: 120, repeats: true
    ))
    XCTAssertNil(MarqueeMath.contentPressX(
      touchX: 10, contentLeft: 0, contentWidth: 100, period: 0, repeats: true
    ))
  }

  func testStaticContentPressHonorsAlignmentOffsetAndBounds() {
    let press = { (touchX: CGFloat) in
      MarqueeMath.contentPressX(
        touchX: touchX, contentLeft: 110, contentWidth: 100, period: 132, repeats: false
      )
    }
    XCTAssertEqual(press(160), 50)
    XCTAssertEqual(press(110), 0)
    XCTAssertNil(press(100))
    XCTAssertNil(press(210))
    XCTAssertNil(press(250))
  }

  func testVelocityBlendIsSmoothAndBounded() {
    XCTAssertEqual(MarqueeMath.blendedVelocity(from: 100, to: -25, progress: 0), 100)
    XCTAssertEqual(MarqueeMath.blendedVelocity(from: 100, to: -25, progress: 0.5), 37.5)
    XCTAssertEqual(MarqueeMath.blendedVelocity(from: 100, to: -25, progress: 1), -25)
  }

  func testInteractiveFrameElapsedClampsToCurrentDisplayInterval() {
    XCTAssertEqual(
      MarqueeMath.clampedFrameElapsed(elapsed: 0.1, frameInterval: 1 / 60),
      1.25 / 60,
      accuracy: 0.000_001
    )
    XCTAssertEqual(
      MarqueeMath.clampedFrameElapsed(elapsed: 0.1, frameInterval: 1 / 120),
      1.25 / 120,
      accuracy: 0.000_001
    )
  }
}
