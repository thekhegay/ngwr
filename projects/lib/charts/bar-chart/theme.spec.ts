import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { WrChartLegendPosition } from 'ngwr/charts/chart-legend';
import { wrChartColor } from 'ngwr/charts/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { COMPILE_TIMEOUT, compileSass } from '../../spec-sass';

import { WrBarChart } from './bar-chart';
import type { WrBarChartDatum, WrBarLine, WrBarOrientation, WrBarSeries } from './types';

const DATA: readonly WrBarChartDatum[] = [
  { label: 'Mon', value: 12 },
  { label: 'Tue', value: 24 },
  { label: 'Wed', value: 6 },
];

@Component({
  imports: [WrBarChart],
  template: `
    <wr-bar-chart
      [data]="data()"
      [series]="series()"
      [categories]="categories()"
      [lines]="lines()"
      [stacked]="stacked()"
      [orientation]="orientation()"
      [max]="max()"
      [showGrid]="showGrid()"
      [showAxis]="showAxis()"
      [showValues]="showValues()"
      [showLegend]="showLegend()"
      [legendPosition]="legendPosition()"
      [toggleableLegend]="toggleable()"
      [loading]="loading()"
      [error]="error()"
      [emptyLabel]="emptyLabel()"
      [loadingLabel]="loadingLabel()"
      [errorLabel]="errorLabel()"
      [valueFormat]="valueFormat()"
      [dataTable]="dataTable()"
    />
  `,
})
class Host {
  readonly data = signal<readonly WrBarChartDatum[]>(DATA);
  readonly series = signal<readonly WrBarSeries[]>([]);
  readonly categories = signal<readonly string[]>(['Q1', 'Q2']);
  readonly lines = signal<readonly WrBarLine[]>([]);
  readonly stacked = signal(false);
  readonly orientation = signal<WrBarOrientation>('vertical');
  readonly max = signal(0);
  readonly showGrid = signal(true);
  readonly showAxis = signal(true);
  readonly showValues = signal(false);
  readonly showLegend = signal<boolean | 'auto'>('auto');
  readonly legendPosition = signal<WrChartLegendPosition>('bottom');
  readonly toggleable = signal(false);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly emptyLabel = signal<string | null>(null);
  readonly loadingLabel = signal<string | null>(null);
  readonly errorLabel = signal<string | null>(null);
  readonly valueFormat = signal<((value: number) => string) | null>(null);
  readonly dataTable = signal(false);
}

@Component({ imports: [WrBarChart], template: `<wr-bar-chart [data]="data" />` })
class DefaultHost {
  readonly data = DATA;
}

const SERIES: readonly WrBarSeries[] = [
  { label: 'North', data: [10, 30] },
  { label: 'South', data: [30, 10] },
  { label: 'West', data: [20, -10] },
];

/**
 * The chart on the shared chart theme: the grid, the value axis and the printed values as
 * inputs, the legend's position, the three states, and the DOM the bars are drawn with.
 * jsdom lays nothing out, so what is held here is the markup and the numbers handed to
 * the stylesheet; the rules themselves are read off the compiled sheet in the block after.
 */
