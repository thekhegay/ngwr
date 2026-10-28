import { createRequire } from 'node:module';
import { join } from 'node:path';

import { Component, LOCALE_ID, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrTreemapChart } from './treemap-chart';
import type { WrTreemapNode } from './types';

/**
 * Two groups: Veg (60) is the larger and is laid out first, Fruit (40) beside it.
 *
 * jsdom lays nothing out and has no `ResizeObserver`, so the chart cuts its layout for the
 * width it assumes before measuring — 640 px — at its `height`, 280 px. Every rectangle
 * below is worked from that box: Veg is a column 384 px wide (60% of it), Fruit the 256 px
 * beside it; each keeps a 20 px strip for its name and 3 px round its children.
 */
const FOOD: readonly WrTreemapNode[] = [
  {
    label: 'Fruit',
    children: [
      { label: 'Apples', value: 30 },
      { label: 'Pears', value: 10 },
    ],
  },
  {
    label: 'Veg',
    children: [
      { label: 'Kale', value: 40 },
      { label: 'Leeks', value: 20 },
    ],
  },
];

@Component({
  imports: [WrTreemapChart],
  template: `
    <wr-treemap-chart
      [data]="data()"
      [height]="height()"
      [showLabels]="showLabels()"
      [showValues]="showValues()"
      [dataTable]="dataTable()"
      [ariaLabel]="ariaLabel()"
      [valueLabel]="valueLabel()"
      [valueFormat]="valueFormat()"
      [percentFormat]="percentFormat()"
    />
  `,
})
class Host {
  readonly data = signal<readonly WrTreemapNode[]>(FOOD);
  readonly height = signal(280);
  readonly showLabels = signal(true);
  readonly showValues = signal(true);
  readonly dataTable = signal(false);
  readonly ariaLabel = signal<string | null>(null);
  readonly valueLabel = signal<string | null>(null);
  readonly valueFormat = signal<((value: number) => string) | null>(null);
  readonly percentFormat = signal<((ratio: number) => string) | null>(null);
}

/**
 * Three levels: Org holds Eng and Ops, and Eng holds Web and Mobile. Org is the whole
 * 640 × 280 plot; Eng is the 422.67 px column of Org's inside, 3 px in and 20 px down
 * under Org's strip, and Web and Mobile share Eng's inside the same way.
 */
const DEEP: readonly WrTreemapNode[] = [
  {
    label: 'Org',
    children: [
      {
        label: 'Eng',
        children: [
          { label: 'Web', value: 30 },
          { label: 'Mobile', value: 10 },
        ],
      },
      { label: 'Ops', value: 20 },
    ],
  },
];

