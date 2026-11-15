import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { COMPILE_TIMEOUT, compileSass } from '../../spec-sass';

import { WrCandlestickChart } from './candlestick-chart';
import { wrCandlestickDigits, wrCandlestickMerge, wrCandlestickPer } from './internal/merge';
import type { WrCandlestickDatum } from './types';

/** Four days over 95..110: an axis from 90 to 115 in fives, four slots of a quarter each. */
const DATA: readonly WrCandlestickDatum[] = [
  { label: 'Mon', open: 100, high: 110, low: 95, close: 105 },
  { label: 'Tue', open: 105, high: 108, low: 98, close: 100 },
  { label: 'Wed', open: 100, high: 104, low: 96, close: 102 },
  { label: 'Thu', open: 102, high: 106, low: 100, close: 102 },
];

/** `count` periods of a wandering price, each its own label: deterministic, with one high and one low that stand out. */
const many = (count: number): WrCandlestickDatum[] =>
  Array.from({ length: count }, (_, i) => {
    const open = 100 + 10 * Math.sin(i / 40) + (i % 7);
    const close = open + ((i % 5) - 2);
    const spike = i === Math.floor(count / 3) ? 50 : 0;
    const dip = i === Math.floor((2 * count) / 3) ? 50 : 0;
    return {
      label: `D${i + 1}`,
      open,
      high: Math.max(open, close) + 1 + spike,
      low: Math.min(open, close) - 1 - dip,
      close,
    };
  });

@Component({
  imports: [WrCandlestickChart],
  template: `
    <wr-candlestick-chart
      [data]="data()"
      [showGrid]="showGrid()"
      [showAxis]="showAxis()"
      [hollow]="hollow()"
      [decimate]="decimate()"
      [loading]="loading()"
      [error]="error()"
      [emptyLabel]="emptyLabel()"
      [loadingLabel]="loadingLabel()"
      [errorLabel]="errorLabel()"
      [dataTable]="dataTable()"
    />
  `,
})
class Host {
  readonly data = signal<readonly WrCandlestickDatum[]>(DATA);
  readonly showGrid = signal(true);
  readonly showAxis = signal(true);
  readonly hollow = signal(false);
  readonly decimate = signal(true);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly emptyLabel = signal<string | null>(null);
  readonly loadingLabel = signal<string | null>(null);
  readonly errorLabel = signal<string | null>(null);
  readonly dataTable = signal(false);
}

@Component({ imports: [WrCandlestickChart], template: `<wr-candlestick-chart [data]="data" />` })
class DefaultHost {
  readonly data = DATA;
}

/**
 * The chart on the shared chart theme: the grid and the scale as two inputs, solid bodies
 * with `hollow` on request, the three states, merged candles past two a pixel, and one
 * measurement per pointer move. jsdom lays nothing out, so what is held here is the
 * markup and the numbers handed to the stylesheet; the rules are read off the compiled
 * sheet in the last block.
 */
