import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { COMPILE_TIMEOUT, compileSass } from '../../spec-sass';

import { WrCalendarHeatmap } from './calendar-heatmap';
import type { WrHeatmapDatum } from './types';

/** Five days of one week, at 1, 3, 5, 8 and 10 of a largest day of 10. */
const DATA: readonly WrHeatmapDatum[] = [
  { date: '2025-08-10', value: 1 },
  { date: '2025-08-11', value: 3 },
  { date: '2025-08-12', value: 5 },
  { date: '2025-08-13', value: 8 },
  { date: '2025-08-14', value: 10 },
];

@Component({
  imports: [WrCalendarHeatmap],
  template: `
    <wr-calendar-heatmap
      endDate="2025-08-16"
      [weeks]="4"
      [data]="data()"
      [color]="color()"
      [emptyColor]="emptyColor()"
      [showLegend]="showLegend()"
      [legendPosition]="legendPosition()"
      [loading]="loading()"
      [error]="error()"
      [emptyLabel]="emptyLabel()"
    />
  `,
})
class Host {
  readonly data = signal<readonly WrHeatmapDatum[]>(DATA);
  readonly color = signal<string | null>(null);
  readonly emptyColor = signal<string | null>(null);
  readonly showLegend = signal(true);
  readonly legendPosition = signal<'top' | 'bottom' | 'none'>('bottom');
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly emptyLabel = signal<string | null>(null);
}

@Component({ imports: [WrCalendarHeatmap], template: `<wr-calendar-heatmap endDate="2025-08-16" [data]="[]" />` })
class DefaultHost {}

/** Angular's own profiler hook, which dev mode publishes on `ng`: event 2 is a template's update pass. */
type Profiler = (event: number, instance?: object | null) => void;
interface Ng {
  ɵsetProfiler(profiler: Profiler): () => void;
  getComponent(el: Element): object | null;
}
const ng = (): Ng => (globalThis as unknown as { ng: Ng }).ng;
const TEMPLATE_UPDATE = 2;

/**
 * The calendar on the shared chart theme: five levels on the sequential scale, the scale
 * key, the ring set by hand, the rows it parses and the three states. The rules
 * themselves are read off the compiled sheet in the block after.
 */