describe('WrBarChart on the chart theme', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): Host => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const chart = (): HTMLElement => root().querySelector<HTMLElement>('wr-bar-chart')!;
  const all = <T extends Element = HTMLElement>(selector: string, from: ParentNode = root()): T[] => [
    ...from.querySelectorAll<T>(selector),
  ];
  const prop = (el: HTMLElement, name: string): string => el.style.getPropertyValue(`--wr-bar-chart-${name}`);
  const ticks = (): [string, string][] =>
    all('.wr-bar-chart__tick:not(.wr-bar-chart__tick--probe)').map(tick => [tick.textContent.trim(), prop(tick, 'at')]);
  const gridlines = (): string[] => all('.wr-bar-chart__grid-line').map(line => prop(line, 'at'));
  const shares = (): string[] => all('.wr-bar-chart__bar').map(bar => prop(bar, 'size'));
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

  describe('grid, axis and values', () => {
    it('draws a grid and a scale by default, and prints no value', () => {
      const plain = TestBed.createComponent(DefaultHost);
      plain.detectChanges();
      const el = plain.nativeElement as HTMLElement;

      expect(el.querySelectorAll('.wr-bar-chart__grid-line')).toHaveLength(4);
      expect(el.querySelectorAll('.wr-bar-chart__tick:not(.wr-bar-chart__tick--probe)')).toHaveLength(4);
      expect(el.querySelectorAll('.wr-bar-chart__value')).toHaveLength(0);
      expect(el.querySelector('wr-bar-chart')!.classList).toContain('wr-bar-chart--axis');
      plain.destroy();
    });

    it('snaps the axis to a round step, with a tick and a gridline at each', () => {
      // 6 to 24 on a step of 10: the axis runs from 0 to 30, and 24 is four fifths of it.
      expect(ticks()).toEqual([
        ['30', '1'],
        ['20', '0.6667'],
        ['10', '0.3333'],
        ['0', '0'],
      ]);
      expect(gridlines()).toEqual(['1', '0.6667', '0.3333', '0']);
      expect(shares()).toEqual(['0.4', '0.8', '0.2']);
    });

    it('ends the axis on the peak when the peak is already a tick, so the tallest bar reaches the top gridline', () => {
      set(h =>
        h.data.set([
          { label: 'Mon', value: 10 },
          { label: 'Tue', value: 20 },
        ])
      );

      expect(ticks().map(([text]) => text)).toEqual(['20', '15', '10', '5', '0']);
      expect(shares()).toEqual(['0.5', '1']);
    });

    it('keeps an explicit max as the top, with the ticks that fit under it', () => {
      set(h => h.max.set(45));

      // A step of 20 under 45: the top of the plot is 45 itself, and the last tick 40.
      expect(ticks()).toEqual([
        ['40', '0.8889'],
        ['20', '0.4444'],
        ['0', '0'],
      ]);
      expect(shares()).toEqual(['0.2667', '0.5333', '0.1333']);
    });

    it('takes the scale down to a snapped step below zero, with the zero line where zero falls', () => {
      set(h => {
        h.data.set([]);
        h.series.set([{ label: 'Net', data: [30, -10] }]);
      });

      expect(ticks().map(([text]) => text)).toEqual(['30', '20', '10', '0', '-10']);
      expect(prop(root().querySelector<HTMLElement>('.wr-bar-chart__track')!, 'zero')).toBe('0.25');
    });

    it('writes the scale compact, and through valueFormat when one is given', () => {
      set(h =>
        h.data.set([
          { label: 'Mon', value: 1200 },
          { label: 'Tue', value: 2400 },
        ])
      );
      expect(ticks().map(([text]) => text)).toEqual(['3K', '2K', '1K', '0']);

      set(h => h.valueFormat.set(value => `$${value}`));
      expect(ticks().map(([text]) => text)).toEqual(['$3000', '$2000', '$1000', '$0']);
    });

    it('sizes the gutter from hidden copies of the longest labels, and hides the scale from a reader', () => {
      const axis = root().querySelector<HTMLElement>('.wr-bar-chart__axis')!;
      expect(axis.getAttribute('aria-hidden')).toBe('true');
      expect(all('.wr-bar-chart__tick--probe').map(probe => probe.textContent.trim())).toEqual(['30', '20', '10']);
    });

    it('drops the grid and the scale each on its own', () => {
      set(h => h.showGrid.set(false));
      expect(all('.wr-bar-chart__grid')).toEqual([]);
      expect(ticks()).toHaveLength(4);
      // Still snapped: the scale is what the round numbers are for.
      expect(shares()).toEqual(['0.4', '0.8', '0.2']);

      set(h => {
        h.showGrid.set(true);
        h.showAxis.set(false);
      });
      expect(all('.wr-bar-chart__axis')).toEqual([]);
      expect(chart().classList).not.toContain('wr-bar-chart--axis');
      expect(gridlines()).toHaveLength(4);
      expect(shares()).toEqual(['0.4', '0.8', '0.2']);
    });

    it('fits the axis to the data once neither is drawn, so the longest bar is the whole of it', () => {
      set(h => {
        h.showGrid.set(false);
        h.showAxis.set(false);
      });

      expect(shares()).toEqual(['0.5', '1', '0.25']);
    });

    it('prints the values on request, each past the end of its bar', () => {
      set(h => h.showValues.set(true));

      const values = all('.wr-bar-chart__column > .wr-bar-chart__value');
      expect(values.map(value => [value.textContent.trim(), prop(value, 'at')])).toEqual([
        ['12', '0.4'],
        ['24', '0.8'],
        ['6', '0.2'],
      ]);
    });

    it('keeps the room for the values from the three longest, however many bars there are', () => {
      // Every distinct value used to get a hidden copy: 9,945 of them for 10,000 bars.
      set(h => {
        h.showValues.set(true);
        h.data.set(Array.from({ length: 60 }, (_, index) => ({ label: `d${index}`, value: index + 1 })));
      });

      expect(all('.wr-bar-chart__column > .wr-bar-chart__value')).toHaveLength(60);
      expect(all('.wr-bar-chart__room--max .wr-bar-chart__value').map(v => v.textContent.trim())).toEqual([
        '10',
        '11',
        '12',
      ]);
      expect(all('.wr-bar-chart__room--min .wr-bar-chart__value')).toEqual([]);
    });
  });

  describe('the bars', () => {
    beforeEach(() =>
      set(h => {
        h.data.set([]);
        h.series.set(SERIES);
      })
    );

    it('draws no svg per bar: a bar is one element in the side that clips it', () => {
      const bars = all('.wr-bar-chart__series-bar');
      expect(bars).toHaveLength(6);
      expect(all('svg', root().querySelector('.wr-bar-chart__track')!)).toEqual([]);
      for (const bar of bars) {
        expect(bar.childElementCount).toBe(0);
        expect(bar.parentElement!.classList).toContain('wr-bar-chart__side');
        expect(bar.parentElement!.parentElement!.classList).toContain('wr-bar-chart__lane');
      }
      // Six bars: six lanes, six sides and the bars themselves, where there were 24 nodes.
      expect(all('.wr-bar-chart__lane, .wr-bar-chart__side, .wr-bar-chart__series-bar')).toHaveLength(18);
    });

    it('paints each series solid in the next palette colour, and keys it for the hover', () => {
      const first = all('.wr-bar-chart__series-bar', all('.wr-bar-chart__category')[0]);
      expect(first.map(bar => prop(bar, 'color'))).toEqual([wrChartColor(0), wrChartColor(1), wrChartColor(2)]);
      expect(first.map(bar => bar.getAttribute('data-wr-series'))).toEqual(['0', '1', '2']);
      expect(wrChartColor(1)).toBe('var(--wr-chart-2)');
    });

    it('puts a bar below zero on the side under it', () => {
      const second = all('.wr-bar-chart__category')[1];
      expect(
        all('.wr-bar-chart__side', second).map(side => [
          side.classList.contains('wr-bar-chart__side--down'),
          side.firstElementChild!.getAttribute('aria-label'),
        ])
      ).toEqual([
        [false, 'North: 30'],
        [false, 'South: 10'],
        [true, 'West: -10'],
      ]);
    });

    it('piles a stack a side at a time, the bar nearest zero on top', () => {
      set(h => h.stacked.set(true));

      const sides = all('.wr-bar-chart__side', all('.wr-bar-chart__category')[0]);
      expect(sides).toHaveLength(1);
      // Each is drawn from zero to its own end, so the first lies over the ones past it.
      expect(all('.wr-bar-chart__series-bar', sides[0]).map(bar => bar.style.zIndex)).toEqual(['0', '-1', '-2']);
      // Three series a pile: one lane, one side and three bars, where there were ten nodes.
      expect(all('*', all('.wr-bar-chart__category')[0])).toHaveLength(5);

      set(h => h.stacked.set(false));
      expect(all('.wr-bar-chart__series-bar').every(bar => bar.style.zIndex === '')).toBe(true);
    });

    it('draws a line over the bars as one path, however many categories it runs through', () => {
      set(h => {
        h.categories.set(Array.from({ length: 50 }, (_, index) => `c${index}`));
        h.series.set([{ label: 'North', data: Array.from({ length: 50 }, (_, index) => index) }]);
        h.lines.set([{ label: 'Target', data: Array.from({ length: 50 }, () => 25) }]);
      });

      const line = root().querySelector('.wr-bar-chart__line')!;
      expect(all('.wr-bar-chart__line-segment', line)).toHaveLength(1);
      expect(all('line', line)).toEqual([]);
      expect(line.querySelector('.wr-bar-chart__line-segment')!.getAttribute('data-segments')).toBe('49');
      expect(all('.wr-bar-chart__point', line)).toHaveLength(50);
    });
  });

  describe('hover', () => {
    it('listens once for the whole chart, not on every bar', () => {
      const added = vi.spyOn(EventTarget.prototype, 'addEventListener');
      const plain = TestBed.createComponent(DefaultHost);
      plain.detectChanges();

      const pointer = added.mock.calls
        .map(([type], index) => [type, added.mock.contexts[index]] as const)
        .filter(([type]) => type.startsWith('mouse'));
      const el = (plain.nativeElement as HTMLElement).querySelector('wr-bar-chart');
      expect(pointer.map(([type]) => type).sort()).toEqual(['mouseleave', 'mouseover']);
      expect(pointer.every(([, target]) => target === el)).toBe(true);
      plain.destroy();
    });

    it('tags every column with its index, which the one listener reads', () => {
      expect(all('.wr-bar-chart__column').map(column => column.getAttribute('data-wr-index'))).toEqual(['0', '1', '2']);

      set(h => {
        h.data.set([]);
        h.series.set(SERIES);
      });
      expect(all('.wr-bar-chart__category').map(category => category.getAttribute('data-wr-index'))).toEqual([
        '0',
        '1',
      ]);
    });

    it('dims the other columns while the pointer is on one', () => {
      const columns = all('.wr-bar-chart__column');
      columns[1].querySelector('.wr-bar-chart__bar')!.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

      expect(chart().classList).toContain('wr-chart--dim');
      expect(columns.map(column => column.classList.contains('wr-chart-mark--on'))).toEqual([false, true, false]);

      chart().dispatchEvent(new MouseEvent('mouseleave'));
      expect(chart().classList).not.toContain('wr-chart--dim');
      expect(all('.wr-chart-mark--on')).toEqual([]);
    });

    it('dims every other series from a bar or from its legend row', () => {
      set(h => {
        h.data.set([]);
        h.series.set(SERIES);
      });
      const on = (): (string | null)[] => all('.wr-chart-mark--on').map(mark => mark.getAttribute('data-wr-series'));

      all('.wr-bar-chart__series-bar')[1].dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      // South's two bars and its legend row.
      expect(on()).toEqual(['1', '1', '1']);

      all('.wr-chart-legend__label')[2].dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      expect(on()).toEqual(['2', '2', '2']);
      expect(chart().classList).toContain('wr-chart--dim');
    });

    it('keys a line by its legend row, past the series', () => {
      set(h => {
        h.data.set([]);
        h.series.set(SERIES);
        h.lines.set([{ label: 'Target', data: [15, 15] }]);
      });

      expect(root().querySelector('.wr-bar-chart__line')!.getAttribute('data-wr-series')).toBe('3');
      expect(all('.wr-chart-legend__item').map(row => row.getAttribute('data-wr-series'))).toEqual([
        '0',
        '1',
        '2',
        '3',
      ]);
    });
  });

  describe('legend', () => {
    const legend = (): HTMLElement | null => root().querySelector('.wr-bar-chart__legend');
    const body = (): HTMLElement => root().querySelector<HTMLElement>('.wr-bar-chart__body')!;
    const before = (): boolean => legend()!.compareDocumentPosition(body()) === Node.DOCUMENT_POSITION_FOLLOWING;

    beforeEach(() =>
      set(h => {
        h.data.set([]);
        h.series.set(SERIES);
      })
    );

    it('sits below the plot by default, after it in the DOM', () => {
      expect(legend()!.classList).toContain('wr-chart-legend--bottom');
      expect(before()).toBe(false);
      expect(chart().classList).toContain('wr-chart--legend');
      expect(chart().classList).not.toContain('wr-chart--legend-side');
    });

    it.each([
      ['top', true, false],
      ['bottom', false, false],
      ['start', true, true],
      ['end', false, true],
    ] as const)('puts it at %s, in the DOM where it is on screen', (position, first, side) => {
      set(h => h.legendPosition.set(position));

      expect(legend()!.classList).toContain(`wr-chart-legend--${position}`);
      expect(before()).toBe(first);
      expect(chart().classList.contains('wr-chart--legend-side')).toBe(side);
      // The legend and the body are the host's own children, which the side layout needs.
      expect(legend()!.parentElement).toBe(chart());
      expect(body().parentElement).toBe(chart());
    });

    it('draws none at `none`, and still hides a series through the model', () => {
      set(h => h.legendPosition.set('none'));

      expect(legend()).toBeNull();
      expect(chart().classList).not.toContain('wr-chart--legend-side');
      expect(all('.wr-bar-chart__series-bar')).toHaveLength(6);
    });

    it('leaves a single series without a legend, unless asked for one', () => {
      set(h => h.series.set([SERIES[0]]));
      expect(legend()).toBeNull();

      set(h => h.showLegend.set(true));
      expect(all('.wr-chart-legend__label').map(label => label.textContent.trim())).toEqual(['North']);

      set(h => h.showLegend.set(false));
      expect(legend()).toBeNull();
    });

    it('keeps the legend for one series beside a line, which is something to tell apart', () => {
      set(h => {
        h.series.set([SERIES[0]]);
        h.lines.set([{ label: 'Target', data: [15, 15] }]);
      });

      expect(all('.wr-chart-legend__label').map(label => label.textContent.trim())).toEqual(['North', 'Target']);
    });
  });

  describe('empty, loading and error', () => {
    const state = (): HTMLElement | null => root().querySelector('wr-chart-state');
    const frame = (): number[] => [
      all('.wr-bar-chart__grid-line').length,
      all('.wr-bar-chart__tick:not(.wr-bar-chart__tick--probe)').length,
      all('.wr-bar-chart__baseline').length,
    ];

    it('shows nothing of the kind while there are bars to draw', () => {
      expect(state()).toBeNull();
    });

    it('keeps the frame and says "No data" when there is nothing to draw', () => {
      set(h => h.data.set([]));

      expect(state()!.textContent.trim()).toBe('No data');
      expect(state()!.classList).toContain('wr-chart-state--empty');
      expect(state()!.parentElement!.classList).toContain('wr-bar-chart__track');
      // The empty axis runs from 0 to 1 in quarters, as the line chart's empty frame does.
      expect(frame()).toEqual([5, 5, 1]);
      expect(root().querySelector<HTMLElement>('.wr-bar-chart__plot')!.style.height).toBe('200px');

      set(h => h.emptyLabel.set('No sales this week'));
      expect(state()!.textContent.trim()).toBe('No sales this week');
    });

    it('is empty for series with no category, and not for series that are all hidden', () => {
      set(h => {
        h.data.set([]);
        h.categories.set([]);
        h.series.set([{ label: 'North', data: [] }]);
      });
      expect(state()!.classList).toContain('wr-chart-state--empty');
    });

    it('gives the bars way to the loading message, over the axis the chart had', () => {
      set(h => h.loading.set(true));

      expect(state()!.textContent.trim()).toBe('Loading…');
      expect(state()!.classList).toContain('wr-chart-state--loading');
      expect(all('.wr-bar-chart__column')).toEqual([]);
      // The data's own axis, 0 to 30, stays under the message.
      expect(frame()).toEqual([4, 4, 1]);

      set(h => h.loadingLabel.set('Fetching sales'));
      expect(state()!.textContent.trim()).toBe('Fetching sales');

      set(h => h.loading.set(false));
      expect(state()).toBeNull();
      expect(all('.wr-bar-chart__column')).toHaveLength(3);
    });

    it('says a load failed, as an alert, and puts loading over it', () => {
      set(h => h.error.set(true));

      expect(state()!.textContent.trim()).toBe('Could not load');
      expect(state()!.getAttribute('role')).toBe('alert');
      expect(all('.wr-bar-chart__column')).toEqual([]);

      set(h => h.errorLabel.set('Sales are unavailable'));
      expect(state()!.textContent.trim()).toBe('Sales are unavailable');

      set(h => h.loading.set(true));
      expect(state()!.classList).toContain('wr-chart-state--loading');
    });

    it('draws no line and no data table under a state', () => {
      set(h => {
        h.lines.set([{ label: 'Target', data: [10, 10, 10] }]);
        h.dataTable.set(true);
      });
      expect(all('.wr-bar-chart__line')).toHaveLength(1);
      expect(all('.wr-chart-table')).toHaveLength(1);

      set(h => h.loading.set(true));
      expect(all('.wr-bar-chart__line')).toEqual([]);
      expect(all('.wr-chart-table')).toEqual([]);
    });
  });
});

