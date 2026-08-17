# Architecture

## Ownership boundary

`Marquee` renders exactly one non-collapsible React Native content container
inside `RNMarqueeView`. React owns arbitrary child composition and state.
Native owns visual repetition, clipping, phase, automatic motion, gestures,
inertia, visibility, and lifecycle cleanup.

The child container reports width only when React Native layout changes. No
JavaScript callback, bridge message, state update, or layout calculation occurs
on animation frames.

## Why one child tree

The package never clones React elements. Cloning would duplicate component
state, image requests, native view identity, effects, gestures, and
accessibility nodes. Instead, one logical tree is rendered repeatedly:

- iOS uses `CAReplicatorLayer` instances of the one mounted child layer;
- Android calls `drawChild` at repeated offsets, replaying the existing
  hardware display lists rather than mounting duplicate views.

The consequence is intentional: visual replicas are not independent hit-test
or accessibility targets. Content is noninteractive and the marquee host owns
gestures.

## Position and updates

The loop period is `contentWidth + spacing`. Phase is stored as floating-point
physical distance and normalized with positive modulo arithmetic. Android
derives movement from monotonic frame timestamps; iOS Core Animation owns
steady translation.

Same-width child updates redraw the one live tree and do not reconfigure
motion. When layout changes width, the wrapper emits one new measurement and
native code preserves the current physical offset and velocity while changing
the period. There is never an empty replacement tree or a duplicated React
generation.

## iOS

The Objective-C++ Fabric shell forwards generated props/events and mounts the
single Fabric child directly into `MarqueeRenderer`. The Swift renderer is
backed by `CAReplicatorLayer`; automatic motion is an infinite linear transform
animation. `CADisplayLink` exists only during gesture inertia and the short
velocity blend back to compositor-driven motion.

## Android

The Kotlin Fabric manager owns a custom `ViewGroup` containing one child.
`dispatchDraw` clips to the viewport and replays that child at enough offsets to
cover the viewport and seam. Existing RenderNode/display-list caching remains
owned by the Android rendering pipeline. `Choreographer` updates a `Double`
phase from monotonic time with no per-frame allocations or JavaScript work.

## Unsupported surfaces

Ordinary React Native views, images, and composed drawing are supported.
External surfaces such as video, maps, cameras, `SurfaceView`, `TextureView`,
and Metal-backed content are not guaranteed to replay through layer/display
list replication. Nested interactive controls are also unsupported because a
visual replica is not another logical view.

## Lifecycle and accessibility

The host is one accessibility element with an explicit consumer-provided label;
the child container and every visual replica are hidden. Reduce Motion,
inactive state, detach, backgrounding, recycle, and offscreen visibility stop
all continuous animation work. Recycling clears callbacks, gestures, content
measurements, and event listeners before Fabric reuses a native view.
