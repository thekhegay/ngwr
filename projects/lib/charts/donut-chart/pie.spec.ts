import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrDonutChart } from './donut-chart';
import type { WrDonutSegment } from './types';

const SEGMENTS: readonly WrDonutSegment[] = [
  { label: 'Direct', value: 30 },
  { label: 'Search', value: 50, color: '#123456' },
  { label: 'Social', value: 20 },
];

/**
 * A sliver of one hundredth of a turn (3.6°) at twelve o'clock, between two slices wider
 * than any hover target.
 */
const SLIVER: readonly WrDonutSegment[] = [
  { label: 'Sliver', value: 1 },
  { label: 'Most', value: 74 },
  { label: 'Rest', value: 25 },
];

@Component({
  imports: [WrDonutChart],
  template: `
    <wr-donut-chart
      [segments]="segments()"
      [pie]="pie()"
      [thickness]="thickness()"
      [size]="size()"
      [tooltip]="tooltip()"
      [ariaLabel]="ariaLabel()"
      [centerValue]="centerValue()"
      [centerLabel]="centerLabel()"
      [toggleableLegend]="toggleable()"
      [(hiddenSegments)]="hidden"
    />
  `,
})
class Host {
  readonly segments = signal<readonly WrDonutSegment[]>(SEGMENTS);
  readonly pie = signal(true);
  readonly thickness = signal(30);
  readonly size = signal(200);
  readonly tooltip = signal(true);
  readonly ariaLabel = signal<string | null>(null);
  readonly centerValue = signal('');
  readonly centerLabel = signal('');
  readonly toggleable = signal(false);
  readonly hidden = signal<readonly number[]>([]);
}

/**
 * Where a point of the drawing sits, in degrees clockwise from twelve o'clock: the frame
 * a reader names a slice by. The drawing's y runs downwards.
 */
function degrees(x: number, y: number): number {
  return (Math.atan2(x - 50, 50 - y) * 180) / Math.PI;
}

/**
 * The start and end of a wedge's OUTER arc, in degrees, read off its `d`. A pie's wedge
 * starts at the centre and draws a line out to that arc first; a ring segment starts on it.
 */
function outerArc(d: string): { start: number; end: number } {
  const match = /^(?:M 50 50 L|M) (\S+) (\S+) A 50 50 0 [01] 1 (\S+) (\S+)/.exec(d);
  if (!match) throw new Error(`not a wedge: ${d}`);
  const [x0, y0, x1, y1] = match.slice(1).map(Number);
  return { start: degrees(x0, y0), end: degrees(x1, y1) };
}

/**
 * `pie` fills every slice to the centre and drops the centre text, and everything else is
 * the donut's. The wedges are read through the rendered `d`, as in the donut's own spec.
 */
