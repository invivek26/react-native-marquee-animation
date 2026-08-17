import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react';
import {
  AppState,
  type AppStateStatus,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Marquee } from 'react-native-marquee-animation';
import type { MarqueeReduceMotion } from 'react-native-marquee-animation';

import {
  BENCHMARK_SCENARIOS,
  DEFAULT_BENCHMARK_ROUTE,
  STRESS_COUNTS,
  type BenchmarkRoute,
  type BenchmarkScenario,
  type StressCount,
  parseBenchmarkRoute,
} from './scenario';
import { buildStocks, type ExampleStock } from './stock-data';

type UpdateMode = 'same-width' | 'width-changing' | 'high-frequency';

type LabState = Readonly<{
  activeOverride: boolean | null;
  reduceMotion: MarqueeReduceMotion;
  route: BenchmarkRoute;
  tick: number;
  updateMode: UpdateMode;
}>;

type LabAction =
  | Readonly<{
      route: BenchmarkRoute;
      type: 'route';
      updateMode?: UpdateMode;
    }>
  | Readonly<{ type: 'pause' }>
  | Readonly<{
      reduceMotion: MarqueeReduceMotion;
      type: 'reduceMotion';
    }>
  | Readonly<{ type: 'reset' }>
  | Readonly<{ type: 'resume' }>
  | Readonly<{ type: 'tick' }>
  | Readonly<{ type: 'updateMode'; updateMode: UpdateMode }>;

const INITIAL_STATE: LabState = {
  activeOverride: null,
  reduceMotion: 'system',
  route: DEFAULT_BENCHMARK_ROUTE,
  tick: 0,
  updateMode: 'same-width',
};

const INTERACTION = {
  deceleration: 0.9985,
  maxFlingVelocity: 3200,
  pauseOnPress: true,
  resumeDelay: 0,
} as const;

const MARQUEE_STYLE = { height: 64 } as const;
const AVATAR_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdjYPj/HwADAgH/5ncLrgAAAABJRU5ErkJggg==';
const UPDATE_INTERVALS: Readonly<Record<UpdateMode, number>> = {
  'high-frequency': 50,
  'same-width': 500,
  'width-changing': 500,
};

const labReducer = (state: LabState, action: LabAction): LabState => {
  if (action.type === 'route') {
    return {
      ...state,
      activeOverride: null,
      route: action.route,
      tick: 0,
      updateMode: action.updateMode ?? state.updateMode,
    };
  }

  if (action.type === 'pause') {
    return { ...state, activeOverride: false };
  }

  if (action.type === 'resume') {
    return { ...state, activeOverride: true };
  }

  if (action.type === 'reset') {
    return { ...state, activeOverride: null, tick: 0 };
  }

  if (action.type === 'updateMode') {
    return { ...state, tick: 0, updateMode: action.updateMode };
  }

  if (action.type === 'reduceMotion') {
    return { ...state, reduceMotion: action.reduceMotion };
  }

  return { ...state, tick: state.tick + 1 };
};

const isNaturallyActive = (scenario: BenchmarkScenario): boolean =>
  scenario === 'active' ||
  scenario === 'updates' ||
  scenario === 'gesture' ||
  scenario === 'stress';

const shouldUpdate = (scenario: BenchmarkScenario): boolean =>
  scenario === 'updates' || scenario === 'stress';

const buildMarqueeItems = (
  tick: number,
  updateMode: UpdateMode,
  showSparklines: boolean
): readonly ExampleStock[] =>
  buildStocks(tick, updateMode === 'width-changing').map((stock) => ({
    ...stock,
    sparkline: showSparklines ? stock.sparkline : [],
  }));

const makeRoute = (
  current: BenchmarkRoute,
  next: Partial<BenchmarkRoute>
): BenchmarkRoute => ({ ...current, ...next });

type ControlButtonProps = Readonly<{
  active?: boolean;
  label: string;
  onPress: () => void;
  testID: string;
}>;

