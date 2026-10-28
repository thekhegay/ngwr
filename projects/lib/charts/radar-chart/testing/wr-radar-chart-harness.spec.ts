import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrRadarChart, type WrRadarSeries, type WrRadarVariant } from 'ngwr/charts/radar-chart';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrRadarChartHarness } from './wr-radar-chart-harness';

const SERIES: readonly WrRadarSeries[] = [
  { label: 'Model A', data: [80, 65, 70, 90] },
  { label: 'Model B', data: [60, Number.NaN, 75, 60], color: '#123456' },
];

@Component({
  imports: [WrRadarChart],
  template: `
    <wr-radar-chart
      ariaLabel="Models"
      [axes]="axes()"
      [series]="series()"
      [max]="100"
      [size]="320"
      [showGrid]="showGrid()"
      [showLegend]="showLegend()"
      [dataTable]="dataTable()"
      [toggleableLegend]="toggleable()"
      [variant]="variant()"
      [(hiddenSeries)]="hidden"
    />
    <wr-radar-chart ariaLabel="Other" [axes]="['X', 'Y', 'Z']" />
  `,
})
class Host {
  readonly axes = signal<readonly string[]>(['Speed', 'Power', 'Range', 'Comfort']);
  readonly series = signal<readonly WrRadarSeries[]>(SERIES);
  readonly showGrid = signal(true);
  readonly showLegend = signal(true);
  readonly dataTable = signal(false);
  readonly toggleable = signal(false);
  readonly hidden = signal<readonly number[]>([]);
  readonly variant = signal<WrRadarVariant>('polygon');
}

describe('WrRadarChartHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let chart: WrRadarChartHarness;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    chart = await TestbedHarnessEnvironment.loader(fixture).getHarness(
      WrRadarChartHarness.with({ ariaLabel: 'Models' })
    );
  });

  afterEach(() => fixture.destroy());

  it('filters by name and by axis', async () => {
    const loader = TestbedHarnessEnvironment.loader(fixture);
    expect(await loader.getAllHarnesses(WrRadarChartHarness)).toHaveLength(2);
    expect(await loader.getAllHarnesses(WrRadarChartHarness.with({ axisLabel: 'Power' }))).toHaveLength(1);
    expect(await loader.getAllHarnesses(WrRadarChartHarness.with({ axisLabel: /^[XYZ]$/ }))).toHaveLength(1);
  });

  it('reads the name, the axes and the ring values', async () => {
    expect(await chart.getAccessibleName()).toBe('Models');
    expect(await chart.getAxisLabels()).toEqual(['Speed', 'Power', 'Range', 'Comfort']);
    expect(await chart.getRingLabels()).toEqual(['100', '75', '50', '25']);
    expect(await chart.hasGrid()).toBe(true);

    fixture.componentInstance.showGrid.set(false);
    expect(await chart.hasGrid()).toBe(false);
    expect(await chart.getRingLabels()).toEqual([]);
  });

  it('tells a closed outline from one left open across a missing value', async () => {
    expect(await chart.getPolygonCount()).toBe(2);
    expect(await chart.getPolygons()).toEqual([
      { color: 'var(--wr-color-primary)', dash: '', closed: true },
      { color: '#123456', dash: '7 4', closed: false },
    ]);
    // Only the closed one is filled, and the missing value has no dot.
    expect(await chart.getAreaCount()).toBe(1);
    expect(await chart.getDotCount()).toBe(7);
  });

  it('draws no outline with fewer than three axes', async () => {
    const other = await TestbedHarnessEnvironment.loader(fixture).getHarness(
      WrRadarChartHarness.with({ ariaLabel: 'Other' })
    );
    expect(await other.getPolygonCount()).toBe(0);
    expect(await other.hasLegend()).toBe(false);
  });

  it('hands over the legend, and hides a series through it', async () => {
    fixture.componentInstance.toggleable.set(true);
    const legend = await chart.getLegendHarness();
    expect(await legend.getLabels()).toEqual(['Model A', 'Model B']);
    expect(await legend.isToggleable()).toBe(true);

    await legend.toggle(0);

    expect(await legend.getHidden()).toEqual([0]);
    expect(fixture.componentInstance.hidden()).toEqual([0]);
    expect(await chart.getPolygonCount()).toBe(1);
  });

  it('refuses a legend the chart does not draw', async () => {
    // Drawn until it is switched off: an answer that was always `false` would pass alone.
    expect(await chart.hasLegend()).toBe(true);
    fixture.componentInstance.showLegend.set(false);
    expect(await chart.hasLegend()).toBe(false);
    await expect(chart.getLegendHarness()).rejects.toThrow(/draws no legend/);
  });

  it('reads the data table, and refuses one that is not rendered', async () => {
    expect(await chart.hasDataTable()).toBe(false);
    await expect(chart.getTableRows()).rejects.toThrow(/`dataTable` is off/);
    await expect(chart.getTableColumns()).rejects.toThrow(/`dataTable` is off/);

    fixture.componentInstance.dataTable.set(true);
    expect(await chart.getTableColumns()).toEqual(['Model A', 'Model B']);
    expect(await chart.getTableRows()).toEqual([
      { header: 'Speed', cells: ['80', '60'] },
      { header: 'Power', cells: ['65', ''] },
      { header: 'Range', cells: ['70', '75'] },
      { header: 'Comfort', cells: ['90', '60'] },
    ]);

    fixture.componentInstance.hidden.set([1]);
    expect(await chart.getTableColumns()).toEqual(['Model A']);
  });

  it('reads the variant, and the polar-area wedges through the same methods', async () => {
    expect(await chart.getVariant()).toBe('polygon');

    fixture.componentInstance.variant.set('polar-area');
    expect(await chart.getVariant()).toBe('polar-area');
    expect(await chart.getAccessibleName()).toBe('Models');
    // A series' wedges are one closed outline, and every one is filled — the missing
    // value is a missing wedge, so it has no dot.
    expect(await chart.getPolygons()).toEqual([
      { color: 'var(--wr-color-primary)', dash: '', closed: true },
      { color: '#123456', dash: '7 4', closed: true },
    ]);
    expect(await chart.getAreaCount()).toBe(2);
    expect(await chart.getDotCount()).toBe(7);
    expect(await chart.getRingLabels()).toEqual(['100', '75', '50', '25']);
  });

  it('refuses to guess a variant the host does not carry', async () => {
    const host = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-radar-chart')!;
    host.classList.remove('wr-radar-chart--polygon', 'wr-radar-chart--polar-area');
    await expect(chart.getVariant()).rejects.toThrow(/neither/);
  });

  it('reads the size the component wrote', async () => {
    expect(await chart.getSize()).toBe(320);
  });
});
