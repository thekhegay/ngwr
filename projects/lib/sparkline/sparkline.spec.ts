import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrSparkline } from './sparkline';

@Component({
  imports: [WrSparkline],
  template: `
    <wr-sparkline [data]="data()" [showArea]="showArea()" [showTip]="showTip()" [ariaLabel]="ariaLabel()" />
  `,
})
class Host {
  readonly data = signal<readonly number[]>([1, 5, 3, 9]);
  readonly showArea = signal(false);
  readonly showTip = signal(true);
  readonly ariaLabel = signal<string | null>(null);
}

/**
 * Everything a consumer sees is in the path `d`, and the viewBox is a fixed 100×40, so
 * the geometry is fully assertable here — no layout needed. Two numbers matter
 * throughout: the 2-unit padding, and the resulting plot area of 96×36.
 */
describe('WrSparkline', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const svg = (): SVGSVGElement => root().querySelector<SVGSVGElement>('svg')!;
  const line = (): SVGPathElement | null => root().querySelector<SVGPathElement>('.wr-sparkline__line');
  const area = (): SVGPathElement | null => root().querySelector<SVGPathElement>('.wr-sparkline__area');
  const tip = (): SVGCircleElement | null => root().querySelector<SVGCircleElement>('.wr-sparkline__tip');
  const ys = (): number[] =>
    (
      line()!
        .getAttribute('d')!
        .match(/[ML] \S+ (\S+)/g) ?? []
    ).map(part => Number(part.split(' ')[2]));

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('plots one point per datum across the padded box', () => {
    // Four points across a 96-unit plot area starting at x = 2.
    expect(line()!.getAttribute('d')).toBe('M 2.00 38.00 L 34.00 20.00 L 66.00 29.00 L 98.00 2.00');
  });

  it('puts the highest datum at the top and the lowest at the bottom', () => {
    const plotted = ys();
    expect(Math.min(...plotted)).toBe(2);
    expect(Math.max(...plotted)).toBe(38);
  });

  it('draws a flat series through the middle, not along the floor', () => {
    // A degenerate span used to divide by the `|| 1` fallback and land every point on
    // `pad + h` — the bottom edge — so a steady series at 500 read as rock bottom. One
    // single datum was already centred, which is the shape the rest should follow.
    fixture.componentInstance.data.set([500, 500, 500]);
    fixture.detectChanges();

    expect(ys()).toEqual([20, 20, 20]);
  });

  it('centres a lone datum', () => {
    fixture.componentInstance.data.set([7]);
    fixture.detectChanges();
    expect(line()!.getAttribute('d')).toBe('M 50.00 20.00');
  });

  it('draws nothing at all for an empty series', () => {
    fixture.componentInstance.data.set([]);
    fixture.detectChanges();

    expect(line()).toBeNull();
    expect(area()).toBeNull();
    expect(tip()).toBeNull();
  });

  it('keeps a non-finite datum out of the path', () => {
    // `min`/`max` comparisons against NaN are all false, so it survived into the scale
    // and `toFixed(2)` wrote the literal text `NaN` into `d` — invalid path geometry.
    fixture.componentInstance.data.set([1, Number.NaN, 3]);
    fixture.detectChanges();

    expect(line()!.getAttribute('d')).not.toContain('NaN');
    expect(ys().every(Number.isFinite)).toBe(true);
  });

  it('survives a series that is nothing but rubbish', () => {
    fixture.componentInstance.data.set([Number.NaN, Number.POSITIVE_INFINITY]);
    fixture.detectChanges();

    expect(line()?.getAttribute('d') ?? '').not.toContain('NaN');
    expect(line()?.getAttribute('d') ?? '').not.toContain('Infinity');
  });

  it('closes the area down to the baseline when asked', () => {
    fixture.componentInstance.showArea.set(true);
    fixture.detectChanges();

    const d = area()!.getAttribute('d')!;
    expect(d.startsWith('M 2.00 38')).toBe(true);
    expect(d.endsWith('L 98.00 38 Z')).toBe(true);
  });

  it('marks the last point with a tip, and drops it on request', () => {
    expect(tip()!.getAttribute('cx')).toBe('98');
    expect(tip()!.getAttribute('cy')).toBe('2');

    fixture.componentInstance.showTip.set(false);
    fixture.detectChanges();
    expect(tip()).toBeNull();
  });

  it('is decorative until the consumer gives it a name', () => {
    // A sparkline usually sits beside the number it summarises, where announcing it
    // twice is noise — but it can also be the only thing showing a trend. Neither
    // hidden nor named was the one option that helps nobody.
    expect(svg().getAttribute('aria-hidden')).toBe('true');
    expect(svg().hasAttribute('role')).toBe(false);

    fixture.componentInstance.ariaLabel.set('Signups, last 7 days');
    fixture.detectChanges();

    expect(svg().getAttribute('role')).toBe('img');
    expect(svg().getAttribute('aria-label')).toBe('Signups, last 7 days');
    expect(svg().hasAttribute('aria-hidden')).toBe(false);
  });
});

