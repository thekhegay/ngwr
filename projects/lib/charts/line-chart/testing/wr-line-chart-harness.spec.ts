import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrLineChart, type WrLineSeries } from 'ngwr/charts/line-chart';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrLineChartHarness } from './wr-line-chart-harness';

const SERIES: readonly WrLineSeries[] = [
  { label: 'Revenue', data: [10, 40, 25] },
  { label: 'Costs', data: [5, 20, 15] },
];

@Component({
  imports: [WrLineChart],
  template: `
    <wr-line-chart
      [series]="series()"
      [xLabels]="xLabels()"
      [showLegend]="showLegend()"
      [showGrid]="showGrid()"
      [showDots]="showDots()"
      [height]="height()"
      [toggleableLegend]="toggleable()"
      [showArea]="showArea()"
      [stacked]="stacked()"
      [dataTable]="dataTable()"
      [(hiddenSeries)]="hidden"
    />
  `,
})
class Host {
  readonly series = signal<readonly WrLineSeries[]>(SERIES);
  readonly xLabels = signal<readonly string[]>(['Jan', 'Feb', 'Mar']);
  readonly showLegend = signal(true);
  readonly showGrid = signal(true);
  readonly showDots = signal(true);
  readonly height = signal(240);
  readonly toggleable = signal(false);
  readonly hidden = signal<readonly number[]>([]);
  readonly showArea = signal(false);
  readonly stacked = signal(false);
  readonly dataTable = signal(false);
}

/** Two charts on one page, only the second with a data table: a read must not cross between them. */
@Component({
  imports: [WrLineChart],
  template: `
    <wr-line-chart ariaLabel="Plain" [series]="series" [xLabels]="labels" />
    <wr-line-chart ariaLabel="Tabled" [series]="series" [xLabels]="labels" dataTable />
  `,
})
class TwoCharts {
  readonly series = SERIES;
  readonly labels = ['Jan', 'Feb', 'Mar'];
}

/**
 * Everything asserted here is textual or countable. A line's `d` is a rendering
 * detail, and the tooltip needs a measured plot to open — jsdom reports 0×0, so a
 * synthetic pointer move resolves to nothing and there is deliberately no `hoverAt()`.
 */
