export type ExampleStock = Readonly<{
  changePercent: number;
  id: string;
  sparkline: readonly number[];
  symbol: string;
}>;

const STOCKS: readonly ExampleStock[] = [
  {
    id: 'nvda',
    symbol: 'NVDA',
    changePercent: 3.84,
    sparkline: [0.12, 0.2, 0.18, 0.37, 0.33, 0.54, 0.48, 0.72, 0.69, 0.91],
  },
  {
    id: 'aapl',
    symbol: 'AAPL',
    changePercent: -1.26,
    sparkline: [0.9, 0.82, 0.87, 0.66, 0.7, 0.51, 0.58, 0.39, 0.45, 0.24],
  },
  {
    id: 'tsla',
    symbol: 'TSLA',
    changePercent: 6.42,
    sparkline: [0.08, 0.2, 0.16, 0.4, 0.31, 0.6, 0.55, 0.75, 0.67, 0.96],
  },
  {
    id: 'btc',
    symbol: 'BTC',
    changePercent: 0.18,
    sparkline: [0.4, 0.44, 0.38, 0.51, 0.48, 0.55, 0.53, 0.61, 0.58, 0.65],
  },
  {
    id: 'googl',
    symbol: 'GOOGL',
    changePercent: -2.73,
    sparkline: [0.88, 0.76, 0.81, 0.63, 0.69, 0.47, 0.52, 0.35, 0.29, 0.17],
  },
  {
    id: 'amzn',
    symbol: 'AMZN',
    changePercent: 1.09,
    sparkline: [0.25, 0.28, 0.34, 0.31, 0.46, 0.43, 0.56, 0.61, 0.59, 0.72],
  },
  {
    id: 'meta',
    symbol: 'META',
    changePercent: 4.2,
    sparkline: [0.11, 0.15, 0.29, 0.25, 0.46, 0.42, 0.68, 0.64, 0.78, 0.94],
  },
  {
    id: 'coin',
    symbol: 'COIN',
    changePercent: -0.62,
    sparkline: [0.7, 0.62, 0.68, 0.59, 0.64, 0.48, 0.51, 0.39, 0.42, 0.31],
  },
] as const;

export const buildStocks = (tick: number, widthChanging: boolean) =>
  STOCKS.map((stock, index) => {
    const direction = index % 2 === 0 ? 1 : -1;
    const sameWidthDelta = ((tick + index) % 9) / 100;
    const widthChangingDelta = tick % 2 === 0 ? 0 : 100 + index * 11.11;
    const changePercent =
      stock.changePercent +
      direction * (widthChanging ? widthChangingDelta : sameWidthDelta);

    return {
      ...stock,
      changePercent,
      symbol:
        widthChanging && tick % 3 === 2 && index === 0
          ? 'BRK.B CLASS B'
          : stock.symbol,
    };
  });
