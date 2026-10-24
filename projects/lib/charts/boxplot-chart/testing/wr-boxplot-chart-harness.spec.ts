import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrBoxplotChart, type WrBoxplotGroup } from 'ngwr/charts/boxplot-chart';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrBoxplotChartHarness } from './wr-boxplot-chart-harness';

/**
 * 1..10 and 30 has its quartiles at 3.5, 6 and 8.5, its whiskers at 1 and 10 and 30 as
 * an outlier; with the summary beside it the axis reads 0 to 40, so a value v is drawn
 * (40 − v) / 40 down.
 */
const GROUPS: readonly WrBoxplotGroup[] = [
  { label: 'North', values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 30] },
  { label: 'South', color: 'rebeccapurple', stats: { min: 4, q1: 8, median: 12, q3: 16, max: 20 } },
  { label: 'West' },
];

@Component({
  imports: [WrBoxplotChart],
  template: `
    <wr-boxplot-chart
      [groups]="groups()"
      [ariaLabel]="ariaLabel()"
      [xLabel]="xLabel()"
      [yLabel]="yLabel()"
      [showGrid]="showGrid()"
      [dataTable]="dataTable()"
    />
  `,
})
class Host {
  readonly groups = signal<readonly WrBoxplotGroup[]>(GROUPS);
  readonly ariaLabel = signal<string | null>('Response time by region');
  readonly xLabel = signal<string | null>(null);
  readonly yLabel = signal<string | null>(null);
  readonly showGrid = signal(true);
  readonly dataTable = signal(false);
}

describe('WrBoxplotChartHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const chart = (): Promise<WrBoxplotChartHarness> => loader.getHarness(WrBoxplotChartHarness);
  const host = (): Host => fixture.componentInstance;

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('reads the name, the group names and the slot count', async () => {
    const harness = await chart();

    expect(await harness.getAccessibleName()).toBe('Response time by region');
    expect(await harness.getGroupLabels()).toEqual(['North', 'South', 'West']);
    expect(await harness.getGroupCount()).toBe(3);
  });

  it('reads every group: what the chart worked out, and where it drew it', async () => {
    expect(await (await chart()).getGroups()).toEqual([
      {
        label: 'North',
        slotStart: 0,
        slotWidth: 33.333,
        color: 'var(--wr-color-primary)',
        stats: { min: 1, q1: 3.5, median: 6, q3: 8.5, max: 10, outliers: [30] },
        position: {
          upperWhisker: { top: 75, bottom: 78.75 },
          lowerWhisker: { top: 91.25, bottom: 97.5 },
          max: 75,
          boxTop: 78.75,
          median: 85,
          boxBottom: 91.25,
          min: 97.5,
          outliers: [25],
        },
      },
      {
        label: 'South',
        slotStart: 33.333,
        slotWidth: 33.333,
        color: 'rebeccapurple',
        stats: { min: 4, q1: 8, median: 12, q3: 16, max: 20, outliers: [] },
        position: {
          upperWhisker: { top: 50, bottom: 60 },
          lowerWhisker: { top: 80, bottom: 90 },
          max: 50,
          boxTop: 60,
          median: 70,
          boxBottom: 80,
          min: 90,
          outliers: [],
        },
      },
      {
        label: 'West',
        slotStart: 66.667,
        slotWidth: 33.333,
        color: 'var(--wr-color-primary)',
        stats: null,
        position: null,
      },
    ]);
  });

  it.each(['upper', 'lower'])(
    'refuses a drawn group without its %s whisker, rather than reading it as drawn',
    async end => {
      const harness = await chart();
      (fixture.nativeElement as HTMLElement).querySelector(`.wr-boxplot-chart__whisker--${end}`)!.remove();

      await expect(harness.getGroups()).rejects.toThrow(/without both whiskers/);
    }
  );

  it('reads the ticks, and none without the grid', async () => {
    const harness = await chart();

    expect(await harness.hasGrid()).toBe(true);
    expect(await harness.getYTicks()).toEqual(['40', '30', '20', '10', '0']);

    host().showGrid.set(false);
    await fixture.whenStable();

    expect([await harness.hasGrid(), await harness.getYTicks()]).toEqual([false, []]);
  });

  it('reads the axis names the chart draws, and none it does not', async () => {
    const harness = await chart();
    expect(await harness.getAxisTitles()).toEqual({ x: null, y: null });

    host().xLabel.set('Region');
    host().yLabel.set('Response time, ms');
    await fixture.whenStable();

    expect(await harness.getAxisTitles()).toEqual({ x: 'Region', y: 'Response time, ms' });
  });

  it('reads the data table, and refuses to while there is none', async () => {
    const harness = await chart();

    expect(await harness.hasDataTable()).toBe(false);
    await expect(harness.getTableRows()).rejects.toThrow(/`dataTable` is off/);
    await expect(harness.getTableColumns()).rejects.toThrow(/`dataTable` is off/);

    host().dataTable.set(true);
    await fixture.whenStable();

    // One heading per cell: the corner over the row headers is not a column.
    expect(await harness.getTableColumns()).toEqual([
      'Lower whisker',
      'Q1',
      'Median',
      'Q3',
      'Upper whisker',
      'Outliers',
    ]);
    expect(await harness.getTableRows()).toEqual([
      { header: 'North', cells: ['1', '3.5', '6', '8.5', '10', '30'] },
      { header: 'South', cells: ['4', '8', '12', '16', '20', ''] },
      { header: 'West', cells: ['', '', '', '', '', ''] },
    ]);
  });

  it('reads the plot height off the style the chart wrote', async () => {
    expect(await (await chart()).getPlotHeight()).toBe(240);
  });

  it('matches on the accessible name and on a group', async () => {
    expect(await loader.getHarnessOrNull(WrBoxplotChartHarness.with({ ariaLabel: /region/ }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrBoxplotChartHarness.with({ ariaLabel: 'Costs' }))).toBeNull();
    expect(await loader.getHarnessOrNull(WrBoxplotChartHarness.with({ groupLabel: 'West' }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrBoxplotChartHarness.with({ groupLabel: 'East' }))).toBeNull();
  });
});
