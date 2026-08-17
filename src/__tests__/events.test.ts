import { describe, expect, test } from 'bun:test';

import { resolveAnimationState } from '../internal/events';

describe('native event policy', () => {
  test('maps every supported native animation state', () => {
    expect(resolveAnimationState('idle')).toBe('idle');
    expect(resolveAnimationState('running')).toBe('running');
    expect(resolveAnimationState('paused')).toBe('paused');
    expect(resolveAnimationState('reducedMotion')).toBe('reduced-motion');
  });

  test('drops unknown native states', () => {
    expect(resolveAnimationState('future-state')).toBeNull();
  });
});
