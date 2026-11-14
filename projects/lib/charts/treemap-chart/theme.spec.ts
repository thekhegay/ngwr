import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { WrChartLegendPosition } from 'ngwr/charts/chart-legend';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { COMPILE_TIMEOUT, compileSass } from '../../spec-sass';

import { WrTreemapChart } from './treemap-chart';
import type { WrTreemapNode } from './types';

const FOOD: readonly WrTreemapNode[] = [
  {
    label: 'Fruit',
    children: [
      { label: 'Apples', value: 30 },
      { label: 'Pears', value: 10 },
    ],
  },
  {
    label: 'Veg',
    children: [
      { label: 'Kale', value: 40 },
      { label: 'Leeks', value: 20 },
    ],
  },
];

@Component({
  imports: [WrTreemapChart],
  template: `
    <wr-treemap-chart
      [data]="data()"
      [showLegend]="showLegend()"
      [legendPosition]="legendPosition()"
      [loading]="loading()"
      [error]="error()"
      [emptyLabel]="emptyLabel()"
      [tooltip]="tooltip()"
    />
  `,
})
class Host {
  readonly data = signal<readonly WrTreemapNode[]>(FOOD);
  readonly showLegend = signal<boolean | 'auto'>(false);
  readonly legendPosition = signal<WrChartLegendPosition>('bottom');
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly emptyLabel = signal<string | null>(null);
  readonly tooltip = signal(true);
}

/** Angular's own profiler hook, which dev mode publishes on `ng`: event 2 is a template's update pass. */
type Profiler = (event: number, instance?: object | null) => void;
const setProfiler = (profiler: Profiler): (() => void) =>
  (globalThis as unknown as { ng: { ɵsetProfiler(profiler: Profiler): () => void } }).ng.ɵsetProfiler(profiler);
const TEMPLATE_UPDATE = 2;

/**
 * The treemap on the shared chart theme: solid tiles in the chart palette, the label rule
 * for small tiles, the hover set by hand, the legend and the three states. jsdom lays
 * nothing out, so the layout is cut for the 640 × 280 the chart assumes; the rules
 * themselves are read off the compiled sheet in the block after.
 */
