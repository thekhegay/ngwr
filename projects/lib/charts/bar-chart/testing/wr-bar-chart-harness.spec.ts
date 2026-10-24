import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  WrBarChart,
  type WrBarChartDatum,
  type WrBarChartLine,
  type WrBarChartOrientation,
  type WrBarSeries,
} from 'ngwr/charts/bar-chart';
import { chartColor } from 'ngwr/charts/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrBarChartHarness } from './wr-bar-chart-harness';

const DATA: readonly WrBarChartDatum[] = [
  { label: 'Mon', value: 12 },
  { label: 'Tue', value: 24 },
  { label: 'Wed', value: 6 },
];

@Component({
  imports: [WrBarChart],
  template: '<wr-bar-chart [data]="data()" [showValues]="showValues()" [height]="height()" [max]="max()" />',
})
class Host {
  readonly data = signal<readonly WrBarChartDatum[]>(DATA);
  readonly showValues = signal(true);
  readonly height = signal(200);
  readonly max = signal(0);
}

/**
 * Heights are read as PERCENTAGES of the chart's maximum — the one number that
 * survives a test with no layout, and the component's actual job.
 */
describe('WrBarChartHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const chart = (): Promise<WrBarChartHarness> => loader.getHarness(WrBarChartHarness);

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('draws a column per datum, scaled against the tallest', async () => {
    const harness = await chart();

    expect(await harness.getBarCount()).toBe(3);
    expect((await harness.getBars()).map(bar => bar.heightPercent)).toEqual([50, 100, 25]);
  });

  it('separates the drawn label from the announced name', async () => {
    const harness = await chart();

    // The label row is `aria-hidden` decoration; the column carries the real name.
    expect(await harness.getLabels()).toEqual(['Mon', 'Tue', 'Wed']);
    expect(await harness.getAccessibleNames()).toEqual(['Mon: 12', 'Tue: 24', 'Wed: 6']);
  });

  it('prints the values above the bars, and drops them when told to', async () => {
    const harness = await chart();
    expect([await harness.hasValues(), (await harness.getBars())[0].value]).toEqual([true, '12']);

    fixture.componentInstance.showValues.set(false);
    await fixture.whenStable();

    expect([await harness.hasValues(), (await harness.getBars())[0].value]).toEqual([false, null]);
  });

  it('scales against an explicit maximum when one is given', async () => {
    fixture.componentInstance.max.set(48);
    await fixture.whenStable();

    expect((await (await chart()).getBars()).map(bar => bar.heightPercent)).toEqual([25, 50, 12.5]);
  });

  it('reads the share the component declared, not one the layout resolved', async () => {
    // `getCssValue()` is `getComputedStyle()`, which echoes the declared `50%` in jsdom and
    // resolves it to used pixels in a real browser — so the same call answered `[50, 100, 25]`
    // here and `[100, 200, 50]` under a browser runner, with nothing to say which you got.

    // An empty bar still DECLARES `height: 0%`, so 0 is a reading rather than an absence —
    // which is what lets the missing case throw instead of reporting a plausible nothing.
    fixture.componentInstance.data.set([
      { label: 'Mon', value: 0 },
      { label: 'Tue', value: 24 },
    ]);
    await fixture.whenStable();
    expect((await (await chart()).getBars()).map(bar => bar.heightPercent)).toEqual([0, 100]);

    // Take the declaration away and the two reads part company: the attribute read has
    // nothing to report and says so, where the computed read quietly returned `NaN`.
    const harness = await chart();
    const bar = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-bar-chart__bar')!;
    bar.removeAttribute('style');

    await expect(harness.getBars()).rejects.toThrow(/no inline share/);
  });

  it('reads the plot height the component wrote', async () => {
    fixture.componentInstance.height.set(320);
    await fixture.whenStable();

    expect(await (await chart()).getPlotHeight()).toBe(320);
  });

  it('draws nothing for an empty dataset', async () => {
    fixture.componentInstance.data.set([]);
    await fixture.whenStable();

    const harness = await chart();
    expect([await harness.getBarCount(), await harness.getLabels()]).toEqual([0, []]);
  });

  it('matches on a bar label', async () => {
    expect(await loader.getHarnessOrNull(WrBarChartHarness.with({ barLabel: 'Tue' }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrBarChartHarness.with({ barLabel: 'Sun' }))).toBeNull();
  });

  it('refuses to read a zero line from a chart that draws no track', async () => {
    await expect((await chart()).getZeroPercent()).rejects.toThrow(/draws no track/);
  });
});

