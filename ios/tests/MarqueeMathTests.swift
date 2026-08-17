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
