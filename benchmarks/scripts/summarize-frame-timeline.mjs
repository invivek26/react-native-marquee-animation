#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import process from 'node:process';

const [csvPath, metadataPath] = process.argv.slice(2);
if (!csvPath || !metadataPath) {
  console.error(
    'Usage: summarize-frame-timeline.mjs FRAME_TIMELINE.csv METADATA.json'
  );
  process.exit(2);
}

const parseCsvLine = (line) => {
  const values = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (character === ',' && !quoted) {
      values.push(value);
      value = '';
      continue;
    }
    value += character;
  }
  values.push(value);
  return values;
};

const percentile = (values, quantile) => {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((left, right) => left - right);
  const rank = Math.ceil(quantile * sorted.length) - 1;
  return sorted[Math.max(0, rank)];
};

const csv = await readFile(csvPath, 'utf8');
const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
const lines = csv.trim().split(/\r?\n/).filter(Boolean);
if (lines.length < 2)
  throw new Error('FrameTimeline CSV contains no data rows');

const headers = parseCsvLine(lines[0]);
const rows = lines.slice(1).map((line) => {
  const values = parseCsvLine(line);
  return Object.fromEntries(
    headers.map((header, index) => [header, values[index]])
  );
});
const overruns = rows
  .map((row) => Number(row.frame_overrun_ms))
  .filter(Number.isFinite);
const jankyFrames = rows.filter((row) => {
  const value = row.jank_type?.trim().toLowerCase();
  return value && value !== 'none' && value !== 'null';
});

const result = {
  platform: 'android',
  scenario: metadata.scenario,
  count: metadata.count,
  metrics: {
    frameCount: rows.length,
    jankyFrameCount: jankyFrames.length,
    jankyFramePercent: (jankyFrames.length / rows.length) * 100,
    p50FrameOverrunMs: percentile(overruns, 0.5),
    p95FrameOverrunMs: percentile(overruns, 0.95),
    p99FrameOverrunMs: percentile(overruns, 0.99),
  },
  source: {
    capturedAt: metadata.capturedAt,
    csvPath,
  },
};

console.log(JSON.stringify(result, null, 2));
