import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrCandlestickChart, type WrCandlestickDatum } from 'ngwr/charts/candlestick-chart';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrCandlestickChartHarness } from './wr-candlestick-chart-harness';

/** Two days over 95..110: an axis from 90 to 115, slots centred at 25% and 75%. */
const DATA: readonly WrCandlestickDatum[] = [
  { label: 'Mon', open: 100, high: 110, low: 95, close: 105 },
  { label: 'Tue', open: 105, high: 108, low: 98, close: 100 },
];

@Component({
  imports: [WrCandlestickChart],
  template: `
    <wr-candlestick-chart [data]="data()" [ariaLabel]="ariaLabel()" [showGrid]="showGrid()" [dataTable]="dataTable()" />
  `,
})
class Host {
  readonly data = signal<readonly WrCandlestickDatum[]>(DATA);
  readonly ariaLabel = signal<string | null>('ACME, daily');
  readonly showGrid = signal(true);
  readonly dataTable = signal(false);
}

describe('WrCandlestickChartHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const chart = (): Promise<WrCandlestickChartHarness> => loader.getHarness(WrCandlestickChartHarness);
  const host = (): Host => fixture.componentInstance;

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('reads the name and the candle count', async () => {
    const harness = await chart();

    expect(await harness.getAccessibleName()).toBe('ACME, daily');
    expect(await harness.getCandleCount()).toBe(2);
  });

  it('reads every candle with its prices, its direction and the place the chart put it', async () => {
    expect(await (await chart()).getCandles()).toEqual([
      {
        index: 0,
        open: 100,
        high: 110,
        low: 95,
        close: 105,
        direction: 'up',
        left: 25,
        top: 20,
        height: 60,
        upperWick: 33.333,
        lowerWick: 33.333,
      },
      {
        index: 1,
        open: 105,
        high: 108,
        low: 98,
        close: 100,
        direction: 'down',
        left: 75,
        top: 28,
        height: 40,
        upperWick: 30,
        lowerWick: 20,
      },
    ]);
  });

  it('keeps the index of a candle past a period it could not draw', async () => {
    host().data.set([{ label: 'Gap', open: Number.NaN, high: 1, low: 0, close: 1 }, ...DATA]);
    await fixture.whenStable();

    expect((await (await chart()).getCandles()).map(candle => candle.index)).toEqual([1, 2]);
  });

  it('reads the ticks and the labels, and none without the grid', async () => {
    const harness = await chart();

    expect(await harness.hasGrid()).toBe(true);
    expect(await harness.getYTicks()).toEqual(['115', '110', '105', '100', '95', '90']);
    expect(await harness.getXLabels()).toEqual(['Mon', 'Tue']);

    host().showGrid.set(false);
    await fixture.whenStable();

    expect([await harness.hasGrid(), await harness.getYTicks(), await harness.getXLabels()]).toEqual([false, [], []]);
  });

  it('reads the dense decision and the thinned labels for many candles', async () => {
    const harness = await chart();
    expect(await harness.isDense()).toBe(false);

    host().data.set(
      Array.from({ length: 200 }, (_, i) => ({ label: `D${i + 1}`, open: i, high: i + 2, low: i - 1, close: i + 1 }))
    );
    await fixture.whenStable();

    expect(await harness.isDense()).toBe(true);
    expect((await harness.getXLabels()).slice(0, 2)).toEqual(['D6', 'D21']);
  });

  it('reads the data table, and refuses to while there is none', async () => {
    const harness = await chart();

    expect(await harness.hasDataTable()).toBe(false);
    await expect(harness.getTableRows()).rejects.toThrow(/`dataTable` is off/);
    await expect(harness.getTableColumns()).rejects.toThrow(/`dataTable` is off/);

    host().dataTable.set(true);
    await fixture.whenStable();

    expect(await harness.getTableColumns()).toEqual(['Open', 'High', 'Low', 'Close']);
    expect(await harness.getTableRows()).toEqual([
      { header: 'Mon', cells: ['100', '110', '95', '105'] },
      { header: 'Tue', cells: ['105', '108', '98', '100'] },
    ]);
  });

  it('reads the plot height off the style the chart wrote', async () => {
    expect(await (await chart()).getPlotHeight()).toBe(240);
  });

  it('matches on the accessible name', async () => {
    expect(await loader.getHarnessOrNull(WrCandlestickChartHarness.with({ ariaLabel: /ACME/ }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrCandlestickChartHarness.with({ ariaLabel: 'Costs' }))).toBeNull();
  });
});
