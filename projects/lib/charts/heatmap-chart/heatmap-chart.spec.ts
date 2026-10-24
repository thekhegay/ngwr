import { createRequire } from 'node:module';
import { join } from 'node:path';

import { Component, LOCALE_ID, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrHeatmapChart } from './heatmap-chart';
import type { WrHeatmapMatrix } from './types';

const ROWS = ['Mon', 'Tue', 'Wed'];
const COLUMNS = ['Morning', 'Afternoon', 'Evening'];

/** 0 to 100 in the corners, a missing value in the middle, and every band of five levels in between. */
const DATA: WrHeatmapMatrix = [
  [0, 20, 40],
  [60, null, 80],
  [100, 19.99, 99],
];

@Component({
  imports: [WrHeatmapChart],
  template: `
    <wr-heatmap-chart
      [data]="data()"
      [rows]="rows()"
      [columns]="columns()"
      [color]="color()"
      [min]="min()"
      [max]="max()"
      [levels]="levels()"
      [showValues]="showValues()"
      [showLegend]="showLegend()"
      [dataTable]="dataTable()"
      [ariaLabel]="ariaLabel()"
      [noDataLabel]="noDataLabel()"
      [valueFormat]="valueFormat()"
    />
  `,
})
class Host {
  readonly data = signal<WrHeatmapMatrix>(DATA);
  readonly rows = signal<readonly string[]>(ROWS);
  readonly columns = signal<readonly string[]>(COLUMNS);
  readonly color = signal('var(--wr-color-primary)');
  readonly min = signal<number | null>(null);
  readonly max = signal<number | null>(null);
  readonly levels = signal(5);
  readonly showValues = signal(false);
  readonly showLegend = signal(true);
  readonly dataTable = signal(false);
  readonly ariaLabel = signal<string | null>(null);
  readonly noDataLabel = signal<string | null>(null);
  readonly valueFormat = signal<((value: number) => string) | null>(null);
}

/**
 * A cell's level is read off the `--wr-heatmap-chart-level` the component writes on it, from
 * 0 (the lowest level) to 1 (the colour itself): the stylesheet turns that into paint, and jsdom has no
 * cascade to resolve it, so the level is the honest thing to hold. That the paint then
 * follows it is measured in a browser.
 */
