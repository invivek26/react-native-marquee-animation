#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import process from 'node:process';

const [baselinePath, candidatePath, thresholdsPath] = process.argv.slice(2);

if (!baselinePath || !candidatePath) {
  console.error(
    'Usage: compare-baseline.mjs BASELINE.json CANDIDATE.json [THRESHOLDS.json]'
  );
  process.exit(2);
}

const parseJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const baseline = await parseJson(baselinePath);
const candidate = await parseJson(candidatePath);
const thresholds = await parseJson(
  thresholdsPath ?? new URL('../thresholds.json', import.meta.url)
);

const failures = [];
const observations = [];
const count = String(candidate.count);
const candidateMetrics = candidate.metrics ?? {};
const baselineMetrics = baseline.metrics ?? {};
const requiredMetrics = [
  'averageCpuPercent',
  'peakMemoryMb',
  'blankFrames',
  'jsAnimationCallbacksPerSecond',
];

if (candidate.platform === 'android') {
  requiredMetrics.push(
    'jankyFramePercent',
    'p95FrameOverrunMs',
    'p99FrameOverrunMs'
  );
}
if (candidate.platform === 'ios') {
  requiredMetrics.push('hitchTimeRatioPercent');
}
if (candidate.scenario === 'active') {
  requiredMetrics.push(
    'steadyStateAllocationsPerFrame',
    'seamDiscontinuityRatio'
  );
}
if (candidate.scenario === 'baseline' || candidate.scenario === 'static') {
  requiredMetrics.push('stationaryNativeAnimationCallbacksPerSecond');
}

for (const metric of requiredMetrics) {
  if (candidateMetrics[metric] === undefined) {
    failures.push(`${metric}: required candidate metric is missing`);
  }
}

const checkMaximum = (name, maximum) => {
  const value = candidateMetrics[name];
  if (value === undefined) return;

  const passed = value <= maximum;
  observations.push({ metric: name, value, limit: maximum, passed });
  if (!passed) failures.push(`${name}: ${value} > ${maximum}`);
};

const checkBaselineDelta = (name, maximumDelta) => {
  const value = candidateMetrics[name];
  const baselineValue = baselineMetrics[name];
  if (value === undefined || baselineValue === undefined) return;

  const delta = value - baselineValue;
  const passed = delta <= maximumDelta;
  observations.push({
    metric: `${name} delta`,
    value: delta,
    limit: maximumDelta,
    passed,
  });
  if (!passed) failures.push(`${name} delta: ${delta} > ${maximumDelta}`);
};

const checkBaselinePercent = (name, maximumPercent) => {
  const value = candidateMetrics[name];
  const baselineValue = baselineMetrics[name];
  if (value === undefined || baselineValue === undefined || baselineValue === 0)
    return;

  const percent = ((value - baselineValue) / baselineValue) * 100;
  const passed = percent <= maximumPercent;
  observations.push({
    metric: `${name} regression %`,
    value: percent,
    limit: maximumPercent,
    passed,
  });
  if (!passed)
    failures.push(
      `${name} regression: ${percent.toFixed(2)}% > ${maximumPercent}%`
    );
};

for (const [name, configuredMaximum] of Object.entries(thresholds.absolute)) {
  const maximum =
    typeof configuredMaximum === 'object'
      ? configuredMaximum[count]
      : configuredMaximum;
  if (maximum !== undefined) checkMaximum(name, maximum);
}

checkBaselineDelta(
  'jankyFramePercent',
  thresholds.relativeToBaseline.jankyFramePercentPoints
);
checkBaselineDelta(
  'hitchTimeRatioPercent',
  thresholds.relativeToBaseline.hitchTimeRatioPercentPoints
);
checkBaselinePercent(
  'averageCpuPercent',
  thresholds.relativeToBaseline.activeCpuRegressionPercent
);
checkBaselinePercent(
  'peakMemoryMb',
  thresholds.relativeToBaseline.peakMemoryRegressionPercent
);

console.table(observations);

if (failures.length > 0) {
  console.error(`\n${failures.length} acceptance check(s) failed:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('\nAll supplied acceptance metrics passed.');
