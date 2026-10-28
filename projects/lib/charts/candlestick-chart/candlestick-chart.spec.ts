import { createRequire } from 'node:module';
import { join } from 'node:path';

import { Component, LOCALE_ID, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrCandlestickChart } from './candlestick-chart';
import type { WrCandlestickDatum } from './types';

/**
 * Four days over 95..110. Fitted with a step's room at both ends and no zero forced in,
 * the axis runs 90..115 in fives, so a price p sits at (115 − p) / 25 of the height from
 * the top, and the four slots are centred at 12.5%, 37.5%, 62.5% and 87.5%.
 */
const DATA: readonly WrCandlestickDatum[] = [
  { label: 'Mon', open: 100, high: 110, low: 95, close: 105 },
  { label: 'Tue', open: 105, high: 108, low: 98, close: 100 },
  { label: 'Wed', open: 100, high: 104, low: 96, close: 102 },
  { label: 'Thu', open: 102, high: 106, low: 100, close: 102 },
];

/**
 * Two days of a forex pair, quoted to five places. The shared exact writer stops at three
 * fraction digits, which wrote Mon's four prices as two numbers — 1.083 and 1.084 — and
 * its low as its open.
 */
const FOREX: readonly WrCandlestickDatum[] = [
  { label: 'Mon', open: 1.08345, high: 1.08391, low: 1.08301, close: 1.08362 },
  { label: 'Tue', open: 1.0836, high: 1.0841, low: 1.0833, close: 1.084 },
];

/** `count` rising days labelled D1, D2, …, each a step above the one before. */
const many = (count: number): WrCandlestickDatum[] =>
  Array.from({ length: count }, (_, i) => ({ label: `D${i + 1}`, open: i, high: i + 2, low: i - 1, close: i + 1 }));

@Component({
  imports: [WrCandlestickChart],
  template: `
    <wr-candlestick-chart
      [data]="data()"
      [ariaLabel]="ariaLabel()"
      [increaseColor]="increaseColor()"
      [decreaseColor]="decreaseColor()"
      [valueFormat]="valueFormat()"
      [height]="height()"
      [showGrid]="showGrid()"
      [tooltip]="tooltip()"
      [dataTable]="dataTable()"
    />
  `,
})
class Host {
  readonly data = signal<readonly WrCandlestickDatum[]>(DATA);
  readonly ariaLabel = signal<string | null>(null);
  readonly increaseColor = signal<string | null>(null);
  readonly decreaseColor = signal<string | null>(null);
  readonly valueFormat = signal<((value: number) => string) | null>(null);
  readonly height = signal<number>(240);
  readonly showGrid = signal(true);
  readonly tooltip = signal(true);
  readonly dataTable = signal(false);
}

interface Drawn {
  readonly index: string | null;
  readonly direction: 'increase' | 'decrease' | null;
  readonly left: string;
  readonly top: string;
  readonly height: string;
  readonly upper: string;
  readonly lower: string;
}

