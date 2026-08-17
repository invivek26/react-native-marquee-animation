# Contributing

## Prerequisites

- Bun 1.3.11
- Node.js 20.19.4 or newer
- JDK 17 and the Android SDK
- macOS, Xcode, and CocoaPods for iOS work
- Maestro for end-to-end flows

Use Bun for JavaScript dependency installation. The root is the library and
`example/` is an Expo SDK 56 development-build fixture linked to the package.
Expo Go cannot load the Fabric component.

```sh
bun install --frozen-lockfile
bun run check
```

Focused checks include:

```sh
bun run format:check
bun run lint
bun run typecheck
bun test
bun run build
```

Native source, the Codegen spec, podspec, or Gradle configuration changes
require regenerating and rebuilding the example application:

```sh
cd example
bunx expo prebuild --clean
bun run ios
# or: bun run android
```

## Engineering expectations

- Preserve the New-Architecture-only contract and consumer-generated Codegen
  bindings.
- Keep per-frame work native. JavaScript supplies data and configuration, not
  animation ticks.
- Animate transforms or compositor-backed layer position. Do not trigger React
  layout on each frame.
- Preserve the one-child-tree invariant. A React rerender or same-width child
  update must not restart motion.
- Keep one accessible representation while hiding native visual repetitions.
- Stop all timers, callbacks, animators, and display links when short, paused,
  reduced-motion, detached, recycled, backgrounded, or otherwise invisible.
- Test interruption from the current presentation position, not only settled
  state-to-state transitions.
- Keep child rendering owned by React Native so moving and stationary pixels
  use exactly the same fonts, images, and view implementation.
- Include Release-build profile evidence with performance claims.

See [docs/testing.md](docs/testing.md) before changing motion, layout, content
updates, lifecycle behavior, or accessibility.

## Pull requests

- Use Conventional Commits.
- Keep changes focused and document observable behavior.
- Add tests for every changed invariant.
- Run `bun run check` and the affected native Release build.
- Do not commit generated `example/ios`, `example/android`, Codegen output,
  native build output, package tarballs, or benchmark captures.
- Update public and architecture documentation with contract changes.
- Discuss large API or architecture changes before implementation.

## Releases

Maintainers use `bun run release` for stable versions and
`bun run release:next` for prereleases. Both run all package checks before
creating a clean version commit and tag. Publishing is performed only by the
tag-triggered GitHub workflow; do not publish from a workstation.