describe('WrDonutChart pie', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): Host => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const chart = (): HTMLElement => root().querySelector<HTMLElement>('wr-donut-chart')!;
  const svg = (): SVGSVGElement => root().querySelector<SVGSVGElement>('.wr-donut-chart__surface svg')!;
  const slices = (): SVGPathElement[] => [...root().querySelectorAll<SVGPathElement>('.wr-donut-chart__slice')];
  const buttons = (): HTMLButtonElement[] => [
    ...root().querySelectorAll<HTMLButtonElement>('.wr-donut-chart__legend button'),
  ];
  const chip = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-chart-tooltip');
  const render = (): void => fixture.detectChanges();

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    render();
  });

  afterEach(() => fixture.destroy());

  it('fills every slice to the centre, whatever the thickness says', () => {
    expect(chart().classList).toContain('wr-donut-chart--pie');
    // Direct is 30% of the turn: from the top, out of the centre, clockwise to 18° past
    // three o'clock, and back to the centre.
    expect(slices()[0].getAttribute('d')).toBe('M 50 50 L 50.00 0.00 A 50 50 0 0 1 97.55 65.45 Z');
    expect(slices()[1].getAttribute('d')!.startsWith('M 50 50 L 97.55 65.45 ')).toBe(true);

    // The same drawing a thickness of 0 makes, which is how a pie was drawn before `pie`.
    const pie = slices().map(path => path.getAttribute('d'));
    host().pie.set(false);
    host().thickness.set(0);
    render();
    expect(slices().map(path => path.getAttribute('d'))).toEqual(pie);
    expect(chart().classList).not.toContain('wr-donut-chart--pie');
  });

  it('draws a lone slice as a whole disc, with no hole', () => {
    host().segments.set([{ label: 'All', value: 10 }]);
    render();

    expect(slices()[0].getAttribute('d')).toBe('M 100 50 A 50 50 0 1 1 0 50 A 50 50 0 1 1 100 50');
  });

  it('prints no centre text, which has no hole to sit in', () => {
    host().centerValue.set('60%');
    host().centerLabel.set('Disk');
    render();
    expect(root().querySelector('.wr-donut-chart__center')).toBeNull();

    // The same inputs on a ring print as they always did.
    host().pie.set(false);
    render();
    expect(root().querySelector('.wr-donut-chart__center-value')!.textContent.trim()).toBe('60%');
    expect(root().querySelector('.wr-donut-chart__center-label')!.textContent.trim()).toBe('Disk');
  });

  it('is named a pie chart, and a bound name still wins', () => {
    expect(svg().getAttribute('role')).toBe('img');
    expect(svg().getAttribute('aria-label')).toBe('Pie chart');

    host().ariaLabel.set('Traffic by source');
    render();
    expect(svg().getAttribute('aria-label')).toBe('Traffic by source');

    host().ariaLabel.set(null);
    host().pie.set(false);
    render();
    expect(svg().getAttribute('aria-label')).toBe('Donut chart');
  });

  it('keeps the legend toggle, and the slices still shown fill the pie', () => {
    host().toggleable.set(true);
    render();

    buttons()[1].click();
    render();

    expect(host().hidden()).toEqual([1]);
    expect(slices()).toHaveLength(2);
    // Direct is 30 of the 50 still shown: 60% of the turn, a large arc, from the centre.
    expect(slices()[0].getAttribute('d')).toBe('M 50 50 L 50.00 0.00 A 50 50 0 1 1 20.61 90.45 Z');
  });

  it('opens the tooltip on a slice', () => {
    slices()[1].dispatchEvent(new MouseEvent('mouseenter'));
    render();

    expect(chip()?.querySelector('.wr-chart-tooltip__label')?.textContent.trim()).toBe('Search');
    expect(chip()?.querySelector('.wr-chart-tooltip__value')?.textContent.trim()).toBe('50');
  });
});

/**
 * In a pie, a slice of a few degrees is a few px of arc, which no pointer lands on. It gets
 * an invisible wedge over the pie widened toward 12px of outer arc, out of what the wider
 * slices beside it can spare. At the default 200px the radius is 100px, so 12px is 0.12
 * rad, 6.88°.
 */
