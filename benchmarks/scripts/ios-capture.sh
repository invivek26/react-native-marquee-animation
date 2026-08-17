#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BENCHMARK_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

SCENARIO="${1:-active}"
COUNT="${2:-1}"
DURATION_SECONDS="${DURATION_SECONDS:-30}"
IOS_BUNDLE_ID="${IOS_BUNDLE_ID:-com.invivek26.marqueeexample}"
IOS_PROCESS_NAME="${IOS_PROCESS_NAME:-MarqueeExample}"
IOS_DEVICE="${IOS_DEVICE:-booted}"
IOS_DESTINATION="${IOS_DESTINATION:-simulator}"
INSTRUMENT_TEMPLATE="${INSTRUMENT_TEMPLATE:-Animation Hitches}"
OUTPUT_ROOT="${OUTPUT_ROOT:-$BENCHMARK_DIR/results/ios}"
CAPTURE_VIDEO="${CAPTURE_VIDEO:-1}"
USE_SIMULATOR_SAMPLE="${USE_SIMULATOR_SAMPLE:-1}"
SPARKLINES="${SPARKLINES:-1}"

case "$SCENARIO" in
  baseline|static|active|updates|gesture|stress) ;;
  *) echo "Unknown scenario: $SCENARIO" >&2; exit 2 ;;
esac

case "$COUNT" in
  1|10|30|100) ;;
  *) echo "Count must be one of 1, 10, 30, 100" >&2; exit 2 ;;
esac

command -v xcrun >/dev/null || { echo "Xcode command-line tools are required" >&2; exit 1; }

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RUN_DIR="$OUTPUT_ROOT/$TIMESTAMP-$SCENARIO-$COUNT"
mkdir -p "$RUN_DIR"
URI="marquee-example://benchmark?scenario=$SCENARIO&count=$COUNT&durationSeconds=$DURATION_SECONDS&sparklines=$SPARKLINES"
XCTRACE_DEVICE="$IOS_DEVICE"
ATTACH_TARGET="$IOS_PROCESS_NAME"
VIDEO_PID=""
TRACE_PID=""
PROFILER="$INSTRUMENT_TEMPLATE"

cleanup() {
  if [[ -n "$TRACE_PID" ]]; then
    kill "$TRACE_PID" >/dev/null 2>&1 || true
    wait "$TRACE_PID" >/dev/null 2>&1 || true
  fi
  if [[ -n "$VIDEO_PID" ]]; then
    kill -INT "$VIDEO_PID" >/dev/null 2>&1 || true
    wait "$VIDEO_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

if [[ "$IOS_DESTINATION" == "simulator" ]]; then
  xcrun simctl terminate "$IOS_DEVICE" "$IOS_BUNDLE_ID" >/dev/null 2>&1 || true
  xcrun simctl openurl "$IOS_DEVICE" "$URI"
  if [[ "$IOS_DEVICE" == "booted" ]]; then
    XCTRACE_DEVICE="$(xcrun simctl list devices booted | sed -nE 's/.*\(([0-9A-F-]{36})\).*/\1/p' | head -n 1)"
    if [[ -z "$XCTRACE_DEVICE" ]]; then
      echo "No booted iOS simulator found" >&2
      exit 1
    fi
  fi
  ATTACH_TARGET=""
  for _ in {1..30}; do
    ATTACH_TARGET="$(xcrun simctl spawn "$IOS_DEVICE" launchctl list \
      | awk -v bundle="$IOS_BUNDLE_ID" '$0 ~ bundle { print $1; exit }')"
    if [[ -n "$ATTACH_TARGET" && "$ATTACH_TARGET" != "-" ]]; then
      break
    fi
    sleep 0.2
  done
  if [[ -z "$ATTACH_TARGET" || "$ATTACH_TARGET" == "-" ]]; then
    echo "Unable to resolve the simulator process for $IOS_BUNDLE_ID" >&2
    exit 1
  fi
else
  xcrun devicectl device process launch \
    --device "$IOS_DEVICE" \
    --terminate-existing \
    --payload-url "$URI" \
    "$IOS_BUNDLE_ID" > "$RUN_DIR/launch.txt"
fi

sleep 2

if [[ "$CAPTURE_VIDEO" == "1" && "$IOS_DESTINATION" == "simulator" ]]; then
  xcrun simctl io "$IOS_DEVICE" recordVideo --codec=h264 "$RUN_DIR/screen.mp4" \
    > "$RUN_DIR/screenrecord.log" 2>&1 &
  VIDEO_PID=$!
fi

if [[ "$IOS_DESTINATION" == "simulator" && "$USE_SIMULATOR_SAMPLE" == "1" ]]; then
  PROFILER="sample"
  sample "$ATTACH_TARGET" "$DURATION_SECONDS" 1 -file "$RUN_DIR/sample.txt" \
    > "$RUN_DIR/sample.log" 2>&1 &
else
  xcrun xctrace record \
    --template "$INSTRUMENT_TEMPLATE" \
    --device "$XCTRACE_DEVICE" \
    --time-limit "${DURATION_SECONDS}s" \
    --output "$RUN_DIR/marquee.trace" \
    --no-prompt \
    --attach "$ATTACH_TARGET" &
fi
TRACE_PID=$!

if [[ "$SCENARIO" == "gesture" ]]; then
  if [[ "$IOS_DESTINATION" == "simulator" ]]; then
    command -v maestro >/dev/null || {
      echo "Maestro is required for the iOS simulator gesture scenario" >&2
      exit 1
    }
    sleep 2
    maestro test \
      --device "$XCTRACE_DEVICE" \
      -e APP_ID="$IOS_BUNDLE_ID" \
      -e COUNT="$COUNT" \
      -e DURATION_SECONDS="$DURATION_SECONDS" \
      -e SWIPE_REPETITIONS="$DURATION_SECONDS" \
      "$BENCHMARK_DIR/maestro/gesture.yaml" > "$RUN_DIR/maestro.log"
  else
    echo "Perform continuous up/down list swipes on the physical device for ${DURATION_SECONDS}s."
  fi
fi

wait "$TRACE_PID"
TRACE_PID=""

if [[ -n "$VIDEO_PID" ]]; then
  kill -INT "$VIDEO_PID" >/dev/null 2>&1 || true
  wait "$VIDEO_PID" || true
  VIDEO_PID=""
fi

if [[ -d "$RUN_DIR/marquee.trace" ]]; then
  xcrun xctrace export --input "$RUN_DIR/marquee.trace" --toc \
    --output "$RUN_DIR/toc.xml"
fi

cat > "$RUN_DIR/metadata.json" <<EOF
{
  "platform": "ios",
  "scenario": "$SCENARIO",
  "count": $COUNT,
  "sparklines": $SPARKLINES,
  "durationSeconds": $DURATION_SECONDS,
  "bundleId": "$IOS_BUNDLE_ID",
  "processName": "$IOS_PROCESS_NAME",
  "route": "$URI",
  "template": "$INSTRUMENT_TEMPLATE",
  "profiler": "$PROFILER",
  "capturedAt": "$TIMESTAMP"
}
EOF

echo "Captured $SCENARIO/$COUNT to $RUN_DIR"
