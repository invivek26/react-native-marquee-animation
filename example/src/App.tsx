import { useCallback, useEffect, useState } from 'react';
import * as Linking from 'expo-linking';

import { ReliabilityLab } from './reliability-lab';
import {
  DEFAULT_BENCHMARK_ROUTE,
  parseBenchmarkRoute,
  type BenchmarkRoute,
} from './scenario';
import { ShowcaseScreen, type LabPreset } from './showcase-screen';

const LAB_ROUTES: Readonly<Record<LabPreset, BenchmarkRoute>> = {
  active: DEFAULT_BENCHMARK_ROUTE,
  gesture: {
    ...DEFAULT_BENCHMARK_ROUTE,
    count: 1,
    durationSeconds: 15,
    scenario: 'gesture',
  },
  static: {
    ...DEFAULT_BENCHMARK_ROUTE,
    count: 1,
    durationSeconds: 10,
    scenario: 'static',
  },
  stress: {
    ...DEFAULT_BENCHMARK_ROUTE,
    count: 100,
    durationSeconds: 8,
    scenario: 'stress',
  },
};

export const App = () => {
  const [labVisible, setLabVisible] = useState(false);
  const [initialRoute, setInitialRoute] = useState<BenchmarkRoute>();

  const handleUrl = useCallback((url: string) => {
    const route = parseBenchmarkRoute(url);
    if (!route) {
      return;
    }

    setInitialRoute(route);
    setLabVisible(true);
  }, []);

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url);
    });
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl(url);
      }
    });

    return () => subscription.remove();
  }, [handleUrl]);

  if (labVisible) {
    return (
      <ReliabilityLab
        initialRoute={initialRoute}
        onClose={() => setLabVisible(false)}
      />
    );
  }

  return (
    <ShowcaseScreen
      onOpenLab={(preset) => {
        setInitialRoute(LAB_ROUTES[preset]);
        setLabVisible(true);
      }}
    />
  );
};