describe('WrTreemapChart on the chart theme', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): Host => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const chart = (): HTMLElement => root().querySelector<HTMLElement>('wr-treemap-chart')!;
  const tiles = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('.wr-treemap-chart__tile')];
  const names = (): (string | null)[] =>
    tiles().map(tile => tile.querySelector('.wr-treemap-chart__label')?.textContent.trim() ?? null);
  const set = (change: (h: Host) => void): void => {
    change(host());
    fixture.detectChanges();
  };
  const over = (target: Element): void => {
    target.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
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

  describe('labels on small tiles', () => {
    it('leaves a tile blank rather than cut its name to a few letters', () => {
      // 640 px shared 90 / 10: the second column is 64 px wide. `Legal` fits it whole;
      // `Facilities` does not, and 64 px would cut it to `Facil…`.
      set(h =>
        h.data.set([
          { label: 'Engineering', value: 90 },
          { label: 'Facilities', value: 10 },
        ])
      );
      expect(names()).toEqual(['Engineering', null]);

      set(h =>
        h.data.set([
          { label: 'Engineering', value: 90 },
          { label: 'Legal', value: 10 },
        ])
      );
      expect(names()).toEqual(['Engineering', 'Legal']);
    });

    it('cuts a long name only where enough of it is left to read', () => {
      // 80 / 20: a 128 px column keeps a dozen letters before the ellipsis.
      set(h =>
        h.data.set([
          { label: 'Engineering', value: 80 },
          { label: 'Research and development', value: 20 },
        ])
      );
      expect(names()).toEqual(['Engineering', 'Research and development']);
    });

    it('gives a group no strip for a name the strip would cut to a few letters', () => {
      set(h =>
        h.data.set([
          { label: 'Engineering', value: 90 },
          { label: 'Operations', children: [{ label: 'IT', value: 10 }] },
        ])
      );
      const group = tiles().find(tile => tile.classList.contains('wr-treemap-chart__tile--group'))!;
      expect(group.querySelector('.wr-treemap-chart__header')).toBeNull();
      // The group still draws its child, 3 px in on every side.
      expect(names()).toEqual(['Engineering', null, 'IT']);
    });
  });

  describe('hover', () => {
    it('listens once for the whole chart, on the host, not on the plot', () => {
      const added = vi.spyOn(EventTarget.prototype, 'addEventListener');
      const plain = TestBed.createComponent(Host);
      plain.detectChanges();

      const el = (plain.nativeElement as HTMLElement).querySelector('wr-treemap-chart')!;
      const pointer = added.mock.calls
        .map(([type], index) => [type, added.mock.contexts[index] as EventTarget] as const)
        .filter(([type, target]) => type.startsWith('mouse') && target instanceof Node && el.contains(target));
      expect(pointer.map(([type]) => type).sort()).toEqual(['mouseleave', 'mouseover']);
      expect(pointer.every(([, target]) => target === el)).toBe(true);
      plain.destroy();
    });

    it('tags every tile with its index and with the top-level node it sits under', () => {
      expect(tiles().map(tile => tile.getAttribute('data-wr-index'))).toEqual(['0', '1', '2', '3', '4', '5']);
      // Veg is laid out first and is the second node of the data: legend row 1.
      expect(tiles().map(tile => tile.getAttribute('data-wr-series'))).toEqual(['1', '1', '1', '0', '0', '0']);
    });

    it('rings the tile under the pointer by hand, with no pass over the template', async () => {
      const component = (globalThis as unknown as { ng: { getComponent(el: Element): object | null } }).ng.getComponent(
        chart()
      );
      let passes = 0;
      const stop = setProfiler((event, instance) => {
        if (event === TEMPLATE_UPDATE && instance === component) passes++;
      });
      try {
        over(tiles()[1]);
        await fixture.whenStable();
        expect(tiles().map(tile => tile.classList.contains('wr-treemap-chart__tile--active'))).toEqual([
          false,
          true,
          false,
          false,
          false,
          false,
        ]);

        over(tiles()[2]);
        await fixture.whenStable();
        expect(root().querySelectorAll('.wr-treemap-chart__tile--active')).toHaveLength(1);
        expect(tiles()[2].classList).toContain('wr-treemap-chart__tile--active');

        // The ring was a class binding on every tile, compared for each on every hover
        // change. Set by hand, the template of the chart is not run at all.
        expect(passes).toBe(0);
      } finally {
        stop();
      }
    });

    it('dims every tile outside the top-level node under the pointer', () => {
      over(tiles()[4]);
      expect(chart().classList).toContain('wr-chart--dim');
      expect(tiles().map(tile => tile.classList.contains('wr-chart-mark--on'))).toEqual([
        false,
        false,
        false,
        true,
        true,
        true,
      ]);

      chart().dispatchEvent(new MouseEvent('mouseleave'));
      expect(chart().classList).not.toContain('wr-chart--dim');
    });
  });

  describe('legend', () => {
    const legend = (): HTMLElement | null => root().querySelector<HTMLElement>('.wr-treemap-chart__legend');
    const rows = (): string[] =>
      [...root().querySelectorAll('.wr-chart-legend__item')].map(row =>
        [...row.querySelectorAll('.wr-chart-legend__label, .wr-chart-legend__value')]
          .map(part => part.textContent.trim())
          .join(' ')
      );

    it('draws none by default: a tile with room carries its own name', () => {
      expect(legend()).toBeNull();
      expect(chart().classList).toContain('wr-chart--legend');
    });

    it('keys the top-level nodes on request, in the order of the data, each with its value', () => {
      set(h => h.showLegend.set(true));
      expect(rows()).toEqual(['Fruit 40', 'Veg 60']);
      const dots = [...root().querySelectorAll<HTMLElement>('.wr-chart-legend__swatch')].map(
        dot => dot.style.background
      );
      expect(dots).toEqual(['var(--wr-chart-1)', 'var(--wr-chart-2)']);
      // Below the plot, after it in the DOM.
      expect(legend()!.previousElementSibling!.classList).toContain('wr-treemap-chart__body');
      expect(legend()!.classList).toContain('wr-chart-legend--bottom');
    });

    it('moves with `legendPosition`, beside the plot at start and end', () => {
      set(h => {
        h.showLegend.set(true);
        h.legendPosition.set('start');
      });
      expect(legend()!.nextElementSibling!.classList).toContain('wr-treemap-chart__body');
      expect(chart().classList).toContain('wr-chart--legend-side');

      set(h => h.legendPosition.set('top'));
      expect(chart().classList).not.toContain('wr-chart--legend-side');

      set(h => h.legendPosition.set('none'));
      expect(legend()).toBeNull();
    });

    it('leaves a single top-level node without one under `auto`', () => {
      set(h => h.showLegend.set('auto'));
      expect(rows()).toHaveLength(2);

      set(h => h.data.set([{ label: 'All', value: 1 }]));
      expect(legend()).toBeNull();
    });
  });

  describe('empty, loading and error', () => {
    const state = (): HTMLElement | null => root().querySelector('wr-chart-state');
    const plot = (): HTMLElement => root().querySelector<HTMLElement>('.wr-treemap-chart__plot')!;

    it('shows nothing of the kind while there are tiles to draw', () => {
      expect(state()).toBeNull();
      expect(plot().classList).not.toContain('wr-treemap-chart__plot--idle');
    });

    it('keeps its box and says "No data" when no node has an area', () => {
      set(h => h.data.set([]));
      expect(state()!.textContent.trim()).toBe('No data');
      expect(state()!.classList).toContain('wr-chart-state--empty');
      // Beside the image, never inside it: an `img` hides what it holds from a reader.
      expect(state()!.parentElement!.classList).toContain('wr-treemap-chart__body');
      expect(plot().contains(state())).toBe(false);
      expect(plot().style.height).toBe('280px');
      expect(plot().classList).toContain('wr-treemap-chart__plot--idle');

      set(h => h.data.set([{ label: 'Nothing', value: 0 }]));
      expect(state()!.textContent.trim()).toBe('No data');

      set(h => h.emptyLabel.set('No spend yet'));
      expect(state()!.textContent.trim()).toBe('No spend yet');
    });

    it('gives the tiles way to the loading message, and to a failed load as an alert', () => {
      set(h => h.loading.set(true));
      expect(tiles()).toHaveLength(0);
      expect(state()!.getAttribute('role')).toBe('status');
      expect(state()!.textContent.trim()).toBe('Loading…');

      set(h => {
        h.loading.set(false);
        h.error.set(true);
      });
      expect(state()!.getAttribute('role')).toBe('alert');
      expect(state()!.textContent.trim()).toBe('Could not load');
    });
  });
});