const ControlButton = ({
  active = false,
  label,
  onPress,
  testID,
}: ControlButtonProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
    onPress={onPress}
    style={({ pressed }) => [
      styles.controlButton,
      active ? styles.controlButtonActive : null,
      pressed ? styles.controlButtonPressed : null,
    ]}
    testID={testID}
  >
    <Text
      style={active ? styles.controlButtonTextActive : styles.controlButtonText}
    >
      {label}
    </Text>
  </Pressable>
);

type ScenarioControlsProps = Readonly<{
  reduceMotion: MarqueeReduceMotion;
  route: BenchmarkRoute;
  updateMode: UpdateMode;
  onCountChange: (count: StressCount) => void;
  onPause: () => void;
  onReset: () => void;
  onReduceMotionChange: (reduceMotion: MarqueeReduceMotion) => void;
  onResume: () => void;
  onScenarioChange: (scenario: BenchmarkScenario) => void;
  onUpdateModeChange: (updateMode: UpdateMode) => void;
}>;

const ScenarioControls = memo(function ScenarioControlsView({
  onCountChange,
  onPause,
  onReduceMotionChange,
  onReset,
  onResume,
  onScenarioChange,
  onUpdateModeChange,
  reduceMotion,
  route,
  updateMode,
}: ScenarioControlsProps) {
  return (
    <View style={styles.controls} testID="controls">
      <Text style={styles.sectionLabel}>SCENARIO</Text>
      <View style={styles.buttonRow}>
        {BENCHMARK_SCENARIOS.slice(0, 2).map((scenario) => (
          <ControlButton
            active={route.scenario === scenario}
            key={scenario}
            label={scenario}
            onPress={() => onScenarioChange(scenario)}
            testID={`scenario-${scenario}-button`}
          />
        ))}
      </View>
      <View style={styles.buttonRow}>
        {BENCHMARK_SCENARIOS.slice(2, 4).map((scenario) => (
          <ControlButton
            active={route.scenario === scenario}
            key={scenario}
            label={scenario}
            onPress={() => onScenarioChange(scenario)}
            testID={`scenario-${scenario}-button`}
          />
        ))}
      </View>
      <View style={styles.buttonRow}>
        <ControlButton
          active={route.scenario === 'gesture'}
          key="gesture"
          label="gesture"
          onPress={() => onScenarioChange('gesture')}
          testID="scenario-gesture-button"
        />
        <ControlButton
          active={route.scenario === 'stress'}
          key="stress"
          label="stress"
          onPress={() => onScenarioChange('stress')}
          testID="scenario-stress-button"
        />
      </View>

      <Text style={styles.sectionLabel}>REDUCE MOTION</Text>
      <View style={styles.buttonRow}>
        <ControlButton
          active={reduceMotion === 'system'}
          key="system"
          label="system"
          onPress={() => onReduceMotionChange('system')}
          testID="reduce-motion-system-button"
        />
        <ControlButton
          active={reduceMotion === 'always'}
          key="always"
          label="always"
          onPress={() => onReduceMotionChange('always')}
          testID="reduce-motion-always-button"
        />
      </View>
      <View style={styles.buttonRow}>
        <ControlButton
          active={reduceMotion === 'never'}
          key="never"
          label="never"
          onPress={() => onReduceMotionChange('never')}
          testID="reduce-motion-never-button"
        />
      </View>

      <Text style={styles.sectionLabel}>SIMULTANEOUS VIEWS</Text>
      <View style={styles.buttonRow}>
        {STRESS_COUNTS.slice(0, 2).map((count) => (
          <ControlButton
            active={route.count === count}
            key={count}
            label={String(count)}
            onPress={() => onCountChange(count)}
            testID={`stress-count-${count}-button`}
          />
        ))}
      </View>
      <View style={styles.buttonRow}>
        {STRESS_COUNTS.slice(2).map((count) => (
          <ControlButton
            active={route.count === count}
            key={count}
            label={String(count)}
            onPress={() => onCountChange(count)}
            testID={`stress-count-${count}-button`}
          />
        ))}
      </View>

      <Text style={styles.sectionLabel}>UPDATE SHAPE</Text>
      <View style={styles.buttonRow}>
        <ControlButton
          active={updateMode === 'same-width'}
          key="same-width"
          label="same width"
          onPress={() => onUpdateModeChange('same-width')}
          testID="update-mode-same-width"
        />
        <ControlButton
          active={updateMode === 'width-changing'}
          key="width-changing"
          label="width changing"
          onPress={() => onUpdateModeChange('width-changing')}
          testID="update-mode-width-changing"
        />
      </View>
      <View style={styles.buttonRow}>
        <ControlButton
          active={updateMode === 'high-frequency'}
          key="high-frequency"
          label="20 Hz"
          onPress={() => onUpdateModeChange('high-frequency')}
          testID="update-mode-high-frequency"
        />
      </View>

      <View style={styles.buttonRow}>
        <ControlButton
          key="pause"
          label="pause"
          onPress={onPause}
          testID="pause-button"
        />
        <ControlButton
          key="resume"
          label="resume"
          onPress={onResume}
          testID="resume-button"
        />
      </View>
      <View style={styles.buttonRow}>
        <ControlButton
          key="reset"
          label="reset"
          onPress={onReset}
          testID="reset-button"
        />
      </View>
    </View>
  );
});

