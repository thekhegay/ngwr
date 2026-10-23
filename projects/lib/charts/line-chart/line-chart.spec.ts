import { Component, LOCALE_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrLineChart } from './line-chart';
import type { WrLineSeries } from './types';

const SERIES: readonly WrLineSeries[] = [
  { label: 'Visits', data: [10, 20, 30] },
  { label: 'Signups', data: [1, 2, 3], color: '#abcdef' },
];

@Component({
  imports: [WrLineChart],
  template: `
    <wr-line-chart
      [series]="series()"
      [xLabels]="xLabels()"
      [showLegend]="showLegend()"
      [showGrid]="showGrid()"
      [tooltip]="tooltip()"
      [valueFormat]="valueFormat()"
    />
  `,
})
class Host {
  readonly series = signal<readonly WrLineSeries[]>(SERIES);
  readonly xLabels = signal<readonly string[]>(['Mon', 'Tue', 'Wed']);
  readonly showLegend = signal(true);
  readonly showGrid = signal(true);
  readonly tooltip = signal(true);
  readonly valueFormat = signal<((value: number) => string) | null>(null);
}

/**
 * The chart is a fixed 600×300 viewBox drawn edge to edge, so every coordinate is exact
 * and no layout is needed to check it. What the legend shows is only the series NAMES —
 * unlike the donut, the numbers are not in text anywhere — so the plot's own name is the
 * whole of what a screen reader gets.
 */