/**
 * The category names under the bars are thinned against the row's own width, measured
 * through the charts' shared `ResizeObserver` and a few hidden copies of the longest
 * names. jsdom has neither a layout nor the observer, so both are stood in for here; that
 * the names printed do not collide is measured in a browser.
 */
describe('WrBarChart label thinning', () => {
  type Deliver = (entries: { target: Element; contentRect: { width: number; height: number } }[]) => void;

  class FakeObserver {
    static latest: FakeObserver | null = null;
    readonly targets: Element[] = [];

    readonly deliver: Deliver;

    constructor(deliver: Deliver) {
      this.deliver = deliver;
      FakeObserver.latest = this;
    }

    observe(target: Element): void {
      this.targets.push(target);
    }

    unobserve(): void {
      // Nothing to release: the case reads what was observed, never what was let go.
    }

    disconnect(): void {
      // As above.
    }
  }

  @Component({ imports: [WrBarChart], template: `<wr-bar-chart [data]="data()" />` })
  class LabelsHost {
    readonly data = signal<readonly WrBarChartDatum[]>(
      Array.from({ length: 10 }, (_, index) => ({ label: `Week ${index + 1}`, value: index + 1 }))
    );
  }

  const original = globalThis.ResizeObserver;

  afterEach(() => {
    globalThis.ResizeObserver = original;
    vi.restoreAllMocks();
  });

  it('measures a few of the longest names, never all of them', () => {
    TestBed.resetTestingModule();
    const fixture = TestBed.createComponent(LabelsHost);
    fixture.componentInstance.data.set(
      Array.from({ length: 120 }, (_, index) => ({ label: `Category ${index}`, value: index }))
    );
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelectorAll('.wr-bar-chart__label')).toHaveLength(120);
    expect([...el.querySelectorAll('.wr-bar-chart__label-probe')].map(probe => probe.textContent.trim())).toEqual([
      'Category 100',
      'Category 101',
      'Category 102',
    ]);
    // Every name is printed until the row is measured.
    expect(el.querySelectorAll('.wr-bar-chart__label--skipped')).toHaveLength(0);
    fixture.destroy();
  });

  it('prints every few names once the longest does not fit its band, each kept in its slot', () => {
    globalThis.ResizeObserver = FakeObserver as unknown as typeof ResizeObserver;
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      return this.classList.contains('wr-bar-chart__label-probe') ? new DOMRect(0, 0, 52, 16) : new DOMRect();
    });
    TestBed.resetTestingModule();
    const fixture = TestBed.createComponent(LabelsHost);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const row = el.querySelector('.wr-bar-chart__labels')!;
    const skipped = (): boolean[] =>
      [...el.querySelectorAll('.wr-bar-chart__label')].map(label =>
        label.classList.contains('wr-bar-chart__label--skipped')
      );

    expect(FakeObserver.latest!.targets).toEqual([row]);

    // Ten bands of 60px hold a 52px name and its 8px of room: every name is printed.
    FakeObserver.latest!.deliver([{ target: row, contentRect: { width: 600, height: 16 } }]);
    fixture.detectChanges();
    expect(skipped()).toEqual(Array.from({ length: 10 }, () => false));

    // Ten bands of 25px do not: one name in three, and the rest keep their slots.
    FakeObserver.latest!.deliver([{ target: row, contentRect: { width: 250, height: 16 } }]);
    fixture.detectChanges();
    expect(skipped()).toEqual([false, true, true, false, true, true, false, true, true, false]);
    expect(el.querySelectorAll('.wr-bar-chart__label--wide')).toHaveLength(10);
    expect(el.querySelectorAll('.wr-bar-chart__label')).toHaveLength(10);
    fixture.destroy();
  });
});

