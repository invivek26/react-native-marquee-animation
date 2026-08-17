import { describe, expect, test } from 'bun:test';

import {
  DEFAULT_INTERACTION,
  resolveInteraction,
  resolveSpacing,
  resolveSpeed,
} from '../internal/options';

describe('marquee options', () => {
  test('resolves stable interaction defaults', () => {
    expect(resolveInteraction()).toEqual(DEFAULT_INTERACTION);
  });

  test('accepts stationary zero speed and zero spacing', () => {
    expect(resolveSpeed(0)).toBe(0);
    expect(resolveSpacing(0)).toBe(0);
  });

  test('rejects invalid dimensions', () => {
    expect(() => resolveSpeed(-1)).toThrow(RangeError);
    expect(() => resolveSpacing(Number.NaN)).toThrow(RangeError);
  });

  test('rejects invalid inertial deceleration', () => {
    expect(() => resolveInteraction({ deceleration: 1 })).toThrow(RangeError);
  });
});
