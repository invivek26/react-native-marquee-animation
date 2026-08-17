#!/usr/bin/env bash
set -euo pipefail

(cd example/android && ./gradlew :react-native-marquee-animation:connectedDebugAndroidTest)
adb install -r example/android/app/build/outputs/apk/release/app-release.apk
~/.maestro/bin/maestro test \
  maestro/android-showcase.yaml \
  maestro/android-smoke.yaml \
  maestro/android-lifecycle.yaml \
  maestro/android-accessibility.yaml \
  maestro/android-gesture.yaml \
  maestro/android-stress.yaml 2>&1 | tee "${RUNNER_TEMP}/maestro-android.log"
