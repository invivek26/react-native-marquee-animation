import { forwardRef, type ComponentRef } from 'react';
import { View } from 'react-native';

import type { MarqueeProps } from './types';
import { getViewProps } from './view-props';

export const Marquee = forwardRef<ComponentRef<typeof View>, MarqueeProps>(
  (props, ref) => {
    const {
      accessibilityLabel,
      children,
      contentContainerStyle,
      onContentPress,
      style,
    } = props;
    const viewProps = getViewProps(props);

    return (
      <View
        {...viewProps}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={viewProps.accessibilityRole ?? 'text'}
        accessible
        ref={ref}
        style={style}
      >
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          onResponderRelease={(event) =>
            onContentPress?.({ x: event.nativeEvent.locationX })
          }
          onStartShouldSetResponder={() => onContentPress !== undefined}
          pointerEvents={onContentPress ? 'box-only' : 'none'}
          style={contentContainerStyle}
        >
          {children}
        </View>
      </View>
    );
  }
);

Marquee.displayName = 'Marquee';