describe('WrHeatmapChart', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): Host => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const all = <T extends Element>(selector: string): T[] => [...root().querySelectorAll<T>(selector)];
  const cells = (): HTMLElement[] => all<HTMLElement>('.wr-heatmap-chart__cell');
  const levels = (): (string | null)[] =>
    cells().map(cell => cell.style.getPropertyValue('--wr-heatmap-chart-level') || null);
  const text = (selector: string): string[] => all<HTMLElement>(selector).map(el => el.textContent.trim());
  const set = (change: (h: Host) => void): void => {
    change(host());
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('names the cells, and keeps the row and column names out of the image', () => {
    const img = root().querySelector('[role="img"]')!;
    expect(img.classList).toContain('wr-heatmap-chart__cells');
    expect(img.getAttribute('aria-label')).toBe('Heatmap chart');
    // `img` hides its whole subtree, and the names are real text a reader can reach.
    for (const label of all('.wr-heatmap-chart__row-label, .wr-heatmap-chart__column-label')) {
      expect(label.closest('[role="img"]')).toBeNull();
    }
    expect(root().querySelectorAll('[role="img"]')).toHaveLength(1);

    set(h => h.ariaLabel.set('Visits by daypart'));
    expect(img.getAttribute('aria-label')).toBe('Visits by daypart');
  });

  it('draws a cell per row and column, row by row, and says which on each', () => {
    expect(text('.wr-heatmap-chart__row-label')).toEqual(ROWS);
    expect(text('.wr-heatmap-chart__column-label')).toEqual(COLUMNS);
    expect(cells()).toHaveLength(9);
    expect(cells().map(cell => [cell.dataset['row'], cell.dataset['column']])).toEqual([
      ['0', '0'],
      ['0', '1'],
      ['0', '2'],
      ['1', '0'],
      ['1', '1'],
      ['1', '2'],
      ['2', '0'],
      ['2', '1'],
      ['2', '2'],
    ]);
    expect(cells()[5].dataset['value']).toBe('80');
    // The grid's tracks follow the shape.
    const matrix = root().querySelector<HTMLElement>('.wr-heatmap-chart__matrix')!;
    expect(matrix.style.getPropertyValue('--wr-heatmap-chart-rows')).toBe('3');
    expect(matrix.style.getPropertyValue('--wr-heatmap-chart-columns')).toBe('3');
  });

  it("puts each value on its band's level, the scale cut into equal shares from the data's lowest to highest", () => {
    // Five bands of 20 over 0..100: a value on a band's edge belongs to the band above,
    // 19.99 to the band below, and the top value to the top level.
    expect(levels()).toEqual(['0', '0.25', '0.5', '0.75', null, '1', '1', '0', '1']);
  });

  it('holds the scale at a given min and max, and draws a value past either on the end level', () => {
    set(h => {
      h.min.set(20);
      h.max.set(60);
    });
    // Bands of 8 over 20..60: 0 is below the scale, 80 and 100 above it.
    expect(levels()).toEqual(['0', '0', '0.5', '1', null, '1', '1', '0', '1']);

    // One bound given, the other from the data.
    set(h => {
      h.min.set(null);
      h.max.set(200);
    });
    expect(levels()).toEqual(['0', '0', '0.25', '0.25', null, '0.5', '0.5', '0', '0.5']);
  });

  it('swaps bounds given in the wrong order', () => {
    set(h => {
      h.min.set(100);
      h.max.set(0);
    });
    expect(levels()).toEqual(['0', '0.25', '0.5', '0.75', null, '1', '1', '0', '1']);
  });

  it('draws a scale with no span as one level, the lowest, keyed by one swatch and one figure', () => {
    // An all-zero matrix is a day with nothing in it: a faint tint, never the peak.
    set(h =>
      h.data.set([
        [0, 0, 0],
        [0, null, 0],
        [0, 0, 0],
      ])
    );
    expect(levels()).toEqual(['0', '0', '0', '0', null, '0', '0', '0', '0']);
    expect(text('.wr-heatmap-chart__legend > .wr-heatmap-chart__legend-label')).toEqual(['0']);
    expect(
      all<HTMLElement>('.wr-heatmap-chart__scale .wr-heatmap-chart__swatch').map(swatch =>
        swatch.style.getPropertyValue('--wr-heatmap-chart-level')
      )
    ).toEqual(['0']);

    // Bounds given equal are the same scale, whatever the data says.
    set(h => {
      h.data.set(DATA);
      h.min.set(7);
      h.max.set(7);
    });
    expect(levels()).toEqual(['0', '0', '0', '0', null, '0', '0', '0', '0']);
    expect(text('.wr-heatmap-chart__legend > .wr-heatmap-chart__legend-label')).toEqual(['7']);
  });

  it('cuts the scale into `levels` shares, held to 2..10', () => {
    set(h => h.levels.set(3));
    expect(levels()).toEqual(['0', '0', '0.5', '0.5', null, '1', '1', '0', '1']);
    expect(all('.wr-heatmap-chart__scale .wr-heatmap-chart__swatch')).toHaveLength(3);

    set(h => h.levels.set(1));
    expect(all('.wr-heatmap-chart__scale .wr-heatmap-chart__swatch')).toHaveLength(2);
    set(h => h.levels.set(40));
    expect(all('.wr-heatmap-chart__scale .wr-heatmap-chart__swatch')).toHaveLength(10);
  });

  it('draws an empty cell as no data, never as the lowest level', () => {
    // A null, a NaN, an infinity and a value a shorter row does not reach.
    set(h => {
      h.rows.set(['A', 'B']);
      h.data.set([
        [0, Number.NaN, 10],
        [Number.POSITIVE_INFINITY, 5],
      ]);
    });
    expect(cells().map(cell => cell.classList.contains('wr-heatmap-chart__cell--empty'))).toEqual([
      false,
      true,
      false,
      true,
      false,
      true,
    ]);
    // No level at all, where the lowest value has the lowest one.
    expect(levels()).toEqual(['0', null, '1', null, '0.5', null]);
    expect(cells()[1].hasAttribute('data-value')).toBe(false);
  });

  it('keys the hatching in the legend while a cell is empty, under its own name', () => {
    expect(text('.wr-heatmap-chart__legend-empty')).toEqual(['No data']);
    expect(all('.wr-heatmap-chart__swatch--empty')).toHaveLength(1);

    set(h => h.noDataLabel.set('Closed'));
    expect(text('.wr-heatmap-chart__legend-empty')).toEqual(['Closed']);

    set(h =>
      h.data.set([
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ])
    );
    expect(root().querySelector('.wr-heatmap-chart__legend-empty')).toBeNull();
  });

  it('names a row or column the names do not reach by its position', () => {
    set(h => {
      h.rows.set(['A']);
      h.columns.set([]);
    });
    expect(text('.wr-heatmap-chart__row-label')).toEqual(['A', '2', '3']);
    expect(text('.wr-heatmap-chart__column-label')).toEqual(['1', '2', '3']);

    // Names past the data add empty rows and columns.
    set(h => {
      h.data.set([[1]]);
      h.rows.set(['A', 'B']);
      h.columns.set(['x', 'y']);
    });
    expect(cells()).toHaveLength(4);
    expect(cells().map(cell => cell.classList.contains('wr-heatmap-chart__cell--empty'))).toEqual([
      false,
      true,
      true,
      true,
    ]);
  });

  it('draws an empty frame with no data and no names', () => {
    set(h => {
      h.data.set([]);
      h.rows.set([]);
      h.columns.set([]);
    });
    expect(cells()).toHaveLength(0);
    expect(root().querySelector('[role="img"]')).not.toBeNull();
    // `repeat()` takes no zero count, so the tracks are held at one.
    const matrix = root().querySelector<HTMLElement>('.wr-heatmap-chart__matrix')!;
    expect(matrix.style.getPropertyValue('--wr-heatmap-chart-columns')).toBe('1');
    expect(root().querySelector('.wr-heatmap-chart__legend')).toBeNull();
  });

  it('prints each value in its cell with `showValues`, compact from a thousand, and nothing in an empty cell', () => {
    expect(all('.wr-heatmap-chart__value')).toHaveLength(0);

    set(h => {
      h.showValues.set(true);
      h.rows.set(['A', 'B']);
      h.columns.set(['x', 'y']);
      h.data.set([
        [12.5, 1234567],
        [null, 999],
      ]);
    });
    expect(cells().map(cell => cell.textContent.trim())).toEqual(['12.5', '1.2M', '', '999']);
    expect(all('.wr-heatmap-chart__value')).toHaveLength(3);
  });

  it('writes the color on the host for the stylesheet to mix every level from', () => {
    const chart = root().querySelector<HTMLElement>('wr-heatmap-chart')!;
    expect(chart.style.getPropertyValue('--wr-heatmap-chart-scale-color')).toBe('var(--wr-color-primary)');
    set(h => h.color.set('var(--wr-color-success)'));
    expect(chart.style.getPropertyValue('--wr-heatmap-chart-scale-color')).toBe('var(--wr-color-success)');
  });

  it('keys the levels from the scale minimum to its maximum, hidden from a screen reader', () => {
    const legend = root().querySelector('.wr-heatmap-chart__legend')!;
    expect(legend.getAttribute('aria-hidden')).toBe('true');
    expect(text('.wr-heatmap-chart__legend > .wr-heatmap-chart__legend-label')).toEqual(['0', '100']);
    expect(
      all<HTMLElement>('.wr-heatmap-chart__scale .wr-heatmap-chart__swatch').map(swatch =>
        swatch.style.getPropertyValue('--wr-heatmap-chart-level')
      )
    ).toEqual(['0', '0.25', '0.5', '0.75', '1']);

    set(h => {
      h.min.set(-5);
      h.max.set(2500);
    });
    expect(text('.wr-heatmap-chart__legend > .wr-heatmap-chart__legend-label')).toEqual(['-5', '2.5K']);

    set(h => h.showLegend.set(false));
    expect(root().querySelector('.wr-heatmap-chart__legend')).toBeNull();
  });

  it('keys an empty matrix with the hatching alone, since there is no scale to draw', () => {
    set(h => h.data.set([[null, null]]));
    expect(root().querySelector('.wr-heatmap-chart__scale')).toBeNull();
    expect(text('.wr-heatmap-chart__legend')).toEqual(['No data']);
  });

  it('renders no data table unless asked', () => {
    expect(root().querySelector('wr-chart-table')).toBeNull();
  });

  it('tabulates the figures beside the image: a row per row, a column per column', () => {
    set(h => {
      h.dataTable.set(true);
      h.ariaLabel.set('Visits');
    });
    const table = root().querySelector('wr-chart-table')!;
    // Never inside the `img`, which would hide it with the cells.
    expect(table.closest('[role="img"]')).toBeNull();
    expect(table.querySelector('caption')!.textContent.trim()).toBe('Visits');
    expect(text('.wr-chart-table thead th')).toEqual(COLUMNS);
    const rows = all('.wr-chart-table tbody tr').map(row => [
      row.querySelector('th')!.textContent.trim(),
      ...[...row.querySelectorAll('td')].map(cell => cell.textContent.trim()),
    ]);
    // An empty cell says so, in the words the legend uses.
    expect(rows).toEqual([
      ['Mon', '0', '20', '40'],
      ['Tue', '60', 'No data', '80'],
      ['Wed', '100', '19.99', '99'],
    ]);
  });

  it('writes every number through `valueFormat`', () => {
    set(h => {
      h.valueFormat.set(v => `${v} °C`);
      h.showValues.set(true);
      h.dataTable.set(true);
    });
    expect(cells()[1].textContent.trim()).toBe('20 °C');
    expect(text('.wr-heatmap-chart__legend > .wr-heatmap-chart__legend-label')).toEqual(['0 °C', '100 °C']);
    expect(all('.wr-chart-table tbody td')[1].textContent.trim()).toBe('20 °C');
  });

  it('holds no tab stop of its own', () => {
    set(h => h.dataTable.set(true));
    expect(root().querySelectorAll('[tabindex], button, a[href], input')).toHaveLength(0);
  });
});