describe('WrLineChart', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  // `.wr-line-chart__svg`, not a bare `svg`: the legend swatch is an `<svg>` as
  // well, and it comes first in the DOM.
  const svg = (): SVGSVGElement => root().querySelector<SVGSVGElement>('.wr-line-chart__svg')!;
  const lines = (): SVGPathElement[] => [...root().querySelectorAll<SVGPathElement>('path.wr-line-chart__line')];
  const legendLabels = (): string[] =>
    [...root().querySelectorAll('.wr-line-chart__legend-item')].map(el => el.textContent.trim());
  const allPaths = (): string[] => [...root().querySelectorAll('path')].map(el => el.getAttribute('d') ?? '');
  const dots = (): SVGPathElement[] => [...root().querySelectorAll<SVGPathElement>('path.wr-line-chart__dot')];
  /** A dot's x in viewBox units — it is a zero-length line drawn at its point. */
  const cx = (dot: Element): number => Number(/^M (\S+) /.exec(dot.getAttribute('d') ?? '')?.[1]);
  /** The y-axis labels, top to bottom, as rendered. */
  const ticks = (): string[] =>
    [...root().querySelectorAll<HTMLElement>('.wr-line-chart__tick')].map(el => el.textContent?.trim() ?? '');
  /** What each y label hands the stylesheet: its gridline's y, as a percentage of the drawing's height. */
  const tickYs = (): number[] =>
    [...root().querySelectorAll<HTMLElement>('.wr-line-chart__tick')].map(el =>
      Number.parseFloat(el.style.getPropertyValue('--wr-line-chart-y'))
    );

  /** What each x label hands the stylesheet, as a percentage of the chart's width. */
  const xLabelProps = (name: string): number[] =>
    [...root().querySelectorAll<HTMLElement>('.wr-line-chart__x-label')].map(el =>
      Number.parseFloat(el.style.getPropertyValue(name))
    );
  /** Each x label's offset, converted from percent-of-width back to viewBox units. */
  const xLabelPositions = (): number[] => xLabelProps('--wr-line-chart-x').map(percent => (percent / 100) * 600);

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('draws one line per series', () => {
    expect(lines().length).toBe(2);
    for (const line of lines()) expect(line.getAttribute('d')).not.toContain('NaN');
  });

  it('names itself, because the numbers are nowhere in text', () => {
    // The legend carries labels only, so without a name on the plot the chart is nothing
    // at all to a screen reader.
    const plot = root().querySelector<HTMLElement>('.wr-line-chart__plot')!;
    expect(plot.getAttribute('role')).toBe('img');
    expect(plot.getAttribute('aria-label')).toBe('Line chart');
  });

  it('hands the hover tooltip the x of its point, so it can stay inside the chart at either end', () => {
    // jsdom lays nothing out, so the plot's box is stubbed: 600px wide at the origin
    // makes a clientX read as a viewBox x. Where the box then lands is CSS — centred on
    // its point, clamped at the ends — measured in a browser; what the clamp is computed
    // from is this number and the layer its `cqw` resolves against.
    svg().getBoundingClientRect = () => new DOMRect(0, 0, 600, 300);
    const tooltipAt = (clientX: number): HTMLElement => {
      svg().dispatchEvent(new MouseEvent('mousemove', { clientX, bubbles: true }));
      fixture.detectChanges();
      return root().querySelector<HTMLElement>('.wr-line-chart__tooltip')!;
    };
    const tooltipX = (clientX: number): number =>
      Number.parseFloat(tooltipAt(clientX).style.getPropertyValue('--wr-line-chart-x'));

    // The drawing runs edge to edge of the 600 viewBox: the first point is at 0%, the last
    // at 100%, and the tooltip carries the same number as the x label under it.
    expect(tooltipX(0)).toBeCloseTo(0, 5);
    expect(tooltipX(600)).toBeCloseTo(100, 5);
    expect(tooltipX(600)).toBeCloseTo(xLabelProps('--wr-line-chart-x')[2], 5);

    // The query container is a layer of its own spanning the plot, not the plot: on the
    // plot, the containment would take the drawing out of the chart's intrinsic width.
    const layer = tooltipAt(300).parentElement!;
    expect(layer.classList).toContain('wr-line-chart__tooltip-layer');
    expect(layer.parentElement!.classList).toContain('wr-line-chart__plot');
  });

  it('uses the given colour and falls back through the palette', () => {
    expect(lines()[0].getAttribute('stroke')).toBe('var(--wr-color-primary)');
    expect(lines()[1].getAttribute('stroke')).toBe('#abcdef');
  });

  it('lists the series in the legend, and drops the list when asked', () => {
    expect(legendLabels()).toEqual(['Visits', 'Signups']);

    fixture.componentInstance.showLegend.set(false);
    fixture.detectChanges();
    expect(root().querySelector('.wr-line-chart__legend')).toBeNull();
  });

  it('spans the drawing from edge to edge', () => {
    // The 36 viewBox units kept at the left for the tick labels are gone with the labels:
    // the first point sits at 0 and the last at 600, whatever the values are, and the
    // room round the dots is CSS padding on the plot.
    const d = lines()[0].getAttribute('d')!;
    expect(d.startsWith('M 0.00 ')).toBe(true);
    expect(d).toContain('L 600.00 ');
  });

  it('draws nothing for an empty series list', () => {
    fixture.componentInstance.series.set([]);
    fixture.componentInstance.xLabels.set([]);
    fixture.detectChanges();

    expect(lines()).toEqual([]);
    expect(root().querySelector('.wr-line-chart__legend')).toBeNull();
  });

  it('puts the y axis on readable numbers rather than quarters of the data', () => {
    // The axis used to be "the data's max plus 10%, divided into four", which
    // lands on a round number almost never: these seven integers gave
    // 38.2 / 28.7 / 19.1 / 9.6 / 0. An axis is the one part of a chart a reader
    // does arithmetic against.
    fixture.componentInstance.series.set([{ label: 'Visits', data: [3, 12, 18, 9, 22, 30, 35] }]);
    fixture.detectChanges();

    expect(ticks()).toEqual(['40', '30', '20', '10', '0']);
  });

  it('keeps the ladder readable at every magnitude, and never touches the frame', () => {
    for (const [data, expected] of [
      [
        [12, 23],
        ['30', '20', '10', '0'],
      ],
      [
        [100, 8400],
        ['10K', '7.5K', '5K', '2.5K', '0'],
      ],
      [
        [0.2, 0.9],
        ['1', '0.75', '0.5', '0.25', '0'],
      ],
      // The thousands took one fraction digit whatever the step — the defect the small-value
      // ladder had already shed. A step of 250 printed 1250 as `1.3k` beside `1k`, and a
      // step of 25 printed -1000 and -1025 as `-1k` twice; that one is too fine for the
      // abbreviation to be any shorter, so the whole axis prints in full.
      [
        [400, 1000],
        ['1.25K', '1K', '750', '500', '250', '0'],
      ],
      [
        [-1050, -950],
        ['-925', '-950', '-975', '-1,000', '-1,025', '-1,050'],
      ],
    ] as const) {
      fixture.componentInstance.series.set([{ label: 'S', data: [...data] }]);
      fixture.detectChanges();
      expect(ticks(), String(data)).toEqual([...expected]);
      // The top tick is at or above the peak, which is what replaced the old
      // 10% pad: a line that ends exactly on the frame reads as clipped.
      expect(Number.parseFloat(ticks()[0].replace('K', 'e3'))).toBeGreaterThan(data[1]);
    }
  });

  it('centres a flat series instead of dividing by a zero span', () => {
    fixture.componentInstance.series.set([{ label: 'Flat', data: [5, 5, 5] }]);
    fixture.detectChanges();

    const d = lines()[0].getAttribute('d')!;
    expect(d).not.toContain('NaN');
    expect(d).not.toContain('Infinity');
  });

  it('keeps one non-finite datum from taking out every line', () => {
    // `Math.min(...data)` and `Math.max(...data)` are both NaN as soon as one datum is, so
    // every coordinate in EVERY series became `NaN` — invalid path geometry, and the whole
    // chart disappeared rather than the one bad point.
    fixture.componentInstance.series.set([
      { label: 'Good', data: [10, 20, 30] },
      { label: 'Bad', data: [1, Number.NaN, 3] },
    ]);
    fixture.detectChanges();

    for (const d of allPaths()) {
      expect(d).not.toContain('NaN');
      expect(d).not.toContain('Infinity');
    }
    // And the bad datum must not shift the SCALE either. The y axis is shared across
    // series, so the comparison is against the same two series with only the NaN gone —
    // dropping the whole series would legitimately rescale the chart.
    const withBad = lines()[0].getAttribute('d');
    fixture.componentInstance.series.set([
      { label: 'Good', data: [10, 20, 30] },
      { label: 'Bad', data: [1, 3] },
    ]);
    fixture.detectChanges();
    expect(lines()[0].getAttribute('d')).toBe(withBad);
  });

  it('leaves a gap where the data has one instead of sliding the rest left', () => {
    // Dropping the bad datum used to CLOSE the gap, which moved every later point one slot
    // left: Wednesday's 9 was drawn at Tuesday's x (and its tooltip headed "Tue"), Thursday's
    // 22 landed on Wednesday, and Thursday had no point at all. The hole keeps its index now
    // and the line breaks across it, rather than drawing a reading nobody took.
    fixture.componentInstance.series.set([{ label: 'Visits', data: [12, Number.NaN, 9, 22] }]);
    fixture.componentInstance.xLabels.set(['Mon', 'Tue', 'Wed', 'Thu']);
    fixture.detectChanges();

    // Four slots across the 600-wide viewBox: 0 / 200 / 400 / 600.
    const d = lines()[0].getAttribute('d')!;
    expect(d.startsWith('M 0.00 ')).toBe(true);
    expect(d).toContain('M 400.00 ');
    expect(d).toContain('L 600.00 ');
    // Tuesday has no reading, so no geometry is drawn at its x — and the run before it is
    // closed rather than joined to the run after.
    expect(d).not.toContain('200.00');
    expect(dots().map(dot => Math.round(cx(dot)))).toEqual([0, 400, 600]);
  });

  it('centres each x label on the point it names', () => {
    // The strip used to lay the labels out as equal centred flex slots — bar-chart geometry —
    // while the plot draws point `i` edge-to-edge at `i / (count - 1)`. Only the middle label
    // landed on its dot; the outer ones sat up to half a column away. They are positioned in
    // the SVG's own percentage space now, the same space the tooltip already used.
    // Both series share the same x's, so the distinct dot positions are the slots.
    const dotXs = [...new Set(dots().map(cx))].sort((a, b) => a - b);
    const labelXs = xLabelPositions();

    expect(labelXs.length).toBe(dotXs.length);
    for (const [i, x] of labelXs.entries()) expect(x).toBeCloseTo(dotXs[i], 6);
  });

  it('hands the strip the room each x label has', () => {
    // Centring a label on its point says nothing about how WIDE it may be, and for a
    // while nothing else did either: on a 600px-wide chart four pairs of twelve month
    // names printed over each other and December hung 13px outside the box. jsdom has no
    // layout, so what a spec can hold is the number the stylesheet is handed, and the
    // Chromium measurement lives in the stylesheet: three points across the drawing are
    // 50% of its width apart, and that is each label's slot.
    const strip = root().querySelector<HTMLElement>('.wr-line-chart__x-labels')!;
    expect(Number.parseFloat(strip.style.getPropertyValue('--wr-line-chart-x-slot'))).toBeCloseTo(50, 6);

    // A lone label has the whole strip.
    fixture.componentInstance.series.set([{ label: 'Visits', data: [1] }]);
    fixture.componentInstance.xLabels.set(['Mon']);
    fixture.detectChanges();
    expect(Number.parseFloat(strip.style.getPropertyValue('--wr-line-chart-x-slot'))).toBe(100);
    expect(xLabelProps('--wr-line-chart-x')).toEqual([50]);
  });

  it('keeps every label inside the chart and out of the next one, however dense the axis', () => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August'];
    fixture.componentInstance.series.set([{ label: 'Visits', data: months.map((_, i) => i) }]);
    fixture.componentInstance.xLabels.set(months);
    fixture.detectChanges();

    // The stylesheet places a label on its point, bounds it to its slot cut back at the
    // ends, and nudges it back in when it would cross an end of the strip. Nothing here is
    // laid out, so those rules are replayed over the numbers the component publishes, on a
    // strip 600px wide whose padding is 12px a side, with every label as wide as it may
    // be. What it checks is the two properties the bound exists to give: no box leaves the
    // strip, and none reaches into the next label's slot.
    const width = 600;
    const inset = 12;
    const drawing = width - 2 * inset;
    const strip = root().querySelector<HTMLElement>('.wr-line-chart__x-labels')!;
    const slot = Number.parseFloat(strip.style.getPropertyValue('--wr-line-chart-x-slot'));
    const boxes = xLabelProps('--wr-line-chart-x').map(x => {
      const point = inset + (drawing * x) / 100;
      const max = Math.min(
        (drawing * slot) / 100,
        inset + (drawing * (x + slot / 2)) / 100,
        inset + (drawing * (100 - x + slot / 2)) / 100
      );
      const left = Math.max(0, Math.min(point - max / 2, width - max));
      return { left, right: left + max };
    });

    for (const [i, box] of boxes.entries()) {
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(width + 0.000001);
      if (i > 0) expect(box.left).toBeGreaterThanOrEqual(boxes[i - 1].right - 0.000001);
    }
  });

  it('widens the axis for more labels than readings, instead of drawing past the end', () => {
    // The point count is the longest of the series and the labels, so a label list longer
    // than the data adds x positions rather than overflowing the ones it has.
    fixture.componentInstance.series.set([{ label: 'Visits', data: [1, 2, 3, 4] }]);
    fixture.componentInstance.xLabels.set(['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6']);
    fixture.detectChanges();

    const labelXs = xLabelPositions();
    expect(labelXs.length).toBe(6);
    // Still the two edges of the same 600-wide viewBox.
    expect(labelXs[0]).toBeCloseTo(0, 6);
    expect(labelXs.at(-1)).toBeCloseTo(600, 6);
    // The series stops where its data does — four dots across six slots.
    expect(dots().length).toBe(4);
  });

  it('labels the y axis with five ticks and drops the grid on request', () => {
    expect(root().querySelectorAll('.wr-line-chart__grid-line').length).toBe(5);

    fixture.componentInstance.showGrid.set(false);
    fixture.detectChanges();
    expect(root().querySelectorAll('.wr-line-chart__grid-line').length).toBe(0);
    // The labels go with their lines, gutter and all, so the drawing takes the width.
    expect(root().querySelector('.wr-line-chart__y-axis')).toBeNull();
  });

  it('writes the y labels as text beside the drawing, never inside it', () => {
    // `<text>` in a drawing stretched with `preserveAspectRatio="none"` stretches with it,
    // and the 36 viewBox units kept for it clipped a long label. The labels are HTML in a
    // column of their own, which sizes to the longest one — measured in a browser.
    const axis = root().querySelector<HTMLElement>('.wr-line-chart__y-axis')!;
    expect(svg().querySelector('text')).toBeNull();
    expect(ticks()).toEqual(['40', '30', '20', '10', '0']);
    expect([...axis.children].every(el => el.classList.contains('wr-line-chart__tick'))).toBe(true);

    // At inline start: first in the body, which is a grid, and a grid puts its first
    // column on the right under RTL. The plot follows it; the x labels sit under the plot.
    const body = axis.parentElement!;
    expect(body.classList).toContain('wr-line-chart__body');
    expect([...body.children].map(el => el.classList[0])).toEqual([
      'wr-line-chart__y-axis',
      'wr-line-chart__plot',
      'wr-line-chart__x-labels',
    ]);

    // Hidden, as they were inside the plot's `img`: what is announced is the plot's name.
    expect(axis.getAttribute('aria-hidden')).toBe('true');
  });

  it('hands each y label the height of its own gridline', () => {
    // Placed from its own tick, not spread over the column by `space-between`: once six
    // 16px labels no longer fitted an 80px plot, the column overflowed, grew the row past
    // the plot, and every label below the first slid off its line — 16px by the last one,
    // with the x labels pushed 20px down, measured in Chromium. The stylesheet turns the
    // percentage into a length inside the plot's padding; jsdom has no layout, so the
    // spec pins the numbers the template hands it.
    const gridYs = (): number[] =>
      [...root().querySelectorAll('.wr-line-chart__grid-line')].map(
        line => (Number(line.getAttribute('y1')) / 300) * 100
      );
    expect(gridYs()).toEqual([0, 25, 50, 75, 100]);
    expect(tickYs()).toEqual(gridYs());

    // A peak on a step lifts the top tick one step, which makes six labels.
    fixture.componentInstance.series.set([{ label: 'S', data: [0, 1] }]);
    fixture.detectChanges();
    expect(ticks()).toEqual(['1.25', '1', '0.75', '0.5', '0.25', '0']);
    expect(tickYs()).toEqual([0, 20, 40, 60, 80, 100]);
    expect(tickYs()).toEqual(gridYs());
  });

  it('abbreviates large ticks the way the locale does, and keeps tiny ones exact', () => {
    for (const [data, expected] of [
      [
        [0, 3_400_000],
        ['4M', '3M', '2M', '1M', '0'],
      ],
      [
        [0, 1_200_000_000],
        ['1.5B', '1B', '500M', '0'],
      ],
      // Significant digits down to the step's last one, so no tick is rounded into its
      // neighbour and none grows digits the step does not have.
      [
        [0.0001, 0.0009],
        ['0.001', '0.00075', '0.0005', '0.00025', '0'],
      ],
    ] as const) {
      fixture.componentInstance.series.set([{ label: 'S', data: [...data] }]);
      fixture.detectChanges();
      expect(ticks(), String(data)).toEqual([...expected]);
    }
  });

  it('writes a tiny reading in the tooltip by its significant digits, not as zero', () => {
    // `Intl.NumberFormat` stops at three fraction digits by default, which writes 0.0004
    // as `0` — a reading the data never took.
    svg().getBoundingClientRect = () => new DOMRect(0, 0, 600, 300);
    fixture.componentInstance.series.set([{ label: 'Rate', data: [0.0004, 0.0012, 1234.5] }]);
    fixture.detectChanges();
    const valueAt = (clientX: number): string => {
      svg().dispatchEvent(new MouseEvent('mousemove', { clientX, bubbles: true }));
      fixture.detectChanges();
      return root().querySelector('.wr-line-chart__tooltip-value')!.textContent.trim();
    };

    expect(valueAt(0)).toBe('0.0004');
    expect(valueAt(300)).toBe('0.0012');
    // Grouped, and never compact: the tooltip is where the exact figure is read.
    expect(valueAt(600)).toBe('1,234.5');
  });

  it('formats every number through `valueFormat` when one is given', () => {
    svg().getBoundingClientRect = () => new DOMRect(0, 0, 600, 300);
    fixture.componentInstance.valueFormat.set(value => `${value} ms`);
    fixture.detectChanges();

    expect(ticks()).toEqual(['40 ms', '30 ms', '20 ms', '10 ms', '0 ms']);
    svg().dispatchEvent(new MouseEvent('mousemove', { clientX: 300, bubbles: true }));
    fixture.detectChanges();
    expect([...root().querySelectorAll('.wr-line-chart__tooltip-value')].map(el => el.textContent.trim())).toEqual([
      '20 ms',
      '2 ms',
    ]);
  });

  it('opens the readout over the padding beside an end dot, on the end point', () => {
    // The drawing runs edge to edge, so the end dots overhang it into the plot's padding.
    // The plot hears the pointer there, and the nearest point is the end one.
    svg().getBoundingClientRect = () => new DOMRect(8, 0, 600, 300);
    const plot = root().querySelector<HTMLElement>('.wr-line-chart__plot')!;
    plot.dispatchEvent(new MouseEvent('mousemove', { clientX: 2, bubbles: true }));
    fixture.detectChanges();
    expect(root().querySelector('.wr-line-chart__tooltip-label')!.textContent.trim()).toBe('Mon');

    plot.dispatchEvent(new MouseEvent('mousemove', { clientX: 614, bubbles: true }));
    fixture.detectChanges();
    expect(root().querySelector('.wr-line-chart__tooltip-label')!.textContent.trim()).toBe('Wed');
  });

  it('reads out the x under the pointer, and drops the whole readout with `tooltip` off', () => {
    // jsdom lays nothing out, so the plot's box is stubbed: 600px wide at the origin makes
    // a clientX read as a viewBox x. x = 300 is the middle of the three points.
    svg().getBoundingClientRect = () => new DOMRect(0, 0, 600, 300);
    const readout = (): Element | null => root().querySelector('.wr-line-chart__tooltip');
    const move = (): void => {
      svg().dispatchEvent(new MouseEvent('mousemove', { clientX: 310, bubbles: true }));
      fixture.detectChanges();
    };

    move();
    expect(root().querySelector('.wr-line-chart__tooltip-label')!.textContent.trim()).toBe('Tue');
    expect(root().querySelector('.wr-line-chart__crosshair')).not.toBeNull();

    // Off while the pointer is still on it: the readout goes, it does not wait for a leave.
    fixture.componentInstance.tooltip.set(false);
    fixture.detectChanges();
    expect(readout()).toBeNull();

    move();
    expect(readout()).toBeNull();
    expect(root().querySelector('.wr-line-chart__crosshair')).toBeNull();
  });

  it('draws each dot as a round cap that does not stretch with the drawing', () => {
    // The drawing stretches to any box with `preserveAspectRatio="none"`, and a `<circle>`
    // stretched with it: a 3 × 5px oval on a phone, 9 × 5px at 1920px. A zero-length line
    // with a round cap and a non-scaling stroke is a circle in screen pixels at any size —
    // which is measured in a browser; what jsdom holds is that every dot is drawn that way.
    expect(root().querySelector('circle')).toBeNull();
    expect(dots().length).toBeGreaterThan(0);
    for (const dot of dots()) {
      expect(dot.getAttribute('d')).toMatch(/^M \S+ \S+ h 0$/);
      expect(dot.getAttribute('stroke-linecap')).toBe('round');
      expect(dot.getAttribute('vector-effect')).toBe('non-scaling-stroke');
    }
  });

  it('opens the readout on the mouse event a tap fires', () => {
    // A tap fires `pointerdown`, `pointerup` and `pointerleave` and no `pointermove`, then
    // the compatibility `mouseenter` / `mousemove` / `click`. The readout listened for
    // `pointermove` alone, so a phone never saw a value.
    svg().getBoundingClientRect = () => new DOMRect(0, 0, 600, 300);
    svg().dispatchEvent(new PointerEvent('pointerleave'));
    svg().dispatchEvent(new MouseEvent('mousemove', { clientX: 310, bubbles: true }));
    fixture.detectChanges();

    expect(root().querySelector('.wr-line-chart__tooltip-label')!.textContent.trim()).toBe('Tue');
  });

  it('closes the readout on Escape without the pointer moving, and keeps it closed on that point', () => {
    // WCAG 1.4.13: hover content dismissible without moving the pointer, as every other
    // chart's tooltip is. Every `mousemove` re-reports the point, so it stays shut until the
    // pointer reaches another one.
    svg().getBoundingClientRect = () => new DOMRect(0, 0, 600, 300);
    const move = (clientX: number): void => {
      svg().dispatchEvent(new MouseEvent('mousemove', { clientX, bubbles: true }));
      fixture.detectChanges();
    };
    const readout = (): Element | null => root().querySelector('.wr-line-chart__tooltip');

    move(310);
    expect(readout()).not.toBeNull();

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(readout()).toBeNull();
    expect(root().querySelector('.wr-line-chart__crosshair')).toBeNull();

    move(312);
    expect(readout()).toBeNull();

    move(590);
    expect(root().querySelector('.wr-line-chart__tooltip-label')!.textContent.trim()).toBe('Wed');
  });

  it('keeps the svg stretchable', () => {
    expect(svg().getAttribute('preserveAspectRatio')).toBe('none');
    expect(svg().getAttribute('viewBox')).toBe('0 0 600 300');
  });
});

