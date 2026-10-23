import { type Direction, Directionality } from '@angular/cdk/bidi';
import { Component, LOCALE_ID, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Subject } from 'rxjs';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrRadarChart } from './radar-chart';
import type { WrRadarSeries } from './types';

const AXES = ['Speed', 'Power', 'Range', 'Comfort', 'Price'];

const SERIES: readonly WrRadarSeries[] = [
  { label: 'Model A', data: [80, 65, 70, 90, 55] },
  { label: 'Model B', data: [60, 85, 75, 60, 80], color: '#123456' },
];

@Component({
  imports: [WrRadarChart],
  template: `
    <wr-radar-chart
      [axes]="axes()"
      [series]="series()"
      [max]="max()"
      [rings]="rings()"
      [size]="size()"
      [showGrid]="showGrid()"
      [showLegend]="showLegend()"
      [showDots]="showDots()"
      [fill]="fill()"
      [dataTable]="dataTable()"
      [ariaLabel]="ariaLabel()"
      [toggleableLegend]="toggleable()"
      [valueFormat]="valueFormat()"
      [(hiddenSeries)]="hidden"
    />
  `,
})
class Host {
  readonly axes = signal<readonly string[]>(AXES);
  readonly series = signal<readonly WrRadarSeries[]>(SERIES);
  readonly max = signal(0);
  readonly rings = signal(4);
  readonly size = signal(280);
  readonly showGrid = signal(true);
  readonly showLegend = signal(true);
  readonly showDots = signal(true);
  readonly fill = signal(true);
  readonly dataTable = signal(false);
  readonly ariaLabel = signal<string | null>(null);
  readonly toggleable = signal(false);
  readonly valueFormat = signal<((value: number) => string) | null>(null);
  readonly hidden = signal<readonly number[]>([]);
}

/**
 * The polygons are compared through the rendered `d`, because a path is what a consumer
 * sees, and what a missing value has to leave OPEN: a closed outline across a gap draws a
 * reading the data never took. Coordinates are in the drawing's 100 × 100 viewBox, centre
 * (50, 50), outer ring radius 50.
 */
