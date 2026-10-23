import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrDonutChart } from './donut-chart';
import type { WrDonutSegment } from './types';

/**
 * The legend is a `ul[wr-chart-legend]` since 15.1. Its rows keep every class the chart
 * drew before, its key gained the `aria-hidden` it lacked, and with `toggleableLegend` a
 * row hides its slice through `hiddenSegments`. A hidden slice draws no wedge, the rest
 * RE-NORMALISE to close the ring, and the tooltip cannot reach it.
 *
 * The ring is read through the rendered `d`, which is where a gap or an un-normalised
 * share would show: the first wedge's end is where the next one starts.
 */
const SEGMENTS: readonly WrDonutSegment[] = [
  { label: 'Direct', value: 30 },
  { label: 'Search', value: 50, color: '#123456' },
  { label: 'Social', value: 20 },
];

@Component({
  imports: [WrDonutChart],
  template: `
    <wr-donut-chart
      [segments]="segments()"
      [showLegend]="showLegend()"
      [toggleableLegend]="toggleable()"
      [(hiddenSegments)]="hidden"
    />
  `,
})
class Host {
  readonly segments = signal<readonly WrDonutSegment[]>(SEGMENTS);
  readonly showLegend = signal(true);
  readonly toggleable = signal(false);
  readonly hidden = signal<readonly number[]>([]);
}

describe('WrDonutChart legend', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): Host => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const legend = (): HTMLUListElement | null => root().querySelector<HTMLUListElement>('.wr-donut-chart__legend');
  const rows = (): HTMLLIElement[] => [...root().querySelectorAll<HTMLLIElement>('.wr-donut-chart__legend-item')];
  const buttons = (): HTMLButtonElement[] => [...(legend()?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
  const paths = (): SVGPathElement[] => [...root().querySelectorAll<SVGPathElement>('.wr-donut-chart__surface path')];
  const chip = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-chart-tooltip');
  const render = (): void => fixture.detectChanges();

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    render();
  });

  afterEach(() => fixture.destroy());

  it('draws its legend with the shared one, and every row keeps the classes it had', () => {
    expect(legend()!.classList).toContain('wr-chart-legend');
    expect(legend()!.getAttribute('role')).toBe('list');
    expect(rows().map(row => row.classList.contains('wr-chart-legend__item'))).toEqual([true, true, true]);

    const swatches = rows().map(row => row.querySelector<HTMLElement>('.wr-donut-chart__swatch')!);
    expect(swatches.every(swatch => swatch.classList.contains('wr-chart-legend__swatch--dot'))).toBe(true);
    // Inline, as the chart always wrote it, so forced colors cannot reset it to Canvas.
    expect(swatches[1].style.background).toBe('rgb(18, 52, 86)');
    expect(rows().map(row => row.querySelector('.wr-donut-chart__legend-label')!.textContent.trim())).toEqual([
      'Direct',
      'Search',
      'Social',
    ]);
    expect(rows().map(row => row.querySelector('.wr-donut-chart__legend-value')!.textContent.trim())).toEqual([
      '30',
      '50',
      '20',
    ]);
  });

  it('hides the key from a screen reader, since the row already says its name', () => {
    // The dot was the one key in the charts announced as an unnamed graphic.
    expect(rows().map(row => row.querySelector('.wr-donut-chart__swatch')!.getAttribute('aria-hidden'))).toEqual([
      'true',
      'true',
      'true',
    ]);
  });

  it('is a plain list by default, and draws every wedge', () => {
    expect(buttons()).toEqual([]);
    expect(paths()).toHaveLength(3);
  });

  it('hides a slice from a toggleable legend and closes the ring over the rest', () => {
    host().toggleable.set(true);
    render();
    expect(buttons().map(button => button.getAttribute('aria-pressed'))).toEqual(['true', 'true', 'true']);

    buttons()[1].click();
    render();

    expect(host().hidden()).toEqual([1]);
    expect(buttons().map(button => button.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'true']);
    expect(paths()).toHaveLength(2);
    expect(paths().map(path => path.getAttribute('fill'))).toEqual([
      'var(--wr-color-primary)',
      // Social keeps the colour of its own position.
      'var(--wr-color-warning)',
    ]);
    // Direct is 30 of the 50 still shown: 60% of the ring, from twelve o'clock to 126°,
    // a large arc. Social starts exactly there, so the ring closes with no gap.
    const [direct, social] = paths().map(path => path.getAttribute('d')!);
    expect(direct.startsWith('M 50.00 0.00 A 50 50 0 1 1 20.61 90.45 ')).toBe(true);
    expect(social.startsWith('M 20.61 90.45 ')).toBe(true);

    // The legend keeps the hidden row and its value, struck through.
    expect(rows().map(row => row.querySelector('.wr-donut-chart__legend-value')!.textContent.trim())).toEqual([
      '30',
      '50',
      '20',
    ]);
    expect(rows()[1].classList).toContain('wr-chart-legend__item--hidden');

    buttons()[1].click();
    render();
    expect(host().hidden()).toEqual([]);
    expect(paths()).toHaveLength(3);
  });

  it('honours hidden slices the host binds, with the legend on or off', () => {
    host().hidden.set([0, 2]);
    render();

    expect(paths()).toHaveLength(1);
    // The one slice still shown is the whole ring.
    expect(paths()[0].getAttribute('fill')).toBe('#123456');
    expect(paths()[0].getAttribute('d')).toMatch(/^M 100 50 A 50 50 0 1 1 0 50 A 50 50 0 1 1 100 50/);
    expect(rows().filter(row => row.classList.contains('wr-chart-legend__item--hidden'))).toHaveLength(2);
    // Said in words as well, since the legend does not toggle and has no aria-pressed to say it.
    expect(rows().map(row => row.querySelector('.wr-chart-legend__sr-only')?.textContent.trim() ?? null)).toEqual([
      'hidden',
      null,
      'hidden',
    ]);

    host().showLegend.set(false);
    render();
    expect(legend()).toBeNull();
    expect(paths()).toHaveLength(1);
  });

  it('draws nothing with every slice hidden, and keeps the legend to bring them back', () => {
    host().hidden.set([0, 1, 2]);
    render();

    expect(paths()).toEqual([]);
    expect(rows()).toHaveLength(3);
  });

  it('closes an open tooltip when its slice is hidden under it', async () => {
    paths()[2].dispatchEvent(new MouseEvent('mouseenter'));
    render();
    expect(chip()?.querySelector('.wr-chart-tooltip__label')?.textContent.trim()).toBe('Social');

    host().hidden.set([2]);
    render();
    await fixture.whenStable();

    expect(chip()).toBeNull();
  });

  it('reads out the right slice after a hidden one', () => {
    host().hidden.set([0]);
    render();

    paths()[1].dispatchEvent(new MouseEvent('mouseenter'));
    render();

    expect(chip()?.querySelector('.wr-chart-tooltip__label')?.textContent.trim()).toBe('Social');
    expect(chip()?.querySelector('.wr-chart-tooltip__value')?.textContent.trim()).toBe('20');
  });
});