describe('WrLineChart in another locale', () => {
  it("writes its numbers in LOCALE_ID's own convention", () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'de' }] });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.series.set([{ label: 'Umsatz', data: [1234.5, 3_400_000, 2_000_000] }]);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    // German abbreviates millions as `Mio.`, after a no-break space.
    const ticks = [...root.querySelectorAll('.wr-line-chart__tick')].map(el => el.textContent.trim());
    expect(ticks).toEqual(['4\u00a0Mio.', '3\u00a0Mio.', '2\u00a0Mio.', '1\u00a0Mio.', '0']);

    const svg = root.querySelector<SVGSVGElement>('.wr-line-chart__svg')!;
    svg.getBoundingClientRect = () => new DOMRect(0, 0, 600, 300);
    svg.dispatchEvent(new MouseEvent('mousemove', { clientX: 0, bubbles: true }));
    fixture.detectChanges();
    expect(root.querySelector('.wr-line-chart__tooltip-value')!.textContent.trim()).toBe('1.234,5');

    fixture.destroy();
  });

  it('lets `valueFormat` win over the locale', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'de' }] });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.series.set([{ label: 'Umsatz', data: [1234.5] }]);
    fixture.componentInstance.valueFormat.set(value => value.toFixed(2));
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    const svg = root.querySelector<SVGSVGElement>('.wr-line-chart__svg')!;
    svg.getBoundingClientRect = () => new DOMRect(0, 0, 600, 300);
    svg.dispatchEvent(new MouseEvent('mousemove', { clientX: 0, bubbles: true }));
    fixture.detectChanges();
    expect(root.querySelector('.wr-line-chart__tooltip-value')!.textContent.trim()).toBe('1234.50');

    fixture.destroy();
  });
});

describe('WrLineChart under a localized catalog', () => {
  it('takes its name from the catalog', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const plot = (fixture.nativeElement as HTMLElement).querySelector('.wr-line-chart__plot')!;
    expect(plot.getAttribute('aria-label')).toBe('Линейный график');

    fixture.destroy();
  });
});
