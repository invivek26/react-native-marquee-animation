#import "RNMarqueeView.h"

#import <React/RCTConversions.h>

#import <react/renderer/components/RNMarqueeViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/RNMarqueeViewSpec/EventEmitters.h>
#import <react/renderer/components/RNMarqueeViewSpec/Props.h>
#import <react/renderer/components/RNMarqueeViewSpec/RCTComponentViewHelpers.h>

#import "RNMarquee-Swift.h"
#import "RCTFabricComponentsPlugins.h"

using namespace facebook::react;

@interface RNMarqueeView () <RCTRNMarqueeViewViewProtocol, MarqueeRendererDelegate>
@end

@implementation RNMarqueeView {
  MarqueeRenderer *_renderer;
  MarqueeConfiguration *_pendingConfiguration;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<RNMarqueeViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const RNMarqueeViewProps>();
    _props = defaultProps;
    _renderer = [[MarqueeRenderer alloc] initWithFrame:self.bounds];
    _renderer.delegate = self;
    self.contentView = _renderer;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
  const auto &newProps = *std::static_pointer_cast<const RNMarqueeViewProps>(props);
  MarqueeConfiguration *configuration = [MarqueeConfiguration new];
  configuration.contentWidth = newProps.contentWidth;
  configuration.spacing = newProps.spacing;
  configuration.active = newProps.active;
  configuration.reduceMotion = newProps.reduceMotion;
  configuration.speed = newProps.speed;
  configuration.direction = RCTNSStringFromString(newProps.direction);
  configuration.shortContentMode = RCTNSStringFromString(newProps.shortContentMode);
  configuration.contentAlignment = RCTNSStringFromString(newProps.contentAlignment);
  configuration.maxFlingVelocity = newProps.maxFlingVelocity;
  configuration.deceleration = newProps.deceleration;
  configuration.pauseOnPress = newProps.pauseOnPress;
  configuration.resumeDelay = MAX(0, newProps.resumeDelayMs / 1000.0);
  _pendingConfiguration = configuration;
  [super updateProps:props oldProps:oldProps];
}

- (void)finalizeUpdates:(RNComponentViewUpdateMask)updateMask
{
  [super finalizeUpdates:updateMask];
  if (_pendingConfiguration != nil) {
    [_renderer applyConfiguration:_pendingConfiguration];
    _pendingConfiguration = nil;
  }
}

- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView index:(NSInteger)index
{
  [_renderer insertSubview:childComponentView atIndex:index];
}

- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView index:(NSInteger)index
{
  [childComponentView removeFromSuperview];
}

- (void)prepareForRecycle
{
  [super prepareForRecycle];
  _pendingConfiguration = nil;
  [_renderer resetForReuse];
}

- (void)invalidate
{
  [_renderer invalidateRenderer];
  _pendingConfiguration = nil;
  [super invalidate];
}

- (void)marqueeRenderer:(MarqueeRenderer *)renderer didChangeState:(NSString *)state
{
  if (renderer != _renderer || !_eventEmitter) {
    return;
  }
  auto eventEmitter = std::static_pointer_cast<const RNMarqueeViewEventEmitter>(_eventEmitter);
  eventEmitter->onAnimationStateChange({
      .state = std::string(state.UTF8String ?: ""),
  });
}

- (void)marqueeRenderer:(MarqueeRenderer *)renderer
    didLayoutContentWidth:(CGFloat)contentWidth
           containerWidth:(CGFloat)containerWidth
{
  if (renderer != _renderer || !_eventEmitter) {
    return;
  }
  auto eventEmitter = std::static_pointer_cast<const RNMarqueeViewEventEmitter>(_eventEmitter);
  eventEmitter->onContentLayout({
      .contentWidth = static_cast<Float>(contentWidth),
      .containerWidth = static_cast<Float>(containerWidth),
  });
}

@end
