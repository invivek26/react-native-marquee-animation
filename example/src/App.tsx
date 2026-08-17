import { useCallback, useEffect, useState } from 'react';
import * as Linking from 'expo-linking';

import { ReliabilityLab } from './reliability-lab';
import { parseBenchmarkRoute, type BenchmarkRoute } from './scenario';
import { ShowcaseScreen } from './showcase-screen';

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
      onOpenLab={
        __DEV__
          ? () => {
              setInitialRoute(undefined);
              setLabVisible(true);
            }
          : undefined
      }
    />
  );
};