@Component({
  imports: [WrSparkline],
  template: `<wr-sparkline [data]="data()" [ariaLabel]="ariaLabel()" [tooltip]="tooltip()" color="#123456" />`,
})
class TooltipHost {
  // Five points, so the step along the 96-unit plot is 24: x = 2, 26, 50, 74, 98.
  readonly data = signal<readonly number[]>([12, 14, 9, 17, 21]);
  readonly ariaLabel = signal<string | null>(null);
  readonly tooltip = signal(true);
}

/**
 * The point under the pointer is worked out from the drawing's box, and jsdom reports
 * every box as 0×0 — so each case STUBS that box to 100px wide at the origin, which
 * makes a `clientX` read directly as a viewBox x. That stub is the whole of what these
 * cases cannot show: that a real box of any width maps the same way, and where the chip
 * lands, are measured in a browser.
 */
describe('WrSparkline tooltip', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TooltipHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const svg = (): SVGSVGElement => root().querySelector<SVGSVGElement>('svg')!;
  const marker = (): HTMLElement | null => root().querySelector<HTMLElement>('.wr-sparkline__marker');
  const chip = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-chart-tooltip');
  const part = (name: string): HTMLElement | null =>
    chip()?.querySelector<HTMLElement>(`.wr-chart-tooltip__${name}`) ?? null;

  const box = (width: number): void => {
    svg().getBoundingClientRect = () => new DOMRect(0, 0, width, 40);
  };
  const moveTo = (clientX: number): void => {
    svg().dispatchEvent(new MouseEvent('mousemove', { clientX }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(TooltipHost);
    fixture.detectChanges();
    box(100);
  });

  afterEach(() => fixture.destroy());

  it('shows the value of the point nearest the pointer, and marks that point', () => {
    moveTo(47);

    expect(part('value')!.textContent.trim()).toBe('9');
    expect(part('swatch')!.style.background).toBe('rgb(18, 52, 86)');
    // x = 50 of 100, and 9 is the minimum, so it sits on the floor of the plot: y = 38 of 40.
    expect(marker()!.style.left).toBe('50%');
    expect(marker()!.style.top).toBe('95%');
    expect(marker()!.getAttribute('aria-hidden')).toBe('true');
  });

  it('snaps to the ends rather than running off them', () => {
    moveTo(-30);
    expect(part('value')!.textContent.trim()).toBe('12');

    moveTo(400);
    expect(part('value')!.textContent.trim()).toBe('21');
  });

  it('names the reading with the `ariaLabel` when there is one', () => {
    fixture.componentInstance.ariaLabel.set('Signups');
    fixture.detectChanges();

    moveTo(98);

    expect(part('label')!.textContent.trim()).toBe('Signups');
    expect(part('value')!.textContent.trim()).toBe('21');
  });

  it('reads the value off the data as drawn, with non-finite values dropped', () => {
    // Filtered BEFORE the scale, so the second point drawn is 3 — and the tooltip has to
    // agree with the drawing rather than with the raw index.
    fixture.componentInstance.data.set([1, Number.NaN, 3]);
    fixture.detectChanges();

    moveTo(98);

    expect(part('value')!.textContent.trim()).toBe('3');
  });

  it('answers nothing for a box that has not been laid out', () => {
    box(0);
    moveTo(50);

    expect(chip()).toBeNull();
    expect(marker()).toBeNull();
  });

  it('shows neither the chip nor the marker with `tooltip` off', () => {
    fixture.componentInstance.tooltip.set(false);
    fixture.detectChanges();

    moveTo(50);

    expect(chip()).toBeNull();
    expect(marker()).toBeNull();
  });
});