describe('WrHeatmapChart on the server', () => {
  it('draws everything from its inputs and measures nothing', () => {
    // Only the tooltip measures, and only after a pointer has moved. A prerendered page
    // carries every cell, the legend and the table.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const measure = vi.spyOn(Element.prototype, 'getBoundingClientRect');
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.dataTable.set(true);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.wr-heatmap-chart__cell')).toHaveLength(9);
    expect(root.querySelectorAll('.wr-heatmap-chart__swatch')).toHaveLength(6);
    expect(root.querySelectorAll('.wr-chart-table tbody tr')).toHaveLength(3);
    expect(measure).not.toHaveBeenCalled();
    fixture.destroy();
    measure.mockRestore();
  });
});

describe('WrHeatmapChart numbers', () => {
  it('writes the values, the legend and the table in LOCALE_ID', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'de' }] });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.data.set([[1500.5, 2500000, 3]]);
    fixture.componentInstance.showValues.set(true);
    fixture.componentInstance.dataTable.set(true);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    // Compact in the cells, whole in the table.
    const compact = new Intl.NumberFormat('de', { notation: 'compact' });
    const values = [...root.querySelectorAll('.wr-heatmap-chart__value')].map(el => el.textContent.trim());
    expect(values.slice(0, 2)).toEqual([compact.format(1500.5), compact.format(2500000)]);
    expect(values[1]).toMatch(/^2,5\sMio\.$/);
    expect(root.querySelector('.wr-chart-table tbody td')!.textContent.trim()).toBe('1.500,5');
    expect(root.querySelector('.wr-heatmap-chart__legend-label')!.textContent.trim()).toBe('3');
    fixture.destroy();
  });
});

