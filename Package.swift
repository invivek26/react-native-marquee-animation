// swift-tools-version: 5.9

import PackageDescription

let package = Package(
  name: "RNMarquee",
  platforms: [.iOS(.v17)],
  products: [
    .library(name: "RNMarquee", targets: ["RNMarquee"]),
  ],
  targets: [
    .target(
      name: "RNMarquee",
      path: "ios",
      exclude: ["RNMarqueeView.h", "RNMarqueeView.mm", "tests"],
      sources: ["MarqueeRenderer.swift"]
    ),
    .testTarget(
      name: "RNMarqueeTests",
      dependencies: ["RNMarquee"],
      path: "ios/tests",
      sources: ["MarqueeMathTests.swift", "MarqueeRendererTests.swift"],
      swiftSettings: [.define("STOCK_MARQUEE_TESTS")]
    ),
  ]
)
