import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrLineChart } from './line-chart';
import type { WrLineSeries } from './types';

/**
 * The legend is a `ul[wr-chart-legend]` since 15.1, and two things ride on it: the rows
 * keep every class the chart drew before (they are public API, and consumers style
 * them), and with `toggleableLegend` a row shows and hides its series through the
 * `hiddenSeries` model. A hidden series is read out of everything that reads values —
 * the lines, the dots, the y axis and the tooltip — and out of nothing else: its legend
 * row stays, and the x axis keeps its length.
 *
 * Everything is read off the rendered DOM. The y ticks are what proves the axis refitted,
 * and the line's `d` is what proves the x positions did not move.
 */
const SERIES: readonly WrLineSeries[] = [
  { label: 'Visits', data: [10, 20, 30] },
  { label: 'Revenue', data: [100, 200, 300] },
  { label: 'Signups', data: [1, 2, 3] },
];

@Component({
  imports: [WrLineChart],
  template: `
    <wr-line-chart
      [series]="series()"
      [xLabels]="xLabels()"
      [showLegend]="showLegend()"
      [toggleableLegend]="toggleable()"
      [(hiddenSeries)]="hidden"
    />
  `,
})
class Host {
  readonly series = signal<readonly WrLineSeries[]>(SERIES);
  readonly xLabels = signal<readonly string[]>(['Mon', 'Tue', 'Wed']);
  readonly showLegend = signal(true);
  readonly toggleable = signal(false);
  readonly hidden = signal<readonly number[]>([]);
}

