import { type Direction, Directionality } from '@angular/cdk/bidi';
import { Component, LOCALE_ID, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Subject } from 'rxjs';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrRadarChart } from './radar-chart';
import type { WrRadarSeries, WrRadarVariant } from './types';

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
      [variant]="variant()"
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
  readonly variant = signal<WrRadarVariant>('polygon');
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

  it('marks the polygon variant on the host by default', () => {
    expect(root().querySelector('wr-radar-chart')!.classList).toContain('wr-radar-chart--polygon');
    expect(root().querySelector('wr-radar-chart')!.classList).not.toContain('wr-radar-chart--polar-area');
  });
});

/**
 * The polar-area variant, through the same rendered `d`. Four axes put the wedges'
 * edges on the diagonals: each wedge is a quarter of the circle, centred on its axis.
 */
describe('WrRadarChart polar area', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): Host => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const all = <T extends Element>(selector: string): T[] => [...root().querySelectorAll<T>(selector)];
  const lines = (): SVGPathElement[] => all<SVGPathElement>('.wr-radar-chart__line');
  const areas = (): SVGPathElement[] => all<SVGPathElement>('.wr-radar-chart__area');
  const dots = (): SVGPathElement[] => all<SVGPathElement>('.wr-radar-chart__dot');
  const rings = (): SVGPathElement[] => all<SVGPathElement>('.wr-radar-chart__ring');
  const text = (selector: string): string[] => all<HTMLElement>(selector).map(el => el.textContent.trim());
  const set = (change: (h: Host) => void): void => {
    change(host());
    fixture.detectChanges();
  };
  /** The radius of every wedge in a path, read off its arc command. */
  const radii = (d: string): number[] => [...d.matchAll(/A (\S+) /g)].map(m => Number.parseFloat(m[1]));

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.variant.set('polar-area');
    fixture.componentInstance.axes.set(['N', 'E', 'S', 'W']);
    fixture.componentInstance.max.set(100);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('marks the variant on the host and names the drawing for it', () => {
    const chart = root().querySelector('wr-radar-chart')!;
    expect(chart.classList).toContain('wr-radar-chart--polar-area');
    expect(chart.classList).not.toContain('wr-radar-chart--polygon');
    expect(root().querySelector('.wr-radar-chart__svg')!.getAttribute('aria-label')).toBe('Polar area chart');

    // A name the host gives wins in either variant.
    set(h => h.ariaLabel.set('Two models'));
    expect(root().querySelector('.wr-radar-chart__svg')!.getAttribute('aria-label')).toBe('Two models');
  });

  it('outlines the wedges as one closed silhouette, each centred on its axis and sweeping clockwise', () => {
    set(h => h.series.set([{ label: 'A', data: [100, 25, Number.NaN, 4] }]));
    // N reaches the outer ring; E, a quarter of the value, half the radius; S is missing,
    // so the walk dips to the centre and draws no arc; W, a twenty-fifth, a fifth of the
    // radius. Between two wedges the step runs along the edge they share.
    expect(lines()[0].getAttribute('d')).toBe(
      'M 14.64 14.64 A 50.00 50.00 0 0 1 85.36 14.64 ' +
        'L 67.68 32.32 A 25.00 25.00 0 0 1 67.68 67.68 ' +
        'L 50.00 50.00 ' +
        'L 42.93 57.07 A 10.00 10.00 0 0 1 42.93 42.93 Z'
    );
  });

  it('strokes no shared edge twice, so a dash stays a dash', () => {
    // Two wedges side by side share an edge, and a closed path per wedge would stroke it
    // twice at two dash phases, which reads solid. Equal neighbours have no step at all.
    set(h => h.series.set([{ label: 'A', data: [50, 50, 50, 50] }]));
    const d = lines()[0].getAttribute('d')!;
    expect(d).not.toContain(' L ');
    expect(radii(d)).toEqual([35.36, 35.36, 35.36, 35.36]);
    expect(d.match(/M /g)).toHaveLength(1);
  });

  it('makes the AREA proportional to the value: the radius is its square root', () => {
    // Every wedge has the same angle, so its area goes with the square of its radius.
    // A radius in proportion to the value would paint 4× the ink for 2× the value.
    set(h => h.series.set([{ label: 'A', data: [100, 50, 25, 12.5] }]));
    const r = radii(lines()[0].getAttribute('d')!);
    const areaRatio = (a: number, b: number): number => (r[a] / r[b]) ** 2;
    expect(areaRatio(1, 0)).toBeCloseTo(0.5, 3);
    expect(areaRatio(2, 0)).toBeCloseTo(0.25, 3);
    expect(areaRatio(3, 2)).toBeCloseTo(0.5, 3);
    expect(r[2]).toBeCloseTo(25, 2);
  });

  it('rings the scale in circles at the same square-root radii, labelled with values', () => {
    expect(rings()).toHaveLength(4);
    for (const ring of rings()) expect(ring.getAttribute('d')).toContain(' A ');
    expect(radii(rings()[3].getAttribute('d')!)[0]).toBe(25);
    expect(text('.wr-radar-chart__ring-label')).toEqual(['100', '75', '50', '25']);
    // A ring labelled 25 out of 100 sits at half the radius, so the labels bunch outward.
    expect(
      all<HTMLElement>('.wr-radar-chart__ring-label').map(el => el.style.getPropertyValue('--wr-radar-chart-y'))
    ).toEqual(['0', '6.6987', '14.6447', '25']);
  });

  it('leaves out a ring value closer than a line to the last one kept, and keeps every ring', () => {
    // Square-root radii bunch outwards: at 280px the rings for 100, 90 and 80 sit 7.2px and
    // 7.6px apart, under the 16px line a value takes. Walking in from the outer ring, a
    // value closer than a line to the last one kept is dropped; its ring stays.
    set(h => h.rings.set(10));
    expect(rings()).toHaveLength(10);
    expect(text('.wr-radar-chart__ring-label')).toEqual(['100', '70', '50', '30', '10']);

    // The room is in pixels, so a smaller drawing keeps fewer.
    set(h => {
      h.rings.set(5);
      h.size.set(160);
    });
    expect(rings()).toHaveLength(5);
    expect(text('.wr-radar-chart__ring-label')).toEqual(['100', '60', '20']);

    // The polygon's rings are evenly spaced, and `rings` is how a host spaces them.
    set(h => {
      h.variant.set('polygon');
      h.rings.set(10);
      h.size.set(280);
    });
    expect(text('.wr-radar-chart__ring-label')).toHaveLength(10);
  });

  it('runs the spokes between the wedges rather than through them', () => {
    const ends = all<SVGLineElement>('.wr-radar-chart__spoke').map(spoke => [
      Number.parseFloat(spoke.getAttribute('x2')!),
      Number.parseFloat(spoke.getAttribute('y2')!),
    ]);
    const expected = [
      [14.645, 14.645],
      [85.355, 14.645],
      [85.355, 85.355],
      [14.645, 85.355],
    ];
    expect(ends).toHaveLength(4);
    ends.forEach(([x, y], i) => {
      expect(x).toBeCloseTo(expected[i][0], 2);
      expect(y).toBeCloseTo(expected[i][1], 2);
    });
    // The axis names stay on the axes, in the middle of their wedges.
    expect(
      all<HTMLElement>('.wr-radar-chart__axis-label').map(el => el.style.getPropertyValue('--wr-radar-chart-x'))
    ).toEqual(['50', '100', '50', '0']);
  });

  it('fills every series, a missing value being a missing wedge rather than a gap', () => {
    set(h =>
      h.series.set([
        { label: 'A', data: [80, 60, 40, 20] },
        { label: 'B', data: [50, Number.NaN, 50], color: '#123456' },
      ])
    );
    expect(lines()).toHaveLength(2);
    expect(areas()).toHaveLength(2);
    expect(areas()[1].getAttribute('d')).toBe(lines()[1].getAttribute('d'));
    // Two wedges for B: N and S. W is past the end of its data.
    expect(radii(lines()[1].getAttribute('d')!)).toHaveLength(2);
    // The overlaid series keep their own dashes, the first solid.
    expect(lines()[0].hasAttribute('stroke-dasharray')).toBe(false);
    expect(lines()[1].getAttribute('stroke-dasharray')).toBe('7 4');
    // A dot on the middle of each wedge's arc, none for the missing ones.
    expect(dots()).toHaveLength(6);
    expect(dots()[0].getAttribute('d')).toBe('M 50.00 5.28 h 0');

    set(h => h.fill.set(false));
    expect(areas()).toHaveLength(0);
  });

  it('starts a fitted scale at zero, and puts a negative value at the centre', () => {
    set(h => {
      h.max.set(0);
      h.dataTable.set(true);
      h.series.set([{ label: 'A', data: [80, -20, 40, 60] }]);
    });
    // The polygon would reach below zero for the -20; a wedge cannot. Five rings from zero
    // to 100, and 80 sits 14.8px under 100 at 280px, closer than a line, so it is the one
    // value left out.
    expect(rings()).toHaveLength(5);
    expect(text('.wr-radar-chart__ring-label')).toEqual(['100', '60', '40', '20']);
    // E has no area: the walk dips to the centre between N and S and draws no arc there.
    const d = lines()[0].getAttribute('d')!;
    expect(d).toContain(' L 50.00 50.00 L ');
    expect(radii(d)).toHaveLength(3);
    // The table keeps the figure the drawing cannot show.
    expect(text('.wr-chart-table tbody td')).toEqual(['80', '-20', '40', '60']);

    set(h => h.variant.set('polygon'));
    expect(text('.wr-radar-chart__ring-label')).toEqual(['100', '75', '50', '25', '0']);
  });

  it('draws the empty frame when nothing is above zero', () => {
    set(h => {
      h.max.set(0);
      h.series.set([{ label: 'A', data: [0, -5, 0, -1] }]);
    });
    expect(text('.wr-radar-chart__ring-label')).toEqual(['1', '0.75', '0.5', '0.25']);
    for (const path of all('path')) expect(path.getAttribute('d') ?? '').not.toContain('NaN');
  });

  it('draws no wedge with fewer than three axes', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    set(h => h.axes.set(['Only', 'Two']));
    expect(lines()).toHaveLength(0);
    expect(rings()).toHaveLength(4);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('keeps the legend, the toggle and the data table', () => {
    set(h => {
      h.toggleable.set(true);
      h.dataTable.set(true);
      h.ariaLabel.set('Models');
    });
    expect(text('.wr-radar-chart__legend .wr-chart-legend__label')).toEqual(['Model A', 'Model B']);
    expect(text('.wr-chart-table caption')).toEqual(['Models']);
    expect(text('.wr-chart-table thead th')).toEqual(['Model A', 'Model B']);

    all<HTMLButtonElement>('.wr-radar-chart__legend button')[1].click();
    fixture.detectChanges();

    expect(host().hidden()).toEqual([1]);
    expect(lines()).toHaveLength(1);
    expect(text('.wr-chart-table thead th')).toEqual(['Model A']);
  });

  it('captions the data table with the variant name when the host gives none', () => {
    set(h => h.dataTable.set(true));
    expect(text('.wr-chart-table caption')).toEqual(['Polar area chart']);
  });

  it('holds no tab stop of its own', () => {
    expect(root().querySelectorAll('[tabindex], button, a[href]')).toHaveLength(0);
  });
});