describe('WrLineChartHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const chart = (): Promise<WrLineChartHarness> => loader.getHarness(WrLineChartHarness);

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('draws one line per series and lists them in the legend', async () => {
    const harness = await chart();

    expect(await harness.getSeriesLabels()).toEqual(['Revenue', 'Costs']);
    expect(await harness.getLineCount()).toBe(2);
    expect(await harness.getDotCount()).toBe(6);
  });

  it('names the plot, which is the only name the drawing has', async () => {
    expect(await (await chart()).getAccessibleName()).toBe('Line chart');
  });

  it('reads the axes it was asked to draw', async () => {
    const harness = await chart();

    expect(await harness.getXLabels()).toEqual(['Jan', 'Feb', 'Mar']);
    expect(await harness.hasGrid()).toBe(true);
    expect((await harness.getYTicks()).length).toBeGreaterThan(1);
  });

  it('drops the parts it was told to hide', async () => {
    fixture.componentInstance.showLegend.set(false);
    fixture.componentInstance.showGrid.set(false);
    fixture.componentInstance.showDots.set(false);
    await fixture.whenStable();

    const harness = await chart();
    expect([await harness.hasLegend(), await harness.hasGrid(), await harness.getDotCount()]).toEqual([
      false,
      false,
      0,
    ]);
    // The lines themselves stay — they are the chart.
    expect(await harness.getLineCount()).toBe(2);
  });

  it('shows no tooltip until something hovers the plot', async () => {
    const harness = await chart();

    expect([await harness.hasTooltip(), await harness.getTooltipLabel()]).toEqual([false, null]);
    expect(await harness.getTooltipRows()).toEqual([]);
  });

  it('reads the plot height the component wrote', async () => {
    fixture.componentInstance.height.set(320);
    await fixture.whenStable();

    expect(await (await chart()).getPlotHeight()).toBe(320);
  });

  it('draws nothing for an empty series list', async () => {
    fixture.componentInstance.series.set([]);
    await fixture.whenStable();

    const harness = await chart();
    expect([await harness.getLineCount(), await harness.hasLegend()]).toEqual([0, false]);
  });

  it('hands back its legend, and hides a series through it', async () => {
    fixture.componentInstance.toggleable.set(true);
    await fixture.whenStable();

    const harness = await chart();
    const legend = await harness.getLegendHarness();
    expect(await legend.getItems()).toEqual([
      {
        label: 'Revenue',
        value: null,
        swatch: 'line',
        color: 'var(--wr-color-primary)',
        dash: '',
        marker: null,
        hidden: false,
      },
      {
        label: 'Costs',
        value: null,
        swatch: 'line',
        color: 'var(--wr-color-success)',
        dash: '7 4',
        marker: null,
        hidden: false,
      },
    ]);
    expect(await legend.isToggleable()).toBe(true);

    await legend.toggle(1);

    expect(await legend.getHidden()).toEqual([1]);
    expect(fixture.componentInstance.hidden()).toEqual([1]);
    expect([await harness.getLineCount(), await harness.getDotCount()]).toEqual([1, 3]);
    // The row stays, so the series can be shown again.
    expect(await harness.getSeriesLabels()).toEqual(['Revenue', 'Costs']);
  });

  it('reads a series the host hid by its name alone, without the word that says it is hidden', async () => {
    fixture.componentInstance.hidden.set([0]);
    await fixture.whenStable();

    const harness = await chart();
    expect(await harness.getSeriesLabels()).toEqual(['Revenue', 'Costs']);
    expect(await (await harness.getLegendHarness()).getHidden()).toEqual([0]);
  });

  it('refuses to hand back a legend the chart does not draw', async () => {
    fixture.componentInstance.showLegend.set(false);
    await fixture.whenStable();

    await expect((await chart()).getLegendHarness()).rejects.toThrow(/draws no legend/);
  });

  it('matches on the name and on a series label', async () => {
    expect(await loader.getHarnessOrNull(WrLineChartHarness.with({ seriesLabel: 'Costs' }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrLineChartHarness.with({ seriesLabel: 'Profit' }))).toBeNull();
    expect(await loader.getHarnessOrNull(WrLineChartHarness.with({ ariaLabel: /chart/ }))).not.toBeNull();
  });

  it('reads the area mode, its fills and the stack', async () => {
    const harness = await chart();
    expect([await harness.hasArea(), await harness.getAreaCount(), await harness.isStacked()]).toEqual([
      false,
      0,
      false,
    ]);

    fixture.componentInstance.showArea.set(true);
    fixture.componentInstance.stacked.set(true);
    await fixture.whenStable();

    expect([await harness.hasArea(), await harness.getAreaCount(), await harness.isStacked()]).toEqual([true, 2, true]);
    expect(await harness.getAccessibleName()).toBe('Area chart');

    // A hidden series takes its fill with it.
    fixture.componentInstance.hidden.set([0]);
    await fixture.whenStable();
    expect(await harness.getAreaCount()).toBe(1);
  });

  it('reads the data table, with the raw values under a stack', async () => {
    const harness = await chart();
    expect(await harness.hasDataTable()).toBe(false);

    fixture.componentInstance.dataTable.set(true);
    fixture.componentInstance.stacked.set(true);
    await fixture.whenStable();

    expect(await harness.hasDataTable()).toBe(true);
    expect(await harness.getTableColumns()).toEqual(['Revenue', 'Costs']);
    expect(await harness.getTableRows()).toEqual([
      { header: 'Jan', cells: ['10', '5'] },
      { header: 'Feb', cells: ['40', '20'] },
      { header: 'Mar', cells: ['25', '15'] },
    ]);
  });

  it('refuses to read a data table the chart does not render', async () => {
    const harness = await chart();
    await expect(harness.getTableRows()).rejects.toThrow(/renders no data table/);
    await expect(harness.getTableColumns()).rejects.toThrow(/renders no data table/);
  });
});

describe('WrLineChartHarness with two charts on the page', () => {
  it("reads each chart's own table and nothing of the other's", async () => {
    TestBed.resetTestingModule();
    const fixture = TestBed.createComponent(TwoCharts);
    fixture.detectChanges();
    const loader = TestbedHarnessEnvironment.loader(fixture);

    const plain = await loader.getHarness(WrLineChartHarness.with({ ariaLabel: 'Plain' }));
    const tabled = await loader.getHarness(WrLineChartHarness.with({ ariaLabel: 'Tabled' }));

    expect(await plain.hasDataTable()).toBe(false);
    await expect(plain.getTableRows()).rejects.toThrow(/renders no data table/);
    expect((await tabled.getTableRows()).map(row => row.header)).toEqual(['Jan', 'Feb', 'Mar']);

    fixture.destroy();
  });
});