describe('WrRadarChart', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): Host => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const all = <T extends Element>(selector: string): T[] => [...root().querySelectorAll<T>(selector)];
  const svg = (): SVGSVGElement => root().querySelector<SVGSVGElement>('.wr-radar-chart__svg')!;
  const lines = (): SVGPathElement[] => all<SVGPathElement>('.wr-radar-chart__line');
  const areas = (): SVGPathElement[] => all<SVGPathElement>('.wr-radar-chart__area');
  const dots = (): SVGPathElement[] => all<SVGPathElement>('.wr-radar-chart__dot');
  const rings = (): SVGPathElement[] => all<SVGPathElement>('.wr-radar-chart__ring');
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

  it('names the drawing itself, not a wrapper round it', () => {
    // `img` hides its whole subtree, and WebKit drops the subtree of an `img` wrapper — the
    // axis names beside the drawing are real text and must stay outside it.
    expect(svg().getAttribute('role')).toBe('img');
    expect(svg().getAttribute('aria-label')).toBe('Radar chart');
    for (const label of all('.wr-radar-chart__axis-label')) expect(label.closest('[role="img"]')).toBeNull();

    set(h => h.ariaLabel.set('Five models compared'));
    expect(svg().getAttribute('aria-label')).toBe('Five models compared');
  });

  it('draws one closed, filled polygon per series, in its colour and its own dash', () => {
    expect(lines()).toHaveLength(2);
    expect(lines().every(line => line.getAttribute('d')!.endsWith('Z'))).toBe(true);
    expect(areas()).toHaveLength(2);
    // The palette first, then the series' own colour.
    expect(lines()[0].getAttribute('stroke')).toBe('var(--wr-color-primary)');
    expect(lines()[1].getAttribute('stroke')).toBe('#123456');
    expect(areas()[1].getAttribute('fill')).toBe('#123456');
    // The first series is solid, the second dashed: the palette's colours sit within
    // about 1.06:1 of each other, so the dash is what tells two outlines apart.
    expect(lines()[0].hasAttribute('stroke-dasharray')).toBe(false);
    expect(lines()[1].getAttribute('stroke-dasharray')).toBe('7 4');
    // Every fill under every outline.
    const order = all('.wr-radar-chart__area, .wr-radar-chart__line').map(el => el.getAttribute('class'));
    expect(order).toEqual([
      'wr-radar-chart__area',
      'wr-radar-chart__area',
      'wr-radar-chart__line',
      'wr-radar-chart__line',
    ]);
  });

  it("starts at twelve o'clock and runs clockwise", () => {
    // A value of 50 on a 0..100 scale is half the radius. Four axes put the second at three
    // o'clock — right of centre, since the drawing's y runs downwards.
    set(h => {
      h.axes.set(['N', 'E', 'S', 'W']);
      h.series.set([{ label: 'A', data: [50, 50, 50, 50] }]);
      h.max.set(100);
    });
    expect(lines()[0].getAttribute('d')).toBe('M 50.00 25.00 L 75.00 50.00 L 50.00 75.00 L 25.00 50.00 Z');
    expect(all<HTMLElement>('.wr-radar-chart__axis-label').map(el => el.getAttribute('style'))).toEqual([
      '--wr-radar-chart-x: 50; --wr-radar-chart-y: 0; --wr-radar-chart-cos: 0; --wr-radar-chart-sin: -1;',
      '--wr-radar-chart-x: 100; --wr-radar-chart-y: 50; --wr-radar-chart-cos: 1; --wr-radar-chart-sin: 0;',
      '--wr-radar-chart-x: 50; --wr-radar-chart-y: 100; --wr-radar-chart-cos: 0; --wr-radar-chart-sin: 1;',
      '--wr-radar-chart-x: 0; --wr-radar-chart-y: 50; --wr-radar-chart-cos: -1; --wr-radar-chart-sin: 0;',
    ]);
    expect(text('.wr-radar-chart__axis-label')).toEqual(['N', 'E', 'S', 'W']);
  });

  it('fits a readable scale from zero when no max is given', () => {
    // 55..90 snaps to a step of 25 from zero, and the peak lands below the top.
    expect(text('.wr-radar-chart__ring-label')).toEqual(['100', '75', '50', '25']);
    expect(rings()).toHaveLength(4);
    // Each ring value hangs at the height of its ring on the first axis.
    expect(
      all<HTMLElement>('.wr-radar-chart__ring-label').map(el => el.style.getPropertyValue('--wr-radar-chart-y'))
    ).toEqual(['0', '12.5', '25', '37.5']);
  });

  it('rings a fixed max on a readable step that divides it, the count nearest `rings`', () => {
    // A rating out of 5 with the default four rings: a ring per point, never 1.25 / 2.5 / 3.75.
    set(h => {
      h.max.set(5);
      h.series.set([{ label: 'A', data: [1, 2, 3, 4, 5] }]);
    });
    expect(text('.wr-radar-chart__ring-label')).toEqual(['5', '4', '3', '2', '1']);
    expect(rings()).toHaveLength(5);

    // Out of 100: four rings by default, and three asked for ties 2 against 4 — the fewer.
    set(h => h.max.set(100));
    expect(text('.wr-radar-chart__ring-label')).toEqual(['100', '75', '50', '25']);
    set(h => h.rings.set(3));
    expect(text('.wr-radar-chart__ring-label')).toEqual(['100', '50']);
    set(h => h.rings.set(6));
    expect(text('.wr-radar-chart__ring-label')).toEqual(['100', '80', '60', '40', '20']);

    // The outer ring is `max` itself however few rings divide it.
    set(h => {
      h.max.set(7);
      h.rings.set(4);
    });
    expect(text('.wr-radar-chart__ring-label')).toEqual(['7', '6', '5', '4', '3', '2', '1']);
    set(h => h.max.set(0.3));
    expect(text('.wr-radar-chart__ring-label')).toEqual(['0.3', '0.2', '0.1']);
  });

  it('cuts a max no readable step divides into exactly `rings` equal rings', () => {
    set(h => {
      h.max.set(37);
      h.series.set([{ label: 'A', data: [10, 20, 30, 37, 5] }]);
    });
    expect(text('.wr-radar-chart__ring-label')).toEqual(['37', '27.75', '18.5', '9.25']);
    expect(rings()).toHaveLength(4);
  });

  it('draws a value outside a fixed scale on its edge, and keeps its own figure in the table', () => {
    set(h => {
      h.axes.set(['N', 'E', 'S', 'W']);
      h.series.set([{ label: 'A', data: [150, -10, 50, 50] }]);
      h.max.set(100);
      h.dataTable.set(true);
    });
    expect(lines()[0].getAttribute('d')).toBe('M 50.00 0.00 L 50.00 50.00 L 50.00 75.00 L 25.00 50.00 Z');
    expect(all('.wr-chart-table tbody td').map(cell => cell.textContent.trim())).toEqual(['150', '-10', '50', '50']);
  });

  it('leaves the outline OPEN across a missing value, and does not fill it', () => {
    // A NaN, and a shorter list whose last value is missing: each breaks the outline on
    // either side of its axis. Closing across the gap would invent a reading, and filling
    // an open outline is closing it.
    set(h => {
      h.axes.set(['N', 'E', 'S', 'W']);
      h.max.set(100);
      h.series.set([
        { label: 'A', data: [50, Number.NaN, 50, 50] },
        { label: 'B', data: [50, 50, 50] },
      ]);
    });
    const [a, b] = lines().map(line => line.getAttribute('d')!);
    // Walked from the gap: S, W, and round past the last axis to N, as one stroke.
    expect(a).toBe('M 50.00 75.00 L 25.00 50.00 L 50.00 25.00');
    expect(b).toBe('M 50.00 25.00 L 75.00 50.00 L 50.00 75.00');
    expect(a).not.toContain('Z');
    expect(areas()).toHaveLength(0);
    // And no dot where there is no value.
    expect(dots()).toHaveLength(6);
  });

  it('keeps a lone value between two gaps visible with the dots off', () => {
    // A subpath of one `M` is not stroked at all; repeating the point gives the round cap
    // something to paint.
    set(h => {
      h.axes.set(['N', 'E', 'S', 'W']);
      h.max.set(100);
      h.showDots.set(false);
      h.series.set([{ label: 'A', data: [50, Number.NaN, 50, Number.POSITIVE_INFINITY] }]);
    });
    expect(lines()[0].getAttribute('d')).toBe('M 50.00 75.00 L 50.00 75.00 M 50.00 25.00 L 50.00 25.00');
    expect(dots()).toHaveLength(0);
  });

  it('writes no NaN into any path, whatever the data', () => {
    set(h => h.series.set([{ label: 'A', data: [Number.NaN, Number.NaN, Number.NaN, Number.NaN, Number.NaN] }]));
    // A series with no value at all draws nothing, and the scale is the empty 0..1 frame.
    expect(lines()).toHaveLength(0);
    expect(text('.wr-radar-chart__ring-label')).toEqual(['1', '0.75', '0.5', '0.25']);
    for (const path of all('path')) expect(path.getAttribute('d') ?? '').not.toContain('NaN');
  });

  it('draws the grid alone with fewer than three axes, and says so once in dev mode', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    set(h => h.axes.set(['Only', 'Two']));
    fixture.detectChanges();

    expect(lines()).toHaveLength(0);
    expect(dots()).toHaveLength(0);
    // The rings have no polygon to follow, so they are circles.
    expect(rings()).toHaveLength(4);
    expect(rings()[0].getAttribute('d')).toContain(' A ');
    expect(all('.wr-radar-chart__spoke')).toHaveLength(2);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('at least three axes');

    set(h => h.series.set([...SERIES]));
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('draws an empty frame with no axes at all', () => {
    set(h => {
      h.axes.set([]);
      h.series.set([]);
    });
    expect(lines()).toHaveLength(0);
    expect(all('.wr-radar-chart__spoke')).toHaveLength(0);
    expect(all('.wr-radar-chart__axis-label')).toHaveLength(0);
    expect(rings()).toHaveLength(4);
    expect(root().querySelector('.wr-radar-chart__legend')).toBeNull();
  });

  it('drops the web with `showGrid` off and keeps the axis names', () => {
    set(h => h.showGrid.set(false));
    expect(rings()).toHaveLength(0);
    expect(all('.wr-radar-chart__spoke')).toHaveLength(0);
    expect(all('.wr-radar-chart__ring-label')).toHaveLength(0);
    expect(text('.wr-radar-chart__axis-label')).toEqual(AXES);
  });

  it('hides the ring values from a screen reader, and not the axis names', () => {
    expect(root().querySelector('.wr-radar-chart__ring-labels')!.getAttribute('aria-hidden')).toBe('true');
    expect(root().querySelector('.wr-radar-chart__axis-labels')!.hasAttribute('aria-hidden')).toBe(false);
  });

  it('draws no fill with `fill` off, and no dots with `showDots` off', () => {
    set(h => h.fill.set(false));
    expect(areas()).toHaveLength(0);
    expect(lines()).toHaveLength(2);
    expect(dots()).toHaveLength(10);

    set(h => h.showDots.set(false));
    expect(dots()).toHaveLength(0);
  });

  it('writes its size on the surface, and holds it to at least 120px', () => {
    const surface = (): HTMLElement => root().querySelector<HTMLElement>('.wr-radar-chart__surface')!;
    expect(surface().style.width).toBe('280px');
    set(h => h.size.set(40));
    expect(surface().style.width).toBe('120px');
  });

  it('lists every series in the legend, keyed by its own dash', () => {
    const keys = all<SVGLineElement>('.wr-radar-chart__legend .wr-chart-legend__swatch--line line');
    expect(text('.wr-radar-chart__legend .wr-chart-legend__label')).toEqual(['Model A', 'Model B']);
    expect(keys.map(key => key.getAttribute('stroke-dasharray'))).toEqual([null, '7 4']);

    set(h => h.showLegend.set(false));
    expect(root().querySelector('.wr-radar-chart__legend')).toBeNull();
  });

  it('leaves a hidden series out of the drawing, the scale and the table, and keeps its row', () => {
    set(h => {
      h.series.set([
        { label: 'Small', data: [1, 2, 3, 2, 1] },
        { label: 'Large', data: [100, 200, 300, 200, 100] },
      ]);
      h.dataTable.set(true);
    });
    expect(text('.wr-radar-chart__ring-label')[0]).toBe('400');

    set(h => h.hidden.set([1]));
    expect(lines()).toHaveLength(1);
    // The scale fits the series still shown.
    expect(text('.wr-radar-chart__ring-label')[0]).toBe('4');
    expect(text('.wr-chart-table thead th')).toEqual(['Small']);
    // The legend keeps the row, struck through and said to be hidden.
    expect(all('.wr-chart-legend__item')).toHaveLength(2);
    expect(all('.wr-chart-legend__item')[1].classList).toContain('wr-chart-legend__item--hidden');
  });

  it('shows and hides a series from a toggleable legend', () => {
    set(h => h.toggleable.set(true));
    const buttons = all<HTMLButtonElement>('.wr-radar-chart__legend button');
    expect(buttons.map(button => button.getAttribute('aria-pressed'))).toEqual(['true', 'true']);

    buttons[0].click();
    fixture.detectChanges();

    expect(host().hidden()).toEqual([0]);
    expect(lines()).toHaveLength(1);
    expect(lines()[0].getAttribute('stroke')).toBe('#123456');
  });

  it('renders no data table unless asked', () => {
    expect(root().querySelector('wr-chart-table')).toBeNull();
  });

  it('tabulates the figures beside the drawing: a row per axis, a column per series', () => {
    set(h => {
      h.dataTable.set(true);
      h.ariaLabel.set('Models');
      h.series.set([
        { label: 'Model A', data: [80, 65, 70, 90, 55] },
        { label: 'Model B', data: [60, Number.NaN, 75, 60] },
      ]);
    });
    const table = root().querySelector('wr-chart-table')!;
    // Never inside the `img`, which would hide it with the drawing.
    expect(table.closest('[role="img"]')).toBeNull();
    expect(table.querySelector('caption')!.textContent.trim()).toBe('Models');
    expect(text('.wr-chart-table thead th')).toEqual(['Model A', 'Model B']);
    const rows = all('.wr-chart-table tbody tr').map(row => [
      row.querySelector('th')!.textContent.trim(),
      ...[...row.querySelectorAll('td')].map(cell => cell.textContent.trim()),
    ]);
    // A missing value is an empty cell.
    expect(rows).toEqual([
      ['Speed', '80', '60'],
      ['Power', '65', ''],
      ['Range', '70', '75'],
      ['Comfort', '90', '60'],
      ['Price', '55', ''],
    ]);
  });

  it('writes every number through `valueFormat`', () => {
    set(h => {
      h.valueFormat.set(v => `${v} pts`);
      h.dataTable.set(true);
    });
    expect(text('.wr-radar-chart__ring-label')).toEqual(['100 pts', '75 pts', '50 pts', '25 pts']);
    expect(all('.wr-chart-table tbody td')[0].textContent.trim()).toBe('80 pts');
  });

  it('holds no tab stop of its own', () => {
    expect(root().querySelectorAll('[tabindex], button, a[href]')).toHaveLength(0);
  });
});