@Component({
  imports: [WrHeatmapChart],
  template: `<wr-heatmap-chart
    [rows]="['Mon', 'Tue']"
    [columns]="['AM', 'PM']"
    [data]="[
      [1, 2],
      [null, 1234],
    ]"
    [tooltip]="tooltip()"
  />`,
})
class TooltipHost {
  readonly tooltip = signal(true);
}

/**
 * The tooltip follows the cell under the pointer, found by the element the pointer is on,
 * so a dispatched `mousemove` reaches it as a real one would. Where the CDK then puts the
 * chip needs a layout jsdom does not have; that it paints over the cell is measured in a
 * browser.
 */
describe('WrHeatmapChart tooltip', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TooltipHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const cell = (row: number, column: number): HTMLElement =>
    root().querySelector<HTMLElement>(`.wr-heatmap-chart__cell[data-row="${row}"][data-column="${column}"]`)!;
  const chip = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-chart-tooltip');
  const heading = (): string | undefined => chip()?.querySelector('.wr-chart-tooltip__label')?.textContent.trim();
  const rows = (): string[] =>
    [...(chip()?.querySelectorAll('.wr-chart-tooltip__row') ?? [])].map(row =>
      [...row.querySelectorAll('.wr-chart-tooltip__row-label, .wr-chart-tooltip__row-value')]
        .map(el => el.textContent.trim())
        .join(' ')
    );
  const move = (el: Element): void => {
    el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(TooltipHost);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  it('heads the chip with the row and gives the column and the exact value under it', () => {
    move(cell(1, 1));

    expect(heading()).toBe('Tue');
    expect(chip()!.querySelector('.wr-chart-tooltip__value')).toBeNull();
    expect(rows()).toEqual(['PM 1,234']);
    // No swatch: the arrow points at the cell, and its paint is the cell's own.
    expect(chip()!.querySelector('.wr-chart-tooltip__swatch, .wr-chart-tooltip__row-swatch')).toBeNull();
  });

  it('says an empty cell has no data rather than skipping it', () => {
    move(cell(1, 0));
    expect(heading()).toBe('Tue');
    expect(rows()).toEqual(['AM No data']);
  });

  it('rings the cell it is reading, and follows the pointer with one chip', () => {
    move(cell(0, 0));
    expect(cell(0, 0).classList).toContain('wr-heatmap-chart__cell--active');

    move(cell(0, 1));
    expect(cell(0, 0).classList).not.toContain('wr-heatmap-chart__cell--active');
    expect(cell(0, 1).classList).toContain('wr-heatmap-chart__cell--active');
    expect(document.querySelectorAll('.wr-chart-tooltip')).toHaveLength(1);
    expect(rows()).toEqual(['PM 2']);
  });

  it('starts to leave over the gap between cells, after the grace that keeps the chip hoverable', () => {
    move(cell(0, 0));
    move(root().querySelector('.wr-heatmap-chart__cells')!);
    expect(chip()).not.toBeNull();

    vi.advanceTimersByTime(150);
    fixture.detectChanges();
    expect(chip()).toBeNull();
    expect(root().querySelector('.wr-heatmap-chart__cell--active')).toBeNull();
  });

  it('shows nothing with `tooltip` off', () => {
    fixture.componentInstance.tooltip.set(false);
    fixture.detectChanges();
    move(cell(0, 0));

    expect(chip()).toBeNull();
    expect(root().querySelector('.wr-heatmap-chart__cell--active')).toBeNull();
  });
});