type MarqueeStackProps = Readonly<{
  active: boolean;
  count: StressCount;
  items: readonly ExampleStock[];
  onAnimationStateChange: (state: string) => void;
  onContentLayout: (contentWidth: number, containerWidth: number) => void;
  reduceMotion: MarqueeReduceMotion;
  scenario: BenchmarkScenario;
  speed: number;
}>;

type SparkBarsProps = Readonly<{
  positive: boolean;
  values: readonly number[];
}>;

const SparkBars = memo(function SparkBarsView({
  positive,
  values,
}: SparkBarsProps) {
  if (values.length === 0) {
    return null;
  }

  const color = positive ? '#32D583' : '#FF5E71';
  return (
    <View style={styles.sparkBars}>
      {values.map((value, index) => (
        <View
          key={index}
          style={[
            styles.sparkBar,
            {
              backgroundColor: color,
              height: 4 + value * 18,
            },
          ]}
        />
      ))}
    </View>
  );
});

const TickerCard = memo(function TickerCardView({
  changePercent,
  id,
  sparkline,
  symbol,
}: ExampleStock) {
  const positive = changePercent >= 0;
  const change = `${positive ? '+' : ''}${changePercent.toFixed(2)}%`;
  return (
    <View style={styles.tickerCard} testID={`content-${id}`}>
      <Image source={{ uri: AVATAR_DATA_URI }} style={styles.tickerImage} />
      <View style={styles.tickerText}>
        <View style={styles.symbolRow}>
          <View
            style={[
              styles.statusDot,
              positive ? styles.positiveBackground : styles.negativeBackground,
            ]}
          />
          <Text style={styles.symbol}>{symbol}</Text>
        </View>
        <Text style={positive ? styles.positiveText : styles.negativeText}>
          {change}
        </Text>
      </View>
      <SparkBars positive={positive} values={sparkline} />
    </View>
  );
});

const MarqueeStack = ({
  active,
  count,
  items,
  onAnimationStateChange,
  onContentLayout,
  reduceMotion,
  scenario,
  speed,
}: MarqueeStackProps) => {
  if (scenario === 'baseline') {
    return (
      <View style={styles.baseline} testID="benchmark-marquee-container">
        <Text style={styles.baselineText}>
          Baseline · no native marquee mounted
        </Text>
      </View>
    );
  }

  const marquees = Array.from({ length: count }, (_, index) => index);

  return (
    <View style={styles.marqueeStack} testID="benchmark-marquee-container">
      {marquees.map((index) => (
        <View
          key={index}
          style={styles.marqueeShell}
          testID={`benchmark-marquee-${index}`}
        >
          <Marquee
            accessibilityLabel="Market ticker with symbols, images, charts, badges, and percentage changes"
            active={active}
            contentContainerStyle={styles.marqueeContent}
            direction="left"
            interaction={INTERACTION}
            onAnimationStateChange={
              index === 0
                ? ({ state }) => onAnimationStateChange(state)
                : undefined
            }
            onContentLayout={
              index === 0
                ? ({ containerWidth, contentWidth }) =>
                    onContentLayout(contentWidth, containerWidth)
                : undefined
            }
            reduceMotion={reduceMotion}
            shortContentMode="static"
            spacing={32}
            speed={speed}
            style={MARQUEE_STYLE}
          >
            {(scenario === 'static' ? items.slice(0, 1) : items).map((item) => (
              <TickerCard key={item.id} {...item} />
            ))}
          </Marquee>
        </View>
      ))}
    </View>
  );
};