describe('WrRadarChart on the server', () => {
  it('draws everything from its inputs and measures nothing', () => {
    // Every coordinate is worked out from the data; only the tooltip measures a box, and
    // only after a pointer has moved. A prerendered page carries the whole drawing.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const measure = vi.spyOn(Element.prototype, 'getBoundingClientRect');
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.dataTable.set(true);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.wr-radar-chart__line')).toHaveLength(2);
    expect(root.querySelectorAll('.wr-radar-chart__axis-label')).toHaveLength(5);
    expect(root.querySelectorAll('.wr-chart-table tbody tr')).toHaveLength(5);
    expect(measure).not.toHaveBeenCalled();
    fixture.destroy();
    measure.mockRestore();
  });
});

describe('WrRadarChart numbers', () => {
  it('writes the ring values and the table in LOCALE_ID', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'de' }] });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.series.set([{ label: 'A', data: [1500.5, 2000, 2500, 1000, 500] }]);
    fixture.componentInstance.dataTable.set(true);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.wr-radar-chart__ring-label')!.textContent.trim()).toBe('3000');
    expect(root.querySelector('.wr-chart-table tbody td')!.textContent.trim()).toBe('1.500,5');
    fixture.destroy();
  });
});

@Component({
  imports: [WrRadarChart],
  template: `<wr-radar-chart
    [axes]="axes"
    [series]="series"
    [max]="100"
    [tooltip]="tooltip()"
    [hiddenSeries]="hidden()"
  />`,
})
class TooltipHost {
  readonly axes = ['N', 'E', 'S', 'W'];
  readonly series: readonly WrRadarSeries[] = [
    { label: 'A', data: [50, 60, 70, 80] },
    { label: 'B', data: [20, Number.NaN, 40, 30], color: '#123456' },
  ];
  readonly tooltip = signal(true);
  readonly hidden = signal<readonly number[]>([]);
}

