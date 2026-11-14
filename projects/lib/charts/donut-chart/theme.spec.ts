import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { WrChartLegendPosition } from 'ngwr/charts/chart-legend';
import { wrChartColor } from 'ngwr/charts/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { COMPILE_TIMEOUT, compileSass } from '../../spec-sass';

import { WrDonutChart } from './donut-chart';
import type { WrDonutSegment } from './types';

const SEGMENTS: readonly WrDonutSegment[] = [
  { label: 'Direct', value: 30 },
  { label: 'Search', value: 50 },
  { label: 'Social', value: 20 },
];

@Component({
  imports: [WrDonutChart],
  template: `
    <wr-donut-chart
      [segments]="segments()"
      [size]="size()"
      [pie]="pie()"
      [showLegend]="showLegend()"
      [legendPosition]="legendPosition()"
      [toggleableLegend]="toggleable()"
      [(hiddenSegments)]="hidden"
      [loading]="loading()"
      [error]="error()"
      [emptyLabel]="emptyLabel()"
      [loadingLabel]="loadingLabel()"
      [errorLabel]="errorLabel()"
      centerValue="60%"
      centerLabel="Disk"
    />
  `,
})
class Host {
  readonly segments = signal<readonly WrDonutSegment[]>(SEGMENTS);
  readonly size = signal(200);
  readonly pie = signal(false);
  readonly showLegend = signal<boolean | 'auto'>('auto');
  readonly legendPosition = signal<WrChartLegendPosition>('bottom');
  readonly toggleable = signal(false);
  readonly hidden = signal<readonly number[]>([]);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly emptyLabel = signal<string | null>(null);
  readonly loadingLabel = signal<string | null>(null);
  readonly errorLabel = signal<string | null>(null);
}

@Component({ imports: [WrDonutChart], template: `<wr-donut-chart [segments]="segments" />` })
class DefaultHost {
  readonly segments = SEGMENTS;
}

/**
 * The chart on the shared chart theme: the palette, the separators, the one hover listener
 * and its dim, the legend's position, and the three states. jsdom lays nothing out, so
 * what is held here is the markup; the rules themselves are read off the compiled sheet
 * in the block after.
 */
