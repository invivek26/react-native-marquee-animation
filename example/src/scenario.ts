import * as Linking from 'expo-linking';

export const BENCHMARK_SCENARIOS = [
  'baseline',
  'static',
  'active',
  'updates',
  'gesture',
  'stress',
] as const;

export const STRESS_COUNTS = [1, 10, 30, 100] as const;

export type BenchmarkScenario = (typeof BENCHMARK_SCENARIOS)[number];
export type StressCount = (typeof STRESS_COUNTS)[number];

export type BenchmarkRoute = Readonly<{
  count: StressCount;
  durationSeconds: number;
  scenario: BenchmarkScenario;
  sparklines: boolean;
}>;

export const DEFAULT_BENCHMARK_ROUTE: BenchmarkRoute = {
  count: 10,
  durationSeconds: 20,
  scenario: 'active',
  sparklines: true,
};

const isBenchmarkScenario = (
  value: string | undefined
): value is BenchmarkScenario =>
  BENCHMARK_SCENARIOS.some((scenario) => scenario === value);

const resolveStressCount = (value: string | undefined): StressCount => {
  const numericValue = Number(value);
  const count = STRESS_COUNTS.find((candidate) => candidate === numericValue);
  return count ?? DEFAULT_BENCHMARK_ROUTE.count;
};

const resolveDurationSeconds = (value: string | undefined): number => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return DEFAULT_BENCHMARK_ROUTE.durationSeconds;
  }

  return Math.min(Math.round(numericValue), 300);
};

const resolveQueryValue = (
  value: Linking.QueryParams[string]
): string | undefined => {
  if (Array.isArray(value)) {
    return value[0] ?? undefined;
  }

  return value ?? undefined;
};

export const parseBenchmarkRoute = (url: string): BenchmarkRoute | null => {
  const parsed = Linking.parse(url);
  if (parsed.hostname !== 'benchmark' && parsed.path !== 'benchmark') {
    return null;
  }

  const scenarioValue = resolveQueryValue(parsed.queryParams?.scenario);
  const scenario = isBenchmarkScenario(scenarioValue)
    ? scenarioValue
    : DEFAULT_BENCHMARK_ROUTE.scenario;

  return {
    count: resolveStressCount(resolveQueryValue(parsed.queryParams?.count)),
    durationSeconds: resolveDurationSeconds(
      resolveQueryValue(parsed.queryParams?.durationSeconds)
    ),
    scenario,
    sparklines: resolveQueryValue(parsed.queryParams?.sparklines) !== '0',
  };
};