describe('WrCalendarHeatmap on the chart theme', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): Host => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const chart = (): HTMLElement => root().querySelector<HTMLElement>('wr-calendar-heatmap')!;
  const cell = (iso: string): HTMLElement => root().querySelector<HTMLElement>(`[data-date="${iso}"]`)!;
  const key = (): HTMLElement | null => root().querySelector<HTMLElement>('wr-chart-scale');
  const steps = (): string[] =>
    [...root().querySelectorAll<HTMLElement>('.wr-chart-scale__step')].map(step => step.style.background);
  const labels = (): string[] =>
    [...root().querySelectorAll('.wr-chart-scale__label')].map(label => label.textContent.trim());
  const set = (change: (h: Host) => void): void => {
    change(host());
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  describe('the sequential scale', () => {
    it('puts a day of something on one of five levels, each a step of the scale, and paints no opacity', () => {
      const days = ['2025-08-10', '2025-08-11', '2025-08-12', '2025-08-13', '2025-08-14'].map(cell);
      expect(days.map(day => day.style.background)).toEqual([
        'var(--wr-calendar-heatmap-step-1)',
        'var(--wr-calendar-heatmap-step-2)',
        'var(--wr-calendar-heatmap-step-3)',
        'var(--wr-calendar-heatmap-step-4)',
        'var(--wr-calendar-heatmap-step-5)',
      ]);
      expect(days.map(day => day.getAttribute('data-level'))).toEqual(['1', '2', '3', '4', '5']);
      // The levels were one colour at four opacities.
      expect(days.every(day => day.style.opacity === '')).toBe(true);
    });

    it('paints a day of nothing with the track, or with `emptyColor`', () => {
      expect(cell('2025-08-15').style.background).toBe('var(--wr-calendar-heatmap-empty)');
      expect(cell('2025-08-15').getAttribute('data-level')).toBe('0');

      set(h => h.emptyColor.set('gainsboro'));
      expect(cell('2025-08-15').style.background).toBe('gainsboro');
    });

    it('steps the scale from a colour of its own when given one', () => {
      expect(chart().classList).not.toContain('wr-calendar-heatmap--tinted');
      set(h => h.color.set('seagreen'));
      expect(chart().classList).toContain('wr-calendar-heatmap--tinted');
      expect(chart().style.getPropertyValue('--wr-calendar-heatmap-scale-color')).toBe('seagreen');
      expect(cell('2025-08-14').style.background).toBe('var(--wr-calendar-heatmap-step-5)');
    });

    it('spaces the days as a grid of days by default: twelve with a gap of three', () => {
      const plain = TestBed.createComponent(DefaultHost);
      plain.detectChanges();
      const grid = (plain.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-calendar-heatmap__grid')!;
      expect(grid.style.getPropertyValue('--wr-calendar-heatmap-cell-size')).toBe('12px');
      expect(grid.style.getPropertyValue('--wr-calendar-heatmap-cell-gap')).toBe('3px');
      plain.destroy();
    });
  });

  describe('the scale key', () => {
    it('keys a day of nothing and the five levels, from 0 to the largest day, hidden from a reader', () => {
      expect(key()!.getAttribute('aria-hidden')).toBe('true');
      expect(steps()).toEqual([
        'var(--wr-calendar-heatmap-empty)',
        'var(--wr-calendar-heatmap-step-1)',
        'var(--wr-calendar-heatmap-step-2)',
        'var(--wr-calendar-heatmap-step-3)',
        'var(--wr-calendar-heatmap-step-4)',
        'var(--wr-calendar-heatmap-step-5)',
      ]);
      expect(labels()).toEqual(['0', '10']);
    });

    it('sits under the grid by default, over it at `top`, and nowhere at `none` or with `showLegend` off', () => {
      const grid = (): HTMLElement => root().querySelector<HTMLElement>('.wr-calendar-heatmap__grid')!;
      expect(chart().classList).toContain('wr-chart--legend');
      expect(key()!.classList).toContain('wr-chart-scale--bottom');
      expect(key()!.previousElementSibling).toBe(grid());

      set(h => h.legendPosition.set('top'));
      expect(key()!.classList).toContain('wr-chart-scale--top');
      expect(key()!.nextElementSibling).toBe(grid());

      set(h => h.legendPosition.set('none'));
      expect(key()).toBeNull();

      set(h => {
        h.legendPosition.set('bottom');
        h.showLegend.set(false);
      });
      expect(key()).toBeNull();
    });
  });

  describe('the window', () => {
    it('parses only the rows inside it, and scales to the largest day it draws', () => {
      // Four weeks to 16 August 2025: 20 July on. Ten years of days outside it, one of
      // them far larger than anything inside.
      const outside: WrHeatmapDatum[] = [];
      for (let year = 2010; year < 2020; year++) {
        for (let day = 1; day <= 28; day++)
          outside.push({ date: `${year}-03-${String(day).padStart(2, '0')}`, value: 500 });
      }
      // Every parsed row is written back as an ISO day, which reads its year: a row
      // outside the window used to be parsed like any other, 280 of them here.
      const years = vi.spyOn(Date.prototype, 'getFullYear');
      set(h => h.data.set([...outside, ...DATA]));
      const read = years.mock.calls.length;
      years.mockRestore();

      // The five rows inside, the 28 days the grid walks, and its bounds.
      expect(read).toBeLessThan(80);
      expect(cell('2025-08-14').style.background).toBe('var(--wr-calendar-heatmap-step-5)');
      expect(labels()).toEqual(['0', '10']);
    });

    it('keeps a `Date` inside the window and drops one outside it', () => {
      set(h =>
        h.data.set([
          { date: new Date(2025, 7, 14, 15, 30), value: 4 },
          { date: new Date(2019, 7, 14), value: 400 },
        ])
      );
      expect(cell('2025-08-14').getAttribute('data-value')).toBe('4');
      expect(cell('2025-08-14').style.background).toBe('var(--wr-calendar-heatmap-step-5)');
    });
  });

  describe('hover', () => {
    it('hears the pointer through two listeners of its own on the days, none from the template', () => {
      const added = vi.spyOn(EventTarget.prototype, 'addEventListener');
      const plain = TestBed.createComponent(Host);
      plain.detectChanges();

      const el = (plain.nativeElement as HTMLElement).querySelector('wr-calendar-heatmap')!;
      const pointer = added.mock.calls
        .map(([type], index) => [type, added.mock.contexts[index] as EventTarget] as const)
        .filter(([type, target]) => type.startsWith('mouse') && target instanceof Node && el.contains(target));
      expect(pointer.map(([type]) => type).sort()).toEqual(['mouseleave', 'mousemove']);
      expect(pointer.every(([, target]) => target === el.querySelector('.wr-calendar-heatmap__cells'))).toBe(true);
      plain.destroy();
    });

    it('rings the day the tooltip reads by hand, with no pass over the template', async () => {
      const component = ng().getComponent(chart());
      let passes = 0;
      const stop = ng().ɵsetProfiler((event, instance) => {
        if (event === TEMPLATE_UPDATE && instance === component) passes++;
      });
      try {
        cell('2025-08-12').dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
        await fixture.whenStable();
        expect(cell('2025-08-12').classList).toContain('wr-calendar-heatmap__cell--active');

        cell('2025-08-13').dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
        await fixture.whenStable();
        expect(root().querySelectorAll('.wr-calendar-heatmap__cell--active')).toHaveLength(1);
        expect(cell('2025-08-13').classList).toContain('wr-calendar-heatmap__cell--active');
        expect(passes).toBe(0);
      } finally {
        stop();
      }
    });
  });

  describe('empty, loading and error', () => {
    const state = (): HTMLElement | null => root().querySelector('wr-chart-state');
    const painted = (): Set<string> =>
      new Set([...root().querySelectorAll<HTMLElement>('.wr-calendar-heatmap__cell')].map(day => day.style.background));

    it('shows nothing of the kind while there are days to draw', () => {
      expect(state()).toBeNull();
    });

    it('keeps its squares and says "No data" under them, in the scale key\'s place', () => {
      set(h => h.data.set([]));
      expect(root().querySelectorAll('.wr-calendar-heatmap__cell').length).toBeGreaterThan(0);
      expect(state()!.textContent.trim()).toBe('No data');
      expect(state()!.parentElement!.classList).toContain('wr-calendar-heatmap__status');
      // Never inside the grid's image, which hides what it holds from a reader.
      expect(root().querySelector('.wr-calendar-heatmap__grid')!.contains(state())).toBe(false);
      expect(key()).toBeNull();

      set(h => h.emptyLabel.set('No commits yet'));
      expect(state()!.textContent.trim()).toBe('No commits yet');
    });

    it('empties every square for the loading message, and for a failed load as an alert', () => {
      set(h => h.loading.set(true));
      expect(painted()).toEqual(new Set(['var(--wr-calendar-heatmap-empty)']));
      expect(state()!.getAttribute('role')).toBe('status');

      set(h => {
        h.loading.set(false);
        h.error.set(true);
      });
      expect(state()!.getAttribute('role')).toBe('alert');
    });
  });
});

