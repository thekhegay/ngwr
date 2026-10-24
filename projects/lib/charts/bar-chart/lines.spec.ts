import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { chartColor, chartDash, chartMarker, chartMarkerExtent } from 'ngwr/charts/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrBarChart } from './bar-chart';
import type { WrBarChartDatum, WrBarChartLine, WrBarChartOrientation, WrBarSeries } from './types';

const CATEGORIES = ['Q1', 'Q2', 'Q3'];

const SERIES: readonly WrBarSeries[] = [
  { label: 'North', data: [10, 20, 5] },
  { label: 'South', data: [30, 10, 15] },
];

const TARGET: WrBarChartLine = { label: 'Target', data: [15, 15, 15] };

const DATA: readonly WrBarChartDatum[] = [
  { label: 'Mon', value: 10 },
  { label: 'Tue', value: 20 },
  { label: 'Wed', value: 40 },
];

@Component({
  imports: [WrBarChart],
  template: `
    <wr-bar-chart
      [series]="series()"
      [categories]="categories()"
      [data]="data()"
      [lines]="lines()"
      [stacked]="stacked()"
      [orientation]="orientation()"
      [max]="max()"
      [toggleableLegend]="toggleable()"
      [dataTable]="dataTable()"
      [(hiddenSeries)]="hiddenSeries"
      [(hiddenLines)]="hiddenLines"
    />
  `,
})
class Host {
  readonly series = signal<readonly WrBarSeries[]>(SERIES);
  readonly categories = signal<readonly string[]>(CATEGORIES);
  readonly data = signal<readonly WrBarChartDatum[]>([]);
  readonly lines = signal<readonly WrBarChartLine[]>([TARGET]);
  readonly stacked = signal(false);
  readonly orientation = signal<WrBarChartOrientation>('vertical');
  readonly max = signal(0);
  readonly toggleable = signal(false);
  readonly dataTable = signal(false);
  readonly hiddenSeries = signal<readonly number[]>([]);
  readonly hiddenLines = signal<readonly number[]>([]);
}

/**
 * Every position of a line is a percentage of the line's own box, written as an SVG
 * attribute, and every bar's is a share of the value axis written inline — both of which
 * jsdom reports verbatim, so the two can be held against each other without layout.
 */
