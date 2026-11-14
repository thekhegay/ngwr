import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { wrChartColor } from 'ngwr/charts/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { COMPILE_TIMEOUT, compileSass } from '../../spec-sass';

import { WrBoxplotChart } from './boxplot-chart';
import { boxplotStats, drawnOutliers, quantile, sortedFinite } from './internal/stats';
import type { WrBoxplotGroup } from './types';

const GROUPS: readonly WrBoxplotGroup[] = [
  // 1..10 and 30: Q1 3.5, the median 6, Q3 8.5, whiskers at 1 and 10, and 30 an outlier.
  { label: 'North', values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 30] },
  { label: 'South', stats: { min: 4, q1: 8, median: 12, q3: 16, max: 20 } },
];

@Component({
  imports: [WrBoxplotChart],
  template: `
    <wr-boxplot-chart
      [groups]="groups()"
      [yLabel]="yLabel()"
      [showGrid]="showGrid()"
      [showAxis]="showAxis()"
      [loading]="loading()"
      [error]="error()"
      [emptyLabel]="emptyLabel()"
      [loadingLabel]="loadingLabel()"
      [errorLabel]="errorLabel()"
      [dataTable]="dataTable()"
    />
  `,
})
class Host {
  readonly groups = signal<readonly WrBoxplotGroup[]>(GROUPS);
  readonly yLabel = signal<string | null>(null);
  readonly showGrid = signal(true);
  readonly showAxis = signal(true);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly emptyLabel = signal<string | null>(null);
  readonly loadingLabel = signal<string | null>(null);
  readonly errorLabel = signal<string | null>(null);
  readonly dataTable = signal(false);
}

@Component({ imports: [WrBoxplotChart], template: `<wr-boxplot-chart [groups]="groups" />` })
class DefaultHost {
  readonly groups = GROUPS;
}

/** A seeded generator, so a large input is the same input on every run. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) % 4294967296;
    return (state < 0 ? state + 4294967296 : state) / 4294967296;
  };
}

/** A tight core of readings round 500 and a tail of `tail` readings far from it, all above. */
function longTail(core: number, tail: number): number[] {
  const random = seeded(7);
  const values: number[] = [];
  for (let i = 0; i < core; i++) values.push(500 + random());
  for (let i = 0; i < tail; i++) values.push(1000 + i);
  return values;
}

/**
 * The chart on the shared chart theme: the grid and the scale as two inputs, the three
 * states, one hover listener for every group, and a group with more outliers than it
 * can usefully draw. jsdom lays nothing out, so what is held here is the markup and the
 * numbers handed to the stylesheet; the rules are read off the compiled sheet in the
 * last block.
 */
