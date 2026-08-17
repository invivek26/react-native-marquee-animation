import type { ViewProps } from 'react-native';
import type { MarqueeProps } from './types';

const COMPONENT_PROP_KEYS = new Set([
  'accessibilityLabel',
  'active',
  'children',
  'contentAlignment',
  'contentContainerStyle',
  'direction',
  'interaction',
  'onAnimationStateChange',
  'onContentLayout',
  'reduceMotion',
  'shortContentMode',
  'spacing',
  'speed',
  'style',
]);

export const getViewProps = (props: MarqueeProps): ViewProps =>
  Object.fromEntries(
    Object.entries(props).filter(([key]) => !COMPONENT_PROP_KEYS.has(key))
  );