/**
 * jsdom lays nothing out and has no `ResizeObserver`, so the specs above thin the ring
 * values for `size` and a 16px line. A browser thins them for the drawing it lays out —
 * smaller than `size` on a phone — and the line box it measures.
 */
describe('WrRadarChart polar area measured', () => {
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

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('thins for the drawing it measures and the line it lays out, and lets go on destroy', async () => {
    TestBed.resetTestingModule();
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.variant.set('polar-area');
    fixture.componentInstance.max.set(100);
    fixture.detectChanges();
    await fixture.whenStable();
    const labels = (): string[] =>
      [...(fixture.nativeElement as HTMLElement).querySelectorAll('.wr-radar-chart__ring-label')].map(el =>
        el.textContent.trim()
      );

    // Assumed 280px: the four values sit 18.8px apart at the closest.
    expect(labels()).toEqual(['100', '75', '50', '25']);
    expect(observed).not.toBeNull();

    // A phone lays the same drawing out at 148px, where 75 sits 9.9px under 100.
    observed!.callback([{ contentRect: { width: 148, height: 148 } }]);
    fixture.detectChanges();
    expect(labels()).toEqual(['100', '50']);
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.wr-radar-chart__ring')).toHaveLength(4);

    // A host that sets a taller line gets more room between the values it keeps.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 24, 24));
    observed!.callback([{ contentRect: { width: 280, height: 280 } }]);
    fixture.detectChanges();
    expect(labels()).toEqual(['100', '50', '25']);

    // A hidden chart measures 0, and keeps the last reading rather than thin to nothing.
    observed!.callback([{ contentRect: { width: 0, height: 0 } }]);
    fixture.detectChanges();
    expect(labels()).toEqual(['100', '50', '25']);

    fixture.destroy();
    expect(observed!.disconnected).toBe(true);
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
    [variant]="variant()"
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
  readonly variant = signal<WrRadarVariant>('polygon');
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

  it('reads the wedge under the pointer in the polar-area variant, and rings the value on its arc', () => {
    create();
    fixture.componentInstance.variant.set('polar-area');
    fixture.detectChanges();
    // Just right of six o'clock, inside the S wedge.
    move(215, 260);

    expect(chip()!.querySelector('.wr-chart-tooltip__label')!.textContent.trim()).toBe('S');
    expect(rows()).toEqual(['A 70', 'B 40']);
    const crosshair = root().querySelector('.wr-radar-chart__crosshair')!;
    expect(crosshair.getAttribute('x2')).toBe('50');
    expect(crosshair.getAttribute('y2')).toBe('100');
    // A's 70 out of 100: √0.7 of the radius below the centre, on the middle of the arc.
    const ring = root().querySelector('.wr-radar-chart__hover-dot')!;
    expect(ring.getAttribute('d')).toBe(`M 50.00 ${(50 + 50 * Math.sqrt(0.7)).toFixed(2)} h 0`);
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
