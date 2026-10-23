import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrScatterChart, type WrScatterSeries } from 'ngwr/charts/scatter-chart';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrScatterChartHarness } from './wr-scatter-chart-harness';

const SERIES: readonly WrScatterSeries[] = [
  {
    label: 'Laptops',
    data: [
      { x: 10, y: 100, size: 4 },
      { x: 30, y: 140, size: 16, label: 'Pro' },
    ],
  },
  { label: 'Tablets', data: [{ x: 20, y: 120 }] },
];

@Component({
  imports: [WrScatterChart],
  template: `
    <wr-scatter-chart
      [series]="series()"
      [ariaLabel]="ariaLabel()"
      [xLabel]="xLabel()"
      [yLabel]="yLabel()"
      [showLegend]="showLegend()"
      [showGrid]="showGrid()"
      [dataTable]="dataTable()"
      [toggleableLegend]="toggleable()"
      [(hiddenSeries)]="hidden"
    />
  `,
})
class Host {
  readonly series = signal<readonly WrScatterSeries[]>(SERIES);
  readonly ariaLabel = signal<string | null>('Price against rating');
  readonly xLabel = signal<string | null>(null);
  readonly yLabel = signal<string | null>(null);
  readonly showLegend = signal(true);
  readonly showGrid = signal(true);
  readonly dataTable = signal(false);
  readonly toggleable = signal(false);
  readonly hidden = signal<readonly number[]>([]);
}

describe('WrScatterChartHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const chart = (): Promise<WrScatterChartHarness> => loader.getHarness(WrScatterChartHarness);
  const host = (): Host => fixture.componentInstance;

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('reads the name, the legend and the point count', async () => {
    const harness = await chart();

    expect(await harness.getAccessibleName()).toBe('Price against rating');
    expect(await harness.hasLegend()).toBe(true);
    expect(await harness.getSeriesLabels()).toEqual(['Laptops', 'Tablets']);
    expect(await harness.getPointCount()).toBe(3);
  });

  it('reads every point with its values, shape, size and the place the chart put it', async () => {
    const points = await (await chart()).getPoints();

    // Largest first: the 16 is drawn at the full 20px, the 4 at half of it, and the
    // point with no size at the plain 5px.
    expect(points).toEqual([
      {
        series: 0,
        x: 30,
        y: 140,
        size: 16,
        marker: 'circle',
        color: 'var(--wr-color-primary)',
        radius: 20,
        left: 83.333,
        top: 16.667,
      },
      {
        series: 0,
        x: 10,
        y: 100,
        size: 4,
        marker: 'circle',
        color: 'var(--wr-color-primary)',
        radius: 10,
        left: 16.667,
        top: 83.333,
      },
      {
        series: 1,
        x: 20,
        y: 120,
        size: null,
        marker: 'square',
        color: 'var(--wr-color-success)',
        radius: 5,
        left: 50,
        top: 50,
      },
    ]);
  });

  it('reads the ticks of both axes, and none without the grid', async () => {
    const harness = await chart();

    expect(await harness.hasGrid()).toBe(true);
    expect(await harness.getXTicks()).toEqual(['5', '10', '15', '20', '25', '30', '35']);
    expect(await harness.getYTicks()).toEqual(['150', '140', '130', '120', '110', '100', '90']);

    host().showGrid.set(false);
    await fixture.whenStable();

    expect([await harness.hasGrid(), await harness.getXTicks(), await harness.getYTicks()]).toEqual([false, [], []]);
  });

  it('reads the axis names the chart draws, and none it does not', async () => {
    const harness = await chart();
    expect(await harness.getAxisTitles()).toEqual({ x: null, y: null });

    host().xLabel.set('Price');
    host().yLabel.set('Rating');
    await fixture.whenStable();

    expect(await harness.getAxisTitles()).toEqual({ x: 'Price', y: 'Rating' });
  });

  it('reads the data table, and refuses to while there is none', async () => {
    const harness = await chart();

    expect(await harness.hasDataTable()).toBe(false);
    await expect(harness.getTableRows()).rejects.toThrow(/`dataTable` is off/);
    await expect(harness.getTableColumns()).rejects.toThrow(/`dataTable` is off/);

    host().dataTable.set(true);
    await fixture.whenStable();

    expect(await harness.getTableColumns()).toEqual(['X', 'Y', 'Size']);
    expect(await harness.getTableRows()).toEqual([
      { series: 'Laptops', header: '1', cells: ['10', '100', '4'] },
      { series: 'Laptops', header: 'Pro', cells: ['30', '140', '16'] },
      { series: 'Tablets', header: '1', cells: ['20', '120', ''] },
    ]);
  });

  it('hands over the legend, and refuses to while there is none', async () => {
    host().toggleable.set(true);
    await fixture.whenStable();
    const harness = await chart();

    const legend = await harness.getLegendHarness();
    const items = await legend.getItems();
    expect(items.map(({ label, swatch, marker }) => [label, swatch, marker])).toEqual([
      ['Laptops', 'marker', 'circle'],
      ['Tablets', 'marker', 'square'],
    ]);

    await legend.toggle(1);
    expect(host().hidden()).toEqual([1]);
    expect(await harness.getPointCount()).toBe(2);

    host().showLegend.set(false);
    await fixture.whenStable();
    expect(await harness.hasLegend()).toBe(false);
    await expect(harness.getLegendHarness()).rejects.toThrow(/draws no legend/);
  });

  it('reads the plot height off the style the chart wrote', async () => {
    expect(await (await chart()).getPlotHeight()).toBe(240);
  });

  it('matches on the accessible name and on a series', async () => {
    expect(await loader.getHarnessOrNull(WrScatterChartHarness.with({ ariaLabel: /rating/ }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrScatterChartHarness.with({ ariaLabel: 'Costs' }))).toBeNull();
    expect(await loader.getHarnessOrNull(WrScatterChartHarness.with({ seriesLabel: 'Tablets' }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrScatterChartHarness.with({ seriesLabel: 'Phones' }))).toBeNull();
  });
});
