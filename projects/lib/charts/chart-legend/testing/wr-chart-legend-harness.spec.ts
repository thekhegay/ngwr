import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrChartLegend, type WrChartLegendItem } from 'ngwr/charts/chart-legend';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrChartLegendHarness } from './wr-chart-legend-harness';

const ITEMS: readonly WrChartLegendItem[] = [
  { label: 'Visits', color: 'rgb(18, 52, 86)', value: '1,204' },
  { label: 'Signups', color: 'var(--wr-color-success)', dash: '7 4' },
  { label: 'Errors', color: 'var(--wr-color-danger)', marker: 'triangle' },
];

@Component({
  imports: [WrChartLegend],
  template: `
    <ul wr-chart-legend [items]="items()" [toggleable]="toggleable()" [(hiddenSeries)]="hidden"></ul>
    <ul wr-chart-legend [items]="other"></ul>
  `,
})
class Host {
  readonly items = signal<readonly WrChartLegendItem[]>(ITEMS);
  readonly toggleable = signal(false);
  readonly hidden = signal<readonly number[]>([]);
  readonly other: readonly WrChartLegendItem[] = [{ label: 'Elsewhere', color: 'red' }];
}

describe('WrChartLegendHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const legend = (): Promise<WrChartLegendHarness> => loader.getHarness(WrChartLegendHarness.with({ label: 'Visits' }));
  const list = (): HTMLUListElement => (fixture.nativeElement as HTMLElement).querySelector('ul')!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('finds a legend by a label it holds', async () => {
    expect(await loader.getAllHarnesses(WrChartLegendHarness)).toHaveLength(2);
    expect(await (await loader.getHarness(WrChartLegendHarness.with({ label: /where/ }))).getLabels()).toEqual([
      'Elsewhere',
    ]);
  });

  it('reads every row: its text, the key and the colour written on it', async () => {
    expect(await (await legend()).getItems()).toEqual([
      {
        label: 'Visits',
        value: '1,204',
        swatch: 'dot',
        color: 'rgb(18, 52, 86)',
        dash: null,
        marker: null,
        hidden: false,
      },
      {
        label: 'Signups',
        value: null,
        swatch: 'line',
        color: 'var(--wr-color-success)',
        dash: '7 4',
        marker: null,
        hidden: false,
      },
      {
        label: 'Errors',
        value: null,
        swatch: 'marker',
        color: 'var(--wr-color-danger)',
        dash: null,
        marker: 'triangle',
        hidden: false,
      },
    ]);
    expect(await (await legend()).getItemCount()).toBe(3);
  });

  it('reads a solid line as an empty dash', async () => {
    fixture.componentInstance.items.set([{ label: 'Solid', color: 'red', dash: '' }]);
    fixture.detectChanges();
    const [item] = await (await loader.getHarness(WrChartLegendHarness.with({ label: 'Solid' }))).getItems();
    expect(item.dash).toBe('');
  });

  it('refuses to toggle a legend that does not toggle', async () => {
    const harness = await legend();
    expect(await harness.isToggleable()).toBe(false);
    await expect(harness.toggle(0)).rejects.toThrow(/not toggleable/);
  });

  describe('on a toggleable legend', () => {
    beforeEach(() => {
      fixture.componentInstance.toggleable.set(true);
      fixture.detectChanges();
    });

    it('toggles a row and reads it back hidden', async () => {
      const harness = await legend();
      expect(await harness.isToggleable()).toBe(true);
      expect(await harness.getAccessibleName()).toBe('Toggle series visibility');

      await harness.toggle(2);
      expect(await harness.getHidden()).toEqual([2]);
      expect(fixture.componentInstance.hidden()).toEqual([2]);
      expect((await harness.getItems())[2].hidden).toBe(true);

      await harness.toggle(2);
      expect(await harness.getHidden()).toEqual([]);
    });

    it('refuses a row that does not exist', async () => {
      await expect((await legend()).toggle(5)).rejects.toThrow(/3 row/);
    });

    it('throws when the strike-through and aria-pressed disagree', async () => {
      // The defect the two reads exist to catch: struck through, still announced as shown.
      const harness = await legend();
      list().querySelector('li')!.classList.add('wr-chart-legend__item--hidden');
      await expect(harness.getHidden()).rejects.toThrow(/aria-pressed="true"/);
    });

    it('throws when the host and the rows disagree about toggling', async () => {
      const harness = await legend();
      list().classList.remove('wr-chart-legend--toggleable');
      await expect(harness.isToggleable()).rejects.toThrow(/lacks wr-chart-legend--toggleable/);
    });
  });

  it('reads a series hidden from outside on a legend that does not toggle', async () => {
    fixture.componentInstance.hidden.set([0]);
    fixture.detectChanges();
    expect(await (await legend()).getHidden()).toEqual([0]);
    expect((await (await legend()).getItems())[0]).toEqual(expect.objectContaining({ label: 'Visits', hidden: true }));
  });

  it('throws when a plain row is struck through and nothing says so to a screen reader', async () => {
    const harness = await legend();
    list().querySelector('li')!.classList.add('wr-chart-legend__item--hidden');
    await expect(harness.getHidden()).rejects.toThrow(/nothing in it tells a screen reader/);
  });

  it('throws when a plain row says hidden in words and is not struck through', async () => {
    fixture.componentInstance.hidden.set([0]);
    fixture.detectChanges();
    const harness = await legend();
    list().querySelector('li')!.classList.remove('wr-chart-legend__item--hidden');
    await expect(harness.getHidden()).rejects.toThrow(/carries the visually hidden word/);
  });

  it('reads no name off a plain legend', async () => {
    expect(await (await legend()).getAccessibleName()).toBeNull();
  });
});
