SELECT
  actual.ts / 1000000.0 AS timestamp_ms,
  actual.dur / 1000000.0 AS duration_ms,
  (
    actual.ts + actual.dur - expected.ts - expected.dur
  ) / 1000000.0 AS frame_overrun_ms,
  actual.jank_type,
  actual.present_type,
  actual.on_time_finish,
  actual.layer_name
FROM actual_frame_timeline_slice AS actual
JOIN expected_frame_timeline_slice AS expected
  ON actual.display_frame_token = expected.display_frame_token
WHERE
  actual.dur > 0
  AND actual.layer_name GLOB '*__APP_PACKAGE__*'
ORDER BY actual.ts;
