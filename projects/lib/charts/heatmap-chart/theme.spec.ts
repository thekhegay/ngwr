import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { WrChartLegendPosition } from 'ngwr/charts/chart-legend';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { COMPILE_TIMEOUT, compileSass } from '../../spec-sass';

import { WrHeatmapChart } from './heatmap-chart';
import type { WrHeatmapMatrix } from './types';

const DATA: WrHeatmapMatrix = [
  [0, 25, 50],
  [75, 100, null],
];

@Component({
  imports: [WrHeatmapChart],
  template: `
    <wr-heatmap-chart
      [rows]="['Mon', 'Tue']"
      [columns]="['a', 'b', 'c']"
      [data]="data()"
      [color]="color()"
      [levels]="levels()"
      [legendPosition]="legendPosition()"
      [loading]="loading()"
      [error]="error()"
      [emptyLabel]="emptyLabel()"
      [tooltip]="tooltip()"
    />
  `,
})
class Host {
  readonly data = signal<WrHeatmapMatrix>(DATA);
  readonly color = signal<string | null>(null);
  readonly levels = signal(5);
  readonly legendPosition = signal<WrChartLegendPosition>('bottom');
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly emptyLabel = signal<string | null>(null);
  readonly tooltip = signal(true);
}

/** Angular's own profiler hook, which dev mode publishes on `ng`: event 2 is a template's update pass. */
type Profiler = (event: number, instance?: object | null) => void;
interface Ng {
  ɵsetProfiler(profiler: Profiler): () => void;
  getComponent(el: Element): object | null;
}
const ng = (): Ng => (globalThis as unknown as { ng: Ng }).ng;
const TEMPLATE_UPDATE = 2;

/**
 * The heatmap on the shared chart theme: levels on the sequential scale, the shared scale
 * key, the reading cell's ring set by hand, the key's position and the three states. The
 * rules themselves are read off the compiled sheet in the block after.
 */