describe('WrCalendarHeatmap stylesheet on the chart theme', { timeout: COMPILE_TIMEOUT }, () => {
  const css = (): string => compileSass(`@use 'charts/calendar-heatmap/styles';`).replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = (selector: string): string =>
    new RegExp(`(?:^|\\n)\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(css())?.[1] ??
    '';

  it('steps the levels down the sequential scale of the chart theme, and empties a day with the track', () => {
    const block = rule('.wr-calendar-heatmap');
    for (const step of [1, 2, 3, 4, 5]) {
      expect(block).toContain(`--wr-calendar-heatmap-step-${step}: var(--wr-chart-seq-${step});`);
    }
    expect(block).toMatch(/--wr-calendar-heatmap-empty: var\(--wr-chart-track\)/);
  });

  it('takes its radius and its labels from the chart tokens, with no literal', () => {
    const block = rule('.wr-calendar-heatmap');
    expect(block).toMatch(/--wr-calendar-heatmap-cell-radius: var\(--wr-chart-bar-radius\)/);
    expect(block).toMatch(/--wr-calendar-heatmap-label-color: var\(--wr-chart-label\)/);
    expect(rule('.wr-calendar-heatmap__cell')).toMatch(/border-radius: var\(--wr-calendar-heatmap-cell-radius\)/);
  });

  it('edges every square faintly, so the lowest level still reads on a dark surface', () => {
    expect(rule('.wr-calendar-heatmap__cell')).toMatch(
      /box-shadow: inset 0 0 0 1px var\(--wr-calendar-heatmap-cell-edge\)/
    );
  });

  it('rings the day under the pointer at once, and grows and tweens nothing', () => {
    const ring = rule('.wr-calendar-heatmap__cell:hover, .wr-calendar-heatmap__cell--active');
    expect(ring).toMatch(/outline: var\(--wr-calendar-heatmap-active-ring-width\) solid/);
    expect(css()).not.toMatch(/\.wr-calendar-heatmap[^{]*\{[^}]*transition:/);
    expect(css()).not.toMatch(/\.wr-calendar-heatmap[^{]*\{[^}]*scale\(/);
  });

  it('holds the scale key to the inline end of the year, in sight while it scrolls', () => {
    const held = rule('.wr-calendar-heatmap__legend, .wr-calendar-heatmap__status');
    expect(held).toMatch(/position: sticky/);
    expect(held).toMatch(/inset-inline-end: 0/);
    expect(rule('.wr-calendar-heatmap')).toMatch(/grid-template-columns: max-content/);
  });
});
