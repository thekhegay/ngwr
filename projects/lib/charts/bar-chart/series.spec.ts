import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { CHART_DASHES, chartColor } from 'ngwr/charts/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrBarChart } from './bar-chart';
import type { WrBarChartDatum, WrBarSeries } from './types';

const CATEGORIES = ['Q1', 'Q2', 'Q3'];

const SERIES: readonly WrBarSeries[] = [
  { label: 'North', data: [10, 20, 5] },
  { label: 'South', data: [30, 10, 15], color: '#123456' },
];

@Component({
  imports: [WrBarChart],
  template: `
    <wr-bar-chart
      [series]="series()"
      [categories]="categories()"
      [data]="data()"
      [stacked]="stacked()"
      [max]="max()"
      [showValues]="showValues()"
      [showLegend]="showLegend()"
      [toggleableLegend]="toggleable()"
      [dataTable]="dataTable()"
      [ariaLabel]="ariaLabel()"
      [(hiddenSeries)]="hidden"
    />
  `,
})
class Host {
  readonly series = signal<readonly WrBarSeries[]>(SERIES);
  readonly categories = signal<readonly string[]>(CATEGORIES);
  readonly data = signal<readonly WrBarChartDatum[]>([]);
  readonly stacked = signal(false);
  readonly max = signal(0);
  readonly showValues = signal(true);
  readonly showLegend = signal(true);
  readonly toggleable = signal(false);
  readonly dataTable = signal(false);
  readonly ariaLabel = signal<string | null>(null);
  readonly hidden = signal<readonly number[]>([]);
}

/**
 * Every position is a share of the value axis from its minimum, written inline as a
 * custom property, which jsdom reports verbatim — so the geometry is checkable without
 * layout. A bar is read as `[start, size]`.
 */
