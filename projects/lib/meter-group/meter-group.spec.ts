import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { WrMeterSegment } from './interfaces';
import { WrMeterGroup } from './meter-group';

const SEGMENTS: readonly WrMeterSegment[] = [
  { label: 'Used', value: 60 },
  { label: 'Reserved', value: 20, color: '#abcdef' },
];

@Component({
  imports: [WrMeterGroup],
  template: `
    <wr-meter-group
      [segments]="segments()"
      [max]="max()"
      [showLegend]="showLegend()"
      [showValues]="showValues()"
      [ariaLabel]="ariaLabel()"
    />
  `,
})
class Host {
  readonly segments = signal<readonly WrMeterSegment[]>(SEGMENTS);
  readonly max = signal(0);
  readonly showLegend = signal(true);
  readonly showValues = signal(true);
  readonly ariaLabel = signal<string | null>(null);
}

/**
 * Segment widths are inline percentages, so the whole stack is checkable in
 * jsdom. The bar is one `progressbar`, not one per segment — so the numbers it
 * announces have to describe the STACK, and the announced value has to stay
 * inside the range it is announced against.
 */
describe('WrMeterGroup', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const bar = (): HTMLElement => root().querySelector<HTMLElement>('.wr-meter-group__bar')!;
  const slices = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('.wr-meter-group__slice')];
  const widths = (): string[] => slices().map(slice => slice.style.width);
  const legendLabels = (): string[] =>
    [...root().querySelectorAll('.wr-meter-group__legend-label')].map(el => el.textContent.trim());
  const legendValues = (): string[] =>
    [...root().querySelectorAll('.wr-meter-group__legend-value')].map(el => el.textContent.trim());

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('is announced as a named progressbar over the summed range', () => {
    expect(bar().getAttribute('role')).toBe('progressbar');
    expect(bar().getAttribute('aria-label')).toBe('Meter');
    expect(bar().getAttribute('aria-valuemin')).toBe('0');
    expect(bar().getAttribute('aria-valuemax')).toBe('80');
    expect(bar().getAttribute('aria-valuenow')).toBe('80');
  });

  it('splits the bar in proportion to the sum when there is no max', () => {
    expect(widths()).toEqual(['75%', '25%']);
  });

  it('leaves the remainder empty when a max is given', () => {
    fixture.componentInstance.max.set(200);
    fixture.detectChanges();

    expect(widths()).toEqual(['30%', '10%']);
    expect(bar().getAttribute('aria-valuemax')).toBe('200');
    expect(bar().getAttribute('aria-valuenow')).toBe('80');
  });

  it('never announces more than the maximum it announced', () => {
    // `aria-valuenow` outside `aria-valuemin`..`aria-valuemax` is not a value a
    // screen reader can turn into a percentage, and segments overflowing an
    // explicit max is exactly the case a meter is used to show.
    fixture.componentInstance.max.set(50);
    fixture.detectChanges();

    expect(bar().getAttribute('aria-valuenow')).toBe('50');
    expect(bar().getAttribute('aria-valuemax')).toBe('50');
  });

  it('keeps one non-finite segment from poisoning the whole stack', () => {
    // The sum is NaN as soon as one value is, so the total fell back to 1, every
    // other slice was asked for `value * 100`% of the bar, and the announced
    // value was the literal text NaN.
    fixture.componentInstance.segments.set([
      { label: 'Used', value: 60 },
      { label: 'Broken', value: Number.NaN },
    ]);
    fixture.detectChanges();

    expect(widths()).toEqual(['100%', '0%']);
    expect(bar().getAttribute('aria-valuenow')).toBe('60');
    expect(root().textContent).not.toContain('NaN');
  });

  it('gives a negative segment no width but keeps its number in the legend', () => {
    fixture.componentInstance.segments.set([
      { label: 'Used', value: 60 },
      { label: 'Refunded', value: -10 },
    ]);
    fixture.detectChanges();

    expect(widths()).toEqual(['100%', '0%']);
    expect(legendValues()).toEqual(['60', '-10']);
  });

  it('renders an empty bar rather than dividing by zero', () => {
    fixture.componentInstance.segments.set([{ label: 'Nothing', value: 0 }]);
    fixture.detectChanges();

    expect(widths()).toEqual(['0%']);
    expect(bar().getAttribute('aria-valuemax')).toBe('1');
    expect(bar().getAttribute('aria-valuenow')).toBe('0');
  });

  it('lists the segments in the legend and can drop the list or the numbers', () => {
    expect(legendLabels()).toEqual(['Used', 'Reserved']);
    expect(legendValues()).toEqual(['60', '20']);

    fixture.componentInstance.showValues.set(false);
    fixture.detectChanges();
    expect(legendValues()).toEqual([]);
    expect(legendLabels()).toEqual(['Used', 'Reserved']);

    fixture.componentInstance.showLegend.set(false);
    fixture.detectChanges();
    expect(root().querySelector('.wr-meter-group__legend')).toBeNull();
  });

  it('drops the legend when there is nothing to list', () => {
    fixture.componentInstance.segments.set([]);
    fixture.detectChanges();

    expect(root().querySelector('.wr-meter-group__legend')).toBeNull();
    expect(slices()).toEqual([]);
  });

  it('takes the colour from the segment, then cycles the palette', () => {
    expect(slices()[1].style.background).toBe('rgb(171, 205, 239)');

    fixture.componentInstance.segments.set(['a', 'b', 'c', 'd', 'e', 'f'].map(label => ({ label, value: 1 })));
    fixture.detectChanges();

    // Six segments over five palette entries: the sixth starts the cycle again
    // rather than rendering with no colour at all.
    expect(slices()[5].style.background).toBe(slices()[0].style.background);
    expect(slices()[5].style.background).toBeTruthy();
  });

  it('takes a name from the consumer over the catalog', () => {
    fixture.componentInstance.ariaLabel.set('Disk usage');
    fixture.detectChanges();

    expect(bar().getAttribute('aria-label')).toBe('Disk usage');
  });
});

describe('WrMeterGroup under a localized catalog', () => {
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

    const bar = (fixture.nativeElement as HTMLElement).querySelector('.wr-meter-group__bar')!;
    expect(bar.getAttribute('aria-label')).toBeTruthy();
    expect(bar.getAttribute('aria-label')).not.toBe('Meter');

    fixture.destroy();
  });
});
