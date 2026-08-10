import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrGauge } from './gauge';

@Component({
  imports: [WrGauge],
  template: `
    <wr-gauge
      [value]="value()"
      [min]="min()"
      [max]="max()"
      [strokeWidth]="strokeWidth()"
      [showValue]="showValue()"
      [suffix]="suffix()"
    />
  `,
})
class Host {
  readonly value = signal(40);
  readonly min = signal(0);
  readonly max = signal(100);
  readonly strokeWidth = signal(10);
  readonly showValue = signal(true);
  readonly suffix = signal('');
}

/**
 * The gauge draws nothing a screen reader can use — the `<svg>` is `aria-hidden` and the
 * printed number is optional — so `role="meter"` and its value attributes ARE the
 * accessible representation. That makes the relationship between what is drawn and what
 * is announced the contract: a meter whose `aria-valuenow` sits outside its own
 * min/max is an invalid state, however the bar happens to look.
 *
 * `wr-gauge` and `wr-knob` share their arc maths down to
 * `radius = 50 - strokeWidth / 2 - 0.5`, so where they disagree one of them is wrong.
 */
describe('WrGauge', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const meter = (): HTMLElement => root().querySelector<HTMLElement>('[role="meter"]')!;
  const track = (): SVGPathElement => root().querySelector<SVGPathElement>('.wr-gauge__track')!;
  const bar = (): SVGPathElement => root().querySelector<SVGPathElement>('.wr-gauge__value')!;
  const text = (): string => root().querySelector('.wr-gauge__text')?.textContent?.trim() ?? '';
  const radii = (path: SVGPathElement): number[] => {
    const m = /A (\S+) (\S+) /.exec(path.getAttribute('d')!)!;
    return [Number(m[1]), Number(m[2])];
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('is announced as a named meter with a range and a reading', () => {
    expect(meter().getAttribute('aria-label')).toBe('Gauge');
    expect(meter().getAttribute('aria-valuemin')).toBe('0');
    expect(meter().getAttribute('aria-valuemax')).toBe('100');
    expect(meter().getAttribute('aria-valuenow')).toBe('40');
    expect(meter().getAttribute('aria-valuetext')).toBe('40');
    expect(root().querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('gives both arcs a class a consumer can style', () => {
    // `.wr-*` names are public API, and `wr-knob` names its equivalents
    // `.wr-knob__track` / `.wr-knob__value` — these two had no class at all.
    expect(track()).not.toBeNull();
    expect(bar()).not.toBeNull();
  });

  it('sweeps the bar from nothing to the whole track', () => {
    // Radius is `50 - strokeWidth / 2 - 0.5` — 44.5 at the default stroke of 10 — so the
    // semicircle runs from x = 5.5 to x = 94.5 along y = 50.
    fixture.componentInstance.value.set(0);
    fixture.detectChanges();
    // At zero the bar is a degenerate arc: it ends where it starts.
    expect(bar().getAttribute('d')).toBe('M 5.5 50 A 44.5 44.5 0 0 1 5.50 50.00');

    fixture.componentInstance.value.set(100);
    fixture.detectChanges();
    expect(bar().getAttribute('d')).toBe('M 5.5 50 A 44.5 44.5 0 0 1 94.50 50.00');
    expect(track().getAttribute('d')).toBe('M 5.5 50 A 44.5 44.5 0 0 1 94.5 50');
  });

  it('announces the value it can actually show, not one past the end', () => {
    // Only the drawn ratio was clamped, so an over-range value drew a full bar and
    // announced `aria-valuenow="500"` against a `valuemax` of 100 — an invalid meter
    // state — while the printed number said 500 too.
    fixture.componentInstance.value.set(500);
    fixture.detectChanges();

    expect(meter().getAttribute('aria-valuenow')).toBe('100');
    expect(meter().getAttribute('aria-valuetext')).toBe('100');
    expect(text()).toBe('100');

    fixture.componentInstance.value.set(-20);
    fixture.detectChanges();
    expect(meter().getAttribute('aria-valuenow')).toBe('0');
    expect(text()).toBe('0');
  });

  it('reads a value that is not a number as the bottom of the range', () => {
    // `value` was the only numeric input with no coercion, so a NaN reached the path
    // `d` as the literal text `NaN` — invalid path geometry, and the arc disappears.
    fixture.componentInstance.value.set(Number.NaN);
    fixture.detectChanges();

    expect(bar().getAttribute('d')).not.toContain('NaN');
    expect(meter().getAttribute('aria-valuenow')).toBe('0');
  });

  it('keeps the arc radius positive however fat the stroke', () => {
    // `50 - strokeWidth / 2 - 0.5` goes negative past 99, and a negative radius is
    // invalid in the SVG path grammar — the browser drops the arc and the dial
    // vanishes. `wr-knob` floors it for exactly this reason.
    fixture.componentInstance.strokeWidth.set(140);
    fixture.detectChanges();

    for (const path of [track(), bar()]) {
      for (const r of radii(path)) expect(r).toBeGreaterThan(0);
    }
  });

  it('respects a narrowed range', () => {
    fixture.componentInstance.min.set(10);
    fixture.componentInstance.max.set(20);
    fixture.componentInstance.value.set(15);
    fixture.detectChanges();

    expect(meter().getAttribute('aria-valuemin')).toBe('10');
    expect(meter().getAttribute('aria-valuenow')).toBe('15');
    // Half way along the range is half the arc: the end point sits above the centre.
    expect(bar().getAttribute('d')).toBe('M 5.5 50 A 44.5 44.5 0 0 1 50.00 5.50');
  });

  it('prints the suffix beside the reading, and hides the text on request', () => {
    fixture.componentInstance.suffix.set('%');
    fixture.detectChanges();
    expect(text()).toBe('40%');
    expect(meter().getAttribute('aria-valuetext')).toBe('40%');

    fixture.componentInstance.showValue.set(false);
    fixture.detectChanges();
    expect(root().querySelector('.wr-gauge__text')).toBeNull();
    // The meter still reads out, which is the reason the role is there at all.
    expect(meter().getAttribute('aria-valuenow')).toBe('40');
  });
});