describe('WrBoxplotChart on the chart theme', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): Host => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const chart = (): HTMLElement => root().querySelector<HTMLElement>('wr-boxplot-chart')!;
  const all = <T extends Element = HTMLElement>(selector: string): T[] => [...root().querySelectorAll<T>(selector)];
  const texts = (selector: string): string[] => all(selector).map(element => element.textContent.trim());
  const groups = (): HTMLElement[] => all('.wr-boxplot-chart__group');
  const chip = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-chart-tooltip');
  const chipTexts = (selector: string): string[] =>
    [...(chip()?.querySelectorAll(selector) ?? [])].map(element => element.textContent.trim());
  const set = (change: (h: Host) => void): void => {
    change(host());
    fixture.detectChanges();
  };
  const over = (element: Element): void => {
    element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
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

  describe('colour, grid and axis', () => {
    it('paints a group in the first palette colour by default, and draws the grid and the scale', () => {
      const plain = TestBed.createComponent(DefaultHost);
      plain.detectChanges();
      const el = plain.nativeElement as HTMLElement;

      expect(wrChartColor(0)).toBe('var(--wr-chart-1)');
      expect(
        [...el.querySelectorAll<HTMLElement>('.wr-boxplot-chart__group')].map(group =>
          group.style.getPropertyValue('--wr-boxplot-chart-group-color')
        )
      ).toEqual(['var(--wr-chart-1)', 'var(--wr-chart-1)']);
      expect(el.querySelectorAll('.wr-boxplot-chart__grid-line')).toHaveLength(5);
      expect(el.querySelectorAll('.wr-boxplot-chart__y-tick')).toHaveLength(5);
      expect(el.querySelector('wr-boxplot-chart')!.classList).toContain('wr-boxplot-chart--axis');
      plain.destroy();
    });

    it('drops the grid and the scale each on its own', () => {
      set(h => h.showGrid.set(false));
      expect(all('.wr-boxplot-chart__grid-line')).toEqual([]);
      expect(texts('.wr-boxplot-chart__y-tick')).toEqual(['40', '30', '20', '10', '0']);

      set(h => {
        h.showGrid.set(true);
        h.showAxis.set(false);
      });
      expect(all('.wr-boxplot-chart__grid-line')).toHaveLength(5);
      expect(root().querySelector('.wr-boxplot-chart__y-axis')).toBeNull();
      expect(chart().classList).not.toContain('wr-boxplot-chart--axis');

      set(h => h.showGrid.set(false));
      expect(all('.wr-boxplot-chart__grid-line')).toEqual([]);
      // The boxes and their names need neither.
      expect(all('.wr-boxplot-chart__box')).toHaveLength(2);
      expect(texts('.wr-boxplot-chart__x-label')).toEqual(['North', 'South']);
    });

    it('marks the gridline at zero, and no other', () => {
      const zero = (): boolean[] =>
        all('.wr-boxplot-chart__grid-line').map(line => line.classList.contains('wr-boxplot-chart__grid-line--zero'));
      // The axis runs 40 down to 0.
      expect(zero()).toEqual([false, false, false, false, true]);

      set(h => h.groups.set([{ label: 'High', stats: { min: 110, q1: 120, median: 130, q3: 140, max: 150 } }]));
      expect(zero().some(Boolean)).toBe(false);
    });

    it('keeps the name of the value axis beside the scale, in the body', () => {
      set(h => h.yLabel.set('Latency, ms'));
      const title = root().querySelector<HTMLElement>('.wr-boxplot-chart__y-title')!;
      expect(title.textContent.trim()).toBe('Latency, ms');
      expect(title.parentElement!.classList).toContain('wr-boxplot-chart__body');
    });
  });

  describe('hover', () => {
    it('listens once for the whole chart, not on every group', () => {
      const added = vi.spyOn(EventTarget.prototype, 'addEventListener');
      const plain = TestBed.createComponent(DefaultHost);
      plain.detectChanges();

      const pointer = added.mock.calls
        .map(([type], index) => [type, added.mock.contexts[index]] as const)
        .filter(([type]) => type.startsWith('mouse'));
      const el = (plain.nativeElement as HTMLElement).querySelector('wr-boxplot-chart');
      expect(pointer.map(([type]) => type).sort()).toEqual(['mouseleave', 'mouseover']);
      expect(pointer.every(([, target]) => target === el)).toBe(true);
      plain.destroy();
    });

    it('tags every group with its index, which the one listener reads, and its figures in one attribute', () => {
      expect(groups().map(group => group.getAttribute('data-wr-index'))).toEqual(['0', '1']);
      expect(groups().map(group => group.getAttribute('data-box'))).toEqual(['1 3.5 6 8.5 10', '4 8 12 16 20']);
      for (const name of ['min', 'q1', 'median', 'q3', 'max']) {
        expect(root().querySelector(`[data-${name}]`), name).toBeNull();
      }
    });

    it('opens the tooltip from a mark inside a slot, and bands that slot', () => {
      over(groups()[1].querySelector('.wr-boxplot-chart__box')!);

      expect(chipTexts('.wr-chart-tooltip__label')).toEqual(['South']);
      expect(chipTexts('.wr-chart-tooltip__row-value')).toEqual(['20', '16', '12', '8', '4']);
      expect(groups().map(group => group.className)).toEqual([
        'wr-boxplot-chart__group',
        'wr-boxplot-chart__group wr-boxplot-chart__group--active',
      ]);
    });

    it('keeps one class binding for a slot: its own, and empty or active, never both', () => {
      set(h => h.groups.set([GROUPS[0], { label: 'Nothing' }]));
      over(groups()[1]);

      expect(chip()).toBeNull();
      expect(groups().map(group => group.className)).toEqual([
        'wr-boxplot-chart__group',
        'wr-boxplot-chart__group wr-boxplot-chart__group--empty',
      ]);
    });
  });

  describe('empty, loading and error', () => {
    const state = (): HTMLElement | null => root().querySelector('wr-chart-state');
    const frame = (): number[] => [all('.wr-boxplot-chart__grid-line').length, all('.wr-boxplot-chart__y-tick').length];

    it('shows nothing of the kind while there are boxes to draw', () => {
      expect(state()).toBeNull();
    });

    it('keeps the frame and says "No data" with no group', () => {
      set(h => h.groups.set([]));

      expect(state()!.textContent.trim()).toBe('No data');
      expect(state()!.classList).toContain('wr-chart-state--empty');
      // Beside the plot, never inside the image.
      expect(state()!.parentElement!.classList).toContain('wr-boxplot-chart__body');
      expect(root().querySelector('.wr-boxplot-chart__plot wr-chart-state')).toBeNull();
      // The empty axis runs from 0 to 1 in quarters.
      expect(frame()).toEqual([5, 5]);
      expect(root().querySelector<HTMLElement>('.wr-boxplot-chart__plot')!.style.height).toBe('240px');

      set(h => h.emptyLabel.set('No readings yet'));
      expect(state()!.textContent.trim()).toBe('No readings yet');
    });

    it('is empty with groups and no summary among them, and keeps their slots, names and table', () => {
      set(h => {
        h.groups.set([{ label: 'Nothing' }, { label: 'Not finite', values: [Number.NaN] }]);
        h.dataTable.set(true);
      });

      expect(state()!.classList).toContain('wr-chart-state--empty');
      expect(groups()).toHaveLength(2);
      expect(texts('.wr-boxplot-chart__x-label')).toEqual(['Nothing', 'Not finite']);
      expect(all('.wr-chart-table')).toHaveLength(1);
    });

    it('gives the boxes way to the loading message, over the axis the chart had', () => {
      set(h => {
        h.dataTable.set(true);
        h.loading.set(true);
      });

      expect(state()!.textContent.trim()).toBe('Loading…');
      expect(state()!.classList).toContain('wr-chart-state--loading');
      expect(groups()).toEqual([]);
      expect(all('.wr-chart-table')).toEqual([]);
      // The data's own axis, 40 down to 0, and the group names stay under the message.
      expect(texts('.wr-boxplot-chart__y-tick')).toEqual(['40', '30', '20', '10', '0']);
      expect(texts('.wr-boxplot-chart__x-label')).toEqual(['North', 'South']);

      set(h => h.loadingLabel.set('Fetching readings'));
      expect(state()!.textContent.trim()).toBe('Fetching readings');

      set(h => h.loading.set(false));
      expect(state()).toBeNull();
      expect(groups()).toHaveLength(2);
    });

    it('says a load failed, as an alert, and puts loading over it', () => {
      set(h => h.error.set(true));

      expect(state()!.textContent.trim()).toBe('Could not load');
      expect(state()!.getAttribute('role')).toBe('alert');
      expect(groups()).toEqual([]);

      set(h => h.errorLabel.set('Readings are unavailable'));
      expect(state()!.textContent.trim()).toBe('Readings are unavailable');

      set(h => h.loading.set(true));
      expect(state()!.classList).toContain('wr-chart-state--loading');
    });
  });

  describe('a group with a long tail', () => {
    it('draws two hundred thousand outliers as a hundred dots, and still counts every one', () => {
      set(h => {
        h.dataTable.set(true);
        h.groups.set([{ label: 'Tail', values: longTail(700_000, 200_000) }]);
      });

      const dots = all('.wr-boxplot-chart__outlier').map(dot => Number(dot.getAttribute('data-value')));
      expect(dots).toHaveLength(100);
      // The nearest the box and the farthest are among them, and the axis holds the farthest.
      expect(dots[0]).toBe(1000);
      expect(dots[dots.length - 1]).toBe(200_999);
      // The farthest dot sits inside the plot: the axis was fitted to it.
      const top = Number(all('.wr-boxplot-chart__outlier').at(-1)!.style.getPropertyValue('--wr-boxplot-chart-y'));
      expect(top).toBeGreaterThan(0);
      expect(top).toBeLessThan(50);

      over(groups()[0]);
      const values = chipTexts('.wr-chart-tooltip__row-value');
      expect(chipTexts('.wr-chart-tooltip__row-label')[5]).toBe('Outliers');
      expect(values.slice(5)).toEqual(['1,000', '1,001', '1,002', '+199,997 more']);

      // The table names the two ends and counts the rest, rather than list them all.
      const cells = texts('.wr-chart-table tbody td');
      expect(cells[cells.length - 1]).toBe('1,000, 200,999, +199,998 more');
    });

    it('draws every outlier of a group with few, on both sides of the box', () => {
      set(h =>
        h.groups.set([
          { label: 'Given', stats: { min: 10, q1: 20, median: 25, q3: 30, max: 40, outliers: [60, 1, 2] } },
        ])
      );
      expect(all('.wr-boxplot-chart__outlier').map(dot => dot.getAttribute('data-value'))).toEqual(['1', '2', '60']);
    });
  });
});

