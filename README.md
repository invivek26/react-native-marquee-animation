# React Native Marquee

A production-grade generic marquee for React Native's New Architecture. Render
ordinary React Native text, images, icons, badges, charts, and composed views
once; native iOS and Android code repeats the visual strip and owns all motion.

There is no per-frame JavaScript, duplicated React state, or list
virtualization.

## Demo

https://github.com/user-attachments/assets/9f4e1655-0f2c-468f-b0e4-25af40de5631

## Compatibility

| Requirement  | Supported                                |
| ------------ | ---------------------------------------- |
| React Native | 0.85.x                                   |
| React        | 19.2.x                                   |
| Expo         | SDK 56 development and production builds |
| iOS          | 17 and newer                             |
| Android      | API 24 and newer                         |
| Architecture | New Architecture (Fabric) only           |
| Expo Go      | No                                       |

## Installation

```sh
bun add react-native-marquee-animation
```

Expo applications must regenerate and rebuild the native project:

```sh
bunx expo prebuild --clean
bunx expo run:ios
# or: bunx expo run:android
```

## Quick start

```tsx
import { Image, StyleSheet, Text, View } from 'react-native';
import { Marquee } from 'react-native-marquee-animation';

export const NewsStrip = () => (
  <Marquee
    accessibilityLabel="Latest headlines"
    contentContainerStyle={styles.row}
    spacing={32}
    speed={25}
    style={styles.marquee}
  >
    <View style={styles.card}>
      <Image source={require('./logo.png')} style={styles.image} />
      <Text>Images, text, badges, icons, and custom views</Text>
    </View>
    <View style={styles.card}>
      <Text>React state is mounted exactly once</Text>
    </View>
  </Marquee>
);

const styles = StyleSheet.create({
  card: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  image: { height: 24, width: 24 },
  marquee: { height: 48 },
  row: { alignItems: 'center', gap: 24 },
});
```

The package wraps `children` in one non-collapsible horizontal content view,
measures that view only when layout changes, and passes one width update to
native code. Native motion remains uninterrupted when child pixels change
without changing width.

## Gesture physics

Dragging, release velocity, decay, and the transition back to automatic motion
are native-owned:

```tsx
<Marquee
  accessibilityLabel="Live activity"
  interaction={{
    maxFlingVelocity: 3200,
    deceleration: 0.9985,
    pauseOnPress: true,
    resumeDelay: 0,
  }}
>
  {content}
</Marquee>
```

After a fling decelerates, both platforms blend velocity into the configured
automatic direction over 350 ms instead of stopping or snapping.
`pauseOnPress: true` pauses immediately on touch-down. `resumeDelay` controls
when automatic motion resumes after release. On iOS, drag, fling, and the blend
back to automatic motion are synchronized to the active screen's refresh rate.

## Content contract

Supported content includes normal layer/display-list-backed React Native views:

- `Text`, `View`, `Image`, and `expo-image`;
- SVG, icons, badges, gradients, and composed layouts;
- custom charts that render into the ordinary React Native view hierarchy;
- child state, asynchronous image loading, and dynamic value changes.

Marquee children are deliberately noninteractive. The host owns horizontal
pan, hold, and fling gestures, and repeated pixels are not additional React
views. Nested `Pressable`, `TextInput`, map, video, camera, `SurfaceView`,
`TextureView`, Metal, and other external rendering surfaces are outside the
contract. Use a separate typed interaction layer when individual repeated
items must be clickable.

## Main props

| Prop                    | Default  | Meaning                                      |
| ----------------------- | -------- | -------------------------------------------- |
| `accessibilityLabel`    | required | One semantic description of the strip        |
| `speed`                 | `25`     | Logical pixels per second                    |
| `direction`             | `left`   | Automatic motion direction                   |
| `spacing`               | `0`      | Empty distance between visual copies         |
| `active`                | `true`   | Application-level pause control              |
| `shortContentMode`      | `static` | Static content or repeated short content     |
| `contentAlignment`      | `start`  | Alignment while short content is stationary  |
| `contentContainerStyle` | —        | Style for the one horizontal content wrapper |
| `reduceMotion`          | `system` | `system`, `always`, or `never`               |

## Native architecture

- iOS mounts one Fabric child container as the only subview of a
  `CAReplicatorLayer`-backed Swift view. Core Animation translates it without a
  display callback during automatic motion.
- Android mounts one Fabric child container in a custom `ViewGroup` and replays
  the existing hardware display lists at repeated canvas offsets. A monotonic
  `Choreographer` clock changes only the translation phase. Missed callbacks
  advance by at most roughly one current display interval instead of catching
  up in one visible jump; API 35+ requests a high refresh rate only while active.
- Same-width visual updates do not restart motion. Width changes preserve the
  physical offset and velocity while native code recomputes the loop period.
- Content that fits, `active={false}`, detached views, backgrounded apps, and
  Reduced Motion schedule no continuous frame work. Window-attached views use
  `active` as the authoritative application-level visibility signal.
- Only the host is accessible; visually repeated descendants are hidden from
  VoiceOver and TalkBack.

See [architecture](docs/architecture.md), [accessibility](docs/accessibility.md),
[testing](docs/testing.md), and [performance](docs/performance.md).

## Fabric and Codegen

`src/RNMarqueeViewNativeComponent.ts` is the source of truth. The native
component is `RNMarqueeView`, the Codegen library is `RNMarqueeViewSpec`, and
the iOS pod/module is `RNMarquee`. Generated bindings are consumer-owned and
are not published.

## Development

The repository uses Bun, React Native Builder Bob, an Expo SDK 56 consumer,
Swift and Kotlin tests, Release builds, packed-tarball validation, and Maestro.
Start with [CONTRIBUTING.md](CONTRIBUTING.md).

### Example experience

The Expo example follows the same showcase-first product system as the sibling
number-animation package. Release builds open a self-running green-and-cream
showcase with product, music, event, finance, image, badge, a Bhagavad Gita
verse in Kannada script, and gesture examples. Development builds expose an
`Open reliability lab` button; benchmark deep links open that lab directly in
either build.

Use `bun run capture:ios` or `bun run capture:android` from `example/` for clean
Release presentation captures. See [example/CAPTURE.md](example/CAPTURE.md).

## License

[MIT](LICENSE)