describe('WrCandlestickChart', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): Host => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const chart = (): HTMLElement => root().querySelector<HTMLElement>('wr-candlestick-chart')!;
  const render = (): void => fixture.detectChanges();
  const plot = (): HTMLElement => root().querySelector<HTMLElement>('.wr-candlestick-chart__plot')!;
  const drawing = (): HTMLElement => root().querySelector<HTMLElement>('.wr-candlestick-chart__drawing')!;
  const texts = (selector: string): string[] =>
    [...root().querySelectorAll(selector)].map(element => element.textContent.trim());
  const candleEls = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('.wr-candlestick-chart__candle')];
  const candles = (): Drawn[] =>
    candleEls().map(candle => ({
      index: candle.getAttribute('data-index'),
      direction: candle.classList.contains('wr-candlestick-chart__candle--increase')
        ? 'increase'
        : candle.classList.contains('wr-candlestick-chart__candle--decrease')
          ? 'decrease'
          : null,
      left: candle.style.left,
      top: candle.style.top,
      height: candle.style.height,
      upper: candle.style.getPropertyValue('--wr-candlestick-chart-upper'),
      lower: candle.style.getPropertyValue('--wr-candlestick-chart-lower'),
    }));

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    render();
  });

  afterEach(() => fixture.destroy());

  describe('drawing', () => {
    it('draws a candle per period on its slot, from its high to its low', () => {
      expect(candles().map(({ index, left, top, height }) => [index, left, top, height])).toEqual([
        ['0', '12.5%', '20%', '60%'],
        ['1', '37.5%', '28%', '40%'],
        ['2', '62.5%', '44%', '32%'],
        ['3', '87.5%', '36%', '24%'],
      ]);
    });

    it('marks each candle rising or falling, a close equal to the open counting as rising', () => {
      expect(candles().map(c => c.direction)).toEqual(['increase', 'decrease', 'increase', 'increase']);
      // The body sits in exactly one of the two modifiers, which the stylesheet draws
      // hollow and filled.
      for (const candle of candleEls()) {
        expect(candle.querySelectorAll('.wr-candlestick-chart__candle-body')).toHaveLength(1);
      }
    });

    it("hands the stylesheet each wick as a share of the candle's own height", () => {
      // Mon: 110 down to the body's 105 is a third of 110..95; the body's 100 down to 95
      // another third. Tue: 108 to 105 is 3 of 10, 100 to 98 is 2 of 10. Thu opened and
      // closed at 102: a body of no height, with the wicks either side of it.
      expect(candles().map(({ upper, lower }) => [upper, lower])).toEqual([
        ['33.333', '33.333'],
        ['30', '20'],
        ['25', '50'],
        ['66.667', '33.333'],
      ]);
    });

    it("hands the drawing one slot's share, which the stylesheet sizes every body against", () => {
      expect(drawing().style.getPropertyValue('--wr-candlestick-chart-slot')).toBe('25');

      host().data.set(DATA.slice(0, 3));
      render();
      expect(drawing().style.getPropertyValue('--wr-candlestick-chart-slot')).toBe('33.333');
    });

    it('fits the axis to the lows and highs with a step either side, and no zero', () => {
      expect(texts('.wr-candlestick-chart__y-tick')).toEqual(['115', '110', '105', '100', '95', '90']);
      const lines = [...root().querySelectorAll<HTMLElement>('.wr-candlestick-chart__grid-line')];
      expect(lines.map(line => line.style.top)).toEqual(['0%', '20%', '40%', '60%', '80%', '100%']);
    });

    it('draws a high below the body, or a low above it, at the edge of the body', () => {
      host().data.set([{ label: 'Odd', open: 10, high: 9, low: 11, close: 12 }]);
      render();

      // Drawn from 12 down to 10: a body with no wick on either side, and an axis fitted
      // to the body rather than to the two prices that contradict it.
      const [candle] = candles();
      expect([candle.upper, candle.lower]).toEqual(['0', '0']);
      expect(Number.parseFloat(candle.height)).toBeGreaterThan(0);
    });

    it('keeps the slot of a period it cannot draw, and draws the rest', () => {
      host().data.set([DATA[0], { label: 'Gap', open: 1, high: Number.NaN, low: 0, close: 1 }, DATA[2]]);
      render();

      expect(candles().map(c => [c.index, c.left])).toEqual([
        ['0', '16.667%'],
        ['2', '83.333%'],
      ]);
      // The label stays under its empty slot.
      expect(texts('.wr-candlestick-chart__x-label')).toEqual(['Mon', 'Gap', 'Wed']);
    });

    it('draws the empty frame and no candle for no data', () => {
      host().data.set([]);
      render();

      expect(candleEls()).toHaveLength(0);
      expect(texts('.wr-candlestick-chart__y-tick')).toEqual(['1', '0.75', '0.5', '0.25', '0']);
      expect(texts('.wr-candlestick-chart__x-label')).toEqual([]);
    });

    it('centres a single flat candle with a step either side', () => {
      host().data.set([{ label: 'Flat', open: 120, high: 120, low: 120, close: 120 }]);
      render();

      expect(texts('.wr-candlestick-chart__y-tick')).toEqual(['140', '120', '100']);
      expect(candles()[0]).toMatchObject({ left: '50%', top: '50%', height: '0%', upper: '0', lower: '0' });
    });
  });

  describe('colours', () => {
    it('leaves the colours to the stylesheet unless asked', () => {
      expect(chart().style.getPropertyValue('--wr-candlestick-chart-increase-color')).toBe('');
      expect(chart().style.getPropertyValue('--wr-candlestick-chart-decrease-color')).toBe('');
    });

    it('writes the colours it is given onto its own hooks, and keeps the fill', () => {
      host().increaseColor.set('var(--wr-color-danger)');
      host().decreaseColor.set('var(--wr-color-success)');
      render();

      expect(chart().style.getPropertyValue('--wr-candlestick-chart-increase-color')).toBe('var(--wr-color-danger)');
      expect(chart().style.getPropertyValue('--wr-candlestick-chart-decrease-color')).toBe('var(--wr-color-success)');
      expect(candles().map(c => c.direction)).toEqual(['increase', 'decrease', 'increase', 'increase']);
    });
  });

  describe('many candles', () => {
    it('stays hollow while a body has room for an inside', () => {
      expect(chart().classList).not.toContain('wr-candlestick-chart--dense');
    });

    it('is drawn dense once a body would be under 4px on the assumed drawing', () => {
      // 560px over 200 slots is 2.8px a slot, and 70% of it under 2px.
      host().data.set(many(200));
      render();

      expect(chart().classList).toContain('wr-candlestick-chart--dense');
      expect(candleEls()).toHaveLength(200);
    });

    it('prints every period label while each fits its slot', () => {
      expect(texts('.wr-candlestick-chart__x-label')).toEqual(['Mon', 'Tue', 'Wed', 'Thu']);
    });

    it('prints every n-th label where they do not, each centred under its candle inside the strip', () => {
      // "D200" is four characters, 28px, and with the 12px gap needs 40px: 15 slots of 2.8px.
      host().data.set(many(200));
      render();

      // D1, moved inwards to the frame, would end 1.4px short of where D16 starts — inside
      // the gap — so the labels start at the first candle whose label needs no move, the
      // sixth, and step by 15 from there.
      const labels = texts('.wr-candlestick-chart__x-label');
      expect(labels.slice(0, 3)).toEqual(['D6', 'D21', 'D36']);
      expect(labels.at(-1)).toBe('D186');
      expect(labels).toHaveLength(13);
    });

    it('starts from the first period when its label, moved inwards, still clears the next', () => {
      // Five characters, 35px, over 28px slots: every second label. The first moves 3.5px
      // inwards and still ends 17.5px before the third period's label starts.
      host().data.set(many(20).map((d, i) => ({ ...d, label: `Wk ${String(i + 1).padStart(2, '0')}` })));
      render();

      const labels = texts('.wr-candlestick-chart__x-label');
      expect(labels.slice(0, 3)).toEqual(['Wk 01', 'Wk 03', 'Wk 05']);
      expect(labels).toHaveLength(10);
    });

    it('prints a label too wide for the drawing alone, under the first candle', () => {
      host().data.set([{ ...DATA[0], label: 'x'.repeat(100) }]);
      render();

      expect(texts('.wr-candlestick-chart__x-label')).toEqual(['x'.repeat(100)]);
    });

    it('hands every printed label its room, n slots wide', () => {
      host().data.set(many(200));
      render();

      const strip = root().querySelector<HTMLElement>('.wr-candlestick-chart__x-axis')!;
      expect(strip.style.getPropertyValue('--wr-candlestick-chart-x-slot')).toBe('7.5');
    });

    it('lays out a hidden copy of every label, once and a line each, to measure the widest', () => {
      // By characters "iiiiiiii" is the longest; laid out, "WWWWWWW" is the wider. The copy
      // carries both, so its width is whichever a browser draws wider.
      host().data.set([
        ...DATA,
        { label: 'WWWWWWW', open: 1, high: 2, low: 0, close: 1 },
        { label: 'iiiiiiii', open: 1, high: 2, low: 0, close: 1 },
        { label: 'Mon', open: 1, high: 2, low: 0, close: 1 },
        { label: 'Two\nlines', open: 1, high: 2, low: 0, close: 1 },
      ]);
      render();

      const probe = root().querySelector('.wr-candlestick-chart__x-probe')!;
      expect(probe.textContent.split('\n')).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'WWWWWWW', 'iiiiiiii', 'Two lines']);
    });
  });

  describe('axes', () => {
    it('drops the gridlines and the ticks with `showGrid` off, and keeps the period labels', () => {
      host().showGrid.set(false);
      render();

      expect(root().querySelector('.wr-candlestick-chart__grid-line')).toBeNull();
      expect(root().querySelector('.wr-candlestick-chart__y-axis')).toBeNull();
      // The period labels are the time axis, as the line chart's `xLabels` are: without
      // them the candles are prices with no dates.
      expect(texts('.wr-candlestick-chart__x-label')).toEqual(['Mon', 'Tue', 'Wed', 'Thu']);
      expect(candleEls()).toHaveLength(4);
    });

    it('writes the ticks through `valueFormat`', () => {
      host().valueFormat.set(value => `$${value}`);
      render();

      expect(texts('.wr-candlestick-chart__y-tick')[0]).toBe('$115');
    });

    it('hides the ticks and the labels, which the plot name and the data table speak for', () => {
      expect(root().querySelector('.wr-candlestick-chart__x-axis')!.getAttribute('aria-hidden')).toBe('true');
      expect(root().querySelector('.wr-candlestick-chart__y-axis')!.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('accessibility', () => {
    it('is one named image, with no tab stop', () => {
      expect(plot().getAttribute('role')).toBe('img');
      expect(plot().getAttribute('aria-label')).toBe('Candlestick chart');
      expect(root().querySelectorAll('[tabindex], button, a[href]')).toHaveLength(0);
      expect(drawing().getAttribute('aria-hidden')).toBe('true');

      host().ariaLabel.set('ACME, daily');
      render();
      expect(plot().getAttribute('aria-label')).toBe('ACME, daily');
    });

    it('writes the plot height, at least 80px', () => {
      expect(plot().style.height).toBe('240px');

      host().height.set(40);
      render();
      expect(plot().style.height).toBe('80px');
    });
  });

  describe('data table', () => {
    const table = (): HTMLTableElement | null => root().querySelector<HTMLTableElement>('.wr-chart-table table');
    const rows = (): string[][] =>
      [...table()!.querySelectorAll('tbody tr')].map(row => [...row.children].map(cell => cell.textContent.trim()));

    it('renders none unless asked', () => {
      expect(root().querySelector('.wr-chart-table')).toBeNull();
    });

    it('tabulates every period beside the image, never inside it', () => {
      host().dataTable.set(true);
      render();

      expect(table()).not.toBeNull();
      expect(table()!.closest('[role="img"]')).toBeNull();
      expect(table()!.caption!.textContent.trim()).toBe('Candlestick chart');
      expect(texts('.wr-chart-table thead th[scope="col"]')).toEqual(['Open', 'High', 'Low', 'Close']);
      expect(rows()).toEqual([
        ['Mon', '100', '110', '95', '105'],
        ['Tue', '105', '108', '98', '100'],
        ['Wed', '100', '104', '96', '102'],
        ['Thu', '102', '106', '100', '102'],
      ]);
    });

    it('keeps the row of a period it cannot draw, with an empty cell for a price that is not a number', () => {
      host().dataTable.set(true);
      host().data.set([{ label: 'Gap', open: 1, high: Number.NaN, low: 0, close: Number.POSITIVE_INFINITY }]);
      render();

      expect(rows()).toEqual([['Gap', '1', '', '0', '']]);
    });

    it('writes the prices through `valueFormat`', () => {
      host().dataTable.set(true);
      host().valueFormat.set(value => `$${value}`);
      render();

      expect(rows()[0]).toEqual(['Mon', '$100', '$110', '$95', '$105']);
    });

    it("writes every price at the data's own precision, five places for a forex quote", () => {
      host().dataTable.set(true);
      host().data.set(FOREX);
      render();

      expect(rows()).toEqual([
        ['Mon', '1.08345', '1.08391', '1.08301', '1.08362'],
        // A ceiling, not a fixed count: a price quoted to fewer places keeps them.
        ['Tue', '1.0836', '1.0841', '1.0833', '1.084'],
      ]);
    });

    it('stops at ten places, where a decimal is float noise rather than precision', () => {
      host().dataTable.set(true);
      host().data.set([{ label: 'Noise', open: 0.1 + 0.2, high: 1, low: 0.1, close: 120.43000000000001 }]);
      render();

      expect(rows()).toEqual([['Noise', '0.3', '1', '0.1', '120.43']]);
    });
  });

  describe('tooltip', () => {
    const chip = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-chart-tooltip');
    const chipTexts = (selector: string): string[] =>
      [...(chip()?.querySelectorAll(selector) ?? [])].map(element => element.textContent.trim());
    const cursor = (): HTMLElement | null => root().querySelector<HTMLElement>('.wr-candlestick-chart__cursor');
    const moveTo = (clientX: number, clientY: number): void => {
      plot().dispatchEvent(new MouseEvent('mousemove', { clientX, clientY, bubbles: true }));
      render();
    };

    beforeEach(() => {
      // jsdom lays nothing out, so the drawing is given a 400 × 200 box inside a plot
      // 16px taller at the origin: four 100px slots.
      drawing().getBoundingClientRect = () => new DOMRect(0, 8, 400, 200);
      plot().getBoundingClientRect = () => new DOMRect(0, 0, 400, 216);
    });

    it('reads the period, its open, high, low and close, and marks its slot', () => {
      moveTo(130, 100);

      expect(chipTexts('.wr-chart-tooltip__label')).toEqual(['Tue']);
      expect(chipTexts('.wr-chart-tooltip__value')).toEqual([]);
      expect(chipTexts('.wr-chart-tooltip__row-label')).toEqual(['Open', 'High', 'Low', 'Close']);
      expect(chipTexts('.wr-chart-tooltip__row-value')).toEqual(['105', '108', '98', '100']);
      // No swatch: the direction is in the prices, and a dot of colour cannot be hollow.
      expect(chip()!.querySelector('.wr-chart-tooltip__swatch')).toBeNull();
      expect(cursor()?.style.left).toBe('25%');
    });

    it('reads a thin candle anywhere in its slot, the plot padding included', () => {
      moveTo(399, 2);

      expect(chipTexts('.wr-chart-tooltip__label')).toEqual(['Thu']);
    });

    it('writes the prices through `valueFormat`', () => {
      host().valueFormat.set(value => `$${value.toFixed(2)}`);
      render();
      moveTo(10, 100);

      expect(chipTexts('.wr-chart-tooltip__row-value')).toEqual(['$100.00', '$110.00', '$95.00', '$105.00']);
    });

    it("writes the prices at the data's own precision, five places for a forex quote", () => {
      host().data.set(FOREX);
      render();
      moveTo(10, 100);

      expect(chipTexts('.wr-chart-tooltip__row-value')).toEqual(['1.08345', '1.08391', '1.08301', '1.08362']);
    });

    it('draws the band behind the gridlines, so they read across it', () => {
      moveTo(130, 100);

      // Positioned siblings paint in document order, so the band comes first.
      const layers = [...drawing().children].map(child => child.classList[0]);
      expect(layers.indexOf('wr-candlestick-chart__cursor')).toBe(0);
      expect(layers.indexOf('wr-candlestick-chart__grid-line')).toBeGreaterThan(0);
    });

    it('opens on nothing over a slot with no candle, or off the drawing', () => {
      host().data.set([DATA[0], { label: 'Gap', open: Number.NaN, high: 1, low: 0, close: 1 }, DATA[2], DATA[3]]);
      render();
      moveTo(150, 100);
      expect(chip()).toBeNull();
      expect(cursor()).toBeNull();

      moveTo(150, 230);
      expect(chip()).toBeNull();
    });

    it('shows nothing with `tooltip` off', () => {
      host().tooltip.set(false);
      render();
      moveTo(150, 100);

      expect(chip()).toBeNull();
      expect(cursor()).toBeNull();
    });

    it('answers nothing for a drawing that has not been laid out', () => {
      drawing().getBoundingClientRect = () => new DOMRect(0, 0, 0, 0);
      moveTo(0, 0);

      expect(chip()).toBeNull();
    });
  });
});

describe('WrCandlestickChart measured', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  /** What the stubbed layout says each part measures, in px. */
  let widths: { drawing: number; probe: number; candle: number };

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const chart = (): HTMLElement => root().querySelector<HTMLElement>('wr-candlestick-chart')!;
  const labels = (): string[] =>
    [...root().querySelectorAll('.wr-candlestick-chart__x-label')].map(element => element.textContent.trim());

  beforeEach(() => {
    widths = { drawing: 1000, probe: 30, candle: 10 };
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const width = this.classList.contains('wr-candlestick-chart__drawing')
        ? widths.drawing
        : this.classList.contains('wr-candlestick-chart__x-probe')
          ? widths.probe
          : this.classList.contains('wr-candlestick-chart__candle')
            ? widths.candle
            : 0;
      return new DOMRect(0, 0, width, width > 0 ? 100 : 0);
    });
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const render = async (data: readonly WrCandlestickDatum[]): Promise<void> => {
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.data.set(data);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('spaces the labels by the measured drawing and the measured longest label', async () => {
    // 1000px over 100 slots is 10px a slot; a 30px label and the 12px gap need 5 slots,
    // and half the label reaches the frame from the first candle, so they start at D2.
    await render(many(100));

    expect(labels().slice(0, 3)).toEqual(['D2', 'D7', 'D12']);
  });

  it('leaves out the last label when moving it inwards would crowd the one before', async () => {
    // 1000px over 97 slots: the labels start at D2 and step by 5, so the last one is under
    // the last candle. Moved inwards to the frame it would start 0.3px inside the gap
    // after D92.
    await render(many(97));

    expect(labels().slice(-2)).toEqual(['D87', 'D92']);
  });

  it('decides dense off the measured body rather than the assumed drawing', async () => {
    // On the assumed 560px, 100 slots would give bodies of 3.9px: dense. The browser says 10px.
    await render(many(100));
    expect(chart().classList).not.toContain('wr-candlestick-chart--dense');

    widths = { drawing: 1000, probe: 30, candle: 3 };
    fixture.componentInstance.data.set(many(101));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(chart().classList).toContain('wr-candlestick-chart--dense');
  });

  it('measures again when the drawing is resized, and stops observing when destroyed', async () => {
    let report: (() => void) | null = null;
    let disconnected = false;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          report = callback;
        }
        observe(): void {
          // The drawing is the one thing observed; the spec reports a resize by hand.
        }
        disconnect(): void {
          disconnected = true;
        }
      }
    );
    await render(many(100));
    expect(labels().slice(0, 2)).toEqual(['D2', 'D7']);

    // Half as wide: 5px a slot, so the same label needs 9 slots and starts at the fourth.
    widths = { drawing: 500, probe: 30, candle: 3.5 };
    report!();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(labels().slice(0, 2)).toEqual(['D4', 'D13']);
    expect(chart().classList).toContain('wr-candlestick-chart--dense');

    fixture.destroy();
    expect(disconnected).toBe(true);
  });

  it('keeps its last reading while hidden, rather than thinning to nothing', async () => {
    await render(many(100));
    widths = { drawing: 0, probe: 0, candle: 0 };
    fixture.componentInstance.data.set(many(100).map(d => ({ ...d, close: d.close + 1 })));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(labels().slice(0, 2)).toEqual(['D2', 'D7']);
  });
});