describe('WrHeatmapChart on the chart theme', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): Host => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const chart = (): HTMLElement => root().querySelector<HTMLElement>('wr-heatmap-chart')!;
  const cells = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('.wr-heatmap-chart__cell')];
  const paints = (): string[] => cells().map(cell => cell.style.getPropertyValue('--wr-heatmap-chart-fill'));
  const key = (): HTMLElement | null => root().querySelector<HTMLElement>('wr-chart-scale');
  const steps = (): string[] =>
    [...root().querySelectorAll<HTMLElement>('.wr-chart-scale__step')].map(step => step.style.background);
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
    it('paints the five levels of the default with the five steps, and an empty cell with none', () => {
      expect(paints()).toEqual([
        'var(--wr-heatmap-chart-step-1)',
        'var(--wr-heatmap-chart-step-2)',
        'var(--wr-heatmap-chart-step-3)',
        'var(--wr-heatmap-chart-step-4)',
        'var(--wr-heatmap-chart-step-5)',
        '',
      ]);
      expect(chart().classList).not.toContain('wr-heatmap-chart--tinted');
      expect(chart().style.getPropertyValue('--wr-heatmap-chart-scale-color')).toBe('');
    });

    it('mixes the levels that fall between two steps', () => {
      set(h => h.levels.set(3));
      // 0, 50 and 100 of three levels: the first, the middle and the last step.
      expect([paints()[0], paints()[2], paints()[4]]).toEqual([
        'var(--wr-heatmap-chart-step-1)',
        'var(--wr-heatmap-chart-step-3)',
        'var(--wr-heatmap-chart-step-5)',
      ]);

      set(h => h.levels.set(9));
      // Nine levels over five steps: every second one is a step, the others halfway.
      expect(steps()).toHaveLength(9);
      expect(steps()[0]).toBe('var(--wr-heatmap-chart-step-1)');
      expect(steps()[1]).toBe('color-mix(in srgb, var(--wr-heatmap-chart-step-2) 50%, var(--wr-heatmap-chart-step-1))');
      expect(steps()[2]).toBe('var(--wr-heatmap-chart-step-2)');
      expect(steps()[8]).toBe('var(--wr-heatmap-chart-step-5)');
    });

    it('steps the scale from a colour of its own when given one', () => {
      set(h => h.color.set('rebeccapurple'));
      expect(chart().classList).toContain('wr-heatmap-chart--tinted');
      expect(chart().style.getPropertyValue('--wr-heatmap-chart-scale-color')).toBe('rebeccapurple');
      // The cells still name the steps; the stylesheet re-points the steps at the colour.
      expect(paints()[4]).toBe('var(--wr-heatmap-chart-step-5)');
    });
  });

  describe('the scale key', () => {
    it('is the shared key, one step per level in the paint of its cells, under the classes it had', () => {
      expect(key()!.classList).toContain('wr-heatmap-chart__legend');
      expect(key()!.getAttribute('aria-hidden')).toBe('true');
      expect(steps()).toEqual([
        'var(--wr-heatmap-chart-step-1)',
        'var(--wr-heatmap-chart-step-2)',
        'var(--wr-heatmap-chart-step-3)',
        'var(--wr-heatmap-chart-step-4)',
        'var(--wr-heatmap-chart-step-5)',
      ]);
      expect(root().querySelectorAll('.wr-heatmap-chart__scale .wr-heatmap-chart__swatch')).toHaveLength(5);
      expect(key()!.querySelector('.wr-heatmap-chart__legend-empty')!.textContent.trim()).toBe('No data');
    });

    it('sits below the matrix by default and moves with `legendPosition`', () => {
      const matrix = (): HTMLElement => root().querySelector<HTMLElement>('.wr-heatmap-chart__matrix')!;
      expect(chart().classList).toContain('wr-chart--legend');
      expect(key()!.classList).toContain('wr-chart-scale--bottom');
      expect(key()!.previousElementSibling).toBe(matrix());

      set(h => h.legendPosition.set('top'));
      expect(key()!.nextElementSibling).toBe(matrix());

      set(h => h.legendPosition.set('end'));
      expect(key()!.previousElementSibling).toBe(matrix());
      expect(chart().classList).toContain('wr-chart--legend-side');

      set(h => h.legendPosition.set('none'));
      expect(key()).toBeNull();
      expect(chart().classList).not.toContain('wr-chart--legend-side');
    });
  });

  describe('hover', () => {
    it('hears the pointer through two listeners of its own on the matrix, none from the template', () => {
      const added = vi.spyOn(EventTarget.prototype, 'addEventListener');
      const plain = TestBed.createComponent(Host);
      plain.detectChanges();

      const el = (plain.nativeElement as HTMLElement).querySelector('wr-heatmap-chart')!;
      const pointer = added.mock.calls
        .map(([type], index) => [type, added.mock.contexts[index] as EventTarget] as const)
        .filter(([type, target]) => type.startsWith('mouse') && target instanceof Node && el.contains(target));
      expect(pointer.map(([type]) => type).sort()).toEqual(['mouseleave', 'mousemove']);
      expect(pointer.every(([, target]) => target === el.querySelector('.wr-heatmap-chart__cells'))).toBe(true);
      plain.destroy();
    });

    it('rings the cell under the pointer by hand, with no pass over the template', async () => {
      const component = ng().getComponent(chart());
      let passes = 0;
      const stop = ng().ɵsetProfiler((event, instance) => {
        if (event === TEMPLATE_UPDATE && instance === component) passes++;
      });
      const ringed = (): boolean[] => cells().map(cell => cell.classList.contains('wr-heatmap-chart__cell--active'));
      try {
        cells()[1].dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
        await fixture.whenStable();
        expect(ringed()).toEqual([false, true, false, false, false, false]);

        // A move inside the same cell is nothing at all.
        cells()[1].dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
        cells()[4].dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
        await fixture.whenStable();
        expect(ringed()).toEqual([false, false, false, false, true, false]);

        // The ring was a class binding on every cell, compared for each on every hover
        // change, under a listener that checked the chart on every move.
        expect(passes).toBe(0);
      } finally {
        stop();
      }
    });
  });

  describe('empty, loading and error', () => {
    const state = (): HTMLElement | null => root().querySelector('wr-chart-state');
    const matrix = (): HTMLElement => root().querySelector<HTMLElement>('.wr-heatmap-chart__matrix')!;

    it('shows nothing of the kind while there are cells to draw', () => {
      expect(state()).toBeNull();
      expect(matrix().classList).not.toContain('wr-heatmap-chart__matrix--idle');
    });

    it('keeps a box and says "No data" for a matrix with no row', () => {
      const bare = TestBed.createComponent(BareHost);
      bare.detectChanges();
      const el = bare.nativeElement as HTMLElement;
      const message = el.querySelector('wr-chart-state')!;

      expect(message.textContent.trim()).toBe('Nothing measured');
      expect(message.classList).toContain('wr-chart-state--empty');
      expect(el.querySelector('.wr-heatmap-chart__matrix')!.classList).toContain('wr-heatmap-chart__matrix--idle');
      // Beside the cells' image, never inside it.
      expect(el.querySelector('.wr-heatmap-chart__cells')!.contains(message)).toBe(false);
      bare.destroy();
    });

    it('gives the cells way to the loading message beside the names, and to a failed load as an alert', () => {
      set(h => h.loading.set(true));
      expect(cells()).toHaveLength(0);
      expect(root().querySelectorAll('.wr-heatmap-chart__row-label')).toHaveLength(2);
      expect(root().querySelectorAll('.wr-heatmap-chart__column-label')).toHaveLength(3);
      expect(state()!.getAttribute('role')).toBe('status');
      expect(state()!.parentElement!.classList).toContain('wr-heatmap-chart__status');

      set(h => {
        h.loading.set(false);
        h.error.set(true);
      });
      expect(state()!.getAttribute('role')).toBe('alert');
    });
  });
});

