import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';
import type { MarqueeReduceMotion } from './types';

type Listener = () => void;

const listeners = new Set<Listener>();
let reduceMotion = true;
let listening = false;
let generation = 0;
let subscription: ReturnType<typeof AccessibilityInfo.addEventListener> | null =
  null;

const notify = (): void => {
  listeners.forEach((listener) => listener());
};

const setReduceMotion = (value: boolean): void => {
  if (reduceMotion === value) {
    return;
  }
  reduceMotion = value;
  notify();
};

const startListening = (): void => {
  if (listening) {
    return;
  }

  listening = true;
  generation += 1;
  const currentGeneration = generation;
  AccessibilityInfo.isReduceMotionEnabled()
    .then((value) => {
      if (listening && currentGeneration === generation) {
        setReduceMotion(value);
      }
    })
    .catch(() => undefined);
  subscription = AccessibilityInfo.addEventListener(
    'reduceMotionChanged',
    (value) => {
      if (listening && currentGeneration === generation) {
        setReduceMotion(value);
      }
    }
  );
};

const subscribe = (listener: Listener): (() => void) => {
  listeners.add(listener);
  startListening();

  return () => {
    listeners.delete(listener);
    if (listeners.size !== 0) {
      return;
    }

    subscription?.remove();
    subscription = null;
    listening = false;
    generation += 1;
    reduceMotion = true;
  };
};

const emptySubscribe = (): (() => void) => () => undefined;
const getSystemSnapshot = (): boolean => (listening ? reduceMotion : true);
const getReducedSnapshot = (): boolean => true;
const getUnreducedSnapshot = (): boolean => false;

export const useMarqueeReducedMotion = (
  policy: MarqueeReduceMotion
): boolean => {
  const system = policy === 'system';

  return useSyncExternalStore(
    system ? subscribe : emptySubscribe,
    system
      ? getSystemSnapshot
      : policy === 'always'
        ? getReducedSnapshot
        : getUnreducedSnapshot,
    policy === 'never' ? getUnreducedSnapshot : getReducedSnapshot
  );
};