/** A tile's rectangle as the component wrote it, in percent of the plot. */
interface Box {
  readonly start: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

const boxOf = (tile: HTMLElement): Box => ({
  start: Number.parseFloat(tile.style.getPropertyValue('inset-inline-start')),
  top: Number.parseFloat(tile.style.top),
  width: Number.parseFloat(tile.style.width),
  height: Number.parseFloat(tile.style.height),
});

describe('WrTreemapChart', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): Host => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const all = <T extends Element = HTMLElement>(selector: string): T[] => [...root().querySelectorAll<T>(selector)];
  const plot = (): HTMLElement => root().querySelector<HTMLElement>('.wr-treemap-chart__plot')!;
  const tiles = (): HTMLElement[] => all('.wr-treemap-chart__tile');
  const text = (selector: string): string[] => all(selector).map(el => el.textContent.trim());
  /** Each tile's own name, whether in its strip or in its corner, or `null` when it writes none. */
  const names = (): (string | null)[] =>
    tiles().map(tile => tile.querySelector('.wr-treemap-chart__label')?.textContent.trim() ?? null);
  const set = (change: (h: Host) => void): void => {
    change(host());
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  it('names the drawing, one image with nothing announced inside it', () => {
    expect(plot().getAttribute('role')).toBe('img');
    expect(plot().getAttribute('aria-label')).toBe('Treemap chart');

    set(h => h.ariaLabel.set('Groceries by weight'));
    expect(plot().getAttribute('aria-label')).toBe('Groceries by weight');
  });

  it('draws parents before their children, and siblings largest first', () => {
    expect(names()).toEqual(['Veg', 'Kale', 'Leeks', 'Fruit', 'Apples', 'Pears']);
    expect(tiles().map(tile => tile.classList.contains('wr-treemap-chart__tile--group'))).toEqual([
      true,
      false,
      false,
      true,
      false,
      false,
    ]);
    expect(all('.wr-treemap-chart__tile--leaf')).toHaveLength(4);
  });

  it('gives every top-level node an area in proportion to its value, squarified', () => {
    // 60 / 30 / 10: the 60 is a column of 60% at the inline-start edge, and the other two
    // share the 40% beside it, the 30 on top.
    set(h =>
      h.data.set([
        { label: 'A', value: 60 },
        { label: 'B', value: 30 },
        { label: 'C', value: 10 },
      ])
    );
    expect(tiles().map(boxOf)).toEqual([
      { start: 0, top: 0, width: 60, height: 100 },
      { start: 60, top: 0, width: 40, height: 75 },
      { start: 60, top: 75, width: 40, height: 25 },
    ]);
  });

  it('lays out from the inline-start edge, so the drawing mirrors under RTL', () => {
    for (const tile of tiles()) {
      expect(tile.style.getPropertyValue('inset-inline-start')).not.toBe('');
      expect(tile.style.left).toBe('');
      expect(tile.style.right).toBe('');
    }
    expect(boxOf(tiles()[0]).start).toBe(0);
  });

  it("draws a group's children inside it, under a strip with its name", () => {
    // Veg is 0..384 × 0..280; inside, 3 px in and 20 px down, Kale is the 252 px column
    // of 378 × 257 and Leeks the 126 beside it.
    const [veg, kale, leeks] = tiles().map(boxOf);
    expect(veg).toEqual({ start: 0, top: 0, width: 60, height: 100 });
    expect(kale.start).toBeCloseTo((3 / 640) * 100, 2);
    expect(kale.top).toBeCloseTo((20 / 280) * 100, 2);
    expect(kale.width).toBeCloseTo((252 / 640) * 100, 2);
    expect(kale.height).toBeCloseTo((257 / 280) * 100, 2);
    expect(leeks.start).toBeCloseTo((255 / 640) * 100, 2);
    expect(leeks.width).toBeCloseTo((126 / 640) * 100, 2);

    const header = tiles()[0].querySelector<HTMLElement>('.wr-treemap-chart__header')!;
    expect(header.style.height).toBe('20px');
    expect(header.querySelector('.wr-treemap-chart__label')!.textContent.trim()).toBe('Veg');
    expect(header.querySelector('.wr-treemap-chart__value')!.textContent.trim()).toBe('60');
  });

  it('draws every level at once, each group inside its own parent', () => {
    set(h => {
      h.data.set(DEEP);
      h.dataTable.set(true);
    });
    expect(names()).toEqual(['Org', 'Eng', 'Web', 'Mobile', 'Ops']);
    expect(tiles().map(tile => tile.classList.contains('wr-treemap-chart__tile--group'))).toEqual([
      true,
      true,
      false,
      false,
      false,
    ]);
    // Web and Mobile lie inside Eng, and Eng inside Org.
    const [org, eng, web, mobile] = tiles().map(boxOf);
    const inside = (inner: Box, outer: Box): boolean =>
      inner.start >= outer.start &&
      inner.top >= outer.top &&
      inner.start + inner.width <= outer.start + outer.width + 1e-6 &&
      inner.top + inner.height <= outer.top + outer.height + 1e-6;
    expect(inside(eng, org)).toBe(true);
    expect(inside(web, eng)).toBe(true);
    expect(inside(mobile, eng)).toBe(true);
    // Eng's own strip sits under Org's: its children start 20 px into it, 40 px down.
    expect(web.top).toBeCloseTo((40 / 280) * 100, 2);
    // The top-level node's colour, handed down two levels.
    const colors = tiles().map(tile => tile.style.getPropertyValue('--wr-treemap-chart-tile-color'));
    expect(new Set(colors).size).toBe(1);
    expect(colors[0]).not.toBe('');
    expect(text('.wr-chart-table tbody th[scope="row"]')).toEqual([
      'Org',
      'Org / Eng',
      'Org / Eng / Web',
      'Org / Eng / Mobile',
      'Org / Ops',
    ]);
  });

  it('draws a group too small to hold its children as one block, and still lists them', () => {
    // 10000 to 2: Tiny is a sliver under a pixel wide, with no room inside for anything.
    set(h => {
      h.data.set([
        { label: 'Big', value: 10000 },
        {
          label: 'Tiny',
          children: [
            { label: 'a', value: 1 },
            { label: 'b', value: 1 },
          ],
        },
      ]);
      h.dataTable.set(true);
    });
    expect(tiles()).toHaveLength(2);
    expect(tiles()[1].classList).toContain('wr-treemap-chart__tile--leaf');
    expect(tiles()[1].classList).not.toContain('wr-treemap-chart__tile--group');
    expect(text('.wr-chart-table tbody th[scope="row"]')).toEqual(['Big', 'Tiny', 'Tiny / a', 'Tiny / b']);
  });

  it('gives a group too short for a strip no header, and draws its children 3 px in', () => {
    // 60 / 35 / 5: C is the 256 × 35 px tile under B, too short for a 20 px strip and the
    // children under it, so its children start 3 px down rather than 20.
    set(h =>
      h.data.set([
        { label: 'A', value: 60 },
        { label: 'B', value: 35 },
        {
          label: 'C',
          children: [
            { label: 'c1', value: 3 },
            { label: 'c2', value: 2 },
          ],
        },
      ])
    );
    const c = tiles()[2];
    expect(c.classList).toContain('wr-treemap-chart__tile--group');
    expect(c.querySelector('.wr-treemap-chart__header')).toBeNull();
    expect(boxOf(tiles()[3]).top - boxOf(c).top).toBeCloseTo((3 / 280) * 100, 3);
  });

  it('sums a group from its children when it has no value of its own', () => {
    set(h => h.dataTable.set(true));
    expect(text('.wr-chart-table tbody th[scope="row"]')).toEqual([
      'Fruit',
      'Fruit / Apples',
      'Fruit / Pears',
      'Veg',
      'Veg / Kale',
      'Veg / Leeks',
    ]);
    expect(all('.wr-chart-table tbody tr').map(row => row.querySelector('td')!.textContent.trim())).toEqual([
      '40',
      '30',
      '10',
      '60',
      '40',
      '20',
    ]);
  });

  it("leaves a group's own value beyond its children empty, as what they do not account for", () => {
    // Fruit is given 80 for children of 40: half its inner room is left to the group.
    set(h =>
      h.data.set([
        {
          label: 'Fruit',
          value: 80,
          children: [
            { label: 'Apples', value: 30 },
            { label: 'Pears', value: 10 },
          ],
        },
      ])
    );
    const [fruit, apples, pears] = tiles().map(boxOf);
    const inner = ((640 - 6) / 640) * ((280 - 23) / 280) * 100 * 100;
    const children = apples.width * apples.height + pears.width * pears.height;
    expect(children / inner).toBeCloseTo(0.5, 3);
    expect(fruit).toEqual({ start: 0, top: 0, width: 100, height: 100 });
    // The children start at the group's inline-start top corner; the rest is the group's.
    expect(apples.start).toBeCloseTo((3 / 640) * 100, 2);
    expect(apples.top).toBeCloseTo((20 / 280) * 100, 2);
  });

  it('draws a group given less than its children at their total, and says so once in dev mode', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    set(h =>
      h.data.set([
        { label: 'Fruit', value: 10, children: [{ label: 'Apples', value: 30 }] },
        { label: 'Veg', value: 30 },
      ])
    );
    // Fruit draws at 30, the same as Veg, and the figure it was given stays its own.
    const [fruit, , veg] = tiles().map(boxOf);
    expect(names()).toEqual(['Fruit', 'Apples', 'Veg']);
    expect(fruit.width * fruit.height).toBeCloseTo(veg.width * veg.height, 1);
    set(h => h.dataTable.set(true));
    expect(all('.wr-chart-table tbody tr')[0].querySelector('td')!.textContent.trim()).toBe('10');

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/"Fruit" is given a value of 10, below the 30 its children add up to/);
    set(h => h.height.set(300));
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('draws no tile for a value with no area, lists it all the same, and warns about a negative one', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    set(h => {
      h.data.set([
        { label: 'A', value: 50 },
        { label: 'Gone', value: -5 },
        { label: 'Blank' },
        { label: 'Zero', value: 0 },
        { label: 'NaN', value: Number.NaN },
      ]);
      h.dataTable.set(true);
    });
    expect(names()).toEqual(['A']);
    expect(tiles().map(boxOf)).toEqual([{ start: 0, top: 0, width: 100, height: 100 }]);

    expect(text('.wr-chart-table tbody th[scope="row"]')).toEqual(['A', 'Gone', 'Blank', 'Zero', 'NaN']);
    expect(
      all('.wr-chart-table tbody tr').map(row => [...row.querySelectorAll('td')].map(td => td.textContent.trim()))
    ).toEqual([
      ['50', '100%'],
      ['-5', ''],
      ['', ''],
      ['0', ''],
      ['', ''],
    ]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/"Gone" has a negative value \(-5\)/);
    expect(warn.mock.calls[0][0]).toMatch(/It draws no tile/);
  });