describe('WrDonutChart on the chart theme', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): Host => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const chart = (): HTMLElement => root().querySelector<HTMLElement>('wr-donut-chart')!;
  const all = <T extends Element = HTMLElement>(selector: string): T[] => [...root().querySelectorAll<T>(selector)];
  const slices = (): SVGPathElement[] => all<SVGPathElement>('.wr-donut-chart__slice');
  const set = (change: (h: Host) => void): void => {
    change(host());
    fixture.detectChanges();
  };
  const over = (el: Element): boolean => el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  describe('palette and separators', () => {
    it('paints each slice in the next colour of the chart palette, past its end too', () => {
      set(h => h.segments.set(Array.from({ length: 10 }, (_, index) => ({ label: `S${index}`, value: 1 }))));

      expect(slices().map(slice => slice.getAttribute('fill'))).toEqual(
        Array.from({ length: 10 }, (_, index) => wrChartColor(index))
      );
      expect(slices()[0].getAttribute('fill')).toBe('var(--wr-chart-1)');
      expect(slices()[8].getAttribute('fill')).toBe('var(--wr-chart-1)');
    });

    it('keys the legend with the same colours', () => {
      expect(all('.wr-donut-chart__swatch').map(swatch => swatch.style.background)).toEqual([
        'var(--wr-chart-1)',
        'var(--wr-chart-2)',
        'var(--wr-chart-3)',
      ]);
    });

    it('parts the slices with a stroke that does not scale, at any size', () => {
      for (const size of [96, 200, 480]) {
        set(h => h.size.set(size));
        for (const slice of slices()) {
          expect(slice.getAttribute('vector-effect'), `${size}px`).toBe('non-scaling-stroke');
          // The width is the stylesheet's, in pixels: an attribute would be viewBox units.
          expect(slice.hasAttribute('stroke-width'), `${size}px`).toBe(false);
        }
      }
    });
  });

  describe('hover', () => {
    it('listens once for the whole chart, not on every slice', () => {
      const added = vi.spyOn(EventTarget.prototype, 'addEventListener');
      const plain = TestBed.createComponent(DefaultHost);
      plain.detectChanges();

      const pointer = added.mock.calls
        .map(([type], index) => [type, added.mock.contexts[index]] as const)
        .filter(([type]) => type.startsWith('mouse'));
      const el = (plain.nativeElement as HTMLElement).querySelector('wr-donut-chart');
      expect(pointer.map(([type]) => type).sort()).toEqual(['mouseleave', 'mouseover']);
      expect(pointer.every(([, target]) => target === el)).toBe(true);
      plain.destroy();
    });

    it('tags every slice with its own position, a hidden one keeping its number', () => {
      expect(slices().map(slice => slice.getAttribute('data-wr-index'))).toEqual(['0', '1', '2']);
      expect(slices().map(slice => slice.getAttribute('data-wr-series'))).toEqual(['0', '1', '2']);

      set(h => h.hidden.set([0]));
      expect(slices().map(slice => slice.getAttribute('data-wr-index'))).toEqual(['1', '2']);
      expect(slices().map(slice => slice.getAttribute('data-wr-series'))).toEqual(['1', '2']);
    });

    it('dims the other slices while the pointer is on one, and lets go on the way out', () => {
      over(slices()[1]);

      expect(chart().classList).toContain('wr-chart--dim');
      expect(slices().map(slice => slice.classList.contains('wr-chart-mark--on'))).toEqual([false, true, false]);
      // Its legend row stays lit with it.
      expect(all('.wr-chart-legend__item').map(row => row.classList.contains('wr-chart-mark--on'))).toEqual([
        false,
        true,
        false,
      ]);

      chart().dispatchEvent(new MouseEvent('mouseleave'));
      expect(chart().classList).not.toContain('wr-chart--dim');
      expect(all('.wr-chart-mark--on')).toEqual([]);
    });

    it('dims the other slices from a legend row', () => {
      over(all('.wr-chart-legend__label')[2]);

      expect(chart().classList).toContain('wr-chart--dim');
      expect(slices().map(slice => slice.classList.contains('wr-chart-mark--on'))).toEqual([false, false, true]);
    });

    it("reads a sliver's wider target as the sliver itself", () => {
      set(h => {
        h.pie.set(true);
        h.segments.set([
          { label: 'Wide', value: 99 },
          { label: 'Sliver', value: 1 },
        ]);
      });
      const hit = root().querySelector('.wr-donut-chart__hit')!;
      expect(hit.getAttribute('data-wr-index')).toBe('1');
      expect(hit.getAttribute('data-wr-series')).toBe('1');

      over(hit);
      expect(slices().map(slice => slice.classList.contains('wr-chart-mark--on'))).toEqual([false, true]);
    });
  });

  describe('legend', () => {
    const legend = (): HTMLElement | null => root().querySelector('.wr-donut-chart__legend');
    const surface = (): HTMLElement => root().querySelector<HTMLElement>('.wr-donut-chart__surface')!;
    const before = (): boolean => legend()!.compareDocumentPosition(surface()) === Node.DOCUMENT_POSITION_FOLLOWING;

    it('sits below the drawing by default, after it in the DOM', () => {
      expect(legend()!.classList).toContain('wr-chart-legend--bottom');
      expect(before()).toBe(false);
      expect(chart().classList).toContain('wr-chart--legend');
      expect(chart().classList).not.toContain('wr-chart--legend-side');
    });

    it.each([
      ['top', true, false],
      ['bottom', false, false],
      ['start', true, true],
      ['end', false, true],
    ] as const)('puts it at %s, in the DOM where it is on screen', (position, first, side) => {
      set(h => h.legendPosition.set(position));

      expect(legend()!.classList).toContain(`wr-chart-legend--${position}`);
      expect(before()).toBe(first);
      expect(chart().classList.contains('wr-chart--legend-side')).toBe(side);
      // The legend and the drawing are the host's own children, which the side layout needs.
      expect(legend()!.parentElement).toBe(chart());
      expect(surface().parentElement).toBe(chart());
    });

    it('draws none at `none`, and still hides a slice through the model', () => {
      set(h => {
        h.legendPosition.set('none');
        h.hidden.set([1]);
      });

      expect(legend()).toBeNull();
      expect(chart().classList).not.toContain('wr-chart--legend-side');
      expect(slices()).toHaveLength(2);
    });

    it('leaves a single slice without a legend, unless asked for one', () => {
      set(h => h.segments.set([SEGMENTS[0]]));
      expect(legend()).toBeNull();

      set(h => h.showLegend.set(true));
      expect(all('.wr-chart-legend__label').map(label => label.textContent.trim())).toEqual(['Direct']);

      set(h => h.showLegend.set(false));
      expect(legend()).toBeNull();
    });

    it('still toggles a slice from wherever it sits', () => {
      set(h => {
        h.legendPosition.set('start');
        h.toggleable.set(true);
      });

      legend()!.querySelectorAll('button')[1].click();
      fixture.detectChanges();
      expect(host().hidden()).toEqual([1]);
      expect(slices()).toHaveLength(2);
    });
  });

  describe('empty, loading and error', () => {
    const state = (): HTMLElement | null => root().querySelector('wr-chart-state');
    const track = (): SVGPathElement | null => root().querySelector<SVGPathElement>('.wr-donut-chart__track');
    const RING = 'M 100 50 A 50 50 0 1 1 0 50 A 50 50 0 1 1 100 50 M 85 50 A 35 35 0 1 0 15 50 A 35 35 0 1 0 85 50';

    it('shows nothing of the kind while there are slices to draw', () => {
      expect(state()).toBeNull();
      expect(track()).toBeNull();
      expect(root().querySelector('.wr-donut-chart__center')).not.toBeNull();
    });

    it('keeps the ring as a track and says "No data" when there is nothing to draw', () => {
      set(h => h.segments.set([]));

      expect(state()!.textContent.trim()).toBe('No data');
      expect(state()!.classList).toContain('wr-chart-state--empty');
      expect(state()!.parentElement!.classList).toContain('wr-donut-chart__surface');
      expect(track()!.getAttribute('d')).toBe(RING);
      expect(slices()).toEqual([]);
      // The message is where the centre text was, and the chart keeps its size.
      expect(root().querySelector('.wr-donut-chart__center')).toBeNull();
      expect(root().querySelector<HTMLElement>('.wr-donut-chart__surface')!.style.width).toBe('200px');

      set(h => h.emptyLabel.set('No traffic yet'));
      expect(state()!.textContent.trim()).toBe('No traffic yet');
    });

    it('is empty when no segment has a share to take, and not when every slice is hidden', () => {
      set(h =>
        h.segments.set([
          { label: 'Zero', value: 0 },
          { label: 'Broken', value: Number.NaN },
          { label: 'Negative', value: -5 },
        ])
      );
      expect(state()!.classList).toContain('wr-chart-state--empty');

      set(h => {
        h.segments.set(SEGMENTS);
        h.hidden.set([0, 1, 2]);
      });
      // Hidden from the legend is not "No data": the track stays, and so does the centre.
      expect(state()).toBeNull();
      expect(track()!.getAttribute('d')).toBe(RING);
      expect(root().querySelector('.wr-donut-chart__center')).not.toBeNull();
    });

    it('draws the track of a pie as the whole disc', () => {
      set(h => {
        h.pie.set(true);
        h.segments.set([]);
      });

      expect(track()!.getAttribute('d')).toBe('M 100 50 A 50 50 0 1 1 0 50 A 50 50 0 1 1 100 50');
    });

    it('gives the slices way to the loading message, and keeps the legend', () => {
      set(h => h.loading.set(true));

      expect(state()!.textContent.trim()).toBe('Loading…');
      expect(state()!.classList).toContain('wr-chart-state--loading');
      expect(slices()).toEqual([]);
      expect(track()).not.toBeNull();
      expect(all('.wr-chart-legend__item')).toHaveLength(3);

      set(h => h.loadingLabel.set('Fetching traffic'));
      expect(state()!.textContent.trim()).toBe('Fetching traffic');

      set(h => h.loading.set(false));
      expect(state()).toBeNull();
      expect(slices()).toHaveLength(3);
    });

    it('says a load failed, as an alert, and puts loading over it', () => {
      set(h => h.error.set(true));

      expect(state()!.textContent.trim()).toBe('Could not load');
      expect(state()!.getAttribute('role')).toBe('alert');
      expect(slices()).toEqual([]);

      set(h => h.errorLabel.set('Traffic is unavailable'));
      expect(state()!.textContent.trim()).toBe('Traffic is unavailable');

      set(h => h.loading.set(true));
      expect(state()!.classList).toContain('wr-chart-state--loading');
    });

    it("draws no sliver target under a state, and closes a slice's open chip", async () => {
      set(h => {
        h.pie.set(true);
        h.segments.set([
          { label: 'Wide', value: 99 },
          { label: 'Sliver', value: 1 },
        ]);
      });
      expect(all('.wr-donut-chart__hit')).toHaveLength(1);
      over(slices()[0]);
      fixture.detectChanges();
      expect(document.querySelector('.wr-chart-tooltip')).not.toBeNull();

      set(h => h.loading.set(true));
      await fixture.whenStable();
      fixture.detectChanges();
      expect(all('.wr-donut-chart__hit')).toEqual([]);
      expect(document.querySelector('.wr-chart-tooltip')).toBeNull();
    });
  });
});