describe('WrCandlestickChart on the chart theme', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): Host => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const chart = (): HTMLElement => root().querySelector<HTMLElement>('wr-candlestick-chart')!;
  const all = <T extends Element = HTMLElement>(selector: string): T[] => [...root().querySelectorAll<T>(selector)];
  const texts = (selector: string): string[] => all(selector).map(element => element.textContent.trim());
  const plot = (): HTMLElement => root().querySelector<HTMLElement>('.wr-candlestick-chart__plot')!;
  const drawing = (): HTMLElement => root().querySelector<HTMLElement>('.wr-candlestick-chart__drawing')!;
  const candles = (): HTMLElement[] => all('.wr-candlestick-chart__candle');
  const figures = (): number[][] => candles().map(candle => candle.getAttribute('data-candle')!.split(' ').map(Number));
  const chip = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-chart-tooltip');
  const chipTexts = (selector: string): string[] =>
    [...(chip()?.querySelectorAll(selector) ?? [])].map(element => element.textContent.trim());
  const set = (change: (h: Host) => void): void => {
    change(host());
    fixture.detectChanges();
  };
  const moveTo = (clientX: number, clientY = 100): void => {
    plot().dispatchEvent(new MouseEvent('mousemove', { clientX, clientY, bubbles: true }));
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

  describe('grid, axis and zero line', () => {
    it('draws the grid and the scale by default', () => {
      const plain = TestBed.createComponent(DefaultHost);
      plain.detectChanges();
      const el = plain.nativeElement as HTMLElement;

      expect(el.querySelectorAll('.wr-candlestick-chart__grid-line')).toHaveLength(6);
      expect(el.querySelectorAll('.wr-candlestick-chart__y-tick')).toHaveLength(6);
      expect(el.querySelector('wr-candlestick-chart')!.classList).toContain('wr-candlestick-chart--axis');
      plain.destroy();
    });

    it('drops the grid and the scale each on its own', () => {
      set(h => h.showGrid.set(false));
      expect(all('.wr-candlestick-chart__grid-line')).toEqual([]);
      expect(texts('.wr-candlestick-chart__y-tick')).toEqual(['115', '110', '105', '100', '95', '90']);

      set(h => {
        h.showGrid.set(true);
        h.showAxis.set(false);
      });
      expect(all('.wr-candlestick-chart__grid-line')).toHaveLength(6);
      expect(root().querySelector('.wr-candlestick-chart__y-axis')).toBeNull();
      expect(chart().classList).not.toContain('wr-candlestick-chart--axis');

      set(h => h.showGrid.set(false));
      expect(all('.wr-candlestick-chart__grid-line')).toEqual([]);
      // The period labels are the time axis, and the candles the chart: both stay.
      expect(texts('.wr-candlestick-chart__x-label')).toEqual(['Mon', 'Tue', 'Wed', 'Thu']);
      expect(candles()).toHaveLength(4);
    });

    it('marks the gridline at zero, and no other', () => {
      expect(all('.wr-candlestick-chart__grid-line--zero')).toEqual([]);

      // A spread that crosses zero: the axis runs through it.
      set(h =>
        h.data.set([
          { label: 'Mon', open: -2, high: 4, low: -4, close: 2 },
          { label: 'Tue', open: 2, high: 3, low: -3, close: -1 },
        ])
      );
      const lines = all('.wr-candlestick-chart__grid-line');
      const zero = all('.wr-candlestick-chart__grid-line--zero');
      expect(zero).toHaveLength(1);
      expect(texts('.wr-candlestick-chart__y-tick')[lines.indexOf(zero[0])]).toBe('0');
    });
  });

  describe('bodies', () => {
    it('draws both directions solid by default, and a rising body hollow on request', () => {
      expect(chart().classList).not.toContain('wr-candlestick-chart--hollow');

      set(h => h.hollow.set(true));
      expect(chart().classList).toContain('wr-candlestick-chart--hollow');
      // The direction is the candle's own modifier either way.
      expect(candles().map(candle => candle.classList[1])).toEqual([
        'wr-candlestick-chart__candle--increase',
        'wr-candlestick-chart__candle--decrease',
        'wr-candlestick-chart__candle--increase',
        'wr-candlestick-chart__candle--increase',
      ]);
    });

    it('writes one attribute for the figures a harness reads, and none per price', () => {
      expect(figures()).toEqual([
        [0, 100, 110, 95, 105],
        [1, 105, 108, 98, 100],
        [2, 100, 104, 96, 102],
        [3, 102, 106, 100, 102],
      ]);
      for (const candle of candles()) {
        expect(candle.getAttributeNames().sort()).toEqual(['class', 'data-candle', 'style']);
        expect(candle.classList).toHaveLength(2);
      }
    });
  });

  describe('empty, loading and error', () => {
    const state = (): HTMLElement | null => root().querySelector('wr-chart-state');
    const frame = (): number[] => [
      all('.wr-candlestick-chart__grid-line').length,
      all('.wr-candlestick-chart__y-tick').length,
    ];

    it('shows nothing of the kind while there are candles to draw', () => {
      expect(state()).toBeNull();
    });

    it('keeps the frame and says "No data" with nothing to draw', () => {
      set(h => h.data.set([]));

      expect(state()!.textContent.trim()).toBe('No data');
      expect(state()!.classList).toContain('wr-chart-state--empty');
      // Beside the plot, never inside it: the plot is an `img`.
      expect(state()!.parentElement!.classList).toContain('wr-candlestick-chart__body');
      expect(plot().contains(state())).toBe(false);
      // The empty axis runs from 0 to 1 in quarters.
      expect(frame()).toEqual([5, 5]);
      expect(plot().style.height).toBe('240px');

      set(h => h.emptyLabel.set('No trades today'));
      expect(state()!.textContent.trim()).toBe('No trades today');
    });

    it('is empty with periods and no candle among them, and keeps their data table', () => {
      set(h => {
        h.dataTable.set(true);
        h.data.set([{ label: 'Gap', open: Number.NaN, high: 3, low: 1, close: 2 }]);
      });

      expect(state()!.classList).toContain('wr-chart-state--empty');
      expect(texts('.wr-chart-table tbody td')).toEqual(['', '3', '1', '2']);
    });

    it('gives the candles way to the loading message, over the axis the chart had', () => {
      set(h => {
        h.dataTable.set(true);
        h.loading.set(true);
      });

      expect(state()!.textContent.trim()).toBe('Loading…');
      expect(state()!.classList).toContain('wr-chart-state--loading');
      expect(candles()).toEqual([]);
      expect(all('.wr-chart-table')).toEqual([]);
      // The data's own axis, 90 to 115, stays under the message, and so do the period labels.
      expect(frame()).toEqual([6, 6]);
      expect(texts('.wr-candlestick-chart__x-label')).toEqual(['Mon', 'Tue', 'Wed', 'Thu']);

      set(h => h.loadingLabel.set('Fetching prices'));
      expect(state()!.textContent.trim()).toBe('Fetching prices');

      set(h => h.loading.set(false));
      expect(state()).toBeNull();
      expect(candles()).toHaveLength(4);
      expect(all('.wr-chart-table')).toHaveLength(1);
    });

    it('says a load failed, as an alert, and puts loading over it', () => {
      set(h => h.error.set(true));

      expect(state()!.textContent.trim()).toBe('Could not load');
      expect(state()!.getAttribute('role')).toBe('alert');
      expect(candles()).toEqual([]);

      set(h => h.errorLabel.set('Prices are unavailable'));
      expect(state()!.textContent.trim()).toBe('Prices are unavailable');

      set(h => h.loading.set(true));
      expect(state()!.classList).toContain('wr-chart-state--loading');
    });

    it('opens no tooltip under a state', () => {
      drawing().getBoundingClientRect = () => new DOMRect(0, 0, 400, 200);
      set(h => h.loading.set(true));
      moveTo(150);

      expect(chip()).toBeNull();
      expect(root().querySelector('.wr-candlestick-chart__cursor')).toBeNull();
    });
  });

  describe('many periods', () => {
    /** 1500 periods on the assumed 560px drawing: past two a pixel, so six to a candle. */
    const LONG = many(1500);

    it('draws a candle per period up to two a pixel', () => {
      set(h => h.data.set(many(1120)));
      expect(candles()).toHaveLength(1120);
    });

    it('merges the periods past that, to one candle for every two pixels at the most', () => {
      set(h => h.data.set(LONG));

      expect(candles()).toHaveLength(250);
      expect(candles().length).toBeLessThanOrEqual(560 / 2);
      // Each stands for six periods: its slot's share is six of them.
      expect(drawing().style.getPropertyValue('--wr-candlestick-chart-slot')).toBe('0.4');
      expect(figures().map(([index]) => index)).toEqual(Array.from({ length: 250 }, (_, i) => i * 6));
      // Centred on the periods it stands for.
      expect(candles()[0].style.left).toBe('0.2%');
      expect(candles()[249].style.left).toBe('99.8%');
    });

    it('keeps the highest high, the lowest low, the first open and the last close', () => {
      set(h => h.data.set(LONG));
      const drawn = figures();

      expect(Math.max(...drawn.map(([, , high]) => high))).toBe(Math.max(...LONG.map(d => d.high)));
      expect(Math.min(...drawn.map(([, , , low]) => low))).toBe(Math.min(...LONG.map(d => d.low)));
      expect(drawn[0][1]).toBe(LONG[0].open);
      expect(drawn[249][4]).toBe(LONG[1499].close);

      // So the axis is the one the whole data fits.
      const merged = texts('.wr-candlestick-chart__y-tick');
      set(h => h.decimate.set(false));
      expect(texts('.wr-candlestick-chart__y-tick')).toEqual(merged);
    });

    it('draws every period with `decimate` off', () => {
      set(h => {
        h.decimate.set(false);
        h.data.set(LONG);
      });

      expect(candles()).toHaveLength(1500);
      expect(drawing().style.getPropertyValue('--wr-candlestick-chart-slot')).toBe('0.067');
    });

    it('still reads the period under the pointer, and bands the candle it is merged into', () => {
      set(h => h.data.set(LONG));
      drawing().getBoundingClientRect = () => new DOMRect(0, 0, 1500, 200);
      plot().getBoundingClientRect = () => new DOMRect(0, 0, 1500, 200);
      // One px a period on this box: the 778th.
      moveTo(777.5);

      const period = LONG[777];
      expect(chipTexts('.wr-chart-tooltip__label')).toEqual(['D778']);
      expect(chipTexts('.wr-chart-tooltip__row-value').map(text => Number(text.replace(/,/g, '')))).toEqual(
        [period.open, period.high, period.low, period.close].map(price => Math.round(price * 1e10) / 1e10)
      );
      // Periods 774 to 779 share a candle: the band starts at the first of them.
      expect(root().querySelector<HTMLElement>('.wr-candlestick-chart__cursor')!.style.left).toBe('51.6%');
    });

    it('tabulates every period, merged or not', () => {
      set(h => {
        h.dataTable.set(true);
        h.data.set(many(1200));
      });

      expect(candles().length).toBeLessThan(1200);
      expect(all('.wr-chart-table tbody tr')).toHaveLength(1200);
    });

    it('lays out the three longest labels to measure, however many periods there are', () => {
      set(h => h.data.set(LONG));

      const probe = root().querySelector('.wr-candlestick-chart__x-probe')!;
      expect(probe.textContent.split('\n')).toEqual(['D1000', 'D1001', 'D1002']);
    });
  });

  describe('pointer', () => {
    it('hears the pointer through one native listener pair on the plot', () => {
      const added = vi.spyOn(EventTarget.prototype, 'addEventListener');
      const plain = TestBed.createComponent(DefaultHost);
      plain.detectChanges();
      const el = plain.nativeElement as HTMLElement;

      const pointer = added.mock.calls
        .map(([type], index) => [type, added.mock.contexts[index]] as const)
        .filter(([type]) => type.startsWith('mouse'));
      expect(pointer.map(([type]) => type).sort()).toEqual(['mouseleave', 'mousemove']);
      expect(pointer.every(([, target]) => target === el.querySelector('.wr-candlestick-chart__plot'))).toBe(true);
      plain.destroy();
    });
  });
});