  it("draws a group given a negative value at its children's total, and says that rather than no tile", () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    set(h => {
      h.data.set([
        { label: 'Neg', value: -5, children: [{ label: 'Kid', value: 30 }] },
        { label: 'Pos', value: 30 },
      ]);
      h.dataTable.set(true);
    });
    // Neg is drawn round Kid at 30, the same area as Pos, and keeps the figure it was given.
    const [neg, , pos] = tiles().map(boxOf);
    expect(names()).toEqual(['Neg', 'Kid', 'Pos']);
    expect(tiles()[0].classList.contains('wr-treemap-chart__tile--group')).toBe(true);
    expect(neg.width * neg.height).toBeCloseTo(pos.width * pos.height, 1);
    expect(all('.wr-chart-table tbody tr')[0].querySelector('td')!.textContent.trim()).toBe('-5');

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/"Neg" has a negative value \(-5\), which has no area/);
    expect(warn.mock.calls[0][0]).toMatch(/drawn at the 30 its children add up to/);
    expect(warn.mock.calls[0][0]).not.toMatch(/draws no tile/);
  });

  it('takes a group whose decimal value its children add up to in binary as their sum, and says nothing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    // 0.1 + 0.2 + 0.3 is 0.6000000000000001: the same total, not a group given less.
    set(h =>
      h.data.set([
        {
          label: 'Share',
          value: 0.6,
          children: [
            { label: 'a', value: 0.1 },
            { label: 'b', value: 0.2 },
            { label: 'c', value: 0.3 },
          ],
        },
        { label: 'Rest', value: 0.4 },
      ])
    );
    expect(warn).not.toHaveBeenCalled();
    expect(names()).toEqual(['Share', 'c', 'b', 'a', 'Rest']);
  });

  it('colours each top-level node from the palette, and hands it down', () => {
    set(h =>
      h.data.set([
        { label: 'A', value: 40, children: [{ label: 'A1', value: 40 }] },
        {
          label: 'B',
          value: 30,
          color: '#123456',
          children: [
            { label: 'B1', value: 20 },
            { label: 'B2', value: 10, color: 'red' },
          ],
        },
        { label: 'C', value: 20 },
      ])
    );
    const color = (tile: HTMLElement): string => tile.style.getPropertyValue('--wr-treemap-chart-tile-color');
    expect(
      Object.fromEntries(
        tiles().map(tile => [tile.querySelector('.wr-treemap-chart__label')?.textContent.trim(), color(tile)])
      )
    ).toEqual({
      A: 'var(--wr-color-primary)',
      A1: 'var(--wr-color-primary)',
      B: '#123456',
      B1: '#123456',
      B2: 'red',
      // The palette keeps counting by position, whatever B brought of its own.
      C: 'var(--wr-color-warning)',
    });
  });

  it('writes names and values only in the tiles with room for them', () => {
    // 1000 to 1: the sliver is about 0.6 × 280 px, too thin for a letter.
    set(h =>
      h.data.set([
        { label: 'Big', value: 1000 },
        { label: 'Sliver', value: 1 },
      ])
    );
    expect(tiles()).toHaveLength(2);
    expect(names()).toEqual(['Big', null]);
    expect(text('.wr-treemap-chart__value')).toEqual(['1K']);
  });

  it('writes the value under the name only where the tile is two lines tall', () => {
    // 60 / 35 / 5: the 60 is the 384 px column, the 35 a 256 × 245 strip beside it, and
    // the 5 the 256 × 35 left under that — room for one line and not two.
    set(h =>
      h.data.set([
        { label: 'A', value: 60 },
        { label: 'B', value: 35 },
        { label: 'C', value: 5 },
      ])
    );
    expect(boxOf(tiles()[2]).height).toBeCloseTo(12.5, 3);
    expect(names()).toEqual(['A', 'B', 'C']);
    expect(tiles().map(tile => tile.querySelector('.wr-treemap-chart__value')?.textContent.trim() ?? null)).toEqual([
      '60',
      '35',
      null,
    ]);
  });

  it('writes no text with `showLabels` off, and gives the strip back to the children', () => {
    set(h => h.showLabels.set(false));
    expect(all('.wr-treemap-chart__label')).toHaveLength(0);
    expect(all('.wr-treemap-chart__header')).toHaveLength(0);
    // Kale starts 3 px down now, not 20.
    expect(boxOf(tiles()[1]).top).toBeCloseTo((3 / 280) * 100, 2);
  });

  it('writes no values with `showValues` off, and keeps the names', () => {
    set(h => h.showValues.set(false));
    expect(all('.wr-treemap-chart__value')).toHaveLength(0);
    expect(names()).toEqual(['Veg', 'Kale', 'Leeks', 'Fruit', 'Apples', 'Pears']);
  });

  it('writes compact values in the tiles and exact ones in the table', () => {
    set(h => {
      h.data.set([{ label: 'A', value: 12345 }]);
      h.dataTable.set(true);
    });
    expect(text('.wr-treemap-chart__value')).toEqual(['12K']);
    expect(all('.wr-chart-table tbody td')[0].textContent.trim()).toBe('12,345');
  });

  it('writes every value through `valueFormat`, and shares as percentages either way', () => {
    set(h => {
      h.valueFormat.set(v => `$${v}`);
      h.dataTable.set(true);
    });
    expect(text('.wr-treemap-chart__header .wr-treemap-chart__value')).toEqual(['$60', '$40']);
    expect([...all('.wr-chart-table tbody tr')[0].querySelectorAll('td')].map(td => td.textContent.trim())).toEqual([
      '$40',
      '40%',
    ]);
  });

  it('writes every share through `percentFormat`, given as a ratio', () => {
    set(h => {
      h.percentFormat.set(ratio => `${(ratio * 100).toFixed(2)} pct`);
      h.dataTable.set(true);
    });
    expect(all('.wr-chart-table tbody tr').map(row => row.querySelectorAll('td')[1].textContent.trim())).toEqual([
      '40.00 pct',
      '30.00 pct',
      '10.00 pct',
      '60.00 pct',
      '40.00 pct',
      '20.00 pct',
    ]);
  });

  it('gives every value its own direction, as every name has', () => {
    for (const value of all('.wr-treemap-chart__value')) expect(value.getAttribute('dir')).toBe('auto');
    expect(all('.wr-treemap-chart__value').length).toBeGreaterThan(0);
  });

  it('renders no data table unless asked', () => {
    expect(root().querySelector('wr-chart-table')).toBeNull();
  });

  it('tabulates every node beside the drawing: its path, its value and its share of the whole', () => {
    set(h => {
      h.dataTable.set(true);
      h.ariaLabel.set('Groceries');
    });
    const table = root().querySelector('.wr-chart-table')!;
    // Beside the image, never inside it.
    expect(table.closest('[role="img"]')).toBeNull();
    expect(table.querySelector('caption')!.textContent.trim()).toBe('Groceries');
    expect(text('.wr-chart-table thead th[scope="col"]')).toEqual(['Value', 'Share']);
    expect(
      all('.wr-chart-table tbody tr').map(row => [...row.querySelectorAll('td')].map(td => td.textContent.trim()))
    ).toEqual([
      ['40', '40%'],
      ['30', '30%'],
      ['10', '10%'],
      ['60', '60%'],
      ['40', '40%'],
      ['20', '20%'],
    ]);

    set(h => h.valueLabel.set('Weight (kg)'));
    expect(text('.wr-chart-table thead th[scope="col"]')).toEqual(['Weight (kg)', 'Share']);
  });

  it('writes a sliver of a share to two significant digits rather than as zero', () => {
    set(h => {
      h.data.set([
        { label: 'A', value: 9996 },
        { label: 'B', value: 4 },
      ]);
      h.dataTable.set(true);
    });
    expect(all('.wr-chart-table tbody tr').map(row => row.querySelectorAll('td')[1].textContent.trim())).toEqual([
      '100%',
      '0.04%',
    ]);
  });

  it('draws nothing, and no NaN, with no data or nothing to draw', () => {
    set(h => h.data.set([]));
    expect(tiles()).toHaveLength(0);
    set(h => h.data.set([{ label: 'Empty', children: [{ label: 'Nothing' }] }]));
    expect(tiles()).toHaveLength(0);
    set(h =>
      h.data.set([
        { label: 'A', value: 1 },
        { label: 'B', value: Number.POSITIVE_INFINITY },
      ])
    );
    expect(root().innerHTML).not.toMatch(/NaN|Infinity/);
  });

  it('holds its height to at least 80px', () => {
    expect(plot().style.height).toBe('280px');
    set(h => h.height.set(10));
    expect(plot().style.height).toBe('80px');
  });

  it('holds no tab stop of its own', () => {
    set(h => h.dataTable.set(true));
    expect(root().querySelectorAll('[tabindex], button, a[href]')).toHaveLength(0);
  });
});

