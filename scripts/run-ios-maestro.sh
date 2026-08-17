#!/usr/bin/env bash
set -euo pipefail

: "${SIMULATOR_UDID:?SIMULATOR_UDID is required}"
: "${RUNNER_TEMP:?RUNNER_TEMP is required}"

flows=(
  maestro/ios-hosted-deep-link-preflight.yaml
  maestro/ios-showcase.yaml
  maestro/ios-smoke.yaml
  maestro/ios-lifecycle.yaml
  maestro/ios-accessibility.yaml
  maestro/ios-gesture.yaml
  maestro/ios-stress.yaml
)

for flow in "${flows[@]}"; do
  ~/.maestro/bin/maestro --device "${SIMULATOR_UDID}" test "$flow" \
    2>&1 | tee -a "${RUNNER_TEMP}/maestro-ios.log"
done
