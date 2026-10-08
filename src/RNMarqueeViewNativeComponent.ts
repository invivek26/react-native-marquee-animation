import type { HostComponent, ViewProps } from 'react-native';
import { codegenNativeComponent, type CodegenTypes } from 'react-native';

type NativeAnimationStateEvent = Readonly<{
  state: string;
}>;

type NativeContentLayoutEvent = Readonly<{
  contentWidth: CodegenTypes.Float;
  containerWidth: CodegenTypes.Float;
}>;

type NativeContentPressEvent = Readonly<{
  x: CodegenTypes.Float;
}>;

export interface NativeMarqueeViewProps extends ViewProps {
  active: boolean;
  reduceMotion: boolean;
  speed: CodegenTypes.Double;
  direction: string;
  shortContentMode: string;
  contentAlignment: string;
  contentWidth: CodegenTypes.Float;
  spacing: CodegenTypes.Float;
  maxFlingVelocity: CodegenTypes.Float;
  deceleration: CodegenTypes.Float;
  pauseOnPress: boolean;
  contentPressEnabled: boolean;
  resumeDelayMs: CodegenTypes.Double;
  onAnimationStateChange?: CodegenTypes.DirectEventHandler<NativeAnimationStateEvent>;
  onContentLayout?: CodegenTypes.DirectEventHandler<NativeContentLayoutEvent>;
  onContentPress?: CodegenTypes.DirectEventHandler<NativeContentPressEvent>;
}

export default codegenNativeComponent<NativeMarqueeViewProps>(
  'RNMarqueeView'
) as HostComponent<NativeMarqueeViewProps>;
