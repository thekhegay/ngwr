import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrHeatmapChart, type WrHeatmapMatrix } from 'ngwr/charts/heatmap-chart';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrHeatmapChartHarness } from './wr-heatmap-chart-harness';

@Component({
  imports: [WrHeatmapChart],
  template: `
    <wr-heatmap-chart
      ariaLabel="Visits"
      [rows]="['Mon', 'Tue']"
      [columns]="['AM', 'PM', 'Night']"
      [data]="data()"
      [showValues]="showValues()"
      [showLegend]="showLegend()"
      [dataTable]="dataTable()"
      [noDataLabel]="noDataLabel()"
    />
    <wr-heatmap-chart ariaLabel="Other" [rows]="['X']" [columns]="['Y']" [data]="[[null]]" />
  `,
})
class Host {
  readonly data = signal<WrHeatmapMatrix>([
    [0, 50, 100],
    [null, 1234, 75],
  ]);
  readonly showValues = signal(false);
  readonly showLegend = signal(true);
  readonly dataTable = signal(false);
  readonly noDataLabel = signal<string | null>(null);
}

describe('WrHeatmapChartHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let chart: WrHeatmapChartHarness;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    chart = await TestbedHarnessEnvironment.loader(fixture).getHarness(
      WrHeatmapChartHarness.with({ ariaLabel: 'Visits' })
    );
  });

  afterEach(() => fixture.destroy());

  it('filters by name, by row and by column', async () => {
    const loader = TestbedHarnessEnvironment.loader(fixture);
    expect(await loader.getAllHarnesses(WrHeatmapChartHarness)).toHaveLength(2);
    expect(await loader.getAllHarnesses(WrHeatmapChartHarness.with({ rowLabel: 'Tue' }))).toHaveLength(1);
    expect(await loader.getAllHarnesses(WrHeatmapChartHarness.with({ columnLabel: /^[XY]$/ }))).toHaveLength(1);
  });

  it('reads the name and the row and column names', async () => {
    expect(await chart.getAccessibleName()).toBe('Visits');
    expect(await chart.getRowLabels()).toEqual(['Mon', 'Tue']);
    expect(await chart.getColumnLabels()).toEqual(['AM', 'PM', 'Night']);
    expect(await chart.getCellCount()).toBe(6);
  });

  it("reads every cell's position, value and level, and tells an empty cell from the lowest level", async () => {
    expect(await chart.getCells()).toEqual([
      { row: 0, column: 0, value: 0, level: 0, empty: false, text: '' },
      { row: 0, column: 1, value: 50, level: 0, empty: false, text: '' },
      { row: 0, column: 2, value: 100, level: 0, empty: false, text: '' },
      { row: 1, column: 0, value: null, level: null, empty: true, text: '' },
      { row: 1, column: 1, value: 1234, level: 1, empty: false, text: '' },
      { row: 1, column: 2, value: 75, level: 0, empty: false, text: '' },
    ]);
  });

  it('reads the text a cell prints, and refuses a position the matrix does not have', async () => {
    fixture.componentInstance.showValues.set(true);
    expect((await chart.getCell(1, 1)).text).toBe('1.2K');
    expect((await chart.getCell(1, 0)).text).toBe('');
    await expect(chart.getCell(2, 0)).rejects.toThrow(/no cell at row 2, column 0/);
  });

  it('reads the legend: the scale, its levels and the key for an empty cell', async () => {
    expect(await chart.hasLegend()).toBe(true);
    // Compact from a thousand, as the cells print them; the table has the whole figure.
    expect(await chart.getScaleRange()).toEqual({ min: '0', max: '1.2K' });
    expect(await chart.getLevelCount()).toBe(5);
    expect(await chart.getNoDataLabel()).toBe('No data');

    fixture.componentInstance.noDataLabel.set('Closed');
    expect(await chart.getNoDataLabel()).toBe('Closed');

    fixture.componentInstance.data.set([
      [1, 2, 3],
      [4, 5, 6],
    ]);
    expect(await chart.getNoDataLabel()).toBeNull();

    // A scale with no span is one level, keyed by one figure that is both ends.
    fixture.componentInstance.data.set([
      [0, 0, 0],
      [0, 0, 0],
    ]);
    expect(await chart.getScaleRange()).toEqual({ min: '0', max: '0' });
    expect(await chart.getLevelCount()).toBe(1);
    expect((await chart.getCell(0, 0)).level).toBe(0);
  });

  it('throws for a cell whose position it cannot read, rather than reading it as 0', async () => {
    const first = (fixture.nativeElement as HTMLElement).querySelector('.wr-heatmap-chart__cell')!;
    first.removeAttribute('data-row');
    await expect(chart.getCells()).rejects.toThrow(/data-row=""/);
  });

  it('refuses a scale the legend does not draw', async () => {
    const other = await TestbedHarnessEnvironment.loader(fixture).getHarness(
      WrHeatmapChartHarness.with({ ariaLabel: 'Other' })
    );
    // Every cell empty: the legend keys the hatching alone.
    expect(await other.hasLegend()).toBe(true);
    expect(await other.getNoDataLabel()).toBe('No data');
    await expect(other.getScaleRange()).rejects.toThrow(/draws no scale/);

    fixture.componentInstance.showLegend.set(false);
    expect(await chart.hasLegend()).toBe(false);
    await expect(chart.getLevelCount()).rejects.toThrow(/draws no scale/);
  });

  it('reads the data table, and refuses one that is not rendered', async () => {
    expect(await chart.hasDataTable()).toBe(false);
    await expect(chart.getTableRows()).rejects.toThrow(/`dataTable` is off/);
    await expect(chart.getTableColumns()).rejects.toThrow(/`dataTable` is off/);

    fixture.componentInstance.dataTable.set(true);
    expect(await chart.getTableColumns()).toEqual(['AM', 'PM', 'Night']);
    expect(await chart.getTableRows()).toEqual([
      { header: 'Mon', cells: ['0', '50', '100'] },
      { header: 'Tue', cells: ['No data', '1,234', '75'] },
    ]);
  });
});