/**
 * What a browser measures, stubbed: the chart reads the drawing once per pointer move,
 * and reads nothing at all for a change to the prices that moves no label and no body.
 */
describe('WrCandlestickChart measurements', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  /** The elements `getBoundingClientRect` was asked of, by their first class. */
  let reads: string[];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const plot = (): HTMLElement => root().querySelector<HTMLElement>('.wr-candlestick-chart__plot')!;
  const chip = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-chart-tooltip');
  const moveTo = (clientX: number): void => {
    plot().dispatchEvent(new MouseEvent('mousemove', { clientX, clientY: 50, bubbles: true }));
    fixture.detectChanges();
  };
  const chartReads = (): string[] => reads.filter(name => name.startsWith('wr-candlestick-chart__'));

  beforeEach(async () => {
    reads = [];
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      reads.push(this.classList[0] ?? this.localName);
      // A 400 × 100 drawing in a plot 8px taller each way; a label 30px wide, a body 70.
      if (this.classList.contains('wr-candlestick-chart__drawing')) return new DOMRect(0, 8, 400, 100);
      if (this.classList.contains('wr-candlestick-chart__plot')) return new DOMRect(0, 0, 400, 116);
      if (this.classList.contains('wr-candlestick-chart__x-probe')) return new DOMRect(0, 0, 30, 16);
      if (this.classList.contains('wr-candlestick-chart__candle')) return new DOMRect(0, 0, 70, 50);
      return new DOMRect(0, 0, 0, 0);
    });
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  it('measures once after the first render: the drawing, the plot, the labels and one body', () => {
    expect(chartReads().sort()).toEqual([
      'wr-candlestick-chart__candle',
      'wr-candlestick-chart__drawing',
      'wr-candlestick-chart__plot',
      'wr-candlestick-chart__x-probe',
    ]);
  });

  it('measures nothing for new prices that keep the labels and the number of candles', async () => {
    reads = [];
    fixture.componentInstance.data.set(DATA.map(d => ({ ...d, close: d.close + 1, high: d.high + 2 })));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(chartReads()).toEqual([]);

    // A period more is a narrower body, and a longer label a wider probe: each measures.
    fixture.componentInstance.data.set([...DATA, { label: 'Friday', open: 1, high: 2, low: 0, close: 1 }]);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(chartReads()).toContain('wr-candlestick-chart__drawing');
  });

  it('reads the drawing once for a pointer move, and the plot never', () => {
    reads = [];
    moveTo(150);
    expect(chip()!.textContent).toContain('Tue');
    // One read to find the slot; the chip then measures the candle it points at.
    expect(chartReads().filter(name => name !== 'wr-candlestick-chart__candle')).toEqual([
      'wr-candlestick-chart__drawing',
    ]);

    // With the chip up the tooltip asks for the slot itself, and the chart's own handler stands down.
    reads = [];
    moveTo(160);
    expect(chartReads().filter(name => name !== 'wr-candlestick-chart__candle')).toEqual([
      'wr-candlestick-chart__drawing',
    ]);

    reads = [];
    moveTo(350);
    expect(chip()!.textContent).toContain('Thu');
    expect(chartReads().filter(name => name === 'wr-candlestick-chart__plot')).toEqual([]);
    expect(chartReads().filter(name => name === 'wr-candlestick-chart__drawing')).toHaveLength(1);
  });

  it('takes the plot padding it measured as part of the slot, and nothing past it', () => {
    moveTo(150);
    expect(chip()).not.toBeNull();
    fixture.destroy();

    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    // 8px of padding under a drawing that ends at 108: 120 is past the plot.
    plot().dispatchEvent(new MouseEvent('mousemove', { clientX: 150, clientY: 120, bubbles: true }));
    fixture.detectChanges();
    expect(root().querySelector('.wr-candlestick-chart__cursor')).toBeNull();

    plot().dispatchEvent(new MouseEvent('mousemove', { clientX: 150, clientY: 114, bubbles: true }));
    fixture.detectChanges();
    expect(root().querySelector('.wr-candlestick-chart__cursor')).not.toBeNull();
  });
});

