import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { COMPILE_TIMEOUT, compileSass } from '../../spec-sass';

import { WrGauge } from './gauge';

@Component({
  imports: [WrGauge],
  template: `
    <wr-gauge
      [value]="value()"
      [size]="size()"
      [strokeWidth]="strokeWidth()"
      [loading]="loading()"
      [error]="error()"
      [loadingLabel]="loadingLabel()"
      [errorLabel]="errorLabel()"
      ariaLabel="CPU"
      suffix="%"
    />
  `,
})
class Host {
  readonly value = signal(40);
  readonly size = signal(160);
  readonly strokeWidth = signal(16);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly loadingLabel = signal<string | null>(null);
  readonly errorLabel = signal<string | null>(null);
}

@Component({ imports: [WrGauge], template: `<wr-gauge [value]="40" [size]="size()" />` })
class DefaultHost {
  readonly size = signal(160);
}

/**
 * The gauge on the shared chart theme: its colours from the theme's tokens, a stroke in
 * CSS pixels whatever the size, and the loading and error states. jsdom lays nothing out,
 * so the stroke is held as the arithmetic the template writes: the width in the
 * drawing's own units times the pixels one unit takes.
 */
describe('WrGauge on the chart theme', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): Host => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const surface = (): HTMLElement => root().querySelector<HTMLElement>('.wr-gauge__surface')!;
  const track = (): SVGPathElement => root().querySelector<SVGPathElement>('.wr-gauge__track')!;
  const bar = (): SVGPathElement | null => root().querySelector<SVGPathElement>('.wr-gauge__value');
  const set = (change: (h: Host) => void): void => {
    change(host());
    fixture.detectChanges();
  };
  /** The stroke as laid out: its width in viewBox units, times the px one unit is at this size. */
  const strokePx = (path: SVGPathElement, size: number): number =>
    (Number(path.getAttribute('stroke-width')) * size) / 100;

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  describe('colours', () => {
    it('fills the arc in the first palette colour over the theme track, by default', () => {
      const plain = TestBed.createComponent(DefaultHost);
      plain.detectChanges();
      const el = plain.nativeElement as HTMLElement;

      expect(el.querySelector('.wr-gauge__value')!.getAttribute('stroke')).toBe('var(--wr-chart-1)');
      expect(el.querySelector('.wr-gauge__track')!.getAttribute('stroke')).toBe('var(--wr-chart-track)');
      plain.destroy();
    });
  });

  describe('stroke', () => {
    it('is 16px by default, at any size', () => {
      const plain = TestBed.createComponent(DefaultHost);
      for (const size of [80, 160, 320]) {
        plain.componentInstance.size.set(size);
        plain.detectChanges();
        const el = plain.nativeElement as HTMLElement;
        for (const path of el.querySelectorAll<SVGPathElement>('path')) {
          expect(strokePx(path, size), `${size}px`).toBeCloseTo(16, 1);
        }
      }
      plain.destroy();
    });

    it('takes `strokeWidth` as CSS pixels, so a gauge twice the size draws the same arc', () => {
      set(h => h.strokeWidth.set(8));
      expect(track().getAttribute('stroke-width')).toBe('5');
      expect(bar()!.getAttribute('stroke-width')).toBe('5');

      set(h => h.size.set(320));
      expect(track().getAttribute('stroke-width')).toBe('2.5');
      expect(strokePx(track(), 320)).toBe(8);
    });

    it('keeps the arc inside the drawing: the radius and the box follow the stroke', () => {
      // 16px of 160: 10 units, so the arc's middle is 44.5 out and its caps end at 55.
      expect(track().getAttribute('d')).toBe('M 5.5 50 A 44.5 44.5 0 0 1 94.5 50');
      expect(root().querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 100 56');

      // 32px of 160: 20 units. The caps reach 60, and the box grows to hold them.
      set(h => h.strokeWidth.set(32));
      expect(track().getAttribute('d')).toBe('M 10.5 50 A 39.5 39.5 0 0 1 89.5 50');
      expect(root().querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 100 61');

      // The same 32px on a gauge twice the size is the 10 units again.
      set(h => h.size.set(320));
      expect(track().getAttribute('d')).toBe('M 5.5 50 A 44.5 44.5 0 0 1 94.5 50');
      expect(root().querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 100 56');
    });
  });

  describe('loading and error', () => {
    const state = (): HTMLElement | null => root().querySelector('wr-chart-state');

    it('is a meter with a reading and no message while it has one', () => {
      expect(state()).toBeNull();
      expect(surface().getAttribute('role')).toBe('meter');
      expect(surface().getAttribute('aria-valuenow')).toBe('40');
    });

    it('gives the arc and the number way to the loading message, over the track', () => {
      set(h => h.loading.set(true));

      expect(state()!.textContent.trim()).toBe('Loading…');
      expect(state()!.classList).toContain('wr-chart-state--loading');
      expect(state()!.parentElement).toBe(surface());
      expect(bar()).toBeNull();
      expect(track().getAttribute('d')).toBe('M 5.5 50 A 44.5 44.5 0 0 1 94.5 50');
      expect(root().querySelector('.wr-gauge__text')).toBeNull();

      set(h => h.loadingLabel.set('Reading the sensor'));
      expect(state()!.textContent.trim()).toBe('Reading the sensor');

      set(h => h.loading.set(false));
      expect(state()).toBeNull();
      expect(bar()).not.toBeNull();
      expect(root().querySelector('.wr-gauge__text')!.textContent.trim()).toBe('40%');
    });

    it('is a named group and not a meter while it has no reading to announce', () => {
      set(h => h.loading.set(true));

      expect(surface().getAttribute('role')).toBe('group');
      expect(surface().getAttribute('aria-label')).toBe('CPU');
      for (const name of ['aria-valuenow', 'aria-valuemin', 'aria-valuemax', 'aria-valuetext']) {
        expect(surface().hasAttribute(name), name).toBe(false);
      }
    });

    it('says a load failed, as an alert, and puts loading over it', () => {
      set(h => h.error.set(true));

      expect(state()!.textContent.trim()).toBe('Could not load');
      expect(state()!.getAttribute('role')).toBe('alert');
      expect(bar()).toBeNull();

      set(h => h.errorLabel.set('Sensor offline'));
      expect(state()!.textContent.trim()).toBe('Sensor offline');

      set(h => h.loading.set(true));
      expect(state()!.classList).toContain('wr-chart-state--loading');
    });

    it('opens no tooltip under a state', () => {
      set(h => h.loading.set(true));
      surface().dispatchEvent(new MouseEvent('mouseenter'));
      fixture.detectChanges();

      expect(document.querySelector('.wr-chart-tooltip')).toBeNull();
    });
  });
});

/** What the gauge's sheet promises, held against the COMPILED CSS. */
describe('WrGauge stylesheet on the chart theme', { timeout: COMPILE_TIMEOUT }, () => {
  const css = (): string => compileSass(`@use 'charts/gauge/styles';`).replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = (selector: string): string =>
    new RegExp(`(?:^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(css())?.[1] ?? '';

  it('declares the chart theme, so the default colours resolve with this sheet alone', () => {
    expect(css()).toMatch(/--wr-chart-1: var\(--wr-color-primary\)/);
    expect(css()).toMatch(/--wr-chart-track: color-mix\(in srgb, var\(--wr-border-base\) 60%, transparent\)/);
  });

  it('prints the reading at xl and mutes its unit in the chart label colour', () => {
    const block = rule('.wr-gauge');
    expect(block).toMatch(/--wr-gauge-text-font-size: var\(--wr-text-xl\)/);
    expect(block).toMatch(/--wr-gauge-suffix-color: var\(--wr-chart-label\)/);
  });

  it("sets a state's message where the reading sits, not across the arc", () => {
    const block = rule('.wr-gauge .wr-chart-state');
    expect(block).toMatch(/align-items: flex-end/);
    expect(block).toMatch(/padding-block-end: var\(--wr-gauge-text-padding-bottom\)/);
  });
});
