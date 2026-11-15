import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrChartLegend } from './chart-legend';
import type { WrChartLegendItem } from './types';

/** Counts every read of an item's fields, which is what a pass over the template used to cost. */
function counted(item: WrChartLegendItem, reads: { count: number }): WrChartLegendItem {
  return new Proxy(item, {
    get(target, key, receiver): unknown {
      if (typeof key === 'string') reads.count++;
      return Reflect.get(target, key, receiver) as unknown;
    },
  });
}

@Component({
  imports: [WrChartLegend],
  template: `<ul wr-chart-legend [items]="items()" [hiddenSeries]="hidden()"></ul>`,
})
class Host {
  readonly items = signal<readonly WrChartLegendItem[]>([]);
  readonly hidden = signal<readonly number[]>([]);
}

/**
 * A legend is checked whenever its chart is, which is on every hover, and it used to build
 * each row again each time: the chart's class for four parts and the marker's path, per
 * item. The rows are built when `items` changes, and a pass after that reads them.
 */
describe('WrChartLegend rows', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  const reads = { count: 0 };

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const paths = (): (string | null)[] => [...root().querySelectorAll('path')].map(path => path.getAttribute('d'));

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    reads.count = 0;
    fixture.componentInstance.items.set(
      Array.from({ length: 50 }, (_, i) =>
        counted(
          i % 2 === 0
            ? { label: `Series ${i}`, color: 'red', marker: 'triangle', value: `${i}` }
            : { label: `Series ${i}`, color: 'blue', marker: 'square', dash: '2 3' },
          reads
        )
      )
    );
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('draws every row from the item it was given', () => {
    expect(root().querySelectorAll('li')).toHaveLength(50);
    expect(root().querySelectorAll('.wr-chart-legend__swatch--marker')).toHaveLength(25);
    expect(root().querySelectorAll('.wr-chart-legend__swatch--line')).toHaveLength(25);
    expect(new Set(paths()).size).toBe(2);
    expect(root().querySelectorAll('.wr-chart-legend__value')).toHaveLength(25);
  });

  it('reads nothing off the items on a later pass: the rows are built once', () => {
    const built = reads.count;
    expect(built).toBeGreaterThan(0);

    for (let pass = 0; pass < 5; pass++) {
      fixture.componentRef.changeDetectorRef.markForCheck();
      fixture.detectChanges();
    }
    // Hiding a series is a new pass over every row, and still no row is built again.
    fixture.componentInstance.hidden.set([3]);
    fixture.detectChanges();

    expect(reads.count).toBe(built);
    expect(root().querySelectorAll('.wr-chart-legend__item--hidden')).toHaveLength(1);
  });

  it('builds the rows again when the items change', () => {
    const built = reads.count;
    fixture.componentInstance.items.set([counted({ label: 'One', color: 'red', marker: 'cross' }, reads)]);
    fixture.detectChanges();

    expect(reads.count).toBeGreaterThan(built);
    expect(root().querySelectorAll('li')).toHaveLength(1);
    expect(root().querySelector('svg')!.getAttribute('data-marker')).toBe('cross');
  });
});
