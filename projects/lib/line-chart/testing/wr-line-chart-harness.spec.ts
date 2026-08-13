import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrLineChart, type WrLineSeries } from 'ngwr/line-chart';
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

  it('matches on the name and on a series label', async () => {
    expect(await loader.getHarnessOrNull(WrLineChartHarness.with({ seriesLabel: 'Costs' }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrLineChartHarness.with({ seriesLabel: 'Profit' }))).toBeNull();
    expect(await loader.getHarnessOrNull(WrLineChartHarness.with({ ariaLabel: /chart/ }))).not.toBeNull();
  });
});
