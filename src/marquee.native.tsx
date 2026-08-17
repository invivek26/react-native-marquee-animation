import {
  forwardRef,
  useCallback,
  useMemo,
  useState,
  type ComponentRef,
} from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import NativeMarqueeView from './RNMarqueeViewNativeComponent';
import { resolveAnimationState } from './internal/events';
import { resolveMeasuredContentWidth } from './internal/geometry';
import {
  resolveInteraction,
  resolveSpacing,
  resolveSpeed,
} from './internal/options';
import type { MarqueeProps } from './types';
import { useMarqueeReducedMotion } from './use-reduced-motion';

type NativeAnimationStateEvent = NativeSyntheticEvent<
  Readonly<{ state: string }>
>;
type NativeContentLayoutEvent = NativeSyntheticEvent<
  Readonly<{ containerWidth: number; contentWidth: number }>
>;

const NATIVE_SHORT_CONTENT_MODES = {
  repeat: 'repeat',
  static: 'static',
} as const;

export const Marquee = forwardRef<
  ComponentRef<typeof NativeMarqueeView>,
  MarqueeProps
>((props, ref) => {
  const {
    accessibilityLabel,
    active = true,
    children,
    contentAlignment = 'start',
    contentContainerStyle,
    direction = 'left',
    interaction,
    onAnimationStateChange,
    onContentLayout,
    reduceMotion: reduceMotionPolicy = 'system',
    shortContentMode = 'static',
    spacing: spacingProp = 0,
    speed: speedProp = 25,
    style,
    ...viewProps
  } = props;
  const [contentWidth, setContentWidth] = useState(0);
  const reduceMotion = useMarqueeReducedMotion(reduceMotionPolicy);
  const resolvedInteraction = useMemo(
    () => resolveInteraction(interaction),
    [interaction]
  );
  const speed = resolveSpeed(speedProp);
  const spacing = resolveSpacing(spacingProp);

  const handleContentContainerLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const nextWidth = event.nativeEvent.layout.width;
      setContentWidth((currentWidth) =>
        resolveMeasuredContentWidth(currentWidth, nextWidth)
      );
    },
    []
  );

  const handleAnimationStateChange = useCallback(
    (event: NativeAnimationStateEvent) => {
      const state = resolveAnimationState(event.nativeEvent.state);
      if (state) {
        onAnimationStateChange?.({ state });
      }
    },
    [onAnimationStateChange]
  );

  const handleContentLayout = useCallback(
    (event: NativeContentLayoutEvent) => {
      onContentLayout?.(event.nativeEvent);
    },
    [onContentLayout]
  );

  return (
    <NativeMarqueeView
      {...viewProps}
      accessibilityLabel={accessibilityLabel}
      accessibilityLiveRegion="none"
      accessibilityRole={viewProps.accessibilityRole ?? 'text'}
      accessible
      active={active}
      contentAlignment={contentAlignment}
      contentWidth={contentWidth}
      deceleration={resolvedInteraction.deceleration}
      direction={direction}
      importantForAccessibility="yes"
      maxFlingVelocity={resolvedInteraction.maxFlingVelocity}
      onAnimationStateChange={
        onAnimationStateChange ? handleAnimationStateChange : undefined
      }
      onContentLayout={onContentLayout ? handleContentLayout : undefined}
      pauseOnPress={resolvedInteraction.pauseOnPress}
      reduceMotion={reduceMotion}
      ref={ref}
      resumeDelayMs={resolvedInteraction.resumeDelay}
      shortContentMode={NATIVE_SHORT_CONTENT_MODES[shortContentMode]}
      spacing={spacing}
      speed={speed}
      style={style}
    >
      <View
        accessibilityElementsHidden
        collapsable={false}
        importantForAccessibility="no-hide-descendants"
        onLayout={handleContentContainerLayout}
        pointerEvents="none"
        style={[styles.content, contentContainerStyle]}
      >
        {children}
      </View>
    </NativeMarqueeView>
  );
});

Marquee.displayName = 'Marquee';

const styles = StyleSheet.create({
  content: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    flexShrink: 0,
  },
});