describe('WrTreemapChart measured', () => {
  type Callback = (entries: { contentRect: { width: number; height: number } }[]) => void;
  let observed: { callback: Callback; disconnected: boolean } | null = null;

  beforeEach(() => {
    observed = null;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        private readonly record: { callback: Callback; disconnected: boolean };
        constructor(callback: Callback) {
          this.record = { callback, disconnected: false };
          observed = this.record;
        }
        observe(): void {
          // The callback is driven by hand below.
        }
        disconnect(): void {
          this.record.disconnected = true;
        }
      }
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it('cuts the layout again for the plot it measures, and lets go of it on destroy', async () => {
    TestBed.resetTestingModule();
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.data.set([
      { label: 'A', value: 1 },
      { label: 'B', value: 1 },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();
    const boxes = (): Box[] =>
      [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.wr-treemap-chart__tile')].map(boxOf);

    // Assumed 640 × 280: two squares side by side.
    expect(boxes()).toEqual([
      { start: 0, top: 0, width: 50, height: 100 },
      { start: 50, top: 0, width: 50, height: 100 },
    ]);

    // Measured 200 × 400: two squares one above the other.
    expect(observed).not.toBeNull();
    observed!.callback([{ contentRect: { width: 200, height: 400 } }]);
    fixture.detectChanges();
    expect(boxes()).toEqual([
      { start: 0, top: 0, width: 100, height: 50 },
      { start: 0, top: 50, width: 100, height: 50 },
    ]);

    // A hidden chart measures nothing, and keeps the layout it had.
    observed!.callback([{ contentRect: { width: 0, height: 0 } }]);
    fixture.detectChanges();
    expect(boxes()[1].top).toBe(50);

    fixture.destroy();
    expect(observed!.disconnected).toBe(true);
  });
});

describe('WrTreemapChart on the server', () => {
  it('draws everything from its inputs and measures nothing', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const measure = vi.spyOn(Element.prototype, 'getBoundingClientRect');
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.dataTable.set(true);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.wr-treemap-chart__tile')).toHaveLength(6);
    expect(root.querySelectorAll('.wr-chart-table tbody tr')).toHaveLength(6);
    expect(measure).not.toHaveBeenCalled();
    fixture.destroy();
    measure.mockRestore();
  });
});

describe('WrTreemapChart numbers', () => {
  it('writes the values and the shares in LOCALE_ID', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'de' }] });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.data.set([
      { label: 'A', value: 1500.5 },
      { label: 'B', value: 499.5 },
    ]);
    fixture.componentInstance.dataTable.set(true);
    fixture.detectChanges();

    const cells = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.wr-chart-table tbody td')].map(td =>
      td.textContent.trim()
    );
    // German puts a no-break space before the percent sign.
    expect(cells).toEqual(['1.500,5', '75\u00a0%', '499,5', '25\u00a0%']);
    fixture.destroy();
  });
});