/**
 * The tooltip follows the axis nearest the pointer, by angle from the drawing's centre.
 * jsdom lays nothing out, so the drawing is given a box — 200px square at (100, 100),
 * centre (200, 200), radius 100 — the chip a size and the document one, and the case
 * reads what the chip says, what the drawing marks and where the CDK put the pane. That
 * the chip then paints there is measured in a browser.
 */
describe('WrRadarChart tooltip', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TooltipHost>>;

  const doc = document.documentElement;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const svg = (): SVGSVGElement => root().querySelector<SVGSVGElement>('.wr-radar-chart__svg')!;
  const chip = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-chart-tooltip');
  const pane = (): HTMLElement => document.querySelector<HTMLElement>('.wr-tooltip-overlay')!;
  const rows = (): string[] =>
    [...(chip()?.querySelectorAll('.wr-chart-tooltip__row') ?? [])].map(row =>
      [...row.querySelectorAll('.wr-chart-tooltip__row-label, .wr-chart-tooltip__row-value')]
        .map(el => el.textContent.trim())
        .join(' ')
    );
  const move = (x: number, y: number): void => {
    svg().dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y, bubbles: true }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    Object.defineProperty(doc, 'clientWidth', { configurable: true, value: 1024 });
    Object.defineProperty(doc, 'clientHeight', { configurable: true, value: 768 });
  });

  const create = (): void => {
    fixture = TestBed.createComponent(TooltipHost);
    fixture.detectChanges();
    const drawing = svg();
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      if (this === drawing) return new DOMRect(100, 100, 200, 200);
      return this.classList.contains('cdk-overlay-pane') ? new DOMRect(0, 0, 80, 40) : new DOMRect();
    });
  };

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
    Reflect.deleteProperty(doc, 'clientWidth');
    Reflect.deleteProperty(doc, 'clientHeight');
  });

  it('heads the chip with the nearest axis and lists every series with a value on it', () => {
    create();
    // Up and a little right of centre: the first axis.
    move(210, 150);

    expect(chip()!.querySelector('.wr-chart-tooltip__label')!.textContent.trim()).toBe('N');
    expect(chip()!.querySelector('.wr-chart-tooltip__value')).toBeNull();
    expect(rows()).toEqual(['A 50', 'B 20']);
  });

  it('leaves out a series with no value on the axis', () => {
    create();
    move(270, 205);

    expect(chip()!.querySelector('.wr-chart-tooltip__label')!.textContent.trim()).toBe('E');
    expect(rows()).toEqual(['A 60']);
  });

  it('marks the axis and a ring round each value on it', () => {
    create();
    move(195, 260);

    const crosshair = root().querySelector('.wr-radar-chart__crosshair')!;
    expect(crosshair.getAttribute('x2')).toBe('50');
    expect(crosshair.getAttribute('y2')).toBe('100');
    expect(root().querySelectorAll('.wr-radar-chart__hover-dot')).toHaveLength(2);
  });

  it('points at the end of the axis, from the side it faces', () => {
    create();
    // Three o'clock: from the right, the box starting at the axis' end (300, 200).
    move(270, 205);
    expect(pane().classList).toContain('wr-tooltip-overlay--right');
    const style = pane().parentElement!.style;
    expect(Number.parseFloat(style.left)).toBeCloseTo(300, 3);
  });

  it('keeps an axis at three o\'clock pointed from the right under dir="rtl"', () => {
    // The drawing does not mirror, so neither does the side: the logical name is the one
    // the arrow keys on under RTL.
    TestBed.overrideProvider(Directionality, { useValue: { value: 'rtl', change: new Subject<Direction>() } });
    create();
    move(270, 205);
    expect(pane().classList).toContain('wr-tooltip-overlay--left');
  });

  it('lets go outside the outer ring, after the grace that keeps the chip hoverable', () => {
    vi.useFakeTimers();
    try {
      create();
      move(210, 150);
      expect(chip()).not.toBeNull();

      // A corner of the drawing's box, well past the ring: the chip waits out the grace a
      // pointer needs to cross onto it, then closes.
      move(105, 105);
      expect(root().querySelector('.wr-radar-chart__crosshair')).not.toBeNull();
      vi.advanceTimersByTime(150);
      fixture.detectChanges();
      expect(root().querySelector('.wr-radar-chart__crosshair')).toBeNull();
      expect(chip()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('opens nothing on an axis no series shown has a value on', () => {
    create();
    // B has no value at three o'clock, so with A hidden that axis has nothing to mark.
    fixture.componentInstance.hidden.set([0]);
    fixture.detectChanges();
    move(270, 205);
    expect(chip()).toBeNull();
    expect(root().querySelector('.wr-radar-chart__crosshair')).toBeNull();

    // Every series hidden: the web is empty, and hovering it opens nothing anywhere.
    fixture.componentInstance.hidden.set([0, 1]);
    fixture.detectChanges();
    move(210, 150);
    expect(chip()).toBeNull();
    expect(root().querySelector('.wr-radar-chart__crosshair')).toBeNull();
    expect(root().querySelectorAll('.wr-radar-chart__hover-dot')).toHaveLength(0);
  });

  it('closes an open chip once the series it lists is hidden under it', () => {
    create();
    move(270, 205);
    expect(rows()).toEqual(['A 60']);

    fixture.componentInstance.hidden.set([0]);
    fixture.detectChanges();
    expect(chip()).toBeNull();
    expect(root().querySelector('.wr-radar-chart__crosshair')).toBeNull();
  });

  it('shows nothing with `tooltip` off', () => {
    create();
    fixture.componentInstance.tooltip.set(false);
    fixture.detectChanges();
    move(210, 150);

    expect(chip()).toBeNull();
    expect(root().querySelector('.wr-radar-chart__crosshair')).toBeNull();
  });
});