/**
 * The summary itself, on inputs the old one could not carry: it sorted a `number[]`
 * through a comparator and filtered it three times, and the chart then spread every
 * outlier into `Math.min`.
 */
describe('boxplot summary of a large input', () => {
  it('sorts the finite values ascending in a typed array, and leaves the input alone', () => {
    const random = seeded(3);
    const values = Array.from({ length: 50_000 }, (_, i) => (i % 5000 === 0 ? Number.NaN : (random() - 0.5) * 1e6));
    const copy = [...values];

    const sorted = sortedFinite(values);
    expect(sorted).toBeInstanceOf(Float64Array);
    expect(values).toEqual(copy);
    expect(Array.from(sorted)).toEqual(values.filter(value => Number.isFinite(value)).sort((a, b) => a - b));
  });

  it('answers what the filtering summary answered, on a seeded sample', () => {
    const random = seeded(11);
    // A bell with a few values far out on either side.
    const values = Array.from({ length: 50_000 }, (_, i) =>
      i % 997 === 0 ? (random() - 0.5) * 1e4 : random() + random() + random()
    );
    const reference = [...values].sort((a, b) => a - b);
    const q1 = quantile(reference, 0.25);
    const q3 = quantile(reference, 0.75);
    const low = q1 - 1.5 * (q3 - q1);
    const high = q3 + 1.5 * (q3 - q1);
    const inside = reference.filter(value => value >= low && value <= high);

    const stats = boxplotStats(values)!;
    expect(stats.q1).toBe(q1);
    expect(stats.median).toBe(quantile(reference, 0.5));
    expect(stats.q3).toBe(q3);
    expect(stats.min).toBe(inside[0]);
    expect(stats.max).toBe(inside[inside.length - 1]);
    expect(stats.outliers).toEqual(reference.filter(value => value < low || value > high));
    expect(stats.outliers.length).toBeGreaterThan(10);
  });

  it('summarises two hundred thousand outliers without overflowing the stack', () => {
    const stats = boxplotStats(longTail(700_000, 200_000))!;
    expect(stats.outliers).toHaveLength(200_000);
    expect(stats.outliers[0]).toBe(1000);
    expect(stats.outliers[stats.outliers.length - 1]).toBe(200_999);
    expect(stats.max).toBeLessThan(502);
    expect(stats.min).toBeGreaterThanOrEqual(500);
  });

  it('takes a typed array as it takes a list', () => {
    expect(boxplotStats(Float32Array.of(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 30))).toEqual({
      min: 1,
      q1: 3.5,
      median: 6,
      q3: 8.5,
      max: 10,
      outliers: [30],
    });
  });

  describe('the outliers drawn', () => {
    const ascending = (from: number, count: number): number[] => Array.from({ length: count }, (_, i) => from + i);

    it('is every outlier up to a hundred a side, the list itself', () => {
      const outliers = [...ascending(-100, 100), ...ascending(1000, 100)];
      expect(drawnOutliers(outliers, 500)).toBe(outliers);
    });

    it('is a hundred of a crowded side, evenly spread, with both of its ends, and all of the other side', () => {
      const outliers = [...ascending(-3, 3), ...ascending(1000, 1001)];
      const drawn = drawnOutliers(outliers, 500);

      expect(drawn).toHaveLength(103);
      expect(drawn.slice(0, 4)).toEqual([-3, -2, -1, 1000]);
      expect(drawn[drawn.length - 1]).toBe(2000);
      // About every tenth of the thousand and one above the box.
      expect(drawn[4] - drawn[3]).toBeGreaterThanOrEqual(10);
      expect(new Set(drawn).size).toBe(103);
      expect(drawnOutliers(outliers, 500)).toEqual(drawn);
    });

    it('caps both sides on their own', () => {
      const drawn = drawnOutliers([...ascending(-5000, 5000), ...ascending(1000, 5000)], 500);
      expect(drawn).toHaveLength(200);
      expect([drawn[0], drawn[99], drawn[100], drawn[199]]).toEqual([-5000, -1, 1000, 5999]);
    });
  });
});

