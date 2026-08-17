# Testing

## Test layers

### JavaScript

Unit tests cover public option resolution, measured-width filtering, native
state mapping, forwarded view props, and the one-child public contract.

### Native unit tests

Both platforms test modulo/wrap math, phase rebasing, velocity, same-width and
width-changing content measurements, Reduce Motion, and recycle cleanup. iOS
tests exercise attached Core Animation without restart. Android device tests
mount and draw an arbitrary child tree, enforce one mounted container, and
cover vertical-scroll arbitration and edge-gesture exclusion.

Android JVM tests run through the autolinked example Gradle project. iOS engine
tests run from the root Swift Package XCTest harness on a simulator.
Android instrumented lifecycle and view tests run on the same emulator used for
the scheduled Release Maestro suite.

### Packed consumers

CI builds the publish tarball once, verifies a strict required/forbidden content
policy and size budget, installs it into a clean TypeScript consumer, and then
builds clean Expo Android and iOS Release consumers from that tarball. Workspace
and packed consumers are separate matrix entries so local source resolution
cannot hide a broken package.

### End-to-end

Maestro runs installed Release applications on both platforms. The automated
Release flows cover:

- static short content and static overflow;
- same-width and width-changing value updates;
- rapid updates at and near a loop seam;
- Reduce Motion changes during motion;
- background, foreground, navigation blur, detach, and reattach;
- list recycling with many simultaneous marquees;
- one accessibility representation;
- pause, press, gesture, and resume behavior when enabled.

The scheduled workflow installs Release applications and runs the platform
smoke, lifecycle, accessibility, gesture, and stress flows in `maestro/`.

Before promoting a stable release, the manual device matrix additionally
checks rotation/container resize, RTL, Dynamic Type/font scaling, the
consumer's embedded custom font, high contrast, and 60/90/120 Hz hardware.

## Benchmark contract

The example exposes:

```text
marquee-example://benchmark?scenario=<baseline|static|active|updates|gesture|stress>&count=<1|10|30|100>&speed=<25|50|100>&durationSeconds=<n>&sparklines=<0|1>
```

The app identity is `com.invivek26.marqueeexample`, Android launches
`MainActivity`, and the iOS scheme is `MarqueeExample`.

Release benchmarks record frame-time percentiles, jank/dropped frames, UI and
JavaScript utilization, CPU, allocations, memory, native view/layer count, and
energy where supported. They exercise one, ten, thirty, and one hundred
instances, including active updates and list scrolling.

Required invariants:

- no per-frame JavaScript work;
- no scheduled frame work while short, paused, detached, backgrounded, or under
  Reduce Motion;
- bounded allocations after warmup;
- no native view, layer, callback, or listener leak after recycle;
- no blank viewport or pixel-visible seam;
- pixel-identical child rendering while moving and stationary.

Numerical regression thresholds must be derived from a checked-in baseline on
representative physical devices before they become release gates.

## Local package verification

```sh
bun run check
bun run build
archive=$(bun pm pack --ignore-scripts --destination /tmp --quiet | tail -n 1)
./scripts/verify-package-contents.sh "$archive"
```