@Component({
  imports: [WrHeatmapChart],
  template: `<wr-heatmap-chart [columns]="columns()" [data]="[[1, 2, 3, 4, 5, 6, 7]]" />`,
})
class NamesHost {
  readonly columns = signal<readonly string[]>(['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00']);
}

/**
 * jsdom has no layout, so the cells' pitch and the names' widths are stubbed: 20px between
 * two columns, 18px of it the cell, and each name `nameWidth` wide. That the stylesheet
 * then draws the names it is told to, where it is told to, is measured in a browser.
 */
describe('WrHeatmapChart column names', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<NamesHost>>;
  let nameWidth = 30;
  let rect: MockInstance<() => DOMRect>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const names = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('.wr-heatmap-chart__column-label')];
  const drawn = (): string[] =>
    names()
      .filter(name => !name.classList.contains('wr-heatmap-chart__column-label--hidden'))
      .map(name => name.textContent.trim());
  const strip = (): HTMLElement => root().querySelector<HTMLElement>('.wr-heatmap-chart__column-labels')!;

  beforeEach(() => {
    rect = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const column = Number((this as HTMLElement).dataset?.['column']);
      const left = Number.isInteger(column) ? column * 20 : 0;
      return { left, right: left + 18, width: 18, top: 0, bottom: 32, height: 32, x: left, y: 0 } as DOMRect;
    });
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('wr-heatmap-chart__column-label') ? nameWidth : 0;
    });
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    nameWidth = 30;
  });

  const render = async (): Promise<void> => {
    fixture = TestBed.createComponent(NamesHost);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('draws every name while each fits its own column', async () => {
    nameWidth = 12;
    await render();
    expect(drawn()).toHaveLength(7);
    expect(strip().classList).not.toContain('wr-heatmap-chart__column-labels--thinned');
    expect(strip().style.getPropertyValue('--wr-heatmap-chart-label-every')).toBe('');
  });

  it('draws every n-th name where they do not fit, and leaves out a last one with no room to the end', async () => {
    await render();
    // 30px names over a 20px pitch need two columns each: 00:00, 02:00, 04:00 — and 06:00,
    // the last column, has one column of room to the end, too little for it.
    expect(drawn()).toEqual(['00:00', '02:00', '04:00']);
    expect(strip().classList).toContain('wr-heatmap-chart__column-labels--thinned');
    expect(strip().style.getPropertyValue('--wr-heatmap-chart-label-every')).toBe('2');
  });

  it('keeps every name in the markup, so a screen reader still reads each one', async () => {
    await render();
    expect(names().map(name => name.textContent.trim())).toEqual([
      '00:00',
      '01:00',
      '02:00',
      '03:00',
      '04:00',
      '05:00',
      '06:00',
    ]);
    for (const name of names()) {
      expect(name.hasAttribute('aria-hidden')).toBe(false);
      expect(name.hasAttribute('hidden')).toBe(false);
    }
  });

  it('measures the names again when they change', async () => {
    await render();
    expect(drawn()).toHaveLength(3);

    nameWidth = 12;
    fixture.componentInstance.columns.set(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(drawn()).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
  });

  it('measures the names again when the chart is resized, and stops observing when destroyed', async () => {
    let report: ((entries: { contentRect: { width: number } }[]) => void) | null = null;
    let disconnected = false;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: typeof report) {
          report = callback;
        }
        observe(): void {
          // The strip is the one thing observed; the spec reports its width by hand.
        }
        disconnect(): void {
          disconnected = true;
        }
      }
    );
    nameWidth = 12;
    await render();
    expect(drawn()).toHaveLength(7);

    // Narrower now: the same names no longer fit their columns.
    nameWidth = 30;
    report!([{ contentRect: { width: 138 } }]);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(drawn()).toEqual(['00:00', '02:00', '04:00']);

    fixture.destroy();
    expect(disconnected).toBe(true);
  });

  it('draws every name where there is nothing to measure: no layout, or one column', async () => {
    rect.mockReturnValue({
      left: 0,
      right: 0,
      width: 0,
      top: 0,
      bottom: 0,
      height: 0,
      x: 0,
      y: 0,
    } as DOMRect);
    await render();
    expect(drawn()).toHaveLength(7);
  });
});

