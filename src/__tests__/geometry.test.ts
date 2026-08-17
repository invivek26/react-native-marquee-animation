import { describe, expect, test } from 'bun:test';

import { resolveMeasuredContentWidth } from '../internal/geometry';

describe('content measurement policy', () => {
  test('ignores fractional layout noise', () => {
    expect(resolveMeasuredContentWidth(400, 400.1)).toBe(400);
  });

  test('accepts meaningful width changes', () => {
    expect(resolveMeasuredContentWidth(400, 401)).toBe(401);
  });

  test('rejects invalid native measurements', () => {
    expect(resolveMeasuredContentWidth(400, Number.NaN)).toBe(400);
    expect(resolveMeasuredContentWidth(400, -1)).toBe(400);
  });
});
