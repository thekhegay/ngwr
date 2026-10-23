import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrMeterGroup } from './meter-group';
import type { WrMeterSegment } from './types';

/**
 * The legend is a `ul[wr-chart-legend]` since 15.1, its rows keeping every class the
 * group drew before, and with `toggleableLegend` a row hides its segment through
 * `hiddenSegments`. A hidden segment draws no band and leaves the sum: with no `max` the
 * rest share the bar, while an explicit `max` is a capacity and stays. The bar announces
 * what it draws.
 *
 * The shares are read off the inline `width` the component writes, and the total off
 * the `progressbar`'s own ARIA.
 */
const SEGMENTS: readonly WrMeterSegment[] = [
  { label: 'Apps', value: 30 },
  { label: 'Photos', value: 50 },
  { label: 'Free', value: 20 },
];

@Component({
  imports: [WrMeterGroup],
  template: `
    <wr-meter-group
      [segments]="segments()"
      [max]="max()"
      [showValues]="showValues()"
      [toggleableLegend]="toggleable()"
      [(hiddenSegments)]="hidden"
    />
  `,
})
class Host {
  readonly segments = signal<readonly WrMeterSegment[]>(SEGMENTS);
  readonly max = signal(0);
  readonly showValues = signal(true);
  readonly toggleable = signal(false);
  readonly hidden = signal<readonly number[]>([]);
}

describe('WrMeterGroup legend', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): Host => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const legend = (): HTMLUListElement | null => root().querySelector<HTMLUListElement>('.wr-meter-group__legend');
  const rows = (): HTMLLIElement[] => [...root().querySelectorAll<HTMLLIElement>('.wr-meter-group__legend-item')];
  const buttons = (): HTMLButtonElement[] => [...(legend()?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
  const bar = (): HTMLElement => root().querySelector<HTMLElement>('.wr-meter-group__bar')!;
  const bands = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('.wr-meter-group__slice')];
  const shares = (): [string | null, string][] =>
    bands().map(band => [band.getAttribute('data-label'), band.style.width]);
  const aria = (): (string | null)[] =>
    ['aria-valuenow', 'aria-valuemax', 'aria-valuetext'].map(name => bar().getAttribute(name));
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

    const swatches = rows().map(row => row.querySelector<HTMLElement>('.wr-meter-group__swatch')!);
    expect(swatches.map(swatch => swatch.getAttribute('aria-hidden'))).toEqual(['true', 'true', 'true']);
    expect(swatches.map(swatch => swatch.style.background)).toEqual(bands().map(band => band.style.background));
    expect(rows().map(row => row.querySelector('.wr-meter-group__legend-label')!.textContent.trim())).toEqual([
      'Apps',
      'Photos',
      'Free',
    ]);
    expect(rows().map(row => row.querySelector('.wr-meter-group__legend-value')?.textContent.trim())).toEqual([
      '30',
      '50',
      '20',
    ]);
  });

  it('drops the value element, not just its text, with `showValues` off', () => {
    host().showValues.set(false);
    render();

    expect(root().querySelectorAll('.wr-meter-group__legend-value')).toHaveLength(0);
    expect(rows()).toHaveLength(3);
  });

  it('hides a segment from a toggleable legend, and the rest share the bar', () => {
    host().toggleable.set(true);
    render();
    expect(buttons().map(button => button.getAttribute('aria-pressed'))).toEqual(['true', 'true', 'true']);

    buttons()[1].click();
    render();

    expect(host().hidden()).toEqual([1]);
    expect(buttons().map(button => button.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'true']);
    // 30 and 20 of the 50 still shown.
    expect(shares()).toEqual([
      ['Apps', '60%'],
      ['Free', '40%'],
    ]);
    expect(aria()).toEqual(['50', '50', '50']);
    expect(rows()[1].classList).toContain('wr-chart-legend__item--hidden');
    // The hidden row keeps its value, so a reader sees what was taken out.
    expect(rows()[1].querySelector('.wr-meter-group__legend-value')!.textContent.trim()).toBe('50');

    buttons()[1].click();
    render();
    expect(host().hidden()).toEqual([]);
    expect(bands()).toHaveLength(3);
    expect(aria()).toEqual(['100', '100', '100']);
  });

  it('keeps an explicit capacity, so a hidden segment leaves empty track', () => {
    host().max.set(200);
    host().hidden.set([1]);
    render();

    expect(shares()).toEqual([
      ['Apps', '15%'],
      ['Free', '10%'],
    ]);
    expect(aria()).toEqual(['50', '200', '50']);
  });

  it('says a segment the host hid is hidden, in words as well as struck through', () => {
    host().hidden.set([1]);
    render();

    expect(buttons()).toEqual([]);
    expect(rows()[1].classList).toContain('wr-chart-legend__item--hidden');
    expect(rows().map(row => row.querySelector('.wr-chart-legend__sr-only')?.textContent.trim() ?? null)).toEqual([
      null,
      'hidden',
      null,
    ]);
    // The label stays the segment's name alone.
    expect(rows()[1].querySelector('.wr-meter-group__legend-label')!.textContent.trim()).toBe('Photos');
  });

  it('keeps the colour of each segment to its own position', () => {
    host().hidden.set([0]);
    render();

    expect(bands().map(band => band.style.background)).toEqual(['var(--wr-color-success)', 'var(--wr-color-warning)']);
  });

  it('points the tooltip at the right band after a hidden one', () => {
    host().hidden.set([1]);
    render();

    bands()[1].dispatchEvent(new MouseEvent('mouseenter'));
    render();

    expect(chip()?.querySelector('.wr-chart-tooltip__label')?.textContent.trim()).toBe('Free');
    expect(chip()?.querySelector('.wr-chart-tooltip__value')?.textContent.trim()).toBe('20');
  });

  it('closes an open tooltip when its band is hidden under it', async () => {
    bands()[2].dispatchEvent(new MouseEvent('mouseenter'));
    render();
    expect(chip()?.querySelector('.wr-chart-tooltip__label')?.textContent.trim()).toBe('Free');

    host().hidden.set([2]);
    render();
    await fixture.whenStable();

    expect(chip()).toBeNull();
  });

  it('draws an empty bar with every segment hidden, announcing nothing filled', () => {
    host().hidden.set([0, 1, 2]);
    render();

    expect(bands()).toEqual([]);
    // The total falls back to 1, so the range stays valid with nothing in it.
    expect(aria()).toEqual(['0', '1', '0']);
    expect(rows()).toHaveLength(3);
  });
});