describe('WrBarChart lines', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): Host => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const chart = (): HTMLElement => root().querySelector<HTMLElement>('wr-bar-chart')!;
  const all = <T extends Element = HTMLElement>(selector: string, from: ParentNode = root()): T[] => [
    ...from.querySelectorAll<T>(selector),
  ];
  const lines = (): SVGSVGElement[] => all<SVGSVGElement>('.wr-bar-chart__line');
  const points = (from: ParentNode = root()): SVGSVGElement[] => all<SVGSVGElement>('.wr-bar-chart__point', from);
  const segments = (from: ParentNode = root()): SVGLineElement[] =>
    all<SVGLineElement>('.wr-bar-chart__line-segment', from);
  /** A point's place in its line's box, as the two percentages written on it. */
  const xy = (point: Element): [number, number] => [
    Number.parseFloat(point.getAttribute('x')!),
    Number.parseFloat(point.getAttribute('y')!),
  ];
  const names = (from: ParentNode = root()): (string | null)[] => points(from).map(p => p.getAttribute('aria-label'));
  const prop = (el: HTMLElement, name: string): string => el.style.getPropertyValue(`--wr-bar-chart-${name}`);
  const seriesBars = (): [number, number][] =>
    all('.wr-bar-chart__series-bar').map(bar => [Number(prop(bar, 'start')), Number(prop(bar, 'size'))]);
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

  describe('with series', () => {
    it('draws each line as a named group over the bars, with a named image per point', () => {
      expect(chart().classList).toContain('wr-bar-chart--combo');
      expect(lines()).toHaveLength(1);
      const [line] = lines();
      expect([line.getAttribute('role'), line.getAttribute('aria-label')]).toEqual(['group', 'Target']);
      expect(line.closest('.wr-bar-chart__track')).not.toBeNull();
      // After every category, so a reader meets the bars first and the line is drawn over them.
      const track = line.parentElement!;
      expect([...track.children].indexOf(line)).toBeGreaterThan(
        [...track.children].indexOf(all('.wr-bar-chart__category').at(-1)!)
      );

      expect(points().map(p => p.getAttribute('role'))).toEqual(['img', 'img', 'img']);
      expect(names()).toEqual(['Q1: 15', 'Q2: 15', 'Q3: 15']);
      for (const point of points()) expect(point.parentElement!.closest('[role="img"]')).toBeNull();
      // The runs are decoration: the points carry every value.
      expect(segments().every(s => !s.hasAttribute('role') && !s.hasAttribute('aria-label'))).toBe(true);
    });

    it('places a point at the middle of each category, along its line box, on the bars’ own axis', () => {
      // The box runs from the first category's middle to the last's, so three categories
      // sit at 0, 50 and 100% of it; the axis tops out at the tallest bar, 30.
      expect(points().map(xy)).toEqual([
        [0, 50],
        [50, 50],
        [100, 50],
      ]);
      expect(lines()[0].style.getPropertyValue('--wr-bar-chart-count')).toBe('3');
      expect(segments().map(s => [s.getAttribute('x1'), s.getAttribute('y1'), s.getAttribute('x2')])).toEqual([
        ['0%', '50%', '50%'],
        ['50%', '50%', '100%'],
      ]);
    });

    it('fits the value axis to the bars and the lines together', () => {
      set(h => h.lines.set([{ label: 'Target', data: [60, 30, 45] }]));

      // 60 tops the axis now, so the tallest bar (30) reaches half of it.
      expect(seriesBars()[1]).toEqual([0, 0.5]);
      expect(points().map(xy)).toEqual([
        [0, 0],
        [50, 50],
        [100, 25],
      ]);
    });

    it('brings the zero line up for a line below zero, and the bars stand on it', () => {
      set(h => h.lines.set([{ label: 'Margin', data: [-10, 5, 0] }]));

      // From -10 to 30: zero is a quarter of the way up.
      const track = root().querySelector<HTMLElement>('.wr-bar-chart__track')!;
      expect(prop(track, 'zero')).toBe('0.25');
      expect(seriesBars()[0]).toEqual([0.25, 0.25]);
      expect(xy(points()[0])).toEqual([0, 100]);
    });

    it('fits the axis to the piles under stacked, and never stacks a line', () => {
      set(h => {
        h.stacked.set(true);
        h.lines.set([{ label: 'Target', data: [20, 20, 20] }]);
      });

      // The piles are 40, 30 and 20; the line stays at its own 20, half the axis.
      expect(names()).toEqual(['Q1: 20', 'Q2: 20', 'Q3: 20']);
      expect(points().map(p => xy(p)[1])).toEqual([50, 50, 50]);
    });

    it('holds a point past a fixed max to the edge, and still names its own figure', () => {
      set(h => {
        h.max.set(20);
        h.lines.set([{ label: 'Target', data: [40, 10, 20] }]);
      });

      expect(points().map(p => xy(p)[1])).toEqual([0, 50, 0]);
      expect(names()[0]).toBe('Q1: 40');
    });

    it('takes the palette past the series, the next dash and the next marker, first solid and a circle', () => {
      set(h =>
        h.lines.set([
          { label: 'Target', data: [15, 15, 15] },
          { label: 'Rate', data: [5, 6, 7], color: '#123456' },
        ])
      );

      const [target, rate] = lines();
      expect(segments(target).map(s => [s.getAttribute('stroke'), s.getAttribute('stroke-dasharray')])).toEqual([
        [chartColor(2), null],
        [chartColor(2), null],
      ]);
      expect(segments(rate)[0].getAttribute('stroke')).toBe('#123456');
      expect(segments(rate)[0].getAttribute('stroke-dasharray')).toBe(chartDash(1));
      expect(points(target).map(p => p.getAttribute('data-marker'))).toEqual([
        chartMarker(0),
        chartMarker(0),
        chartMarker(0),
      ]);
      expect(points(rate)[0].getAttribute('data-marker')).toBe(chartMarker(1));
      expect(points(rate)[0].querySelector('path')!.getAttribute('fill')).toBe('#123456');
    });

    it('breaks the line at a missing value, and keeps a lone value as a point', () => {
      set(h => h.lines.set([{ label: 'Target', data: [15, null, 12, Number.NaN] }]));

      expect(names()).toEqual(['Q1: 15', 'Q3: 12']);
      expect(segments()).toEqual([]);

      set(h => h.lines.set([{ label: 'Target', data: [15, 20, null] }]));
      expect(segments()).toHaveLength(1);
    });

    it('draws nothing past the last category: the categories belong to the bars', () => {
      set(h => h.lines.set([{ label: 'Target', data: [1, 2, 3, 4, 5] }]));

      expect(names()).toEqual(['Q1: 1', 'Q2: 2', 'Q3: 3']);
      expect(all('.wr-bar-chart__category')).toHaveLength(3);
    });

    it('puts a single category’s point in the middle of its box', () => {
      set(h => {
        h.categories.set(['Q1']);
        h.series.set([{ label: 'North', data: [10] }]);
        h.lines.set([{ label: 'Target', data: [5] }]);
      });

      expect(points().map(xy)).toEqual([[50, 50]]);
      expect(segments()).toEqual([]);
    });

    it('lies down with the bars: across is the value axis, down the rows the categories', () => {
      set(h => h.orientation.set('horizontal'));

      expect(points().map(xy)).toEqual([
        [50, 0],
        [50, 50],
        [50, 100],
      ]);
    });

    it('leaves the markup of a chart without lines exactly as it was', () => {
      set(h => h.lines.set([]));

      expect(chart().classList).not.toContain('wr-bar-chart--combo');
      expect(lines()).toEqual([]);
      expect(all('.wr-chart-legend__label').map(l => l.textContent.trim())).toEqual(['North', 'South']);
    });
  });

  describe('beside data', () => {
    beforeEach(() =>
      set(h => {
        h.series.set([]);
        h.data.set(DATA);
        h.lines.set([{ label: 'Target', data: [20, 20, 20] }]);
      })
    );

    const columns = (): HTMLElement[] => all('.wr-bar-chart__column');
    const share = (column: HTMLElement): number =>
      Number.parseFloat(column.querySelector<HTMLElement>('.wr-bar-chart__bar')!.style.flexGrow);

    it('moves the columns into the track the lines are drawn over', () => {
      expect(chart().classList).toContain('wr-bar-chart--combo');
      expect(chart().classList).not.toContain('wr-bar-chart--series');
      expect(columns()).toHaveLength(3);
      for (const column of columns()) expect(column.closest('.wr-bar-chart__track')).not.toBeNull();
      expect(columns().map(c => c.getAttribute('aria-label'))).toEqual(['Mon: 10', 'Tue: 20', 'Wed: 40']);
      expect(names()).toEqual(['Mon: 20', 'Tue: 20', 'Wed: 20']);
    });

    it('fits the axis to the bars and the line, and raises the top for a line above every bar', () => {
      expect(columns().map(share)).toEqual([0.25, 0.5, 1]);

      set(h => h.lines.set([{ label: 'Target', data: [80, 20, 20] }]));
      expect(columns().map(share)).toEqual([0.125, 0.25, 0.5]);
      expect(xy(points()[0])[1]).toBe(0);
    });

    it('stands the bars on a zero a line below it has brought up, with their values past their ends', () => {
      set(h => h.lines.set([{ label: 'Change', data: [-40, 0, 10] }]));

      // From -40 to 40: zero is halfway up, and the tallest bar reaches the top.
      const track = root().querySelector<HTMLElement>('.wr-bar-chart__track')!;
      expect(prop(track, 'zero')).toBe('0.5');
      expect(columns().map(share)).toEqual([0.125, 0.25, 0.5]);
      const values = columns().map(c => Number(prop(c.querySelector<HTMLElement>('.wr-bar-chart__value')!, 'at')));
      expect(values).toEqual([0.625, 0.75, 1]);
    });

    it('takes the palette’s second colour, past the one the bars are painted in', () => {
      expect(segments()[0].getAttribute('stroke')).toBe(chartColor(1));
    });

    it('lists the lines alone in the legend, keyed by dash and marker', () => {
      expect(all('.wr-chart-legend__label').map(l => l.textContent.trim())).toEqual(['Target']);
      const swatch = root().querySelector('.wr-chart-legend__swatch--line')!;
      expect(swatch.getAttribute('data-marker')).toBe('circle');
      expect(swatch.querySelector('path')).not.toBeNull();
    });

    it('keeps its layout when every line is hidden, so a toggle never reflows the bars', () => {
      set(h => h.hiddenLines.set([0]));

      expect(lines()).toEqual([]);
      expect(columns()[0].closest('.wr-bar-chart__track')).not.toBeNull();
      expect(columns().map(share)).toEqual([0.25, 0.5, 1]);
    });

    describe('below zero', () => {
      const value = (column: HTMLElement): HTMLElement => column.querySelector<HTMLElement>('.wr-bar-chart__value')!;
      const bar = (column: HTMLElement): HTMLElement => column.querySelector<HTMLElement>('.wr-bar-chart__bar')!;
      const room = (end: 'max' | 'min'): string[] =>
        all(`.wr-bar-chart__room--${end} .wr-bar-chart__value`).map(v => v.textContent.trim());

      beforeEach(() =>
        set(h => {
          h.data.set([
            { label: 'A', value: -10 },
            { label: 'B', value: 20 },
            { label: 'C', value: 8 },
          ]);
          h.lines.set([{ label: 'L', data: [-5, 15, -12] }]);
        })
      );

      it('draws a negative bar down from zero, on the axis the line shares, rather than empty on zero', () => {
        // From -12 to 20: zero is 12/32 of the way up. The -10 bar hangs from zero to
        // 2/32, under the line's -5 point at 7/32, where an empty bar read as 0 above it.
        const track = root().querySelector<HTMLElement>('.wr-bar-chart__track')!;
        expect(prop(track, 'zero')).toBe('0.375');
        expect(columns().map(share)).toEqual([0.3125, 0.625, 0.25]);
        expect(columns().map(c => prop(c, 'start'))).toEqual(['0.0625', '0.375', '0.375']);
        expect(columns().map(c => bar(c).classList.contains('wr-bar-chart__bar--below'))).toEqual([true, false, false]);
        const pointShare = 1 - xy(points()[0])[1] / 100;
        expect(pointShare).toBeGreaterThan(0.0625);
        expect(pointShare).toBeLessThan(0.375);
        expect(columns()[0].getAttribute('aria-label')).toBe('A: -10');
      });

      it('prints a negative bar’s value past its lower end, and keeps the room under the track for it', () => {
        expect(columns().map(c => value(c).classList.contains('wr-bar-chart__value--below'))).toEqual([
          true,
          false,
          false,
        ]);
        expect(columns().map(c => prop(value(c), 'at'))).toEqual(['0.0625', '1', '0.625']);
        expect(room('min')).toEqual(['-10']);
        expect(room('max')).toEqual(['20', '8']);
      });

      it('keeps a negative bar below zero while every line is hidden, as the layout is kept', () => {
        set(h => h.hiddenLines.set([0]));

        // From -10 to 20 now: the line's -12 has left the axis, the bar's -10 has not.
        expect(prop(root().querySelector<HTMLElement>('.wr-bar-chart__track')!, 'zero')).toBe('0.3333');
        expect(bar(columns()[0]).classList).toContain('wr-bar-chart__bar--below');
      });

      it('leaves a chart without lines drawing a negative value as an empty bar on zero', () => {
        set(h => h.lines.set([]));

        expect(chart().classList).not.toContain('wr-bar-chart--combo');
        expect(columns().map(share)).toEqual([0, 1, 0.4]);
        expect(columns().map(c => c.style.getPropertyValue('--wr-bar-chart-start'))).toEqual(['', '', '']);
        expect(all('.wr-bar-chart__bar--below, .wr-bar-chart__value--below')).toEqual([]);
      });
    });

    it('tabulates a column for the bars, then one per line shown', () => {
      set(h => {
        h.dataTable.set(true);
        h.lines.set([{ label: 'Target', data: [15, null, 12.5] }]);
      });

      const table = (): string[][] =>
        all('.wr-chart-table tbody tr').map(row => all('th, td', row).map(cell => cell.textContent.trim()));
      expect(all('.wr-chart-table thead th').map(th => th.textContent.trim())).toEqual(['Value', 'Target']);
      expect(table()).toEqual([
        ['Mon', '10', '15'],
        ['Tue', '20', ''],
        ['Wed', '40', '12.5'],
      ]);

      set(h => h.hiddenLines.set([0]));
      expect(all('.wr-chart-table thead th').map(th => th.textContent.trim())).toEqual(['Value']);
    });

    it('tracks the hidden room copies by position, so live data does not re-create them with a warning', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      set(h => h.data.set(DATA.map(d => ({ ...d, value: d.value + 1 }))));
      set(h => h.data.set(DATA.map(d => ({ ...d, value: d.value + 2 }))));

      expect(warn.mock.calls.filter(call => String(call[0]).includes('NG0956'))).toEqual([]);
      warn.mockRestore();
    });
  });

  describe('room for the markers', () => {
    const reach = (): string => chart().style.getPropertyValue('--wr-bar-chart-reach');
    const along = (shape: Parameters<typeof chartMarkerExtent>[0]): number => {
      const extent = chartMarkerExtent(shape, 4);
      return Math.round(Math.max(extent.top, extent.bottom) * 1000) / 1000;
    };

    it('writes how far the largest marker reaches along the value axis, by shape', () => {
      expect(reach()).toBe('4');

      set(h =>
        h.lines.set([
          { label: 'A', data: [1, 2, 3] },
          { label: 'B', data: [1, 2, 3] },
          { label: 'C', data: [1, 2, 3] },
        ])
      );
      // A triangle's point stands further off its centre than a circle's edge.
      expect(Number(reach())).toBe(along('triangle'));
      expect(Number(reach())).toBeGreaterThan(4);
    });

    it('counts a hidden line, so a legend toggle never reflows the bars', () => {
      set(h => {
        h.lines.set([
          { label: 'A', data: [1, 2, 3] },
          { label: 'B', data: [1, 2, 3] },
          { label: 'C', data: [1, 2, 3] },
        ]);
        h.hiddenLines.set([2]);
      });

      expect(Number(reach())).toBe(along('triangle'));
    });

    it('reads sideways lying down, and writes nothing without lines', () => {
      set(h => {
        h.orientation.set('horizontal');
        h.lines.set([
          { label: 'A', data: [1, 2, 3] },
          { label: 'B', data: [1, 2, 3] },
          { label: 'C', data: [1, 2, 3] },
        ]);
      });
      expect(Number(reach())).toBe(Math.round(chartMarkerExtent('triangle', 4).side * 1000) / 1000);

      set(h => h.lines.set([]));
      expect(reach()).toBe('');
    });
  });

  describe('legend, hidden lines and the table', () => {
    const rows = (): string[] => all('.wr-chart-legend__label').map(l => l.textContent.trim());

    it('lists the series and then the lines, each line keyed by its dash and its marker', () => {
      expect(rows()).toEqual(['North', 'South', 'Target']);
      const swatches = all('.wr-chart-legend__swatch');
      expect(swatches.map(s => s.getAttribute('data-marker'))).toEqual([null, null, 'circle']);
    });

    it('hides a line from a toggleable legend through hiddenLines, and leaves hiddenSeries alone', () => {
      set(h => h.toggleable.set(true));
      const toggles = all<HTMLButtonElement>('.wr-chart-legend__toggle');
      expect(toggles).toHaveLength(3);

      toggles[2].click();
      fixture.detectChanges();
      expect(host().hiddenLines()).toEqual([0]);
      expect(host().hiddenSeries()).toEqual([]);
      expect(lines()).toEqual([]);
      expect(toggles[2].getAttribute('aria-pressed')).toBe('false');

      toggles[0].click();
      fixture.detectChanges();
      expect(host().hiddenSeries()).toEqual([0]);
      expect(host().hiddenLines()).toEqual([0]);

      toggles[2].click();
      fixture.detectChanges();
      expect(host().hiddenLines()).toEqual([]);
      expect(lines()).toHaveLength(1);
    });

    it('keeps a hidden series past the end of series out of the lines’ rows, and keeps it', () => {
      set(h => {
        h.toggleable.set(true);
        h.hiddenSeries.set([2]);
      });

      // Position 2 would be the line's row; it names a series that is not there.
      expect(lines()).toHaveLength(1);
      expect(all('.wr-chart-legend__item--hidden')).toEqual([]);

      all<HTMLButtonElement>('.wr-chart-legend__toggle')[2].click();
      fixture.detectChanges();
      expect(host().hiddenSeries()).toEqual([2]);
      expect(host().hiddenLines()).toEqual([0]);
    });

    it('fits the axis to the lines still shown', () => {
      set(h => h.lines.set([{ label: 'Target', data: [60, 60, 60] }]));
      expect(seriesBars()[1]).toEqual([0, 0.5]);

      set(h => h.hiddenLines.set([0]));
      expect(seriesBars()[1]).toEqual([0, 1]);
      expect(all('.wr-chart-legend__item--hidden')).toHaveLength(1);
    });

    it('gives each line shown a column after the series in the data table', () => {
      set(h => {
        h.dataTable.set(true);
        h.lines.set([{ label: 'Target', data: [15, null, 12.5] }]);
      });

      const table = (): string[][] =>
        all('.wr-chart-table tbody tr').map(row => all('th, td', row).map(cell => cell.textContent.trim()));
      expect(all('.wr-chart-table thead th').map(th => th.textContent.trim())).toEqual(['North', 'South', 'Target']);
      expect(table()).toEqual([
        ['Q1', '10', '30', '15'],
        ['Q2', '20', '10', ''],
        ['Q3', '5', '15', '12.5'],
      ]);

      set(h => h.hiddenLines.set([0]));
      expect(all('.wr-chart-table thead th').map(th => th.textContent.trim())).toEqual(['North', 'South']);
    });
  });
});

