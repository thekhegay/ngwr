import { Component } from '@angular/core';

import { WrCandlestickChart, type WrCandlestickDatum } from 'ngwr/charts/candlestick-chart';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
  type DocApiRow,
} from '#core/components';
import { API } from '#core/generated/api';

/**
 * `count` trading days from 2 January 2026, weekends skipped, as a seeded random walk:
 * the same candles on the server and in the browser, every build.
 */
function tradingDays(count: number, start: number, seed: number): WrCandlestickDatum[] {
  // The Park–Miller generator: whole numbers below 2³¹, every product exact in a double,
  // so a prerendered page and the app that hydrates it agree on every price.
  let state = seed;
  const random = (): number => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
  const label = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const round = (value: number): number => Math.round(value * 100) / 100;

  const days: WrCandlestickDatum[] = [];
  let close = start;
  for (let offset = 2; days.length < count; offset++) {
    const date = new Date(Date.UTC(2026, 0, offset));
    const weekday = date.getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    const open = close + (random() - 0.5) * start * 0.01;
    close = open + (random() - 0.48) * start * 0.04;
    const high = Math.max(open, close) + random() * start * 0.015;
    const low = Math.min(open, close) - random() * start * 0.015;
    days.push({
      label: label.format(date),
      open: round(open),
      high: round(high),
      low: round(low),
      close: round(close),
    });
  }
  return days;
}

@Component({
  selector: 'ngwr-candlestick-chart-page',
  templateUrl: './candlestick-chart.html',
  imports: [
    WrCandlestickChart,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class CandlestickChartPageComponent {
  /** Four weeks of one stock. */
  protected readonly month = tradingDays(20, 120, 1234567);

  /** A trading year: 250 days in one chart. */
  protected readonly year = tradingDays(250, 80, 7654321);

  private readonly usdFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

  protected readonly format = (value: number): string => this.usdFormat.format(value);

  protected readonly snippets = {
    basic: `<wr-candlestick-chart ariaLabel="ACME, daily" [data]="days" />`,
    basicTs: `days: WrCandlestickDatum[] = [
  { label: 'Jan 2', open: 120.4, high: 122.9, low: 119.8, close: 122.1 },
  { label: 'Jan 5', open: 122.3, high: 123.0, low: 118.6, close: 119.2 },
  // …
];`,
    colors: `<wr-candlestick-chart
  [data]="days"
  increaseColor="var(--wr-color-danger)"
  decreaseColor="var(--wr-color-success)"
/>`,
    many: `<wr-candlestick-chart ariaLabel="ACME, 2026" [data]="year" />`,
    format: `<wr-candlestick-chart [data]="days" [valueFormat]="format" />`,
    formatTs: `const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

format = (value: number): string => usd.format(value);`,
    table: `<wr-candlestick-chart ariaLabel="ACME, daily" dataTable [data]="days" />`,
  };

  protected readonly typeSnippet = `interface WrCandlestickDatum {
  label: string;
  open: number;
  high: number;
  low: number;
  close: number;
}`;

  protected readonly api = API.WrCandlestickChart;

  protected readonly typeRows: readonly DocApiRow[] = [
    { name: 'WrCandlestickDatum', description: 'One period and its four prices.', type: 'interface' },
    {
      name: 'label',
      description: 'The period, as text. Printed under the candle when there is room.',
      type: 'string',
      required: true,
      sub: true,
    },
    { name: 'open', description: 'The first price: one end of the body.', type: 'number', required: true, sub: true },
    { name: 'high', description: 'The highest price: the top of the wick.', type: 'number', required: true, sub: true },
    {
      name: 'low',
      description: 'The lowest price: the bottom of the wick.',
      type: 'number',
      required: true,
      sub: true,
    },
    {
      name: 'close',
      description: 'The last price. At or above `open` the candle is rising.',
      type: 'number',
      required: true,
      sub: true,
    },
  ];
}