/**
 * What the chart promises that jsdom cannot show - no cascade, no layout, no stroke -
 * held against the COMPILED sheet. That each rule then paints what it says is measured in
 * a browser.
 */
describe('WrDonutChart stylesheet on the chart theme', { timeout: COMPILE_TIMEOUT }, () => {
  const css = (): string => compileSass(`@use 'charts/donut-chart/styles';`).replace(/\/\*[\s\S]*?\*\//g, '');
  const pattern = (selector: string): string => selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/, /g, ',\\s*');
  const rule = (selector: string): string =>
    new RegExp(`(?:^|\\n)${pattern(selector)}\\s*\\{([^}]*)\\}`).exec(css())?.[1] ?? '';

  it('points the hooks that paint the ring at the shared chart tokens', () => {
    const block = rule('.wr-donut-chart');
    expect(block).toMatch(/--wr-donut-chart-slice-gap-color: var\(--wr-chart-separator\)/);
    expect(block).toMatch(/--wr-donut-chart-track-color: var\(--wr-chart-track\)/);
    expect(rule('.wr-donut-chart__center-label')).toMatch(
      /--wr-donut-chart-center-label-font-size: var\(--wr-chart-label-size\)/
    );
    expect(rule('.wr-donut-chart__center-label')).toMatch(
      /--wr-donut-chart-center-label-color: var\(--wr-chart-label\)/
    );
  });

  it('declares the chart theme itself, so the palette resolves with this sheet alone', () => {
    expect(css()).toMatch(/--wr-chart-1: var\(--wr-color-primary\)/);
    expect(css()).toMatch(/--wr-chart-separator: var\(--wr-color-surface\)/);
  });

  it('parts two slices with 1px of the separator, in pixels', () => {
    expect(rule('.wr-donut-chart')).toMatch(/--wr-donut-chart-slice-gap-width: 1px/);
    const slice = rule('.wr-donut-chart__slice');
    expect(slice).toMatch(/stroke: var\(--wr-donut-chart-slice-gap-color\)/);
    expect(slice).toMatch(/stroke-width: var\(--wr-donut-chart-slice-gap-width\)/);
  });

  it('paints the empty ring in the track hook, and in a system colour under forced colors', () => {
    expect(rule('.wr-donut-chart__track')).toMatch(/fill: var\(--wr-donut-chart-track-color\)/);
    expect(css()).toMatch(/@media \(forced-colors: active\)\s*\{[^@]*\.wr-donut-chart__track\s*\{\s*fill: GrayText;/);
  });

  it('prints the centre value at the size the gauge prints its reading', () => {
    expect(rule('.wr-donut-chart__center-value')).toMatch(
      /--wr-donut-chart-center-value-font-size: var\(--wr-text-xl\)/
    );
    expect(compileSass(`@use 'charts/gauge/styles';`)).toMatch(/--wr-gauge-text-font-size: var\(--wr-text-xl\)/);
  });

  it('dims through the shared rule, and transitions nothing but opacity', () => {
    expect(css()).toMatch(
      /:where\(\.wr-chart--dim\) :where\(\[data-wr-series\]:not\(\.wr-chart-mark--on\)\)\s*\{\s*opacity: var\(--wr-chart-dim\)/
    );
    const own = [...css().matchAll(/(?:^|\n)(\.wr-donut-chart[^{]*)\{([^}]*)\}/g)].map(match => match[2]).join('\n');
    expect(own).not.toMatch(/transition/);
  });

  it("keeps the legend's room through the chart's own gap hook, and the shared 8px key", () => {
    expect(rule('.wr-donut-chart__legend')).toMatch(/--wr-chart-legend-space: var\(--wr-donut-chart-gap\)/);
    expect(rule('.wr-donut-chart')).not.toMatch(/(?:^|\s)gap:/);
    expect(rule('.wr-donut-chart__swatch')).not.toMatch(/width|height/);
  });

  it('keeps the drawing its size beside the legend, and the chart as wide as its parts', () => {
    const side = rule('.wr-donut-chart.wr-chart--legend-side.wr-chart--legend-side');
    expect(side).toMatch(/display: inline-flex/);
    expect(side).toMatch(/flex-direction: row/);
    expect(side).toMatch(/align-items: center/);
    expect(rule('.wr-donut-chart.wr-chart--legend-side.wr-chart--legend-side > .wr-donut-chart__surface')).toMatch(
      /flex: none/
    );
  });
});
