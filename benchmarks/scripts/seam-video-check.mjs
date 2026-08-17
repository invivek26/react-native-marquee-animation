#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

const [videoPath] = process.argv.slice(2);
if (!videoPath) {
  console.error(
    'Usage: seam-video-check.mjs VIDEO [--crop=w:h:x:y] [--fps=60] [--max-ratio=3]'
  );
  process.exit(2);
}

const options = Object.fromEntries(
  process.argv.slice(3).map((argument) => {
    const [key, value] = argument.replace(/^--/, '').split('=');
    return [key, value];
  })
);
const fps = Number(options.fps ?? 60);
const maximumRatio = Number(options['max-ratio'] ?? 3);
const crop = options.crop ? `,crop=${options.crop}` : '';
const workDirectory = await mkdtemp(join(tmpdir(), 'marquee-animation-seam-'));

const parsePgm = (buffer) => {
  let cursor = 0;
  const readToken = () => {
    while (cursor < buffer.length) {
      if (buffer[cursor] === 35) {
        while (cursor < buffer.length && buffer[cursor] !== 10) cursor += 1;
      }
      if (buffer[cursor] > 32) break;
      cursor += 1;
    }
    const start = cursor;
    while (cursor < buffer.length && buffer[cursor] > 32) cursor += 1;
    return buffer.subarray(start, cursor).toString('ascii');
  };

  if (readToken() !== 'P5') throw new Error('Expected binary PGM frame');
  const width = Number(readToken());
  const height = Number(readToken());
  const maximum = Number(readToken());
  if (buffer[cursor] <= 32) cursor += 1;
  if (maximum !== 255) throw new Error(`Unsupported PGM maximum: ${maximum}`);
  return { width, height, pixels: buffer.subarray(cursor) };
};

const median = (values) => {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
};

try {
  execFileSync('ffmpeg', [
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    videoPath,
    '-vf',
    `fps=${fps}${crop},format=gray`,
    '-vsync',
    '0',
    join(workDirectory, 'frame-%06d.pgm'),
  ]);

  const frameNames = (await readdir(workDirectory))
    .filter((name) => name.endsWith('.pgm'))
    .sort();
  if (frameNames.length < 3)
    throw new Error('At least three frames are required');

  const frames = [];
  for (const frameName of frameNames) {
    frames.push(parsePgm(await readFile(join(workDirectory, frameName))));
  }

  const differences = [];
  const variances = [];
  for (let frameIndex = 0; frameIndex < frames.length; frameIndex += 1) {
    const frame = frames[frameIndex];
    let sum = 0;
    let squareSum = 0;
    for (const pixel of frame.pixels) {
      sum += pixel;
      squareSum += pixel * pixel;
    }
    const mean = sum / frame.pixels.length;
    variances.push(squareSum / frame.pixels.length - mean * mean);

    if (frameIndex === 0) continue;
    const previous = frames[frameIndex - 1];
    if (frame.width !== previous.width || frame.height !== previous.height) {
      throw new Error('Frame dimensions changed during capture');
    }
    let absoluteDifference = 0;
    for (let index = 0; index < frame.pixels.length; index += 1) {
      absoluteDifference += Math.abs(
        frame.pixels[index] - previous.pixels[index]
      );
    }
    differences.push(absoluteDifference / frame.pixels.length);
  }

  const medianDifference = median(differences);
  const maximumDifference = Math.max(...differences);
  const rawDiscontinuityRatio =
    medianDifference === 0
      ? maximumDifference === 0
        ? 1
        : Number.POSITIVE_INFINITY
      : maximumDifference / medianDifference;
  const seamDiscontinuityRatio = Number.isFinite(rawDiscontinuityRatio)
    ? rawDiscontinuityRatio
    : Number.MAX_VALUE;
  const medianVariance = median(variances);
  const possibleBlankFrames = variances
    .map((variance, index) => ({ variance, index }))
    .filter(
      ({ variance }) => medianVariance > 0 && variance < medianVariance * 0.05
    );

  const result = {
    videoPath,
    frameCount: frames.length,
    fps,
    medianFrameDifference: medianDifference,
    maximumFrameDifference: maximumDifference,
    seamDiscontinuityRatio,
    possibleBlankFrames,
  };
  await writeFile(
    `${videoPath}.seam.json`,
    `${JSON.stringify(result, null, 2)}\n`
  );
  console.log(JSON.stringify(result, null, 2));

  if (possibleBlankFrames.length > 0 || seamDiscontinuityRatio > maximumRatio) {
    process.exitCode = 1;
  }
} finally {
  await rm(workDirectory, { recursive: true, force: true });
}