describe('WrCandlestickChart on the server', () => {
  it('draws everything from its inputs and measures nothing', () => {
    // Every position is a percentage worked out from the data and the assumed drawing;
    // only a browser measures. A prerendered page carries the drawing.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const measure = vi.spyOn(Element.prototype, 'getBoundingClientRect');
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.dataTable.set(true);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.wr-candlestick-chart__candle')).toHaveLength(4);
    expect(root.querySelectorAll('.wr-candlestick-chart__x-label')).toHaveLength(4);
    expect(root.querySelectorAll('.wr-chart-table tbody tr')).toHaveLength(4);
    expect(measure).not.toHaveBeenCalled();
    fixture.destroy();
    measure.mockRestore();
  });
});

@Component({
  imports: [WrCandlestickChart],
  template: `<wr-candlestick-chart dataTable [data]="data" />`,
})
class LocaleHost {
  readonly data: readonly WrCandlestickDatum[] = [{ label: 'Q1', open: 1234.5, high: 2000, low: 0.0004, close: 1500 }];
}

describe('WrCandlestickChart number format', () => {
  afterEach(() => TestBed.resetTestingModule());

  const cells = (locale?: string): string[] => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: locale ? [{ provide: LOCALE_ID, useValue: locale }] : [] });
    const fixture = TestBed.createComponent(LocaleHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    return [...root.querySelectorAll('.wr-chart-table tbody td')].map(cell => cell.textContent.trim());
  };

  it('writes the exact figures in the table, a tiny one not as zero', () => {
    expect(cells()).toEqual(['1,234.5', '2,000', '0.0004', '1,500']);
  });

  it("follows LOCALE_ID's own convention", () => {
    expect(cells('de')).toEqual(['1.234,5', '2.000', '0,0004', '1.500']);
  });
});

