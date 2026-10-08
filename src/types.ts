import type { ReactNode } from 'react';
import type { StyleProp, ViewProps, ViewStyle } from 'react-native';

export type MarqueeDirection = 'left' | 'right';
export type MarqueeReduceMotion = 'system' | 'always' | 'never';
export type MarqueeShortContentMode = 'static' | 'repeat';
export type MarqueeContentAlignment = 'start' | 'center' | 'end';
export type MarqueeAnimationState =
  'idle' | 'running' | 'paused' | 'reduced-motion';

export type MarqueeAnimationStateEvent = Readonly<{
  state: MarqueeAnimationState;
}>;

export type MarqueeContentLayoutEvent = Readonly<{
  containerWidth: number;
  contentWidth: number;
}>;

/** `x` is in the content container's own coordinates for one copy: `[0, contentWidth)`. */
export type MarqueeContentPressEvent = Readonly<{
  x: number;
}>;

export type MarqueeInteraction = Readonly<{
  maxFlingVelocity?: number;
  /** Unitless velocity retention per millisecond, greater than 0 and below 1. */
  deceleration?: number;
  pauseOnPress?: boolean;
  /** Delay in milliseconds before automatic motion resumes. */
  resumeDelay?: number;
}>;

type InheritedViewProps = Omit<
  ViewProps,
  | 'accessibilityElementsHidden'
  | 'accessibilityLabel'
  | 'children'
  | 'importantForAccessibility'
  | 'style'
>;

export type MarqueeProps = InheritedViewProps &
  Readonly<{
    /** One visual strip. React state is mounted exactly once; descendants receive no touches. */
    children: ReactNode;
    /** A single semantic description for all visually repeated content. */
    accessibilityLabel: string;
    /** Keeps native motion active. Attachment and visibility are also enforced natively. */
    active?: boolean;
    contentAlignment?: MarqueeContentAlignment;
    contentContainerStyle?: StyleProp<ViewStyle>;
    direction?: MarqueeDirection;
    interaction?: MarqueeInteraction;
    onAnimationStateChange?: (event: MarqueeAnimationStateEvent) => void;
    onContentLayout?: (event: MarqueeContentLayoutEvent) => void;
    /** A tap on any visual copy. Taps in the spacing gap or outside static content do not fire. */
    onContentPress?: (event: MarqueeContentPressEvent) => void;
    reduceMotion?: MarqueeReduceMotion;
    shortContentMode?: MarqueeShortContentMode;
    /** Empty distance between the end of one visual copy and the next. */
    spacing?: number;
    /** Constant native motion in logical pixels per second. */
    speed?: number;
    style?: StyleProp<ViewStyle>;
  }>;