@Component({
  imports: [WrBarChart],
  template: `<wr-bar-chart [series]="series()" [data]="data()" [categories]="categories" [lines]="lines" />`,
})
class TooltipHost {
  readonly series = signal<readonly WrBarSeries[]>([
    { label: 'North', data: [1234.5, null] },
    { label: 'South', data: [3, null] },
  ]);
  readonly data = signal<readonly WrBarChartDatum[]>([]);
  readonly categories = ['Q1', 'Q2'];
  readonly lines: readonly WrBarChartLine[] = [{ label: 'Target', data: [2000, 7] }];
}

/** The chip renders into a CDK overlay, so it is read off `document`. */
describe('WrBarChart lines tooltip', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TooltipHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const chip = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-chart-tooltip');
  const rows = (): string[][] =>
    [...chip()!.querySelectorAll('.wr-chart-tooltip__row')].map(row => [
      row.querySelector('.wr-chart-tooltip__row-label')!.textContent.trim(),
      row.querySelector('.wr-chart-tooltip__row-value')!.textContent.trim(),
    ]);
  const hover = (el: Element): void => {
    el.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(TooltipHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('gives each line a row after the series', () => {
    hover(root().querySelectorAll('.wr-bar-chart__category')[0]);

    expect(rows()).toEqual([
      ['North', '1,234.5'],
      ['South', '3'],
      ['Target', '2,000'],
    ]);
  });

  it('opens over a category only a line has a value in', () => {
    hover(root().querySelectorAll('.wr-bar-chart__category')[1]);

    expect(chip()!.querySelector('.wr-chart-tooltip__label')!.textContent.trim()).toBe('Q2');
    expect(rows()).toEqual([['Target', '7']]);
  });

  it('keeps the bar as the heading beside data, over the lines’ rows', () => {
    fixture.componentInstance.series.set([]);
    fixture.componentInstance.data.set([
      { label: 'Mon', value: 12 },
      { label: 'Tue', value: 18 },
    ]);
    fixture.detectChanges();
    hover(root().querySelectorAll('.wr-bar-chart__column')[0]);

    expect(chip()!.querySelector('.wr-chart-tooltip__label')!.textContent.trim()).toBe('Mon');
    expect(chip()!.querySelector('.wr-chart-tooltip__value')!.textContent.trim()).toBe('12');
    expect(rows()).toEqual([['Target', '2,000']]);
  });
});