/** The pure helpers the chart merges and writes its prices with. */
describe('candlestick merging', () => {
  const candle = (open: number, high: number, low: number, close: number): WrCandlestickDatum => ({
    label: '',
    open,
    high,
    low,
    close,
  });

  it('keeps a candle per period until there are more than two a pixel', () => {
    expect(wrCandlestickPer(0, 560)).toBe(1);
    expect(wrCandlestickPer(1120, 560)).toBe(1);
    expect(wrCandlestickPer(1121, 560)).toBe(5);
    expect(wrCandlestickPer(10_000, 560)).toBe(36);
    expect(wrCandlestickPer(100_000, 300)).toBe(667);
    // Nothing measured, nothing merged.
    expect(wrCandlestickPer(10_000, 0)).toBe(1);
    expect(wrCandlestickPer(10_000, Number.NaN)).toBe(1);
  });

  it('never draws more than a candle for every two pixels once it merges', () => {
    for (const [count, width] of [
      [1121, 560],
      [10_000, 560],
      [100_000, 1280],
      [5000, 301],
    ] as const) {
      const per = wrCandlestickPer(count, width);
      expect(Math.ceil(count / per), `${count} on ${width}`).toBeLessThanOrEqual(Math.floor(width / 2));
    }
  });

  it('keeps every period as its own candle at one a candle', () => {
    const data = [candle(1, 3, 0, 2), candle(2, 5, 1, 4)];
    expect(wrCandlestickMerge(data, 1)).toEqual([
      { start: 0, end: 1, open: 1, high: 3, low: 0, close: 2 },
      { start: 1, end: 2, open: 2, high: 5, low: 1, close: 4 },
    ]);
    expect(wrCandlestickMerge(data, 0)).toHaveLength(2);
  });

  it('merges a run into the candle of the longer period: first open, last close, the extremes', () => {
    const data = [
      candle(10, 12, 9, 11),
      candle(11, 20, 10, 15),
      candle(15, 16, 2, 4),
      candle(4, 6, 3, 5),
      candle(5, 7, 4, 6),
    ];

    expect(wrCandlestickMerge(data, 3)).toEqual([
      { start: 0, end: 3, open: 10, high: 20, low: 2, close: 4 },
      { start: 3, end: 5, open: 4, high: 7, low: 3, close: 6 },
    ]);
  });

  it('leaves out a period it cannot draw, and a run with none it can', () => {
    const gap = candle(Number.NaN, 5, 1, 2);
    const data = [gap, candle(3, 4, 2, 3), gap, gap, candle(7, 9, 6, 8), gap];

    expect(wrCandlestickMerge(data, 2)).toEqual([
      { start: 0, end: 2, open: 3, high: 4, low: 2, close: 3 },
      { start: 4, end: 6, open: 7, high: 9, low: 6, close: 8 },
    ]);
  });

  it('preserves the extremes and the ends of a long series at any run length', () => {
    const data = many(10_000);
    const high = data.reduce((most, d) => Math.max(most, d.high), Number.NEGATIVE_INFINITY);
    const low = data.reduce((least, d) => Math.min(least, d.low), Number.POSITIVE_INFINITY);

    for (const per of [2, 7, 36, 1000, 20_000]) {
      const merged = wrCandlestickMerge(data, per);
      expect(merged).toHaveLength(Math.ceil(10_000 / per));
      expect(merged.reduce((most, d) => Math.max(most, d.high), Number.NEGATIVE_INFINITY)).toBe(high);
      expect(merged.reduce((least, d) => Math.min(least, d.low), Number.POSITIVE_INFINITY)).toBe(low);
      expect(merged[0].open).toBe(data[0].open);
      expect(merged[merged.length - 1].close).toBe(data[9999].close);
    }
  });

  it("finds the data's own precision in one pass", () => {
    expect(wrCandlestickDigits([candle(100, 110, 95, 105)], 0, 10)).toBe(0);
    expect(
      wrCandlestickDigits([candle(1.08345, 1.08391, 1.08301, 1.08362), candle(1.0836, 1.0841, 1.0833, 1.084)], 0, 10)
    ).toBe(5);
    expect(wrCandlestickDigits([candle(120, 120.25, 119, 120)], 0, 10)).toBe(2);
    // Never fewer than the axis step needs, never more than the ceiling.
    expect(wrCandlestickDigits([candle(1, 2, 0, 1)], 3, 10)).toBe(3);
    expect(wrCandlestickDigits([candle(0.1 + 0.2, 1, 0, 1)], 0, 10)).toBe(10);
    expect(wrCandlestickDigits([candle(1.2e-7, 1, 0, 1)], 0, 10)).toBe(8);
    // A price that is not a number has no digits to count.
    expect(wrCandlestickDigits([candle(Number.NaN, Number.POSITIVE_INFINITY, 0.5, 1)], 0, 10)).toBe(1);
  });

  it('stops reading once the ceiling is reached', () => {
    let read = 0;
    const counted = (value: number): WrCandlestickDatum => ({
      label: '',
      get open(): number {
        read++;
        return value;
      },
      high: 2,
      low: 0,
      close: 1,
    });

    expect(wrCandlestickDigits([counted(0.123456789012), counted(1), counted(1), counted(1)], 0, 10)).toBe(10);
    expect(read).toBe(1);
  });
});

