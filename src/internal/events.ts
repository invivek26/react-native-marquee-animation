import type { MarqueeAnimationState } from '../types';

const STATE_BY_NATIVE_VALUE: Readonly<Record<string, MarqueeAnimationState>> = {
  idle: 'idle',
  paused: 'paused',
  reducedMotion: 'reduced-motion',
  running: 'running',
};

export const resolveAnimationState = (
  nativeState: string
): MarqueeAnimationState | null => STATE_BY_NATIVE_VALUE[nativeState] ?? null;