@Component({
  imports: [WrHeatmapChart],
  template: `<wr-heatmap-chart [data]="[]" emptyLabel="Nothing measured" />`,
})
class BareHost {}

describe('WrHeatmapChart stylesheet on the chart theme', { timeout: COMPILE_TIMEOUT }, () => {
  const css = (): string => compileSass(`@use 'charts/heatmap-chart/styles';`).replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = (selector: string): string =>
    new RegExp(`(?:^|\\n)\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(css())?.[1] ??
    '';

  it('steps the levels down the sequential scale of the chart theme', () => {
    const block = rule('.wr-heatmap-chart');
    for (const step of [1, 2, 3, 4, 5]) {
      expect(block).toContain(`--wr-heatmap-chart-step-${step}: var(--wr-chart-seq-${step});`);
    }
    expect(block).not.toMatch(/oklab/);
    expect(block).not.toMatch(/--wr-heatmap-chart-min-share/);
  });

  it('steps a colour of its own in the shares the theme steps its scale by', () => {
    const tinted = rule('.wr-heatmap-chart--tinted').replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')');
    for (const [step, share] of [
      [1, 20],
      [2, 40],
      [3, 60],
      [4, 80],
    ]) {
      expect(tinted).toContain(
        `--wr-heatmap-chart-step-${step}: color-mix(in srgb, var(--wr-heatmap-chart-scale-color) ${share}%, var(--wr-heatmap-chart-surface));`
      );
    }
    expect(tinted).toContain('--wr-heatmap-chart-step-5: var(--wr-heatmap-chart-scale-color);');
  });

  it('takes its gap, radius and labels from tokens, with no literal', () => {
    const block = rule('.wr-heatmap-chart');
    expect(block).toMatch(/--wr-heatmap-chart-gap: calc\(var\(--wr-space-xs\) \/ 2\)/);
    expect(block).toMatch(/--wr-heatmap-chart-cell-radius: var\(--wr-chart-bar-radius\)/);
    expect(block).toMatch(/--wr-heatmap-chart-label-color: var\(--wr-chart-label\)/);
    expect(block).toMatch(/--wr-heatmap-chart-label-font-size: var\(--wr-chart-label-size\)/);
  });

  it('edges every cell faintly, so the lowest level still reads as a cell on a dark surface', () => {
    expect(rule('.wr-heatmap-chart')).toMatch(
      /--wr-heatmap-chart-cell-edge: color-mix\(in srgb, var\(--wr-color-on-surface\) 14%, transparent\)/
    );
    expect(rule('.wr-heatmap-chart__cell')).toMatch(/box-shadow: inset 0 0 0 1px var\(--wr-heatmap-chart-cell-edge\)/);
  });

  it('draws the scale key through the shared one, on its own hooks', () => {
    const legend = rule('.wr-heatmap-chart__legend');
    expect(legend).toMatch(/--wr-chart-legend-space: var\(--wr-heatmap-chart-legend-margin-top\)/);
    expect(legend).toMatch(/--wr-chart-scale-step-width: var\(--wr-heatmap-chart-swatch-width\)/);
    expect(css()).toMatch(/\.wr-chart-scale__step\s*\{[^}]*forced-color-adjust: none/);
  });
});