/**
 * What the stylesheet promises that no rendered DOM in jsdom can show, held against the
 * COMPILED sheet; `sass` is resolved through `@angular/build`, as `charts/stylesheets.spec.ts`
 * does. That each rule then paints what it says is measured in a browser.
 */
describe('WrHeatmapChart stylesheet', () => {
  const sass = createRequire(createRequire(import.meta.url).resolve('@angular/build/package.json'))('sass') as {
    compileString(source: string, options: { loadPaths: string[]; style: 'expanded' }): { css: string };
  };
  const css = sass
    .compileString(`@use 'charts/heatmap-chart/styles';`, {
      loadPaths: [join(process.cwd(), 'projects/lib')],
      style: 'expanded',
    })
    .css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = (selector: string): string =>
    new RegExp(`(?:^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';

  it('prints a value whole or not at all: a wrapping line led by a zero-width item as tall as the cell', () => {
    const cell = rule('.wr-heatmap-chart__cell');
    expect(cell).toMatch(/display: flex/);
    expect(cell).toMatch(/flex-wrap: wrap/);
    expect(cell).toMatch(/overflow: hidden/);
    expect(cell).toMatch(/block-size: var\(--wr-heatmap-chart-cell-height\)/);
    const before = rule('.wr-heatmap-chart__cell::before');
    expect(before).toMatch(/flex: 0 0 0/);
    expect(before).toMatch(/block-size: 100%/);
    // Never ellipsised: a value cut to its first digits would print another number.
    const value = rule('.wr-heatmap-chart__value');
    expect(value).toMatch(/flex: none/);
    expect(value).toMatch(/white-space: nowrap/);
    expect(value).not.toMatch(/text-overflow/);
  });

  it('picks black or white for a value by the luminance of its own cell, with nothing in between', () => {
    expect(rule('.wr-heatmap-chart__value')).toMatch(
      /color: color\(from color-mix\(in oklab, .*\) xyz-d65 calc\(0\.9505 \* clamp\(0, \(0\.17913 - y\) \* infinity, 1\)\) clamp\(0, \(0\.17913 - y\) \* infinity, 1\) calc\(1\.0891 \* clamp\(0, \(0\.17913 - y\) \* infinity, 1\)\)\)/
    );
    // √(1.05 × 0.05) − 0.05: the luminance both candidates score the same against.
    expect(Math.sqrt(1.05 * 0.05) - 0.05).toBeCloseTo(0.17913, 5);
  });

  it('mixes every level in OKLab from the colour toward the surface, the lowest keeping a share of it', () => {
    for (const selector of ['.wr-heatmap-chart__cell', '.wr-heatmap-chart__swatch']) {
      expect(rule(selector)).toMatch(
        /background: color-mix\(in oklab, var\(--wr-heatmap-chart-scale-color, var\(--wr-color-primary\)\) calc\(var\(--wr-heatmap-chart-min-share\) \+ \(100% - var\(--wr-heatmap-chart-min-share\)\) \* var\(--wr-heatmap-chart-level, 1\)\), var\(--wr-heatmap-chart-surface\)\)/
      );
      // The levels are the chart: forced colors would paint them as the page.
      expect(rule(selector)).toMatch(/forced-color-adjust: none/);
    }
  });

  it('hatches and outlines an empty cell AFTER every level, so it replaces the paint', () => {
    const empty = css.indexOf('.wr-heatmap-chart__cell--empty, .wr-heatmap-chart__swatch--empty {');
    expect(empty).toBeGreaterThan(css.indexOf('.wr-heatmap-chart__swatch {'));
    expect(empty).toBeGreaterThan(css.indexOf('.wr-heatmap-chart__cell {'));
    expect(css.slice(empty)).toMatch(/^[^}]*background: repeating-linear-gradient\(45deg/);
    expect(css.slice(empty)).toMatch(/^[^}]*outline: 1px dashed/);
    // The reading cell's ring comes later still, so an empty cell under the pointer is ringed.
    expect(css.indexOf('.wr-heatmap-chart__cell--active {')).toBeGreaterThan(empty);
  });

  it('positions every cell for good, so the ring under the pointer only raises one', () => {
    // A hover that switched a grid item to `position: relative` laid the whole grid out
    // again on every move: 5.6ms a move on a 100×100 matrix, against 1.8ms.
    expect(rule('.wr-heatmap-chart__cell')).toMatch(/position: relative/);
    expect(rule('.wr-heatmap-chart__cell')).toMatch(/z-index: 0/);
    const active = rule('.wr-heatmap-chart__cell--active');
    expect(active).toMatch(/z-index: 1/);
    expect(active).not.toMatch(/position/);
  });

  it('keeps the sign of a figure first on an RTL page', () => {
    // A figure has no strong character, so `-50` was laid out `50-` under `dir="rtl"`.
    expect(rule('.wr-heatmap-chart__value')).toMatch(/unicode-bidi: plaintext/);
    expect(rule('.wr-heatmap-chart__legend-label')).toMatch(/unicode-bidi: plaintext/);
  });

  it('keeps the empty cell and the ring in system colours under forced colors', () => {
    const forced = /@media \(forced-colors: active\)\s*\{([\s\S]*)\}\s*$/.exec(css)?.[1] ?? '';
    expect(forced).toMatch(/--wr-heatmap-chart-empty-border: CanvasText/);
    expect(forced).toMatch(/--wr-heatmap-chart-empty-hatch: GrayText/);
    expect(forced).toMatch(/outline-color: Highlight/);
  });

  it('falls back to a chip of the surface where relative colour syntax is missing, testing the declaration itself', () => {
    const fallback =
      /@supports not \(color: color\(from red xyz-d65 calc\(0\.9505 \* clamp\(0, \(0\.17913 - y\) \* infinity, 1\)\) clamp\(0, \(0\.17913 - y\) \* infinity, 1\) calc\(1\.0891 \* clamp\(0, \(0\.17913 - y\) \* infinity, 1\)\)\)\) \{\s*\.wr-heatmap-chart__value \{([^}]*)\}/.exec(
        css
      )?.[1] ?? '';
    expect(fallback).toMatch(/background: var\(--wr-heatmap-chart-surface\)/);
    expect(fallback).toMatch(/color: var\(--wr-heatmap-chart-color\)/);
  });

  it('writes the names in tabular figures, so names differing only in digits are one width', () => {
    expect(rule('.wr-heatmap-chart__column-labels, .wr-heatmap-chart__row-labels')).toMatch(
      /font-variant-numeric: tabular-nums/
    );
  });

  it("shrinks a name to its text, and lets a thinned one run to the next drawn name's column", () => {
    const name = rule('.wr-heatmap-chart__column-label');
    expect(name).toMatch(/justify-self: center/);
    expect(name).toMatch(/max-inline-size: 100%/);
    const thinned = rule('.wr-heatmap-chart__column-labels--thinned > .wr-heatmap-chart__column-label');
    expect(thinned).toMatch(/justify-self: start/);
    expect(thinned).toMatch(
      /max-inline-size: calc\(var\(--wr-heatmap-chart-label-every, 1\) \* 100% \+ \(var\(--wr-heatmap-chart-label-every, 1\) - 1\) \* var\(--wr-heatmap-chart-gap\)\)/
    );
    // Out of sight and nothing more: a screen reader still reads it.
    const hidden = rule('.wr-heatmap-chart__column-label--hidden');
    expect(hidden).toMatch(/clip-path: inset\(50%\)/);
    expect(hidden).not.toMatch(/display: none|visibility: hidden/);
    // And held to its own column: a clipped box still scrolls the page.
    const index = (selector: string): number => css.indexOf(`${selector} {`);
    const held = '.wr-heatmap-chart__column-labels--thinned > .wr-heatmap-chart__column-label--hidden';
    expect(rule(held)).toMatch(/max-inline-size: 100%/);
    expect(index(held)).toBeGreaterThan(
      index('.wr-heatmap-chart__column-labels--thinned > .wr-heatmap-chart__column-label')
    );
  });

  it('lays the names and the cells on one grid, the cells in a subgrid of its tracks', () => {
    expect(rule('.wr-heatmap-chart__cells')).toMatch(/grid-template-columns: subgrid;\s*grid-template-rows: subgrid/);
    expect(rule('.wr-heatmap-chart__column-labels')).toMatch(/grid-template-columns: subgrid/);
    expect(rule('.wr-heatmap-chart__row-labels')).toMatch(/grid-template-rows: subgrid/);
  });
});
