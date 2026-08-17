# Native marquee performance benchmarks

This directory defines the production benchmark contract without coupling the package implementation to a particular renderer or example-screen component tree.

## Required example route

The example development/release build must handle:

```text
marquee-example://benchmark?scenario=<scenario>&count=<1|10|30|100>&durationSeconds=<seconds>&sparklines=<0|1>
```

The default iOS bundle ID and Android package are `com.invivek26.marqueeexample`. Android uses `.MainActivity`; the default iOS process name is `MarqueeExample`.

The route must render the selected workload immediately, without a menu animation, network dependency, or random data. Use a seeded data set and wait for embedded custom fonts before reporting the screen ready.

Set `sparklines=0` to remove only graph drawing while retaining identical item
geometry. Alternate graph-on and graph-off runs when isolating sparkline cost.

Stable automation identifiers expected by Maestro and manual trace notes are:

- Screen and controls: `benchmark-screen`, `benchmark-scenario`, `benchmark-count`, `benchmark-duration`, `benchmark-marquee-container`, `pause-button`, `resume-button`, and `reset-button`.
- Instances: `benchmark-marquee-0` through `benchmark-marquee-N`.
- Update state: `update-mode-same-width`, `update-mode-width-changing`, `update-mode-high-frequency`, and `update-count`.
- Lifecycle/accessibility: `lifecycle-status`, `reduce-motion-status`, `reduce-motion-system-button`, `reduce-motion-always-button`, `reduce-motion-never-button`, and `accessibility-summary`.
- Native state: `animation-status`, `layout-status`, and `benchmark-deep-link-help`.
- List pressure: `gallery-screen`, `gallery-scroll`, and `gallery-end`.
- Scenario selectors: `scenario-<scenario>-button` and `stress-count-<count>-button`.

## Workloads

[`workloads.json`](./workloads.json) is the source of truth. Its reference mixed-content child includes:

- Item width: 108
- Gap: 32
- Speed: 25 points/second
- One ordinary React Native image: 20 × 20
- Nested primary and secondary text: 12sp and 11sp
- A status badge
- A composed 48 × 22 chart made from child views
- Height: 50

Scenarios:

| Scenario   | Purpose                                                                            |
| ---------- | ---------------------------------------------------------------------------------- |
| `baseline` | Same hierarchy with marquee motion disabled.                                       |
| `static`   | Content fits; proves idle instances schedule no animation work.                    |
| `active`   | Static production children at 25 points/second.                                    |
| `updates`  | Alternating same-width and width-changing values every 100ms.                      |
| `gesture`  | Active marquees while a vertical virtualized list repeatedly scrolls and recycles. |
| `stress`   | Updates plus 100 mounted rows; only visible rows may animate.                      |

Counts 1, 10, 30, and 100 mean mounted marquee instances. Record the visible/active instance count in trace metadata when virtualization makes it lower.

## Android capture

Requirements: a release/profileable build installed on a physical device, `adb`, and Perfetto support.

```bash
benchmarks/scripts/android-capture.sh baseline 30
benchmarks/scripts/android-capture.sh active 30
benchmarks/scripts/android-capture.sh updates 30
benchmarks/scripts/android-capture.sh gesture 100
```

Useful overrides:

```bash
ANDROID_SERIAL=device-serial \
DURATION_SECONDS=60 \
CAPTURE_VIDEO=1 \
OUTPUT_ROOT=/tmp/marquee-android \
benchmarks/scripts/android-capture.sh stress 100
```

The script:

1. Force-stops and deep-links the app.
2. Resets `gfxinfo`.
3. Captures SurfaceFlinger FrameTimeline, scheduling, RenderThread/UI-thread, process, GPU-memory, and app trace events to a Perfetto trace.
4. Performs repeated swipes for `gesture`.
5. Saves `gfxinfo`, `meminfo`, metadata, and an optional screen recording.

