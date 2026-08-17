import { describe, expect, test } from 'bun:test';

import { getViewProps } from '../view-props';
import type { MarqueeProps } from '../types';

describe('getViewProps', () => {
  test('forwards host props without leaking package props', () => {
    const props = {
      accessibilityLabel: 'News headlines',
      active: true,
      children: null,
      contentContainerStyle: { gap: 8 },
      nativeID: 'marquee',
      spacing: 24,
      speed: 30,
      testID: 'ticker',
    } satisfies MarqueeProps;

    expect(getViewProps(props)).toEqual({
      nativeID: 'marquee',
      testID: 'ticker',
    });
  });
});