/**
 * What the stylesheet promises that no rendered DOM in jsdom can show, held against the
 * COMPILED sheet; `sass` is resolved through `@angular/build`, as `charts/stylesheets.spec.ts`
 * does. That each rule then paints what it says is measured in a browser.
 */
describe('WrCandlestickChart stylesheet', () => {
  const sass = createRequire(createRequire(import.meta.url).resolve('@angular/build/package.json'))('sass') as {
    compileString(source: string, options: { loadPaths: string[]; style: 'expanded' }): { css: string };
  };
  const css = sass
    .compileString(`@use 'charts/candlestick-chart/styles';`, {
      loadPaths: [join(process.cwd(), 'projects/lib')],
      style: 'expanded',
    })
    .css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = (block: string, selector: string): string =>
    new RegExp(`(?:^|\\n)\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(block)?.[1] ??
    '';
  /** Every `forced-colors` block of the sheet, the chart's own and any it loads. */
  const forced = [...css.matchAll(/@media \(forced-colors: active\)\s*\{([\s\S]*?)\n\}/g)].map(m => m[1]).join('\n');

  it('keeps the candles in their colours under forced colors, and so their fill', () => {
    // Painted by `background` and `currentColor`: forced colors would reset a falling body
    // to the page and lose the one channel that is not colour.
    expect(rule(forced, '.wr-candlestick-chart__candle')).toMatch(/forced-color-adjust: none/);
  });

  it('marks the slot being read with an outline in the selection colour under forced colors', () => {
    const band = rule(forced, '.wr-candlestick-chart__cursor');
    expect(band).toMatch(/background: transparent/);
    expect(band).toMatch(/outline: 2px solid Highlight/);
    expect(forced).toMatch(/--wr-candlestick-chart-grid-color: GrayText/);
  });

  it('lets a negative tick take its direction from its own text, shrunk against the plot', () => {
    // Under RTL a `-` in front of digits would land on their far side: `50-`.
    const tick = rule(css, '.wr-candlestick-chart__y-tick');
    expect(tick).toMatch(/unicode-bidi: plaintext/);
    expect(tick).toMatch(/justify-self: end/);
  });
});