describe('WrTreemapChart stylesheet on the chart theme', { timeout: COMPILE_TIMEOUT }, () => {
  const css = (): string => compileSass(`@use 'charts/treemap-chart/styles';`).replace(/\/\*[\s\S]*?\*\//g, '');
  const pattern = (selector: string): string => selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/, /g, ',\\s*');
  const rule = (selector: string): string =>
    new RegExp(`(?:^|\\n)\\s*${pattern(selector)}\\s*\\{([^}]*)\\}`).exec(css())?.[1] ?? '';

  it('points the separator and the radius at the shared chart tokens', () => {
    const block = rule('.wr-treemap-chart');
    expect(block).toMatch(/--wr-treemap-chart-gap-color: var\(--wr-chart-separator\)/);
    expect(block).toMatch(/--wr-treemap-chart-radius: var\(--wr-chart-bar-radius\)/);
    expect(block).toMatch(/--wr-treemap-chart-idle-bg: var\(--wr-chart-track\)/);
    expect(block).toMatch(/--wr-treemap-chart-gap: 1px/);
  });

  it('paints a tile solid, a group as its leaves, with the palette as the fallback', () => {
    const block = rule('.wr-treemap-chart');
    expect(block).toMatch(/--wr-treemap-chart-leaf-tint: 100%/);
    expect(block).toMatch(/--wr-treemap-chart-group-tint: 100%/);
    expect(rule('.wr-treemap-chart__tile')).toMatch(
      /background: color-mix\(in srgb, var\(--wr-treemap-chart-tile-color, var\(--wr-chart-1\)\) var\(--wr-treemap-chart-leaf-tint\), var\(--wr-treemap-chart-bg\)\)/
    );
    expect(rule('.wr-treemap-chart__tile')).toMatch(
      /box-shadow: inset 0 0 0 var\(--wr-treemap-chart-gap\) var\(--wr-treemap-chart-gap-color\)/
    );
  });

  it('keeps no line of its own under `prefers-contrast: more`: the separator already holds 3:1 on a solid tile', () => {
    expect(css()).not.toMatch(/prefers-contrast: more\)\s*\{\s*\.wr-treemap-chart/);
  });

  it('writes on a tile in black or white, picked from the paint of that tile', () => {
    const tile = rule('.wr-treemap-chart__tile');
    expect(tile).toMatch(/color: var\(--wr-treemap-chart-label-color, color\(from color-mix\(/);
    expect(tile).toMatch(/xyz-d65/);
    expect(tile).toMatch(/\(0\.17913 - y\) \* infinity/);
    // Where the pick is not supported the text sits on a chip of the background.
    expect(css()).toMatch(/@supports not \(color: color\(from red xyz-d65/);
  });

  it('rings the reading tile in two tones, so one shows on a tile of any colour', () => {
    const active = rule('.wr-treemap-chart__tile--active');
    expect(active).toMatch(
      /inset 0 0 0 var\(--wr-treemap-chart-active-ring-width\) var\(--wr-treemap-chart-active-ring\)/
    );
    expect(active).toMatch(/var\(--wr-treemap-chart-gap-color\)/);
  });

  it('dims a tile with a veil rather than its opacity, which would show its group through it', () => {
    expect(rule('.wr-treemap-chart__tile')).toMatch(/opacity: 1/);
    const veil = rule('.wr-chart--dim .wr-treemap-chart__tile:not(.wr-chart-mark--on)::after');
    expect(veil).toMatch(/background: var\(--wr-treemap-chart-bg\)/);
    expect(veil).toMatch(/opacity: calc\(1 - var\(--wr-chart-dim\)\)/);
    expect(veil).toMatch(/transition: opacity var\(--wr-chart-duration-short\) var\(--wr-chart-ease\)/);
  });

  it('transitions nothing a layout reads', () => {
    const transitions = [...css().matchAll(/\.wr-treemap-chart[^{]*\{[^}]*transition: ([^;]+);/g)].map(m => m[1]);
    for (const transition of transitions) expect(transition).toMatch(/^opacity /);
  });
});