Open `trace.pftrace` in [Perfetto](https://ui.perfetto.dev). If `trace_processor_shell` is installed, export raw FrameTimeline rows:

```bash
trace_processor_shell trace.pftrace \
  -q frame-timeline.sql \
  --csv > frame-timeline.csv

node benchmarks/scripts/summarize-frame-timeline.mjs \
  frame-timeline.csv \
  metadata.json > metrics.json
```

The capture directory contains a package-filtered `frame-timeline.sql`. The summarizer calculates frame count, janky-frame percentage, and p50/p95/p99 deadline overrun. Add CPU, memory, allocation, callback, and visual metrics from the companion captures before running the acceptance comparator.

Inspect:

- `actual_frame_timeline_slice` jank type and duration.
- UI thread and RenderThread around content updates and seams.
- Whether stationary/detached marquees retain animation callbacks.
- GC/allocation bursts during updates or recycling.
- GPU-memory growth as mounted count rises.

### JankStats

Perfetto is the release gate. JankStats adds field-style attribution. The copy-ready adapter in [`jankstats/MarqueeJankStats.kt`](./jankstats/MarqueeJankStats.kt) tags frames with scenario and mounted count. Integrate it only in the benchmark example build with `androidx.metrics:metrics-performance`; do not ship logging in the package.

Keep its reporting callback nonallocating/lightweight in the measured window. Aggregate primitive counts/durations and serialize after capture; do not retain the reused `FrameData` object. JankStats reports frame data from the frame-delivery thread, so expensive logging can create the jank being measured.

## iOS Instruments capture

Install a release build, boot the target simulator or connect a physical device, then run:

```bash
benchmarks/scripts/ios-capture.sh baseline 30
benchmarks/scripts/ios-capture.sh active 30
benchmarks/scripts/ios-capture.sh updates 30
benchmarks/scripts/ios-capture.sh gesture 100
```

Physical device example:

```bash
IOS_DESTINATION=device \
IOS_DEVICE='Vicky’s iPhone' \
DURATION_SECONDS=60 \
benchmarks/scripts/ios-capture.sh stress 100
```

Physical-device capture defaults to the `Animation Hitches` Instruments template. Override `INSTRUMENT_TEMPLATE` for a second pass with `Time Profiler`, `Allocations`, or another template reported by `xcrun xctrace list templates`:

```bash
INSTRUMENT_TEMPLATE='Time Profiler' benchmarks/scripts/ios-capture.sh active 30
```

Simulator capture uses macOS `sample` against the simulator process because the Hitches instrument is unavailable there; set `USE_SIMULATOR_SAMPLE=0` to explicitly exercise `xctrace`. It also writes `screen.mp4` by default. Set `CAPTURE_VIDEO=0` to disable it. For physical-device seam analysis, capture the screen with QuickTime or an equivalent lossless/high-bitrate workflow while Instruments records.

The iOS simulator `gesture` capture runs [`maestro/gesture.yaml`](./maestro/gesture.yaml) during the Instruments window and therefore requires Maestro. For physical iOS capture, the script prints a prompt and the operator performs continuous up/down swipes for the measured window. Android uses device-relative `adb input swipe` coordinates instead.

Use physical-device results for gates. Simulator recordings are useful only for correctness and trace-shape debugging.

Inspect:

- Hitch time ratio and individual hitches.
- Main-thread work at updates, layout changes, and loop boundaries.
- Core Animation commits and source-layer redraws.
- Allocations after the warm-up interval.
- CPU/energy while `static`, detached, backgrounded, and Reduce Motion is enabled.

## Seam and disappearance video check

Capture at the device refresh rate for at least three complete loop periods. Crop tightly to the marquee viewport so unrelated animation does not become an outlier:

```bash
node benchmarks/scripts/seam-video-check.mjs screen.mp4 \
  --crop=1080:120:0:640 \
  --fps=60 \
  --max-ratio=3
```

The script converts the crop to grayscale frames, measures mean absolute difference between adjacent frames, flags frames whose variance collapses relative to the median, and fails on a discontinuity ratio above the configured threshold. It writes `screen.mp4.seam.json`.

This is a regression detector, not proof of a perfect seam. Review outlier frames manually at 1× and frame-by-frame because value updates can legitimately create a visual difference. Run the seam gate on `active` with static children; use `updates` separately to assess position preservation.

## Measurement protocol

For each platform/device/refresh rate:

1. Use the same signed release build, OS, display brightness, refresh-rate setting, and power state.
2. Disable debugger/dev menu/log streaming.
3. Let the device return to a stable thermal state.
4. Run one discarded warm-up and at least five measured iterations.
5. Alternate baseline and candidate order to reduce thermal/order bias.
6. Capture `baseline`, `static`, `active`, `updates`, `gesture`, and `stress` for 1/10/30/100 where meaningful.
7. Report median plus p90/p95/p99 distributions; never report only an average.
8. Preserve the raw `.trace`/`.pftrace`, video, build SHA, package version, device model, OS, refresh rate, and thermal state.

The JS thread should also be deliberately blocked during one `active` run. Motion must continue because the animation is native-owned; no JS animation callback is allowed per frame.

## Acceptance gates

[`thresholds.json`](./thresholds.json) contains machine-readable gates. Key invariants:

- Zero blank frames.
- Zero JS callbacks used to advance animation.
- Zero application allocations per steady-state animation frame.
- Zero native animation callbacks for short/stationary/detached content.
- Seam discontinuity ratio ≤ 3 on static-child video.
- Janky-frame or iOS hitch-time ratio: ≤1% at 1, ≤2% at 10, ≤3% at 30, ≤5% at 100 mounted instances.
- p95 frame overrun ≤0ms and p99 ≤8ms on the agreed physical-device matrix.
- Stationary CPU ≤1 percentage point above the nonmoving baseline.
- Candidate jank/hitch ratios must not regress by more than 0.5 percentage points against its approved baseline.

The 100-count gate tests virtualization/lifecycle correctness, not 100 visible animations. A screen that actually displays 100 simultaneous marquees needs a separately approved device-specific budget.

Normalize exported results to:

```json
{
  "platform": "android",
  "scenario": "active",
  "count": 30,
  "metrics": {
    "jankyFramePercent": 0.5,
    "p95FrameOverrunMs": -1.2,
    "p99FrameOverrunMs": 3.1,
    "averageCpuPercent": 8.2,
    "peakMemoryMb": 148,
    "blankFrames": 0,
    "steadyStateAllocationsPerFrame": 0,
    "jsAnimationCallbacksPerSecond": 0,
    "seamDiscontinuityRatio": 1.4
  }
}
```

Compare an approved baseline and candidate after merging all required companion metrics. The comparator deliberately fails when platform/scenario-required fields are missing:

```bash
node benchmarks/scripts/compare-baseline.mjs \
  approved-baseline.json \
  candidate.json
```

Do not loosen a threshold because a single device is noisy. First repeat the capture, inspect the trace, and document any deliberate budget change with the device/OS evidence.

## Required lifecycle/correctness passes

Performance acceptance is incomplete until these are captured or manually verified:

- Attach/detach and temporary list recycling.
- Background/foreground without a time jump.
- Navigation blur/focus while the screen remains mounted.
- Reduce Motion toggled while running.
- Android animator scale 0 and Battery Saver.
- Font-size/Dynamic Type change while active.
- Embedded custom font, missing-font fallback, and no measurement before runtime font readiness.
- Width-stable and width-changing updates immediately before, at, and after the seam.
- Rotation/viewport resize and RTL.
- Async image completion without restart.
- No duplicate accessibility representation in VoiceOver/TalkBack.

## Primary references

- [Android Macrobenchmark frame metrics](https://developer.android.com/topic/performance/benchmarking/macrobenchmark-metrics)
- [Android JankStats](https://developer.android.com/topic/performance/jankstats)
- [Perfetto trace configuration](https://perfetto.dev/docs/concepts/config)
- [Apple XCTest performance metrics](https://developer.apple.com/documentation/xctest/performance-tests)
- [Apple: understanding UI animation hitches](https://developer.apple.com/documentation/xcode/understanding-hitches-in-your-app)
- [React Native performance overview](https://reactnative.dev/docs/performance)
