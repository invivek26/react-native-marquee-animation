# Maestro development-build flows

The checked-in flows target an installed release build. They launch the app
directly and require no Metro server. This matches release CI.

For local development, install the development build, start Metro from
`example/`, and open it before running an individual flow:

```sh
bun start --port 8081
# iOS Simulator
xcrun simctl openurl booted 'marquee-example://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081'
# Android emulator
adb shell am start -a android.intent.action.VIEW -d 'marquee-example://expo-development-client/?url=http%3A%2F%2F10.0.2.2%3A8081'
```

The example accepts the benchmark URL contract:

```text
marquee-example://benchmark?scenario=<baseline|static|active|updates|gesture|stress>&count=<1|10|30|100>&durationSeconds=<n>
```

Android emulator flows connect to Metro through `10.0.2.2`; iOS Simulator
flows use `127.0.0.1`. The development build must already be installed with
bundle/package ID `com.invivek26.marqueeexample`.

Run all flows against an installed release app with:

```sh
maestro test maestro
```

The accessibility flows verify the app's single summary representation and
exercise forced/system Reduce Motion modes. Full screen-reader traversal and
changing the OS setting itself remain device-matrix tests because Maestro does
not offer a portable cross-platform command for those system settings.