/**
 * What the bars promise that jsdom cannot show - no cascade, no transform, no layout -
 * held against the COMPILED sheet. That each rule then paints what it says is measured in
 * a browser.
 */
describe('WrBarChart stylesheet on the chart theme', { timeout: COMPILE_TIMEOUT }, () => {
  const css = (): string => compileSass(`@use 'charts/bar-chart/styles';`).replace(/\/\*[\s\S]*?\*\//g, '');
  /** A selector as a pattern: Sass prints a list on one line or one selector a line, by its own rule. */
  const pattern = (selector: string): string => selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/, /g, ',\\s*');
  const rule = (selector: string): string =>
    new RegExp(`(?:^|\\n)${pattern(selector)}\\s*\\{([^}]*)\\}`).exec(css())?.[1] ?? '';

  it('points every hook that paints the frame at the shared chart token', () => {
    const block = rule('.wr-bar-chart');
    expect(block).toMatch(/--wr-bar-chart-grid-color: var\(--wr-chart-grid\)/);
    expect(block).toMatch(/--wr-bar-chart-separator: var\(--wr-chart-separator\)/);
    expect(block).toMatch(/--wr-bar-chart-halo: var\(--wr-chart-separator\)/);
    expect(block).toMatch(/--wr-bar-chart-band: var\(--wr-chart-band\)/);
    expect(block).toMatch(/--wr-bar-chart-tick-color: var\(--wr-chart-label\)/);
    expect(block).toMatch(/--wr-bar-chart-tick-font-size: var\(--wr-chart-label-size\)/);
    expect(block).toMatch(/--wr-bar-chart-duration: var\(--wr-chart-duration\)/);
    expect(block).toMatch(
      /--wr-bar-chart-plot-gap: calc\(var\(--wr-chart-gap\) \/ var\(--wr-bar-chart-categories, 1\)\)/
    );
    expect(rule('.wr-bar-chart__plot')).toMatch(/--wr-bar-chart-plot-border: var\(--wr-chart-zero\)/);
    expect(rule('.wr-bar-chart__bar')).toMatch(/--wr-bar-chart-bar-radius: var\(--wr-chart-bar-radius\)/);
    expect(rule('.wr-bar-chart__series-bar')).toMatch(/--wr-bar-chart-bar-radius: var\(--wr-chart-bar-radius\)/);
    expect(rule('.wr-bar-chart__line')).toMatch(/--wr-bar-chart-line-width: var\(--wr-chart-stroke\)/);
    expect(rule('.wr-bar-chart__value')).toMatch(/--wr-bar-chart-value-color: var\(--wr-chart-label\)/);
  });

  it('draws the gridlines in the grid hook and the zero line in the stronger one', () => {
    expect(rule('.wr-bar-chart__grid-line')).toMatch(/border-bottom: 1px solid var\(--wr-bar-chart-grid-color\)/);
    expect(rule('.wr-bar-chart__baseline')).toMatch(/border-bottom: 1px solid var\(--wr-bar-chart-plot-border\)/);
  });

  it('rounds a bar on its value end only', () => {
    for (const bar of ['.wr-bar-chart__bar', '.wr-bar-chart__series-bar']) {
      const block = rule(bar);
      expect(block, bar).toMatch(/border-start-start-radius: var\(--wr-bar-chart-bar-radius\)/);
      expect(block, bar).toMatch(/border-start-end-radius: var\(--wr-bar-chart-bar-radius\)/);
      expect(block, bar).not.toMatch(/border-end-/);
      expect(block, bar).not.toMatch(/(?:^|\s)border-radius:/);
    }
    // Below zero the end is the lower one.
    const below = rule(
      '.wr-bar-chart__side--down > .wr-bar-chart__bar, .wr-bar-chart__side--down > .wr-bar-chart__series-bar'
    );
    expect(below).toMatch(/border-radius: 0/);
    expect(below).toMatch(/border-end-start-radius: var\(--wr-bar-chart-bar-radius\)/);
    expect(below).toMatch(/border-end-end-radius: var\(--wr-bar-chart-bar-radius\)/);
    // Lying down it is the inline end.
    const lying = rule(
      '.wr-bar-chart--horizontal .wr-bar-chart__bar, .wr-bar-chart--horizontal .wr-bar-chart__series-bar'
    );
    expect(lying).toMatch(/border-start-end-radius: var\(--wr-bar-chart-bar-radius\)/);
    expect(lying).toMatch(/border-end-end-radius: var\(--wr-bar-chart-bar-radius\)/);
  });

  it('parts the segments of a pile with a 1px line in the separator, and rounds only the outermost', () => {
    const inner = rule('.wr-bar-chart__side > .wr-bar-chart__series-bar:not(:last-child)');
    expect(inner).toMatch(/box-shadow: 0 -1px 0 0 var\(--wr-bar-chart-separator\)/);
    expect(inner).toMatch(/border-radius: 0/);
    expect(rule('.wr-bar-chart__side--down > .wr-bar-chart__series-bar:not(:last-child)')).toMatch(
      /box-shadow: 0 1px 0 0 var\(--wr-bar-chart-separator\)/
    );
    expect(rule('.wr-bar-chart--horizontal .wr-bar-chart__side > .wr-bar-chart__series-bar:not(:last-child)')).toMatch(
      /box-shadow: 1px 0 0 0 var\(--wr-bar-chart-separator\)/
    );
  });

  it('moves a bar by a transform inside the side that clips it, and transitions nothing a layout reads', () => {
    for (const bar of ['.wr-bar-chart__bar', '.wr-bar-chart__series-bar']) {
      const block = rule(bar);
      expect(block, bar).toMatch(/position: absolute/);
      expect(block, bar).toMatch(/inset: 0/);
      expect(block, bar).toMatch(
        /transform: translateY\(calc\(\(1 - \(var\(--wr-bar-chart-start, 0\) \+ var\(--wr-bar-chart-size, 0\)/
      );
      const transition = /transition:([^;]*);/.exec(block)?.[1] ?? '';
      expect(transition.split(',').map(part => part.trim().split(' ')[0])).toEqual(['transform', 'opacity']);
    }
    expect(rule('.wr-bar-chart__side')).toMatch(/overflow: clip/);
    expect(rule('.wr-bar-chart__side')).toMatch(/isolation: isolate/);

    // No rule of the chart transitions a property that takes a layout pass.
    const transitions = [...css().matchAll(/transition:([^;]*);/g)].map(match => match[1]);
    expect(transitions.length).toBeGreaterThan(0);
    for (const value of transitions) {
      expect(value).not.toMatch(/\b(height|width|flex-grow|top|bottom|inset[a-z-]*|inline-size|block-size)\b/);
    }
  });

  it('mirrors the transform by hand lying down, since a transform is physical', () => {
    const bars = '.wr-bar-chart--horizontal .wr-bar-chart__bar, .wr-bar-chart--horizontal .wr-bar-chart__series-bar';
    expect(rule(bars)).toMatch(/transform: translateX\(calc\(\(\(var\(--wr-bar-chart-start, 0\)/);
    expect(rule(bars.replace(/bar(,|$)/g, 'bar:dir(rtl)$1'))).toMatch(
      /transform: translateX\(calc\(\(1 - \(var\(--wr-bar-chart-start, 0\)/
    );
  });

  it('paints a series bar solid by default, and keeps the tint and the edge as hooks', () => {
    const block = rule('.wr-bar-chart__series-bar');
    expect(block).toMatch(/--wr-bar-chart-series-tint: 100%/);
    expect(block).toMatch(/--wr-bar-chart-series-edge-width: 0px/);
    expect(block).toMatch(/outline: var\(--wr-bar-chart-series-edge-width\) solid/);
    expect(block).toMatch(/forced-color-adjust: none/);
  });

  it('bands the category under the pointer, and lands at once under reduced motion', () => {
    expect(rule('.wr-bar-chart__category:hover, .wr-bar-chart__column:hover')).toMatch(
      /background-color: var\(--wr-bar-chart-band\)/
    );
    expect(css()).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{\s*\.wr-bar-chart__bar,\s*\.wr-bar-chart__series-bar,\s*\.wr-bar-chart__category,\s*\.wr-bar-chart__column \{\s*transition: none;/
    );
  });

  it("keeps room for the top of the scale, and the legend its room through the chart's own hook", () => {
    expect(rule('.wr-bar-chart--axis:not(.wr-bar-chart--horizontal) .wr-bar-chart__body')).toMatch(
      /padding-block-start: calc\(var\(--wr-bar-chart-tick-font-size\) \/ 2\)/
    );
    expect(rule('.wr-bar-chart__legend')).toMatch(
      /--wr-chart-legend-space: var\(--wr-bar-chart-legend-margin-bottom\)/
    );
  });
});