type ReliabilityLabProps = Readonly<{
  initialRoute?: BenchmarkRoute;
  onClose: () => void;
}>;

const initializeLabState = (initialRoute?: BenchmarkRoute): LabState => ({
  ...INITIAL_STATE,
  route: initialRoute ?? INITIAL_STATE.route,
  updateMode:
    initialRoute?.scenario === 'updates'
      ? 'high-frequency'
      : INITIAL_STATE.updateMode,
});

export const ReliabilityLab = ({
  initialRoute,
  onClose,
}: ReliabilityLabProps) => {
  const [state, dispatch] = useReducer(
    labReducer,
    initialRoute,
    initializeLabState
  );
  const [appState, setAppState] = useState<AppStateStatus>('active');
  const [animationStatus, setAnimationStatus] = useState('idle');
  const [layoutStatus, setLayoutStatus] = useState('awaiting first layout');

  const handleUrl = useCallback((url: string) => {
    const route = parseBenchmarkRoute(url);
    if (route) {
      dispatch({
        route,
        type: 'route',
        updateMode: route.scenario === 'updates' ? 'high-frequency' : undefined,
      });
    }
  }, []);

  useEffect(() => {
    const urlSubscription = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url);
    });
    const appStateSubscription = AppState.addEventListener(
      'change',
      setAppState
    );
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl(url);
      }
    });

    return () => {
      appStateSubscription.remove();
      urlSubscription.remove();
    };
  }, [handleUrl]);

  useEffect(() => {
    if (!shouldUpdate(state.route.scenario)) {
      return undefined;
    }

    const interval = setInterval(
      () => dispatch({ type: 'tick' }),
      UPDATE_INTERVALS[state.updateMode]
    );
    const timeout = setTimeout(
      () => clearInterval(interval),
      state.route.durationSeconds * 1000
    );

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [state.route.durationSeconds, state.route.scenario, state.updateMode]);

  const items = useMemo(
    () =>
      buildMarqueeItems(state.tick, state.updateMode, state.route.sparklines),
    [state.route.sparklines, state.tick, state.updateMode]
  );
  const active =
    state.activeOverride ?? isNaturallyActive(state.route.scenario);

  const handleScenarioChange = useCallback(
    (scenario: BenchmarkScenario) => {
      dispatch({
        route: makeRoute(state.route, { scenario }),
        type: 'route',
      });
    },
    [state.route]
  );
  const handleCountChange = useCallback(
    (count: StressCount) => {
      dispatch({ route: makeRoute(state.route, { count }), type: 'route' });
    },
    [state.route]
  );
  const handleUpdateModeChange = useCallback((updateMode: UpdateMode) => {
    dispatch({ type: 'updateMode', updateMode });
  }, []);
  const handleReduceMotionChange = useCallback(
    (reduceMotion: MarqueeReduceMotion) => {
      dispatch({ reduceMotion, type: 'reduceMotion' });
    },
    []
  );
  const handlePause = useCallback(() => dispatch({ type: 'pause' }), []);
  const handleReset = useCallback(() => dispatch({ type: 'reset' }), []);
  const handleResume = useCallback(() => dispatch({ type: 'resume' }), []);
  const handleAnimationStateChange = useCallback((nextState: string) => {
    setAnimationStatus(nextState);
  }, []);
  const handleContentLayout = useCallback(
    (contentWidth: number, containerWidth: number) => {
      setLayoutStatus(
        `${Math.round(contentWidth)} px content · ${Math.round(containerWidth)} px viewport`
      );
    },
    []
  );

  return (
    <View style={styles.screen} testID="gallery-screen">
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        testID="gallery-scroll"
      >
        <View style={styles.hero} testID="benchmark-screen">
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={styles.showcaseButton}
            testID="close-lab-button"
          >
            <Text style={styles.showcaseButtonText}>Showcase</Text>
          </Pressable>
          <Text style={styles.kicker}>GENERIC NATIVE MARQUEE LAB</Text>
          <Text style={styles.title}>Any content, native motion.</Text>
          <Text style={styles.subtitle}>
            Dynamic updates, gestures, lifecycle, accessibility, and 100-view
            stress in one development build.
          </Text>
          <View style={styles.routeSummary}>
            <Text style={styles.routeValue} testID="benchmark-scenario">
              {state.route.scenario}
            </Text>
            <Text style={styles.routeMeta} testID="benchmark-count">
              {state.route.count} view{state.route.count === 1 ? '' : 's'}
            </Text>
            <Text style={styles.routeMeta} testID="benchmark-duration">
              {state.route.durationSeconds}s window
            </Text>
            <Text style={styles.routeMeta} testID="benchmark-sparklines">
              graphs {state.route.sparklines ? 'on' : 'off'}
            </Text>
            <Text style={styles.routeMeta} testID="benchmark-speed">
              {state.route.speed} pt/s
            </Text>
          </View>
        </View>

        <MarqueeStack
          active={active}
          count={state.route.count}
          items={items}
          onAnimationStateChange={handleAnimationStateChange}
          onContentLayout={handleContentLayout}
          reduceMotion={state.reduceMotion}
          scenario={state.route.scenario}
          speed={state.route.speed}
        />

        <View style={styles.telemetryCard}>
          <Text style={styles.telemetryLabel}>ANIMATION</Text>
          <Text style={styles.telemetryValue} testID="animation-status">
            {animationStatus}
          </Text>
          <Text style={styles.telemetryLabel}>LAYOUT</Text>
          <Text style={styles.telemetryValue} testID="layout-status">
            {layoutStatus}
          </Text>
          <Text style={styles.telemetryLabel}>UPDATES</Text>
          <Text style={styles.telemetryValue} testID="update-count">
            {state.updateMode} · tick {state.tick}
          </Text>
          <Text style={styles.telemetryLabel}>GESTURE PHYSICS</Text>
          <Text style={styles.telemetryValue} testID="gesture-physics">
            3200 max velocity · 0.9985 decay · smooth auto handoff
          </Text>
          <Text style={styles.telemetryLabel}>LIFECYCLE</Text>
          <Text style={styles.telemetryValue} testID="lifecycle-status">
            {appState}
          </Text>
          <Text style={styles.telemetryLabel}>REDUCE MOTION</Text>
          <Text style={styles.telemetryValue} testID="reduce-motion-status">
            {state.reduceMotion}
          </Text>
          <Text style={styles.telemetryLabel}>ACCESSIBILITY</Text>
          <Text style={styles.telemetryValue} testID="accessibility-summary">
            one summary element per marquee; visual repetitions are hidden
          </Text>
        </View>

        <ScenarioControls
          onCountChange={handleCountChange}
          onPause={handlePause}
          onReduceMotionChange={handleReduceMotionChange}
          onReset={handleReset}
          onResume={handleResume}
          onScenarioChange={handleScenarioChange}
          onUpdateModeChange={handleUpdateModeChange}
          reduceMotion={state.reduceMotion}
          route={state.route}
          updateMode={state.updateMode}
        />

        <View style={styles.deepLinkCard} testID="benchmark-deep-link-help">
          <Text style={styles.sectionLabel}>AUTOMATION ROUTE</Text>
          <Text style={styles.code}>
            marquee-example://benchmark?scenario=updates&amp;count=1&amp;speed=50&amp;durationSeconds=20
          </Text>
        </View>
        <View testID="gallery-end" />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  baseline: {
    alignItems: 'center',
    backgroundColor: '#10271f',
    borderColor: '#1e4134',
    borderRadius: 16,
    borderWidth: 1,
    height: 72,
    justifyContent: 'center',
    marginHorizontal: 20,
  },
  baselineText: {
    color: '#78978a',
    fontFamily: 'Inter',
    fontSize: 13,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  code: {
    color: '#b9fbd5',
    fontFamily: 'Inter',
    fontSize: 12,
    lineHeight: 18,
  },
  content: {
    gap: 14,
    paddingBottom: 48,
  },
  controlButton: {
    alignItems: 'center',
    backgroundColor: '#18382d',
    borderColor: '#2a5545',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
    width: 140,
  },
  controlButtonActive: {
    backgroundColor: '#78edb3',
    borderColor: '#78edb3',
  },
  controlButtonPressed: {
    opacity: 0.7,
  },
  controlButtonText: {
    color: '#d9eee4',
    fontFamily: 'Inter',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  controlButtonTextActive: {
    color: '#07110e',
    fontFamily: 'Inter',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  controls: {
    gap: 12,
    marginHorizontal: 20,
  },
  deepLinkCard: {
    backgroundColor: '#10271f',
    borderColor: '#1e4134',
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    marginHorizontal: 20,
    padding: 16,
  },
  hero: {
    backgroundColor: '#0b2019',
    gap: 10,
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  kicker: {
    color: '#77e0ad',
    fontFamily: 'Inter',
    fontSize: 11,
    letterSpacing: 1.4,
  },
  marqueeShell: {
    backgroundColor: '#10271f',
    borderBottomColor: '#1e4134',
    borderBottomWidth: 1,
    height: 58,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  marqueeStack: {
    backgroundColor: '#10271f',
    maxHeight: 5800,
    overflow: 'hidden',
  },
  marqueeContent: {
    alignItems: 'center',
    gap: 32,
    height: 64,
  },
  negativeBackground: {
    backgroundColor: '#FF5E71',
  },
  negativeText: {
    color: '#FF5E71',
    fontFamily: 'Inter',
    fontSize: 11,
  },
  positiveBackground: {
    backgroundColor: '#32D583',
  },
  positiveText: {
    color: '#32D583',
    fontFamily: 'Inter',
    fontSize: 11,
  },
  routeMeta: {
    color: '#9eb8ac',
    fontFamily: 'Inter',
    fontSize: 12,
  },
  routeSummary: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  routeValue: {
    backgroundColor: '#78edb3',
    borderRadius: 999,
    color: '#07110e',
    fontFamily: 'Inter',
    fontSize: 12,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
    textTransform: 'uppercase',
  },
  screen: {
    backgroundColor: '#07110e',
    flex: 1,
  },
  showcaseButton: {
    alignSelf: 'flex-end',
    borderColor: '#2a5545',
    borderCurve: 'continuous',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  showcaseButtonText: {
    color: '#9eb8ac',
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
  },
  sectionLabel: {
    color: '#77e0ad',
    fontFamily: 'Inter',
    fontSize: 10,
    letterSpacing: 1.2,
  },
  sparkBar: {
    borderRadius: 1,
    opacity: 0.9,
    width: 2,
  },
  sparkBars: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 2,
    height: 24,
  },
  statusDot: {
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  subtitle: {
    color: '#9eb8ac',
    fontFamily: 'Inter',
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 560,
  },
  telemetryCard: {
    backgroundColor: '#f5f1e8',
    borderColor: '#d8d2c4',
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
    marginHorizontal: 20,
    padding: 16,
  },
  telemetryLabel: {
    color: '#48856d',
    fontFamily: 'Inter',
    fontSize: 9,
    letterSpacing: 1.1,
    marginTop: 5,
  },
  telemetryValue: {
    color: '#18382d',
    fontFamily: 'Inter',
    fontSize: 12,
  },
  symbol: {
    color: '#FFFFFF',
    fontFamily: 'Inter',
    fontSize: 12,
  },
  symbolRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  tickerCard: {
    alignItems: 'center',
    backgroundColor: '#10271f',
    borderColor: '#2a5545',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    height: 48,
    paddingHorizontal: 10,
  },
  tickerImage: {
    backgroundColor: '#78edb3',
    borderRadius: 10,
    height: 20,
    width: 20,
  },
  tickerText: {
    gap: 2,
  },
  title: {
    color: '#f3fbf6',
    fontFamily: 'Inter',
    fontSize: 34,
    letterSpacing: -1.2,
    lineHeight: 38,
  },
});