@Component({
  imports: [WrTreemapChart],
  template: `<wr-treemap-chart [data]="data()" [tooltip]="tooltip()" [percentFormat]="percentFormat()" />`,
})
class TooltipHost {
  readonly data = signal<readonly WrTreemapNode[]>(FOOD);
  readonly tooltip = signal(true);
  readonly percentFormat = signal<((ratio: number) => string) | null>(null);
}

/**
 * The tooltip follows the tile under the pointer, read off the element the pointer is
 * over, so jsdom can drive it with a `mousemove` on a tile. The chip is given a size and
 * the document one, and the case reads what the chip says and what the drawing marks;
 * where the chip paints is measured in a browser.
 */
describe('WrTreemapChart tooltip', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TooltipHost>>;

  const doc = document.documentElement;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const tiles = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('.wr-treemap-chart__tile')];
  const chip = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-chart-tooltip');
  const heading = (): string[] =>
    [...(chip()?.querySelectorAll('.wr-chart-tooltip__label, .wr-chart-tooltip__value') ?? [])].map(el =>
      el.textContent.trim()
    );
  const rows = (): string[] =>
    [...(chip()?.querySelectorAll('.wr-chart-tooltip__row') ?? [])].map(row =>
      [...row.querySelectorAll('.wr-chart-tooltip__row-label, .wr-chart-tooltip__row-value')]
        .map(el => el.textContent.trim())
        .join(' ')
    );
  const move = (target: Element): void => {
    target.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    Object.defineProperty(doc, 'clientWidth', { configurable: true, value: 1024 });
    Object.defineProperty(doc, 'clientHeight', { configurable: true, value: 768 });
    fixture = TestBed.createComponent(TooltipHost);
    fixture.detectChanges();
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      return this.classList.contains('cdk-overlay-pane') ? new DOMRect(0, 0, 80, 40) : new DOMRect(10, 10, 100, 50);
    });
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
    Reflect.deleteProperty(doc, 'clientWidth');
    Reflect.deleteProperty(doc, 'clientHeight');
  });

  it("heads the chip with the tile's path and value, and gives its share under it", () => {
    move(tiles()[1].querySelector('.wr-treemap-chart__label')!);

    expect(heading()).toEqual(['Veg / Kale', '40']);
    // Veg is the second top-level node in the data, so the second palette colour.
    expect(chip()!.querySelector<HTMLElement>('.wr-chart-tooltip__swatch')!.style.background).toBe(
      'var(--wr-color-success)'
    );
    expect(rows()).toEqual(['Share 40%']);
  });

  it('heads a tile two levels down with its whole path, and writes its share through `percentFormat`', () => {
    fixture.componentInstance.data.set(DEEP);
    fixture.componentInstance.percentFormat.set(ratio => `${ratio * 100} pct`);
    fixture.detectChanges();
    move(tiles()[2]);

    expect(heading()).toEqual(['Org / Eng / Web', '30']);
    expect(rows()).toEqual(['Share 50 pct']);
  });

  it("reads the group off its strip and its edge, with the group's total", () => {
    move(tiles()[3].querySelector('.wr-treemap-chart__header')!);
    expect(heading()).toEqual(['Fruit', '40']);

    move(tiles()[0]);
    expect(heading()).toEqual(['Veg', '60']);
  });

  it('outlines the tile the chip is about, and only that one', () => {
    move(tiles()[2]);
    expect(tiles().map(tile => tile.classList.contains('wr-treemap-chart__tile--active'))).toEqual([
      false,
      false,
      true,
      false,
      false,
      false,
    ]);
  });

  it('lets go off the plot, after the grace that keeps the chip hoverable', () => {
    vi.useFakeTimers();
    try {
      move(tiles()[1]);
      expect(chip()).not.toBeNull();

      root()
        .querySelector('.wr-treemap-chart__plot')!
        .dispatchEvent(new MouseEvent('mouseleave', { relatedTarget: document.body }));
      vi.advanceTimersByTime(150);
      fixture.detectChanges();
      expect(chip()).toBeNull();
      expect(root().querySelector('.wr-treemap-chart__tile--active')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows nothing with `tooltip` off', () => {
    fixture.componentInstance.tooltip.set(false);
    fixture.detectChanges();
    move(tiles()[1]);
    expect(chip()).toBeNull();
    expect(root().querySelector('.wr-treemap-chart__tile--active')).toBeNull();
  });
});