/**
 * The rules the markup cannot show, read off the COMPILED sheet. That each rule then
 * paints what it says is measured in a browser.
 */
describe('WrBoxplotChart stylesheet on the chart theme', { timeout: COMPILE_TIMEOUT }, () => {
  const css = (): string => compileSass(`@use 'charts/boxplot-chart/styles';`).replace(/\/\*[\s\S]*?\*\//g, '');
  const pattern = (selector: string): string => selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/, /g, ',\\s*');
  const rule = (selector: string, from: string = css()): string =>
    new RegExp(`(?:^|\\n)\\s*${pattern(selector)}\\s*\\{([^}]*)\\}`).exec(from)?.[1] ?? '';
  const forced = (): string =>
    [...css().matchAll(/@media \(forced-colors: active\)\s*\{([\s\S]*?)\n\}/g)].map(m => m[1]).join('\n');

  it('points every hook that paints the frame at the shared chart token', () => {
    const block = rule('.wr-boxplot-chart');
    expect(block).toMatch(/--wr-boxplot-chart-grid-color: var\(--wr-chart-grid\)/);
    expect(block).toMatch(/--wr-boxplot-chart-zero-color: var\(--wr-chart-zero\)/);
    expect(block).toMatch(/--wr-boxplot-chart-tick-color: var\(--wr-chart-label\)/);
    expect(block).toMatch(/--wr-boxplot-chart-tick-font-size: var\(--wr-chart-label-size\)/);
    expect(block).toMatch(/--wr-boxplot-chart-label-color: var\(--wr-chart-label\)/);
    expect(block).toMatch(/--wr-boxplot-chart-label-font-size: var\(--wr-chart-label-size\)/);
    expect(block).toMatch(/--wr-boxplot-chart-active-bg: var\(--wr-chart-band\)/);
    expect(block).toMatch(/--wr-boxplot-chart-line-width: var\(--wr-chart-stroke\)/);
    expect(block).toMatch(/--wr-boxplot-chart-median-width: calc\(var\(--wr-chart-stroke\) \+ 1px\)/);
    expect(block).toMatch(/--wr-boxplot-chart-box-radius: var\(--wr-chart-bar-radius\)/);
    expect(block).toMatch(/--wr-boxplot-chart-outlier-size: var\(--wr-chart-marker\)/);
    expect(block).toMatch(/--wr-boxplot-chart-outlier-ring: var\(--wr-chart-separator\)/);
  });

  it('draws the gridlines in the grid hook and the one at zero in the stronger one', () => {
    expect(rule('.wr-boxplot-chart__grid-line')).toMatch(
      /border-block-start: 1px solid var\(--wr-boxplot-chart-grid-color\)/
    );
    expect(rule('.wr-boxplot-chart__grid-line--zero')).toMatch(
      /border-block-start-color: var\(--wr-boxplot-chart-zero-color\)/
    );
    expect(rule('.wr-boxplot-chart__grid-line--zero', forced())).toMatch(/border-color: CanvasText/);
  });

  it("paints an outlier solid in its group's colour, with a ring of the surface that takes no room", () => {
    const dot = rule('.wr-boxplot-chart__outlier');
    expect(dot).toMatch(/background: var\(--wr-boxplot-chart-group-color, currentColor\)/);
    expect(dot).toMatch(/box-shadow: 0 0 0 1px var\(--wr-boxplot-chart-outlier-ring\)/);
    expect(dot).not.toMatch(/border:/);
    // A background with no border is the page's own colour under forced colors.
    expect(rule('.wr-boxplot-chart__outlier', forced())).toMatch(/background: CanvasText/);
  });

  it('writes an axis name in full ink and semibold, and the value axis one along its axis', () => {
    const block = rule('.wr-boxplot-chart');
    expect(block).toMatch(/--wr-boxplot-chart-title-font-weight: var\(--wr-font-weight-semibold\)/);
    expect(block).toMatch(/--wr-boxplot-chart-title-color: var\(--wr-color-on-surface\)/);
    const title = rule('.wr-boxplot-chart__y-title');
    expect(title).toMatch(/writing-mode: vertical-rl/);
    expect(title).toMatch(/transform: rotate\(180deg\)/);
    expect(title).toMatch(/grid-column: 1;/);
    expect(rule('.wr-boxplot-chart__y-axis')).toMatch(/grid-column: 2;/);
    expect(rule('.wr-boxplot-chart__plot')).toMatch(/grid-column: 3;/);
  });

  it('keeps the top tick inside the chart, and the state in the cell of the plot', () => {
    expect(rule('.wr-boxplot-chart--axis .wr-boxplot-chart__body')).toMatch(
      /padding-block-start: max\(0px, var\(--wr-boxplot-chart-tick-line-height\) \/ 2 - var\(--wr-boxplot-chart-plot-inset-y\)\)/
    );
    const state = rule('.wr-boxplot-chart__body > .wr-chart-state');
    expect(state).toMatch(/position: relative/);
    expect(state).toMatch(/grid-column: 3/);
    expect(state).toMatch(/grid-row: 1/);
  });

  it('loads the chart theme and the state message with the chart', () => {
    expect(css()).toMatch(/--wr-chart-grid: var\(--wr-border-base\)/);
    expect(css()).toMatch(/\.wr-chart-state\s*\{/);
  });

  it('transitions nothing a layout reads', () => {
    for (const [, value] of css().matchAll(/transition:([^;]*);/g)) {
      expect(value).not.toMatch(/\b(height|width|top|bottom|left|right|inset[a-z-]*|inline-size|block-size)\b/);
    }
  });
});
