#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BENCHMARK_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

SCENARIO="${1:-active}"
COUNT="${2:-1}"
DURATION_SECONDS="${DURATION_SECONDS:-30}"
APP_PACKAGE="${APP_PACKAGE:-com.invivek26.marqueeexample}"
APP_ACTIVITY="${APP_ACTIVITY:-MainActivity}"
DEVICE_SERIAL="${ANDROID_SERIAL:-}"
OUTPUT_ROOT="${OUTPUT_ROOT:-$BENCHMARK_DIR/results/android}"
CAPTURE_VIDEO="${CAPTURE_VIDEO:-1}"
SPARKLINES="${SPARKLINES:-1}"

case "$SCENARIO" in
  baseline|static|active|updates|gesture|stress) ;;
  *) echo "Unknown scenario: $SCENARIO" >&2; exit 2 ;;
esac

case "$COUNT" in
  1|10|30|100) ;;
  *) echo "Count must be one of 1, 10, 30, 100" >&2; exit 2 ;;
esac

command -v adb >/dev/null || { echo "adb is required" >&2; exit 1; }

ADB=(adb)
if [[ -n "$DEVICE_SERIAL" ]]; then
  ADB+=( -s "$DEVICE_SERIAL" )
fi

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RUN_DIR="$OUTPUT_ROOT/$TIMESTAMP-$SCENARIO-$COUNT"
mkdir -p "$RUN_DIR"

URI="marquee-example://benchmark?scenario=$SCENARIO&count=$COUNT&durationSeconds=$DURATION_SECONDS&sparklines=$SPARKLINES"
REMOTE_TRACE="/data/misc/perfetto-traces/marquee-animation-$TIMESTAMP.pftrace"
REMOTE_VIDEO="/sdcard/marquee-animation-$TIMESTAMP.mp4"
CONFIG_FILE="$(mktemp -t marquee-animation-perfetto.XXXXXX)"
PERFETTO_LOG="$RUN_DIR/perfetto.log"
VIDEO_PID=""
PERFETTO_PID=""

cleanup() {
  if [[ -n "$PERFETTO_PID" ]]; then
    kill "$PERFETTO_PID" >/dev/null 2>&1 || true
  fi
  if [[ -n "$VIDEO_PID" ]]; then
    kill "$VIDEO_PID" >/dev/null 2>&1 || true
  fi
  rm -f "$CONFIG_FILE"
}
trap cleanup EXIT

sed \
  -e "s/__APP_PACKAGE__/$APP_PACKAGE/g" \
  -e "s/__DURATION_MS__/$((DURATION_SECONDS * 1000))/g" \
  "$BENCHMARK_DIR/perfetto/marquee.pbtxt" > "$CONFIG_FILE"
sed \
  -e "s/__APP_PACKAGE__/$APP_PACKAGE/g" \
  "$BENCHMARK_DIR/perfetto/frame-timeline.sql" > "$RUN_DIR/frame-timeline.sql"

"${ADB[@]}" shell am force-stop "$APP_PACKAGE"
"${ADB[@]}" shell dumpsys gfxinfo "$APP_PACKAGE" reset >/dev/null 2>&1 || true
"${ADB[@]}" shell am start -W \
  -n "$APP_PACKAGE/.$APP_ACTIVITY" \
  -a android.intent.action.VIEW \
  -d "$URI" > "$RUN_DIR/launch.txt"

sleep 2

if [[ "$CAPTURE_VIDEO" == "1" ]]; then
  "${ADB[@]}" shell screenrecord --time-limit "$((DURATION_SECONDS + 2))" "$REMOTE_VIDEO" \
    > "$RUN_DIR/screenrecord.log" 2>&1 &
  VIDEO_PID=$!
fi

"${ADB[@]}" shell perfetto --txt -c - -o "$REMOTE_TRACE" < "$CONFIG_FILE" \
  > "$PERFETTO_LOG" 2>&1 &
PERFETTO_PID=$!

if [[ "$SCENARIO" == "gesture" ]]; then
  DISPLAY_SIZE="$("${ADB[@]}" shell wm size | sed -nE 's/.* ([0-9]+)x([0-9]+).*/\1 \2/p' | tail -n 1)"
  read -r DISPLAY_WIDTH DISPLAY_HEIGHT <<< "$DISPLAY_SIZE"
  if [[ -z "${DISPLAY_WIDTH:-}" || -z "${DISPLAY_HEIGHT:-}" ]]; then
    echo "Unable to resolve Android display size for gesture coordinates" >&2
    exit 1
  fi
  GESTURE_X=$((DISPLAY_WIDTH / 2))
  GESTURE_START_Y=$((DISPLAY_HEIGHT * 85 / 100))
  GESTURE_END_Y=$((DISPLAY_HEIGHT * 20 / 100))
  END_TIME=$((SECONDS + DURATION_SECONDS))
  while (( SECONDS < END_TIME )); do
    "${ADB[@]}" shell input swipe \
      "$GESTURE_X" "$GESTURE_START_Y" "$GESTURE_X" "$GESTURE_END_Y" 450
    "${ADB[@]}" shell input swipe \
      "$GESTURE_X" "$GESTURE_END_Y" "$GESTURE_X" "$GESTURE_START_Y" 450
  done
fi

wait "$PERFETTO_PID"
PERFETTO_PID=""
"${ADB[@]}" pull "$REMOTE_TRACE" "$RUN_DIR/trace.pftrace" >/dev/null
"${ADB[@]}" shell rm -f "$REMOTE_TRACE"
"${ADB[@]}" shell dumpsys gfxinfo "$APP_PACKAGE" framestats > "$RUN_DIR/gfxinfo-framestats.txt"
"${ADB[@]}" shell dumpsys meminfo "$APP_PACKAGE" > "$RUN_DIR/meminfo.txt"

if [[ "$CAPTURE_VIDEO" == "1" ]]; then
  wait "$VIDEO_PID" || true
  VIDEO_PID=""
  "${ADB[@]}" pull "$REMOTE_VIDEO" "$RUN_DIR/screen.mp4" >/dev/null
  "${ADB[@]}" shell rm -f "$REMOTE_VIDEO"
fi

cat > "$RUN_DIR/metadata.json" <<EOF
{
  "platform": "android",
  "scenario": "$SCENARIO",
  "count": $COUNT,
  "sparklines": $SPARKLINES,
  "durationSeconds": $DURATION_SECONDS,
  "package": "$APP_PACKAGE",
  "route": "$URI",
  "capturedAt": "$TIMESTAMP"
}
EOF

cat <<EOF
Captured $SCENARIO/$COUNT to $RUN_DIR

Open the trace at https://ui.perfetto.dev or extract FrameTimeline rows with:
  trace_processor_shell "$RUN_DIR/trace.pftrace" -q "$RUN_DIR/frame-timeline.sql" --csv > "$RUN_DIR/frame-timeline.csv"
  node "$SCRIPT_DIR/summarize-frame-timeline.mjs" "$RUN_DIR/frame-timeline.csv" "$RUN_DIR/metadata.json" > "$RUN_DIR/metrics.json"
EOF