describe('WrDonutChart sliver hover target', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): Host => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const hits = (): SVGPathElement[] => [...root().querySelectorAll<SVGPathElement>('.wr-donut-chart__hit')];
  const arcs = (): { start: number; end: number }[] => hits().map(hit => outerArc(hit.getAttribute('d')!));
  const chip = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-chart-tooltip');
  const render = (): void => fixture.detectChanges();
  const TARGET = (0.12 * 180) / Math.PI;

  /** The slice each target opens the tooltip for, read off the chip it opens. */
  const owners = (): string[] =>
    hits().map(hit => {
      hit.dispatchEvent(new MouseEvent('mouseenter'));
      render();
      return chip()?.querySelector('.wr-chart-tooltip__label')?.textContent.trim() ?? '';
    });

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    host().segments.set(SLIVER);
    render();
  });

  afterEach(() => fixture.destroy());

  it('adds nothing to a pie whose slices are all wide enough', () => {
    host().segments.set(SEGMENTS);
    render();

    expect(hits()).toEqual([]);
    expect(root().querySelectorAll('.wr-donut-chart__surface path')).toHaveLength(3);
  });

  it('draws no target in the ring, which is drawn as it was before `pie`', () => {
    host().pie.set(false);
    render();

    expect(hits()).toEqual([]);
    // Every path is a slice, so a count of the drawing's paths still counts the slices.
    expect(root().querySelectorAll('.wr-donut-chart__surface path')).toHaveLength(3);
  });

  it('gives a sliver a wider target out of the centre, the same angle taken from each side', () => {
    expect(hits()).toHaveLength(1);
    const hit = hits()[0];
    expect(hit.getAttribute('fill')).toBe('none');
    // Not `all`, which would hit-test the unpainted stroke too and move every edge out.
    expect(hit.getAttribute('pointer-events')).toBe('fill');
    expect(hit.getAttribute('d')!.startsWith('M 50 50 L ')).toBe(true);

    // The sliver runs 0°–3.6°, so its target is centred on 1.8° and 6.88° wide.
    const [{ start, end }] = arcs();
    expect(start).toBeCloseTo(1.8 - TARGET / 2, 1);
    expect(end).toBeCloseTo(1.8 + TARGET / 2, 1);
  });

  it("opens the sliver's tooltip from its target", () => {
    expect(owners()).toEqual(['Sliver']);
    expect(chip()?.querySelector('.wr-chart-tooltip__value')?.textContent.trim()).toBe('1');
  });

  it('keeps the edge between two slivers where it is, and grows each on its open side', () => {
    // 0°–3.6° and 3.6°–7.2°: neither covers the other, so each takes its whole shortfall
    // from the wide slice on its far side.
    host().segments.set([
      { label: 'A', value: 1 },
      { label: 'B', value: 1 },
      { label: 'Rest', value: 98 },
    ]);
    render();

    const [a, b] = arcs();
    expect(a.start).toBeCloseTo(3.6 - TARGET, 1);
    expect(a.end).toBeCloseTo(3.6, 1);
    expect(b.start).toBeCloseTo(3.6, 1);
    expect(b.end).toBeCloseTo(3.6 + TARGET, 1);
  });

  it('leaves a slice between two slivers 12px of its own, and the slivers take the rest elsewhere', () => {
    // 'Small' runs 0.36°–7.56°: 7.2°, wider than a target, and the slivers on either side
    // of it may share only the 0.33° it can spare.
    host().segments.set([
      { label: 'Left', value: 0.1 },
      { label: 'Small', value: 2 },
      { label: 'Right', value: 0.1 },
      { label: 'Rest', value: 97.8 },
    ]);
    render();

    expect(owners()).toEqual(['Left', 'Right']);
    const [left, right] = arcs();
    expect(right.start - left.end).toBeCloseTo(TARGET, 2);
    expect(left.end).toBeCloseTo(0.36 + (7.2 - TARGET) / 2, 2);
    // What 'Small' could not give, the large slice on each far side did.
    expect(left.end - left.start).toBeCloseTo(TARGET, 2);
    expect(right.end - right.start).toBeCloseTo(TARGET, 2);
  });

  it('gives a sliver only what its neighbour spares, and the middle of a run none', () => {
    // From 349.2°: 2% (7.2°), then 1.5% (5.4°), 0.8%, 0.5% and 0.2% back round to the top.
    host().segments.set([50, 30, 10, 5, 2, 1.5, 0.8, 0.5, 0.2].map((value, i) => ({ label: `S${i}`, value })));
    render();

    // The 0.8% and 0.5% slices lie between two slivers and are read in the legend.
    expect(owners()).toEqual(['S5', 'S8']);
    const [s5, s8] = arcs().map(({ start, end }) => (end - start + 360) % 360);
    // 1.5% asks 1.48° of the 2%, which can spare 0.33°, and nothing of the 0.8% beside it.
    expect(s5).toBeCloseTo(5.4 + (7.2 - TARGET), 2);
    expect(s5).toBeLessThan(TARGET);
    // 0.2% takes its whole shortfall from the half at the top.
    expect(s8).toBeCloseTo(TARGET, 2);
  });

  it('gives no target to a slice that draws nothing', () => {
    host().segments.set([
      { label: 'Zero', value: 0 },
      { label: 'Half', value: 50 },
      { label: 'Other half', value: 50 },
    ]);
    render();
    expect(hits()).toEqual([]);

    host().segments.set(SLIVER);
    host().hidden.set([0]);
    render();
    expect(hits()).toEqual([]);
  });

  it('measures the target in px, so a large chart needs none and a small one is capped', () => {
    // At 400px, 3.6° is 12.6px of arc: wide enough already.
    host().size.set(400);
    render();
    expect(hits()).toEqual([]);

    // At 48px, 12px of arc would be 28.6°; the target stops at 15°.
    host().size.set(48);
    render();
    const [{ start, end }] = arcs();
    expect(end - start).toBeCloseTo(15, 1);
  });

  it('is not drawn with the tooltip off, since the tooltip is all it is for', () => {
    host().tooltip.set(false);
    render();

    expect(hits()).toEqual([]);
  });
});