/**
 * What the stylesheet promises that no rendered DOM in jsdom can show, held against the
 * COMPILED sheet; `sass` is resolved through `@angular/build`, as `charts/stylesheets.spec.ts`
 * does. That each rule then paints what it says is measured in a browser.
 */
describe('WrTreemapChart stylesheet', () => {
  const sass = createRequire(createRequire(import.meta.url).resolve('@angular/build/package.json'))('sass') as {
    compileString(source: string, options: { loadPaths: string[]; style: 'expanded' }): { css: string };
  };
  const css = sass
    .compileString(`@use 'charts/treemap-chart/styles';`, {
      loadPaths: [join(process.cwd(), 'projects/lib')],
      style: 'expanded',
    })
    .css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = (block: string, selector: string): string =>
    new RegExp(`(?:^|\\n)\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(block)?.[1] ??
    '';
  /** Every `forced-colors` block of the sheet, the chart's own and any it loads. */
  const forced = [...css.matchAll(/@media \(forced-colors: active\)\s*\{([\s\S]*?)\n\}/g)].map(m => m[1]).join('\n');

  it("prints a leaf's value whole or not at all: a wrapping line one line tall, led by a zero-width item", () => {
    const value = rule(css, '.wr-treemap-chart__tile > .wr-treemap-chart__value');
    expect(value).toMatch(/display: flex/);
    expect(value).toMatch(/flex-wrap: wrap/);
    expect(value).toMatch(/block-size: var\(--wr-treemap-chart-label-line-height\)/);
    const before = rule(css, '.wr-treemap-chart__tile > .wr-treemap-chart__value::before');
    expect(before).toMatch(/flex: 0 0 0/);
    expect(before).toMatch(/block-size: 100%/);
    // Never ellipsised: `$12…` for $120K would print another number. A name still is.
    expect(css).not.toMatch(/\.wr-treemap-chart__value[^{]*\{[^}]*text-overflow/);
    expect(rule(css, '.wr-treemap-chart__label')).toMatch(/text-overflow: ellipsis/);
  });

  it('keeps every tile edge under forced colors, the reading tile in the selection colour', () => {
    // The tints are left to forced colors, which paints them as the page; the edge is
    // what tells the tiles apart there.
    expect(rule(forced, '.wr-treemap-chart__tile')).toMatch(/outline: var\(--wr-treemap-chart-gap\) solid CanvasText/);
    expect(rule(forced, '.wr-treemap-chart__tile--active')).toMatch(
      /outline: var\(--wr-treemap-chart-active-ring-width\) solid Highlight/
    );
    expect(rule(forced, '.wr-treemap-chart__tile')).not.toMatch(/forced-color-adjust/);
  });
});
