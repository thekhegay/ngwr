import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrTreemapChart, type WrTreemapNode } from 'ngwr/charts/treemap-chart';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrTreemapChartHarness } from './wr-treemap-chart-harness';

const DATA: readonly WrTreemapNode[] = [
  {
    label: 'Fruit',
    children: [
      { label: 'Apples', value: 30 },
      { label: 'Pears', value: 10, color: '#123456' },
    ],
  },
  { label: 'Bread', value: 60 },
  { label: 'Salt' },
];

@Component({
  imports: [WrTreemapChart],
  template: `
    <wr-treemap-chart
      ariaLabel="Groceries"
      [data]="data()"
      [height]="300"
      [showLabels]="showLabels()"
      [dataTable]="dataTable()"
    />
    <wr-treemap-chart ariaLabel="Other" [data]="[{ label: 'Lone', value: 1 }]" />
  `,
})
class Host {
  readonly data = signal<readonly WrTreemapNode[]>(DATA);
  readonly showLabels = signal(true);
  readonly dataTable = signal(false);
}

describe('WrTreemapChartHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let chart: WrTreemapChartHarness;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    chart = await TestbedHarnessEnvironment.loader(fixture).getHarness(
      WrTreemapChartHarness.with({ ariaLabel: 'Groceries' })
    );
  });

  afterEach(() => fixture.destroy());

  it('filters by name and by a name on a tile', async () => {
    const loader = TestbedHarnessEnvironment.loader(fixture);
    expect(await loader.getAllHarnesses(WrTreemapChartHarness)).toHaveLength(2);
    expect(await loader.getAllHarnesses(WrTreemapChartHarness.with({ tileLabel: 'Apples' }))).toHaveLength(1);
    expect(await loader.getAllHarnesses(WrTreemapChartHarness.with({ tileLabel: /^Lo/ }))).toHaveLength(1);
  });

  it('reads the name, the counts and the names written on the tiles', async () => {
    expect(await chart.getAccessibleName()).toBe('Groceries');
    // Salt has no value, so no area, and draws no tile.
    expect(await chart.getTileCount()).toBe(4);
    expect(await chart.getGroupCount()).toBe(1);
    expect(await chart.getLeafCount()).toBe(3);
    expect(await chart.getLabels()).toEqual(['Bread', 'Fruit', 'Apples', 'Pears']);

    fixture.componentInstance.showLabels.set(false);
    expect(await chart.getLabels()).toEqual([]);
  });

  it('reads every tile: its text, its kind, its colour and where it was drawn', async () => {
    const tiles = await chart.getTiles();
    expect(tiles.map(({ label, value, group, color }) => ({ label, value, group, color }))).toEqual([
      { label: 'Bread', value: '60', group: false, color: 'var(--wr-color-success)' },
      { label: 'Fruit', value: '40', group: true, color: 'var(--wr-color-primary)' },
      { label: 'Apples', value: '30', group: false, color: 'var(--wr-color-primary)' },
      { label: 'Pears', value: '10', group: false, color: '#123456' },
    ]);
    // Bread is 60% of the whole, in the inline-start top corner.
    expect(tiles[0].box).toEqual({ start: 0, top: 0, width: 60, height: 100 });
    expect(tiles[1].box).toEqual({ start: 60, top: 0, width: 40, height: 100 });
  });

  it('reads the data table, and refuses one that is not rendered', async () => {
    expect(await chart.hasDataTable()).toBe(false);
    await expect(chart.getTableRows()).rejects.toThrow(/`dataTable` is off/);
    await expect(chart.getTableColumns()).rejects.toThrow(/`dataTable` is off/);

    fixture.componentInstance.dataTable.set(true);
    expect(await chart.getTableColumns()).toEqual(['Value', 'Share']);
    expect(await chart.getTableRows()).toEqual([
      { header: 'Fruit', cells: ['40', '40%'] },
      { header: 'Fruit / Apples', cells: ['30', '30%'] },
      { header: 'Fruit / Pears', cells: ['10', '10%'] },
      { header: 'Bread', cells: ['60', '60%'] },
      { header: 'Salt', cells: ['', ''] },
    ]);
  });

  it('reads the height the component wrote', async () => {
    expect(await chart.getHeight()).toBe(300);
  });
});