describe('WrCandlestickChart stylesheet on the chart theme', { timeout: COMPILE_TIMEOUT }, () => {
  const css = (): string => compileSass(`@use 'charts/candlestick-chart/styles';`).replace(/\/\*[\s\S]*?\*\//g, '');
  const pattern = (selector: string): string => selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/, /g, ',\\s*');
  const rule = (selector: string): string =>
    new RegExp(`(?:^|\\n)${pattern(selector)}\\s*\\{([^}]*)\\}`).exec(css())?.[1] ?? '';

  it('points every hook that paints the frame at the shared chart token', () => {
    const block = rule('.wr-candlestick-chart');
    expect(block).toMatch(/--wr-candlestick-chart-grid-color: var\(--wr-chart-grid\)/);
    expect(block).toMatch(/--wr-candlestick-chart-zero-color: var\(--wr-chart-zero\)/);
    expect(block).toMatch(/--wr-candlestick-chart-tick-color: var\(--wr-chart-label\)/);
    expect(block).toMatch(/--wr-candlestick-chart-tick-font-size: var\(--wr-chart-label-size\)/);
    expect(block).toMatch(/--wr-candlestick-chart-cursor-bg: var\(--wr-chart-band\)/);
  });

  it('keeps a rise and a fall on the status roles, which is what they mean here', () => {
    const block = rule('.wr-candlestick-chart');
    expect(block).toMatch(/--wr-candlestick-chart-increase-color: var\(--wr-color-success\)/);
    expect(block).toMatch(/--wr-candlestick-chart-decrease-color: var\(--wr-color-danger\)/);
    // No colour of the series palette in the chart's own rules.
    expect(css().slice(css().indexOf('.wr-candlestick-chart {'))).not.toMatch(/--wr-chart-[1-8]\b/);
  });

  it('draws the gridlines in the grid hook and the one at zero in the stronger one', () => {
    expect(rule('.wr-candlestick-chart__grid-line')).toMatch(
      /border-block-start: 1px solid var\(--wr-candlestick-chart-grid-color\)/
    );
    expect(rule('.wr-candlestick-chart__grid-line--zero')).toMatch(
      /border-block-start-color: var\(--wr-candlestick-chart-zero-color\)/
    );
    expect(css().indexOf('.wr-candlestick-chart__grid-line--zero')).toBeGreaterThan(
      css().indexOf('.wr-candlestick-chart__grid-line {')
    );
    expect(css()).toMatch(/@media \(forced-colors: active\)[\s\S]*--wr-candlestick-chart-zero-color: CanvasText/);
  });

  it('fills a body both ways, and leaves a rising one hollow only on request', () => {
    expect(rule('.wr-candlestick-chart__candle-body')).toMatch(/background: currentColor/);
    expect(
      rule('.wr-candlestick-chart--hollow .wr-candlestick-chart__candle--increase .wr-candlestick-chart__candle-body')
    ).toMatch(/background: transparent/);
    // No rule of the default look empties or fills by direction.
    expect(rule('.wr-candlestick-chart__candle--decrease .wr-candlestick-chart__candle-body')).toBe('');
    expect(rule('.wr-candlestick-chart__candle--increase .wr-candlestick-chart__candle-body')).toBe('');
  });

  it('dots a narrow rising body only where bodies are hollow', () => {
    expect(
      rule(
        '.wr-candlestick-chart--hollow.wr-candlestick-chart--dense .wr-candlestick-chart__candle--increase .wr-candlestick-chart__candle-body'
      )
    ).toMatch(/background: repeating-linear-gradient/);
    expect(
      rule('.wr-candlestick-chart--dense .wr-candlestick-chart__candle--increase .wr-candlestick-chart__candle-body')
    ).toBe('');
  });

  it('keeps the top tick inside the chart, and the state in the cell of the plot', () => {
    expect(rule('.wr-candlestick-chart--axis .wr-candlestick-chart__body')).toMatch(
      /padding-block-start: max\(0px, var\(--wr-candlestick-chart-tick-line-height\) \/ 2 - var\(--wr-candlestick-chart-plot-inset-y\)\)/
    );
    const state = rule('.wr-candlestick-chart__body > .wr-chart-state');
    expect(state).toMatch(/position: relative/);
    expect(state).toMatch(/grid-column: 2/);
    expect(state).toMatch(/grid-row: 1/);
  });

  it('loads the chart theme and the state message with the chart', () => {
    expect(css()).toMatch(/--wr-chart-grid: var\(--wr-border-base\)/);
    expect(css()).toMatch(/\.wr-chart-state \{/);
  });

  it('transitions nothing a layout reads', () => {
    const own = css().slice(css().indexOf('.wr-candlestick-chart {'));
    for (const [, value] of own.matchAll(/transition:([^;]*);/g)) {
      expect(value).not.toMatch(/\b(height|width|top|bottom|left|right|inset[a-z-]*|inline-size|block-size)\b/);
    }
  });
});