const SERIES: readonly WrBarSeries[] = [
  { label: 'North', data: [10, 30] },
  { label: 'South', data: [30, null] },
];

@Component({
  imports: [WrBarChart],
  template: `
    <wr-bar-chart
      ariaLabel="Sales by region"
      [series]="series()"
      [categories]="['Q1', 'Q2']"
      [stacked]="stacked()"
      [orientation]="orientation()"
      [dataTable]="dataTable()"
      [showLegend]="showLegend()"
      toggleableLegend
      [(hiddenSeries)]="hidden"
    />
  `,
})
class SeriesHost {
  readonly series = signal<readonly WrBarSeries[]>(SERIES);
  readonly stacked = signal(false);
  readonly orientation = signal<WrBarChartOrientation>('vertical');
  readonly dataTable = signal(false);
  readonly showLegend = signal(true);
  readonly hidden = signal<readonly number[]>([]);
}

/**
 * A chart drawn from `series`: the bars are read with the category group round them and
 * their place along the value axis as the two percentages the component wrote.
 */
describe('WrBarChartHarness with series', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<SeriesHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const chart = (): Promise<WrBarChartHarness> => loader.getHarness(WrBarChartHarness);
  const set = async (change: (h: SeriesHost) => void): Promise<void> => {
    change(fixture.componentInstance);
    await fixture.whenStable();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(SeriesHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('reads each bar with its category, its name, its shares and its key', async () => {
    const harness = await chart();

    expect(await harness.getSeriesBars()).toEqual([
      { category: 'Q1', name: 'North: 10', startPercent: 0, sizePercent: 33.33, color: chartColor(0), dash: '' },
      { category: 'Q1', name: 'South: 30', startPercent: 0, sizePercent: 100, color: chartColor(1), dash: '7 4' },
      { category: 'Q2', name: 'North: 30', startPercent: 0, sizePercent: 100, color: chartColor(0), dash: '' },
    ]);
    // The single-series reads have nothing to read here, and say so by being empty.
    expect([await harness.getBars(), await harness.getBarCount()]).toEqual([[], 0]);
    expect(await harness.getLabels()).toEqual(['Q1', 'Q2']);
    expect(await harness.getValues()).toEqual(['10', '30', '30']);
  });

  it('reads the pile under stacked', async () => {
    await set(h => h.stacked.set(true));
    const harness = await chart();

    expect(await harness.isStacked()).toBe(true);
    expect((await harness.getSeriesBars()).map(bar => [bar.startPercent, bar.sizePercent])).toEqual([
      [0, 25],
      [25, 75],
      [0, 75],
    ]);
    expect(await harness.getValues()).toEqual(['40', '30']);
  });

  it('reads the orientation the component declared', async () => {
    const harness = await chart();
    expect(await harness.getOrientation()).toBe('vertical');

    await set(h => h.orientation.set('horizontal'));
    expect(await harness.getOrientation()).toBe('horizontal');
    expect(await harness.getLabels()).toEqual(['Q1', 'Q2']);
    // Lying down, `height` is written as a floor the rows may grow the plot past.
    expect(await harness.getPlotHeight()).toBe(200);
  });

  it('composes the legend harness, and hides a series through it', async () => {
    const harness = await chart();
    expect(await harness.hasLegend()).toBe(true);

    const legend = await harness.getLegendHarness();
    expect(await legend.getLabels()).toEqual(['North', 'South']);
    await legend.toggle(1);

    expect(fixture.componentInstance.hidden()).toEqual([1]);
    expect((await harness.getSeriesBars()).map(bar => bar.name)).toEqual(['North: 10', 'North: 30']);

    await set(h => h.showLegend.set(false));
    expect(await harness.hasLegend()).toBe(false);
    await expect(harness.getLegendHarness()).rejects.toThrow(/draws no legend/);
  });

  it('reads the data table, and refuses to when there is none', async () => {
    const harness = await chart();
    expect(await harness.hasDataTable()).toBe(false);
    await expect(harness.getTableRows()).rejects.toThrow(/no data table/);

    await set(h => h.dataTable.set(true));
    expect(await harness.getTableColumns()).toEqual(['North', 'South']);
    expect(await harness.getTableRows()).toEqual([
      { header: 'Q1', cells: ['10', '30'] },
      { header: 'Q2', cells: ['30', ''] },
    ]);
  });

  it('matches on the accessible name and on a category', async () => {
    expect(await (await chart()).getAccessibleName()).toBe('Sales by region');
    expect(await loader.getHarnessOrNull(WrBarChartHarness.with({ ariaLabel: /region/ }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrBarChartHarness.with({ ariaLabel: 'Bar chart' }))).toBeNull();
    expect(await loader.getHarnessOrNull(WrBarChartHarness.with({ barLabel: 'Q2' }))).not.toBeNull();
  });

  it('throws on a bar with no shares rather than reading it as one on the axis minimum', async () => {
    const harness = await chart();
    const bar = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-bar-chart__series-bar')!;
    bar.removeAttribute('style');

    await expect(harness.getSeriesBars()).rejects.toThrow(/no inline --wr-bar-chart-start/);
  });
});

@Component({
  imports: [WrBarChart],
  template: `
    <wr-bar-chart
      [series]="series()"
      [data]="data()"
      [categories]="['Q1', 'Q2', 'Q3']"
      [lines]="lines()"
      [orientation]="orientation()"
      [dataTable]="dataTable()"
      [(hiddenLines)]="hiddenLines"
    />
  `,
})
class LinesHost {
  readonly series = signal<readonly WrBarSeries[]>([{ label: 'North', data: [10, 20, 40] }]);
  readonly data = signal<readonly WrBarChartDatum[]>([]);
  readonly lines = signal<readonly WrBarChartLine[]>([
    { label: 'Target', data: [20, null, 30] },
    { label: 'Rate', data: [5, 10, 15], color: '#123456' },
  ]);
  readonly orientation = signal<WrBarChartOrientation>('vertical');
  readonly dataTable = signal(false);
  readonly hiddenLines = signal<readonly number[]>([]);
}

/**
 * A chart with `lines`: each line is read off its own group, and each point's place along
 * the value axis is on the percentage scale the bars are read on.
 */
describe('WrBarChartHarness with lines', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<LinesHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const chart = (): Promise<WrBarChartHarness> => loader.getHarness(WrBarChartHarness);
  const set = async (change: (h: LinesHost) => void): Promise<void> => {
    change(fixture.componentInstance);
    await fixture.whenStable();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(LinesHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('counts the lines drawn, and leaves a hidden one out', async () => {
    const harness = await chart();
    expect(await harness.getLineCount()).toBe(2);

    await set(h => h.hiddenLines.set([0]));
    expect(await harness.getLineCount()).toBe(1);
    expect((await harness.getLines()).map(line => line.label)).toEqual(['Rate']);
  });

  it('reads each line’s key, its runs and its points on the bars’ own scale', async () => {
    const [target, rate] = await (await chart()).getLines();

    expect(target).toEqual({
      label: 'Target',
      color: chartColor(1),
      // The missing Q2 breaks the line, so neither point has a run, and there is no dash
      // to read rather than a solid one.
      dash: null,
      marker: 'circle',
      segmentCount: 0,
      points: [
        { name: 'Q1: 20', valuePercent: 50 },
        { name: 'Q3: 30', valuePercent: 75 },
      ],
    });
    expect([rate.color, rate.dash, rate.marker, rate.segmentCount]).toEqual(['#123456', '7 4', 'square', 2]);
    // The tallest bar tops the axis, so it and a point at its value read the same.
    expect((await (await chart()).getSeriesBars())[2].sizePercent).toBe(100);
  });

  it('reads a point’s place along the value axis whichever way the chart runs', async () => {
    await set(h => h.orientation.set('horizontal'));

    expect((await (await chart()).getLines())[0].points.map(point => point.valuePercent)).toEqual([50, 75]);
  });

  it('answers with no lines for a chart without them', async () => {
    await set(h => h.lines.set([]));
    const harness = await chart();

    expect([await harness.getLineCount(), await harness.getLines()]).toEqual([0, []]);
  });

  it('throws on a point that carries no position rather than reading it as an end of the axis', async () => {
    const harness = await chart();
    (fixture.nativeElement as HTMLElement).querySelector('.wr-bar-chart__point')!.removeAttribute('y');

    await expect(harness.getLines()).rejects.toThrow(/no percentage y/);
  });

  it('reads where zero is, which a line below it lifts', async () => {
    const harness = await chart();
    expect(await harness.getZeroPercent()).toBe(0);

    await set(h => h.lines.set([{ label: 'Margin', data: [-10, 10, 20] }]));
    // From -10 to 40: zero is a fifth of the way up, and the bars start there.
    expect(await harness.getZeroPercent()).toBe(20);
    expect((await harness.getSeriesBars())[0]).toMatchObject({ startPercent: 20, sizePercent: 20 });

    const track = (fixture.nativeElement as HTMLElement).querySelector('.wr-bar-chart__track')!;
    track.removeAttribute('style');
    await expect(harness.getZeroPercent()).rejects.toThrow(/no inline --wr-bar-chart-zero/);
  });

  it('holds a data bar against a point beside lines, and reads the bars’ column in the table', async () => {
    await set(h => {
      h.series.set([]);
      h.data.set([
        { label: 'Mon', value: -10 },
        { label: 'Tue', value: 20 },
        { label: 'Wed', value: 30 },
      ]);
      h.lines.set([{ label: 'Target', data: [10, 20, 30] }]);
      h.dataTable.set(true);
    });
    const harness = await chart();

    // From -10 to 30: zero is a quarter of the way up, the -10 bar hangs a quarter below
    // it, and Tue's bar ends exactly where the line's point at the same value sits.
    expect(await harness.getZeroPercent()).toBe(25);
    expect((await harness.getBars()).map(bar => bar.heightPercent)).toEqual([25, 50, 75]);
    const [target] = await harness.getLines();
    expect(target.points[1].valuePercent).toBe(25 + 50);

    expect(await harness.getTableColumns()).toEqual(['Value', 'Target']);
    expect(await harness.getTableRows()).toEqual([
      { header: 'Mon', cells: ['-10', '10'] },
      { header: 'Tue', cells: ['20', '20'] },
      { header: 'Wed', cells: ['30', '30'] },
    ]);
  });

  it('opens a legend for lines beside data', async () => {
    await set(h => {
      h.series.set([]);
      h.data.set([
        { label: 'Mon', value: 10 },
        { label: 'Tue', value: 20 },
        { label: 'Wed', value: 40 },
      ]);
    });
    const harness = await chart();

    expect(await harness.hasLegend()).toBe(true);
    expect(await harness.getBarCount()).toBe(3);
    expect(await harness.getLineCount()).toBe(2);
  });
});