describe('WrLineChart legend', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): Host => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const legend = (): HTMLUListElement | null => root().querySelector<HTMLUListElement>('.wr-line-chart__legend');
  const rows = (): HTMLLIElement[] => [...root().querySelectorAll<HTMLLIElement>('.wr-line-chart__legend-item')];
  const buttons = (): HTMLButtonElement[] => [...(legend()?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
  const lines = (): SVGPathElement[] => [...root().querySelectorAll<SVGPathElement>('.wr-line-chart__line')];
  const ticks = (): string[] => [...root().querySelectorAll('.wr-line-chart__tick')].map(t => t.textContent.trim());
  const tooltipRows = (): string[] =>
    [...root().querySelectorAll('.wr-line-chart__tooltip-name')].map(el => el.textContent.trim());
  const drawing = (): SVGSVGElement => root().querySelector<SVGSVGElement>('.wr-line-chart__svg')!;
  const render = (): void => fixture.detectChanges();

  /** jsdom lays nothing out, so the drawing reads a clientX as a viewBox x. Bubbling: the plot listens. */
  const hoverAt = (clientX: number): void => {
    drawing().getBoundingClientRect = () => new DOMRect(0, 0, 600, 300);
    drawing().dispatchEvent(new MouseEvent('mousemove', { clientX, bubbles: true }));
    render();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    render();
  });

  afterEach(() => fixture.destroy());

  it('draws its legend with the shared one, and every row keeps the classes it had', () => {
    expect(legend()!.classList).toContain('wr-chart-legend');
    // The rows are a list whatever the stylesheet does to its markers.
    expect(legend()!.getAttribute('role')).toBe('list');
    expect(rows().map(row => row.classList.contains('wr-chart-legend__item'))).toEqual([true, true, true]);

    const swatches = rows().map(row => row.querySelector('svg.wr-line-chart__swatch')!);
    expect(swatches.every(swatch => swatch.classList.contains('wr-chart-legend__swatch--line'))).toBe(true);
    expect(swatches.map(swatch => swatch.getAttribute('aria-hidden'))).toEqual(['true', 'true', 'true']);
    // The key is the series' own dash, the first one solid, in the series' own colour.
    expect(swatches.map(swatch => swatch.querySelector('line')!.getAttribute('stroke-dasharray'))).toEqual([
      null,
      '7 4',
      '2 3',
    ]);
    expect(swatches.map(swatch => swatch.querySelector('line')!.getAttribute('stroke'))).toEqual(
      lines().map(line => line.getAttribute('stroke'))
    );
    expect(rows().map(row => row.querySelector('.wr-line-chart__legend-label')!.textContent.trim())).toEqual([
      'Visits',
      'Revenue',
      'Signups',
    ]);
  });

  it('is a plain list by default: no buttons, no name, nothing hidden', () => {
    expect(buttons()).toEqual([]);
    expect(legend()!.getAttribute('aria-label')).toBeNull();
    expect(lines()).toHaveLength(3);
  });

  it('keeps two series that share a label apart, in the legend, the drawing and the tooltip', () => {
    // Tracked by label, the legend and the lines handed Angular two rows with one key.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    host().series.set([
      { label: 'Visits', data: [10, 20, 30] },
      { label: 'Visits', data: [5, 6, 7] },
    ]);
    render();
    hoverAt(300);

    expect(rows().map(row => row.textContent.trim())).toEqual(['Visits', 'Visits']);
    expect(lines()).toHaveLength(2);
    expect(tooltipRows()).toEqual(['Visits', 'Visits']);
    expect(warn.mock.calls.flat().join(' ')).not.toMatch(/NG0955/);
    warn.mockRestore();
  });

  it('makes every row a toggle that hides its series from the drawing, the axis and the tooltip', () => {
    host().toggleable.set(true);
    render();

    expect(buttons().map(button => button.getAttribute('aria-pressed'))).toEqual(['true', 'true', 'true']);
    // The y axis is fitted to Revenue, the largest series.
    expect(ticks()[0]).toBe('400');

    buttons()[1].click();
    render();

    expect(host().hidden()).toEqual([1]);
    expect(buttons().map(button => button.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'true']);
    expect(rows()[1].classList).toContain('wr-chart-legend__item--hidden');
    expect(lines()).toHaveLength(2);
    expect(lines().map(line => line.getAttribute('stroke'))).toEqual([
      'var(--wr-color-primary)',
      // The third series keeps its own colour and dash: they belong to its position.
      'var(--wr-color-warning)',
    ]);
    expect(lines()[1].getAttribute('stroke-dasharray')).toBe('2 3');
    // Refitted to the series still shown: Visits peaks at 30.
    expect(ticks()).toEqual(['40', '30', '20', '10', '0']);

    hoverAt(300);
    expect(tooltipRows()).toEqual(['Visits', 'Signups']);

    buttons()[1].click();
    render();
    expect(host().hidden()).toEqual([]);
    expect(lines()).toHaveLength(3);
    expect(ticks()[0]).toBe('400');
  });

  it('honours a hidden series the host binds, with or without the toggle', () => {
    host().hidden.set([0]);
    render();

    expect(buttons()).toEqual([]);
    expect(lines()).toHaveLength(2);
    // The legend still lists it, and says it is hidden: struck through for the eye, and in
    // words for a screen reader, which hears no strike-through.
    expect(rows()).toHaveLength(3);
    expect(rows()[0].classList).toContain('wr-chart-legend__item--hidden');
    expect(rows().map(row => row.textContent.trim())).toEqual(['Visits hidden', 'Revenue', 'Signups']);

    host().toggleable.set(true);
    render();
    expect(lines()).toHaveLength(2);
    // A toggle says it through aria-pressed, and its name stays the series' alone.
    expect(buttons().map(button => button.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'true']);
    expect(rows().map(row => row.textContent.trim())).toEqual(['Visits', 'Revenue', 'Signups']);
  });

  it('still hides a series with the legend switched off', () => {
    host().showLegend.set(false);
    host().hidden.set([1]);
    render();

    expect(legend()).toBeNull();
    expect(lines()).toHaveLength(2);
    expect(ticks()[0]).toBe('40');
  });

  it('keeps the x axis when the longest series is hidden, so the lines still shown stay put', () => {
    host().xLabels.set([]);
    host().series.set([
      { label: 'Short', data: [1, 2, 3] },
      { label: 'Long', data: [1, 2, 3, 4, 5] },
    ]);
    render();
    const before = lines()[0].getAttribute('d');
    // Five slots, so the short series' third point is half way across.
    expect(before).toMatch(/^M 0\.00 \S+ L 150\.00 \S+ L 300\.00 /);

    host().hidden.set([1]);
    render();

    expect(lines()).toHaveLength(1);
    // Same x for every point; only the y moved, with the axis refitted to the short series.
    expect(lines()[0].getAttribute('d')).toMatch(/^M 0\.00 \S+ L 150\.00 \S+ L 300\.00 /);
    expect(ticks()[0]).toBe('4');
  });

  it('draws the empty frame and opens no readout with every series hidden', () => {
    host().hidden.set([0, 1, 2]);
    render();

    expect(lines()).toEqual([]);
    expect(root().querySelectorAll('.wr-line-chart__dot')).toHaveLength(0);
    expect(ticks()).toEqual(['1', '0.75', '0.5', '0.25', '0']);

    hoverAt(300);
    expect(root().querySelector('.wr-line-chart__tooltip')).toBeNull();
    expect(root().querySelector('.wr-line-chart__crosshair')).toBeNull();
  });

  it('ignores a position past the end of the series', () => {
    host().hidden.set([7]);
    render();

    expect(lines()).toHaveLength(3);
    expect(rows().some(row => row.classList.contains('wr-chart-legend__item--hidden'))).toBe(false);
  });
});