describe('WrBarChart series', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): Host => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const chart = (): HTMLElement => root().querySelector<HTMLElement>('wr-bar-chart')!;
  const all = <T extends Element = HTMLElement>(selector: string, from: ParentNode = root()): T[] => [
    ...from.querySelectorAll<T>(selector),
  ];
  const categories = (): HTMLElement[] => all('.wr-bar-chart__category');
  const bars = (from: ParentNode = root()): HTMLElement[] => all('.wr-bar-chart__series-bar', from);
  const prop = (el: HTMLElement, name: string): string => el.style.getPropertyValue(`--wr-bar-chart-${name}`);
  const geometry = (from: ParentNode = root()): [number, number][] =>
    bars(from).map(bar => [Number(prop(bar, 'start')), Number(prop(bar, 'size'))]);
  const names = (from: ParentNode = root()): (string | null)[] => bars(from).map(bar => bar.getAttribute('aria-label'));
  const printed = (): string[] => all('.wr-bar-chart__lane > .wr-bar-chart__value').map(v => v.textContent.trim());
  const set = (change: (h: Host) => void): void => {
    change(host());
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('draws a group per category with a bar per series, side by side in series order', () => {
    expect(categories().map(c => c.getAttribute('aria-label'))).toEqual(['Q1', 'Q2', 'Q3']);
    expect(categories().map(c => all('.wr-bar-chart__lane', c).length)).toEqual([2, 2, 2]);
    expect(names(categories()[0])).toEqual(['North: 10', 'South: 30']);
    // Scaled against the tallest bar, from zero at the bottom.
    expect(geometry(categories()[0])).toEqual([
      [0, 0.3333],
      [0, 1],
    ]);
    expect(all('.wr-bar-chart__label').map(l => l.textContent.trim())).toEqual(['Q1', 'Q2', 'Q3']);
  });

  it('marks the host as drawing series, and leaves the single-series markup out', () => {
    expect(chart().classList).toContain('wr-bar-chart--series');
    expect(chart().classList).not.toContain('wr-bar-chart--stacked');
    expect(all('.wr-bar-chart__column')).toEqual([]);
    expect(all('.wr-bar-chart__bar')).toEqual([]);
  });

  it('names the plot, each category and each bar, and nests nothing under an img', () => {
    const plot = root().querySelector<HTMLElement>('.wr-bar-chart__plot')!;
    expect([plot.getAttribute('role'), plot.getAttribute('aria-label')]).toEqual(['group', 'Bar chart']);
    for (const category of categories()) expect(category.getAttribute('role')).toBe('group');
    for (const bar of bars()) {
      expect(bar.getAttribute('role')).toBe('img');
      expect(bar.parentElement!.closest('[role="img"]')).toBeNull();
    }
    // The printed values and the label row are decoration: the names carry every value.
    // (A stacked pile's total is the exception, and announces itself — see `stacked`.)
    for (const value of all('.wr-bar-chart__lane > .wr-bar-chart__value')) {
      expect(value.getAttribute('aria-hidden')).toBe('true');
    }
    expect(root().querySelector('.wr-bar-chart__labels')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('gives each series its colour and its own dash, the first one solid', () => {
    const [north, south] = bars(categories()[0]);
    expect(prop(north, 'color')).toBe(chartColor(0));
    expect(prop(south, 'color')).toBe('#123456');
    const edge = (bar: HTMLElement, attr: string): string | null =>
      bar.querySelector('.wr-bar-chart__edge rect')!.getAttribute(attr);
    expect([edge(north, 'stroke-dasharray'), edge(south, 'stroke-dasharray')]).toEqual([null, CHART_DASHES[1]]);
    // The outline is the series' colour itself; the body is a tint of it.
    expect([edge(north, 'stroke'), edge(south, 'stroke')]).toEqual([chartColor(0), '#123456']);
  });

  it('prints each bar its own value past its end', () => {
    expect(printed()).toEqual(['10', '30', '20', '10', '5', '15']);
    const ends = all('.wr-bar-chart__lane > .wr-bar-chart__value').map(v => Number(prop(v, 'at')));
    expect(ends.slice(0, 2)).toEqual([0.3333, 1]);
  });

  it('keeps a room past each end of the axis, from a copy of each value printed there', () => {
    const room = (end: 'max' | 'min'): string[] =>
      all(`.wr-bar-chart__room--${end} .wr-bar-chart__value`).map(v => v.textContent.trim());
    // Each text once: the room is as large as the largest, so a repeat adds nothing.
    expect(room('max')).toEqual(['10', '30', '20', '5', '15']);
    expect(room('min')).toEqual([]);
    for (const el of all('.wr-bar-chart__room')) expect(el.getAttribute('aria-hidden')).toBe('true');

    set(h => h.showValues.set(false));
    expect(printed()).toEqual([]);
    expect(all('.wr-bar-chart__room')).toEqual([]);
    // The values are still in the names.
    expect(names(categories()[0])).toEqual(['North: 10', 'South: 30']);
  });

  it('draws a negative value below a zero line that moves up to meet it', () => {
    set(h => h.series.set([{ label: 'Net', data: [30, -10, 0] }]));

    // The axis runs from -10 to 30, so zero is a quarter of the way up.
    expect(
      root().querySelector<HTMLElement>('.wr-bar-chart__track')!.style.getPropertyValue('--wr-bar-chart-zero')
    ).toBe('0.25');
    expect(geometry()).toEqual([
      [0.25, 0.75],
      [0, 0.25],
      [0.25, 0],
    ]);
    const values = all('.wr-bar-chart__lane > .wr-bar-chart__value');
    expect(values.map(v => v.classList.contains('wr-bar-chart__value--below'))).toEqual([false, true, false]);
    expect(all('.wr-bar-chart__room--min .wr-bar-chart__value').map(v => v.textContent.trim())).toEqual(['-10']);
  });

  it('leaves a missing value an empty lane, so the bars beside it keep their places', () => {
    set(h =>
      h.series.set([
        { label: 'A', data: [10, null, Number.NaN] },
        { label: 'B', data: [5] },
      ])
    );

    expect(categories().map(c => all('.wr-bar-chart__lane', c).length)).toEqual([2, 2, 2]);
    expect(categories().map(c => names(c))).toEqual([['A: 10', 'B: 5'], [], []]);
    expect(root().textContent).not.toContain('NaN');
  });

  it('names a category past the end of `categories` by its position', () => {
    set(h => h.categories.set(['Q1']));
    expect(categories().map(c => c.getAttribute('aria-label'))).toEqual(['Q1', '1', '2']);
  });

  it('holds the positive end to an explicit max and still fits the negative end', () => {
    set(h => {
      h.series.set([{ label: 'Net', data: [20, -20, 60] }]);
      h.max.set(40);
    });

    // -20 to 40: zero a third of the way up, and 60 drawn to the edge.
    expect(geometry()).toEqual([
      [0.3333, 0.3333],
      [0, 0.3333],
      [0.3333, 0.6667],
    ]);
    // Its own figure is still what it announces.
    expect(names()[2]).toBe('Net: 60');
  });

  describe('stacked', () => {
    beforeEach(() => set(h => h.stacked.set(true)));

    it('piles every series into one lane per category, in series order', () => {
      expect(chart().classList).toContain('wr-bar-chart--stacked');
      expect(categories().map(c => all('.wr-bar-chart__lane', c).length)).toEqual([1, 1, 1]);
      // Q1 piles 10 + 30 = 40, the tallest pile, so 10 covers a quarter and 30 the rest.
      expect(geometry(categories()[0])).toEqual([
        [0, 0.25],
        [0.25, 0.75],
      ]);
      expect(geometry(categories()[2])).toEqual([
        [0, 0.125],
        [0.125, 0.375],
      ]);
    });

    it("keeps each series' own value in its name and prints the pile's total", () => {
      expect(names(categories()[0])).toEqual(['North: 10', 'South: 30']);
      expect(printed()).toEqual(['40', '30', '20']);
    });

    it('announces each printed total, which no bar name carries, with the whole figure', () => {
      set(h =>
        h.series.set([
          { label: 'Sales', data: [1200.5, 4] },
          { label: 'Refunds', data: [-300, null] },
        ])
      );

      const totals = all('.wr-bar-chart__lane > .wr-bar-chart__value');
      // Printed compact, announced whole, as a bar's own label and name are.
      expect(totals.map(t => [t.textContent.trim(), t.getAttribute('role'), t.getAttribute('aria-label')])).toEqual([
        ['1.2K', 'img', 'Total: 1,200.5'],
        ['-300', 'img', 'Total: -300'],
        ['4', 'img', 'Total: 4'],
      ]);
      for (const total of totals) {
        expect(total.hasAttribute('aria-hidden')).toBe(false);
        expect(total.closest('.wr-bar-chart__category')!.getAttribute('role')).toBe('group');
      }

      // In step with what is printed: no value on screen, no total announced.
      set(h => h.showValues.set(false));
      expect(all('[role="img"]').filter(el => el.classList.contains('wr-bar-chart__value'))).toEqual([]);
    });

    it('stacks positive values up and negative values down from zero, each sign on its own', () => {
      set(h =>
        h.series.set([
          { label: 'A', data: [10] },
          { label: 'B', data: [-5] },
          { label: 'C', data: [10] },
          { label: 'D', data: [-15] },
        ])
      );

      // The axis runs from -20 to 20; zero is half way. A sits on zero, C on A; B hangs
      // from zero and D from B — no band crosses another.
      expect(geometry()).toEqual([
        [0.5, 0.25],
        [0.375, 0.125],
        [0.75, 0.25],
        [0, 0.375],
      ]);
      expect(names()).toEqual(['A: 10', 'B: -5', 'C: 10', 'D: -15']);
      // One total for each sign, past the end of its own pile.
      expect(printed()).toEqual(['20', '-20']);
      const values = all('.wr-bar-chart__lane > .wr-bar-chart__value');
      expect(values.map(v => [Number(prop(v, 'at')), v.classList.contains('wr-bar-chart__value--below')])).toEqual([
        [1, false],
        [0, true],
      ]);
    });

    it('adds nothing for a missing value', () => {
      set(h =>
        h.series.set([
          { label: 'A', data: [10, 10] },
          { label: 'B', data: [null, 10] },
          { label: 'C', data: [10, 10] },
        ])
      );

      expect(geometry(categories()[0])).toEqual([
        [0, 0.3333],
        [0.3333, 0.3333],
      ]);
      expect(printed()).toEqual(['20', '30']);
    });
  });

  describe('legend and hidden series', () => {
    const legend = (): HTMLElement | null => root().querySelector('.wr-bar-chart__legend');
    const rows = (): string[] => all('.wr-chart-legend__label').map(l => l.textContent.trim());

    it('keys every series by its dash in a legend above the plot', () => {
      expect(legend()!.matches('ul[wr-chart-legend]')).toBe(true);
      expect(rows()).toEqual(['North', 'South']);
      const lines = all<SVGLineElement>('.wr-chart-legend__swatch--line line');
      expect(lines.map(l => l.getAttribute('stroke-dasharray'))).toEqual([null, CHART_DASHES[1]]);
      expect(legend()!.compareDocumentPosition(root().querySelector('.wr-bar-chart__plot')!)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING
      );

      set(h => h.showLegend.set(false));
      expect(legend()).toBeNull();
    });

    it('takes a hidden series out of the lanes, the stack and the scale, and keeps its legend row', () => {
      set(h => h.hidden.set([1]));

      expect(categories().map(c => all('.wr-bar-chart__lane', c).length)).toEqual([1, 1, 1]);
      expect(names()).toEqual(['North: 10', 'North: 20', 'North: 5']);
      // Refitted to North alone: 20 is now the tallest.
      expect(geometry().map(([, size]) => size)).toEqual([0.5, 1, 0.25]);
      expect(rows()).toEqual(['North', 'South']);
      expect(all('.wr-chart-legend__item--hidden')).toHaveLength(1);
    });

    it('shows and hides a series from a toggleable legend, through hiddenSeries', () => {
      set(h => h.toggleable.set(true));

      const toggles = all<HTMLButtonElement>('.wr-chart-legend__toggle');
      expect(toggles.map(t => t.getAttribute('aria-pressed'))).toEqual(['true', 'true']);

      toggles[0].click();
      fixture.detectChanges();

      expect(host().hidden()).toEqual([0]);
      expect(names()).toEqual(['South: 30', 'South: 10', 'South: 15']);
    });
  });

  describe('data table', () => {
    const table = (): HTMLTableElement | null => root().querySelector('.wr-chart-table table');
    const cells = (): string[][] =>
      all('.wr-chart-table tbody tr').map(row => all('th, td', row).map(cell => cell.textContent.trim()));

    it('renders nothing until asked for', () => {
      expect(table()).toBeNull();
    });

    it('tabulates a row per category and a column per series shown, beside the plot', () => {
      set(h => {
        h.dataTable.set(true);
        h.ariaLabel.set('Sales by region');
        h.series.set([
          { label: 'North', data: [1234.5, null] },
          { label: 'South', data: [3, 4] },
        ]);
        h.categories.set(['Q1', 'Q2']);
      });

      expect(table()!.querySelector('caption')!.textContent.trim()).toBe('Sales by region');
      expect(all('.wr-chart-table thead th').map(th => th.textContent.trim())).toEqual(['North', 'South']);
      expect(cells()).toEqual([
        ['Q1', '1,234.5', '3'],
        ['Q2', '', '4'],
      ]);
      expect(root().querySelector('.wr-chart-table')!.closest('.wr-bar-chart__plot')).toBeNull();

      set(h => h.hidden.set([0]));
      expect(all('.wr-chart-table thead th').map(th => th.textContent.trim())).toEqual(['South']);
    });

    it("keeps each series' own value when stacked", () => {
      set(h => {
        h.dataTable.set(true);
        h.stacked.set(true);
      });
      expect(cells()[0]).toEqual(['Q1', '10', '30']);
    });
  });

  describe('beside data', () => {
    it('draws series and warns once in dev mode when both are set', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      set(h => h.data.set([{ label: 'Mon', value: 1 }]));
      set(h => h.data.set([{ label: 'Tue', value: 2 }]));

      expect(categories()).toHaveLength(3);
      expect(all('.wr-bar-chart__column')).toEqual([]);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('both `data` and `series`');
      warn.mockRestore();
    });

    it('falls back to the single-series markup when series empties', () => {
      set(h => {
        h.series.set([]);
        h.data.set([{ label: 'Mon', value: 1 }]);
      });

      expect(chart().classList).not.toContain('wr-bar-chart--series');
      expect(all('.wr-bar-chart__column')).toHaveLength(1);
      expect(categories()).toEqual([]);
      expect(root().querySelector('.wr-bar-chart__legend')).toBeNull();
    });
  });
});

@Component({
  imports: [WrBarChart],
  template: `<wr-bar-chart [series]="series" [categories]="categories" [valueFormat]="format()" />`,
})
class TooltipHost {
  readonly series: readonly WrBarSeries[] = [
    { label: 'North', data: [1234.5, null] },
    { label: 'South', data: [3, null] },
  ];
  readonly categories = ['Q1', 'Q2'];
  readonly format = signal<((value: number) => string) | null>(null);
}

/** The chip renders into a CDK overlay, so it is read off `document`. */
describe('WrBarChart series tooltip', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TooltipHost>>;

  const categories = (): HTMLElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.wr-bar-chart__category'),
  ];
  const chip = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-chart-tooltip');
  const hover = (el: HTMLElement): void => {
    el.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(TooltipHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it("heads the chip with the category and gives a row to each series' whole figure", () => {
    hover(categories()[0]);

    expect(chip()!.querySelector('.wr-chart-tooltip__label')!.textContent.trim()).toBe('Q1');
    const rows = [...chip()!.querySelectorAll('.wr-chart-tooltip__row')].map(row => [
      row.querySelector('.wr-chart-tooltip__row-label')!.textContent.trim(),
      row.querySelector('.wr-chart-tooltip__row-value')!.textContent.trim(),
      row.querySelector<HTMLElement>('.wr-chart-tooltip__row-swatch')!.style.background,
    ]);
    expect(rows).toEqual([
      ['North', '1,234.5', chartColor(0)],
      ['South', '3', chartColor(1)],
    ]);
  });

  it('writes the rows through valueFormat', () => {
    fixture.componentInstance.format.set(v => `$${v.toFixed(2)}`);
    fixture.detectChanges();
    hover(categories()[0]);

    expect(chip()!.querySelector('.wr-chart-tooltip__row-value')!.textContent.trim()).toBe('$1234.50');
  });

  it('opens nothing over a category no series has a value in', () => {
    hover(categories()[1]);
    expect(chip()).toBeNull();
  });
});
