import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { WrChartLegendPosition } from 'ngwr/charts/chart-legend';
import { wrChartColor } from 'ngwr/charts/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { COMPILE_TIMEOUT, compileSass } from '../../spec-sass';

import { WrRadarChart } from './radar-chart';
import type { WrRadarSeries, WrRadarVariant } from './types';

const AXES = ['Speed', 'Power', 'Range', 'Comfort', 'Price'];

const SERIES: readonly WrRadarSeries[] = [
  { label: 'Model A', data: [80, 65, 70, 90, 55] },
  { label: 'Model B', data: [60, 85, 75, 60, 80] },
  { label: 'Model C', data: [40, 45, 95, 70, 65] },
];

@Component({
  imports: [WrRadarChart],
  template: `
    <wr-radar-chart
      [axes]="axes()"
      [series]="series()"
      [max]="max()"
      [rings]="rings()"
      [size]="size()"
      [variant]="variant()"
      [showGrid]="showGrid()"
      [showLegend]="showLegend()"
      [legendPosition]="legendPosition()"
      [toggleableLegend]="toggleable()"
      [(hiddenSeries)]="hidden"
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
  readonly axes = signal<readonly string[]>(AXES);
  readonly series = signal<readonly WrRadarSeries[]>(SERIES);
  readonly max = signal(100);
  readonly rings = signal(4);
  readonly size = signal(280);
  readonly variant = signal<WrRadarVariant>('polygon');
  readonly showGrid = signal(true);
  readonly showLegend = signal<boolean | 'auto'>('auto');
  readonly legendPosition = signal<WrChartLegendPosition>('bottom');
  readonly toggleable = signal(false);
  readonly hidden = signal<readonly number[]>([]);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly emptyLabel = signal<string | null>(null);
  readonly loadingLabel = signal<string | null>(null);
  readonly errorLabel = signal<string | null>(null);
  readonly dataTable = signal(false);
}

@Component({ imports: [WrRadarChart], template: `<wr-radar-chart [axes]="axes" [series]="series" />` })
class DefaultHost {
  readonly axes = AXES;
  readonly series = SERIES;
}

/**
 * The chart on the shared chart theme: the palette, the dots of a series as one path, the
 * ring values between the spokes, the hover-dim, the legend's position, and the three
 * states. jsdom lays nothing out, so what is held here is the markup and the numbers
 * handed to the stylesheet; the rules themselves are read off the compiled sheet in the
 * block after.
 */
describe('WrRadarChart on the chart theme', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): Host => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const chart = (): HTMLElement => root().querySelector<HTMLElement>('wr-radar-chart')!;
  const all = <T extends Element = HTMLElement>(selector: string): T[] => [...root().querySelectorAll<T>(selector)];
  const set = (change: (h: Host) => void): void => {
    change(host());
    fixture.detectChanges();
  };
  const over = (el: Element): boolean => el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  /** Each ring value with the point of the drawing it is centred on, in percent. */
  const ringLabels = (): [string, number, number][] =>
    all('.wr-radar-chart__ring-label').map(label => [
      label.textContent.trim(),
      Number(label.style.getPropertyValue('--wr-radar-chart-x')),
      Number(label.style.getPropertyValue('--wr-radar-chart-y')),
    ]);
  /** The angle of a point of the drawing from its centre, in degrees clockwise from twelve o'clock. */
  const bearing = (x: number, y: number): number => ((Math.atan2(y - 50, x - 50) * 180) / Math.PI + 90 + 360) % 360;

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  describe('palette', () => {
    it('paints each series in the next colour of the chart palette: outline, fill, dots and key', () => {
      const colours = [wrChartColor(0), wrChartColor(1), wrChartColor(2)];
      expect(colours).toEqual(['var(--wr-chart-1)', 'var(--wr-chart-2)', 'var(--wr-chart-3)']);

      expect(all('.wr-radar-chart__line').map(line => line.getAttribute('stroke'))).toEqual(colours);
      expect(all('.wr-radar-chart__area').map(area => area.getAttribute('fill'))).toEqual(colours);
      expect(all('.wr-radar-chart__dot').map(dots => dots.getAttribute('stroke'))).toEqual(colours);
      expect(all('.wr-chart-legend__swatch line').map(key => key.getAttribute('stroke'))).toEqual(colours);
    });

    it('hands each fill its colour as a property, for the stylesheet to tint', () => {
      expect(
        all('.wr-radar-chart__area').map(area => area.style.getPropertyValue('--wr-radar-chart-series-color'))
      ).toEqual(['var(--wr-chart-1)', 'var(--wr-chart-2)', 'var(--wr-chart-3)']);

      set(h => h.series.set([{ label: 'Own', data: [1, 2, 3, 4, 5], color: '#123456' }]));
      expect(
        root()
          .querySelector<HTMLElement>('.wr-radar-chart__area')!
          .style.getPropertyValue('--wr-radar-chart-series-color')
      ).toBe('#123456');
    });
  });

  describe('dots', () => {
    it('draws every dot of a series as one path, a subpath per value', () => {
      const dots = all<SVGPathElement>('.wr-radar-chart__dot');
      expect(dots).toHaveLength(3);
      // Model A: 80 on the first axis is 40 of the radius above the centre.
      expect(dots[0].getAttribute('d')!.startsWith('M 50.00 10.00 h 0 M ')).toBe(true);
      for (const path of dots) expect(path.getAttribute('d')!.match(/M [\d.-]+ [\d.-]+ h 0/g)).toHaveLength(5);
    });

    it('keeps one path per series however many axes there are, and skips a missing value', () => {
      const axes = Array.from({ length: 12 }, (_, index) => `Axis ${index}`);
      set(h => {
        h.axes.set(axes);
        h.series.set([
          { label: 'Full', data: axes.map(() => 50) },
          { label: 'Gaps', data: axes.map((_, index) => (index % 3 === 0 ? null : 50)) },
        ]);
      });

      const dots = all<SVGPathElement>('.wr-radar-chart__dot');
      expect(dots).toHaveLength(2);
      expect(dots[0].getAttribute('d')!.match(/M/g)).toHaveLength(12);
      expect(dots[1].getAttribute('d')!.match(/M/g)).toHaveLength(8);
    });

    it('draws no dot path for a series hidden from the legend', () => {
      set(h => h.hidden.set([1]));
      expect(all('.wr-radar-chart__dot').map(dots => dots.getAttribute('data-wr-series'))).toEqual(['0', '2']);
    });

    it('keeps the strokes in pixels: none of them scales with the drawing', () => {
      set(h => h.size.set(480));
      const strokes = all('.wr-radar-chart__ring, .wr-radar-chart__spoke, .wr-radar-chart__line, .wr-radar-chart__dot');
      expect(strokes.length).toBeGreaterThan(10);
      for (const stroke of strokes) {
        expect(stroke.getAttribute('vector-effect')).toBe('non-scaling-stroke');
        expect(stroke.hasAttribute('stroke-width')).toBe(false);
      }
    });
  });

  describe('ring values', () => {
    it('sits them straight down from the centre with an odd count of axes, on the bottom edge of each ring', () => {
      // Five axes: spokes at 0°, 72°, 144°, 216° and 288°. Straight down, 180°, is half way
      // between two of them, and the middle of a ring's edge is cos 36° of its radius out.
      const reach = Math.cos(Math.PI / 5);
      expect(ringLabels().map(([text]) => text)).toEqual(['100', '75', '50', '25']);
      ringLabels().forEach(([, x, y], index) => {
        expect(x).toBe(50);
        expect(y).toBeCloseTo(50 + (50 - index * 12.5) * reach, 3);
      });
    });

    it('sits them between the first two axes with an even count, where straight down is a spoke', () => {
      set(h => {
        h.axes.set(['N', 'E', 'S', 'W']);
        h.series.set([{ label: 'A', data: [50, 50, 50, 50] }]);
      });

      // The outer ring's edge from N to E has its middle at (75, 25).
      expect(ringLabels()).toEqual([
        ['100', 75, 25],
        ['75', 68.75, 31.25],
        ['50', 62.5, 37.5],
        ['25', 56.25, 43.75],
      ]);
    });

    it.each([3, 4, 5, 6, 7, 8, 12])('keeps them off every spoke and every axis name with %i axes', count => {
      set(h => {
        h.axes.set(Array.from({ length: count }, (_, index) => `Axis ${index}`));
        h.series.set([{ label: 'A', data: Array.from({ length: count }, () => 50) }]);
      });
      const slice = 360 / count;

      const labels = ringLabels();
      expect(labels.length).toBeGreaterThan(0);
      for (const [text, x, y] of labels) {
        // Exactly half a slice from the spoke on either side: as far from both as a ring gets.
        const fromSpoke = bearing(x, y) % slice;
        expect(fromSpoke, text).toBeCloseTo(slice / 2, 2);
        // Inside the outer ring, so clear of the axis names, which sit past the ends of the spokes.
        expect(Math.hypot(x - 50, y - 50), text).toBeLessThan(50);
      }
    });

    it('sits them a quarter of a slice past the first axis in the polar-area variant, off the dots and the spokes', () => {
      set(h => h.variant.set('polar-area'));
      // Five wedges of 72°: the dots are on the axes, at 0°, and the spokes between the
      // wedges, at 36°. The values run at 18°.
      for (const [text, x, y] of ringLabels()) expect(bearing(x, y), text).toBeCloseTo(18, 2);
      // The rings are circles, so each value is on its ring: 25 out of 100 at half the radius.
      const [, x, y] = ringLabels().at(-1)!;
      expect(Math.hypot(x - 50, y - 50)).toBeCloseTo(25, 3);
    });

    it('leaves out a value closer than a line to the last one kept, in the polygon too', () => {
      set(h => h.rings.set(10));
      // Ten rings of a pentagon at 280px are 11.3px apart down the middle of the bottom edge.
      expect(all('.wr-radar-chart__ring')).toHaveLength(10);
      expect(ringLabels().map(([text]) => text)).toEqual(['100', '80', '60', '40', '20']);

      // At twice the size they are 22.7px apart, and every one fits.
      set(h => h.size.set(560));
      expect(ringLabels()).toHaveLength(10);
    });

    it('hands the stylesheet no offset from a spoke any more: the point is the value’s own', () => {
      for (const label of all('.wr-radar-chart__ring-label')) {
        expect(label.getAttribute('style')).toMatch(/^--wr-radar-chart-x: [\d.]+; --wr-radar-chart-y: [\d.]+;$/);
      }
    });
  });

  describe('hover', () => {
    const on = (): (string | null)[] => all('.wr-chart-mark--on').map(mark => mark.getAttribute('data-wr-series'));

    it('listens once on the chart for the dim, beside the one listener the drawing has for the tooltip', () => {
      const added = vi.spyOn(EventTarget.prototype, 'addEventListener');
      const plain = TestBed.createComponent(DefaultHost);
      plain.detectChanges();

      const el = (plain.nativeElement as HTMLElement).querySelector('wr-radar-chart');
      const pointer = added.mock.calls
        .map(([type], index) => [type, added.mock.contexts[index]] as const)
        .filter(([type, target]) => type.startsWith('mouse') && target === el);
      expect(pointer.map(([type]) => type).sort()).toEqual(['mouseleave', 'mouseover']);
      plain.destroy();
    });

    it('keys every mark of a series by its legend row', () => {
      for (const part of ['area', 'line', 'dot']) {
        expect(
          all(`.wr-radar-chart__${part}`).map(mark => mark.getAttribute('data-wr-series')),
          part
        ).toEqual(['0', '1', '2']);
      }
      expect(all('.wr-chart-legend__item').map(row => row.getAttribute('data-wr-series'))).toEqual(['0', '1', '2']);
    });

    it('dims every other series from an outline or a dot, and lets go on the way out', () => {
      over(all('.wr-radar-chart__line')[1]);
      expect(chart().classList).toContain('wr-chart--dim');
      // Model B's fill, outline, dots and legend row.
      expect(on()).toEqual(['1', '1', '1', '1']);

      over(all('.wr-radar-chart__dot')[2]);
      expect(on()).toEqual(['2', '2', '2', '2']);

      chart().dispatchEvent(new MouseEvent('mouseleave'));
      expect(chart().classList).not.toContain('wr-chart--dim');
      expect(on()).toEqual([]);
    });

    it('dims every other series from a legend row', () => {
      over(all('.wr-chart-legend__label')[0]);

      expect(chart().classList).toContain('wr-chart--dim');
      expect(on()).toEqual(['0', '0', '0', '0']);
    });

    it('dims nothing over the web itself, where the tooltip reads the axis', () => {
      over(root().querySelector('.wr-radar-chart__svg')!);
      expect(chart().classList).not.toContain('wr-chart--dim');
    });
  });

  describe('legend', () => {
    const legend = (): HTMLElement | null => root().querySelector('.wr-radar-chart__legend');
    const surface = (): HTMLElement => root().querySelector<HTMLElement>('.wr-radar-chart__surface')!;
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

    it('draws none at `none`, and still hides a series through the model', () => {
      set(h => {
        h.legendPosition.set('none');
        h.hidden.set([1]);
      });

      expect(legend()).toBeNull();
      expect(chart().classList).not.toContain('wr-chart--legend-side');
      expect(all('.wr-radar-chart__line')).toHaveLength(2);
    });

    it('leaves a single series without a legend, unless asked for one', () => {
      set(h => h.series.set([SERIES[0]]));
      expect(legend()).toBeNull();

      set(h => h.showLegend.set(true));
      expect(all('.wr-chart-legend__label').map(label => label.textContent.trim())).toEqual(['Model A']);

      set(h => h.showLegend.set(false));
      expect(legend()).toBeNull();
    });

    it('still toggles a series from wherever it sits', () => {
      set(h => {
        h.legendPosition.set('top');
        h.toggleable.set(true);
      });

      legend()!.querySelectorAll('button')[2].click();
      fixture.detectChanges();
      expect(host().hidden()).toEqual([2]);
      expect(all('.wr-radar-chart__line')).toHaveLength(2);
    });
  });

  describe('empty, loading and error', () => {
    const state = (): HTMLElement | null => root().querySelector('wr-chart-state');
    /** The frame the chart keeps: its rings, its spokes and its axis names. */
    const frame = (): number[] => [
      all('.wr-radar-chart__ring').length,
      all('.wr-radar-chart__spoke').length,
      all('.wr-radar-chart__axis-label').length,
    ];
    const marks = (): Element[] => all('.wr-radar-chart__area, .wr-radar-chart__line, .wr-radar-chart__dot');

    it('shows nothing of the kind while there is a series to draw', () => {
      expect(state()).toBeNull();
      expect(marks()).toHaveLength(9);
    });

    it('keeps the web and the axis names and says "No data" when there is nothing to draw', () => {
      set(h => h.series.set([]));

      expect(state()!.textContent.trim()).toBe('No data');
      expect(state()!.classList).toContain('wr-chart-state--empty');
      expect(state()!.parentElement!.classList).toContain('wr-radar-chart__surface');
      expect(frame()).toEqual([4, 5, 5]);
      // The ring values give way to the message, which is centred over the same web.
      expect(all('.wr-radar-chart__ring-label')).toEqual([]);
      expect(root().querySelector<HTMLElement>('.wr-radar-chart__surface')!.style.width).toBe('280px');

      set(h => h.emptyLabel.set('No models to compare'));
      expect(state()!.textContent.trim()).toBe('No models to compare');
    });

    it('is empty when no series has a value, and not when every series is hidden', () => {
      set(h => h.series.set([{ label: 'A', data: [null, Number.NaN] }]));
      expect(state()!.classList).toContain('wr-chart-state--empty');

      set(h => {
        h.series.set(SERIES);
        h.hidden.set([0, 1, 2]);
      });
      expect(state()).toBeNull();
      expect(marks()).toEqual([]);
      expect(all('.wr-chart-legend__item')).toHaveLength(3);
    });

    it('gives the series way to the loading message, over the web the chart had', () => {
      set(h => h.loading.set(true));

      expect(state()!.textContent.trim()).toBe('Loading…');
      expect(state()!.classList).toContain('wr-chart-state--loading');
      expect(marks()).toEqual([]);
      expect(frame()).toEqual([4, 5, 5]);
      expect(all('.wr-chart-legend__item')).toHaveLength(3);

      set(h => h.loadingLabel.set('Fetching models'));
      expect(state()!.textContent.trim()).toBe('Fetching models');

      set(h => h.loading.set(false));
      expect(state()).toBeNull();
      expect(marks()).toHaveLength(9);
    });

    it('says a load failed, as an alert, and puts loading over it', () => {
      set(h => h.error.set(true));

      expect(state()!.textContent.trim()).toBe('Could not load');
      expect(state()!.getAttribute('role')).toBe('alert');
      expect(marks()).toEqual([]);

      set(h => h.errorLabel.set('Models are unavailable'));
      expect(state()!.textContent.trim()).toBe('Models are unavailable');

      set(h => h.loading.set(true));
      expect(state()!.classList).toContain('wr-chart-state--loading');
    });

    it('draws no data table and opens no tooltip under a state', () => {
      set(h => h.dataTable.set(true));
      expect(all('.wr-chart-table')).toHaveLength(1);

      set(h => h.loading.set(true));
      expect(all('.wr-chart-table')).toEqual([]);

      const svg = root().querySelector<SVGSVGElement>('.wr-radar-chart__svg')!;
      vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 100, 200, 200));
      svg.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 150, bubbles: true }));
      fixture.detectChanges();
      expect(document.querySelector('.wr-chart-tooltip')).toBeNull();
      expect(root().querySelector('.wr-radar-chart__crosshair')).toBeNull();
    });
  });
});

/**
 * What the chart promises that jsdom cannot show - no cascade, no layout, no stroke -
 * held against the COMPILED sheet. That each rule then paints what it says is measured in
 * a browser.
 */
describe('WrRadarChart stylesheet on the chart theme', { timeout: COMPILE_TIMEOUT }, () => {
  const css = (): string => compileSass(`@use 'charts/radar-chart/styles';`).replace(/\/\*[\s\S]*?\*\//g, '');
  const pattern = (selector: string): string => selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/, /g, ',\\s*');
  const rule = (selector: string): string =>
    new RegExp(`(?:^|\\n)${pattern(selector)}\\s*\\{([^}]*)\\}`).exec(css())?.[1] ?? '';

  it('points every hook that paints the frame and the marks at the shared chart token', () => {
    const block = rule('.wr-radar-chart');
    expect(block).toMatch(/--wr-radar-chart-grid-color: var\(--wr-chart-grid\)/);
    expect(block).toMatch(/--wr-radar-chart-label-color: var\(--wr-chart-label\)/);
    expect(block).toMatch(/--wr-radar-chart-label-font-size: var\(--wr-chart-label-size\)/);
    expect(block).toMatch(/--wr-radar-chart-ring-label-color: var\(--wr-chart-label\)/);
    expect(block).toMatch(/--wr-radar-chart-ring-label-halo: var\(--wr-chart-separator\)/);
    expect(block).toMatch(/--wr-radar-chart-line-width: var\(--wr-chart-stroke\)/);
    expect(block).toMatch(/--wr-radar-chart-dot-size: var\(--wr-chart-marker\)/);
    expect(block).toMatch(/--wr-radar-chart-crosshair-color: var\(--wr-chart-axis\)/);
    expect(block).toMatch(/--wr-radar-chart-hover-ring: var\(--wr-chart-separator\)/);
  });

  it('draws the web in the grid hook, a pixel wide', () => {
    const web = rule('.wr-radar-chart__ring, .wr-radar-chart__spoke');
    expect(web).toMatch(/stroke: var\(--wr-radar-chart-grid-color\)/);
    expect(web).toMatch(/stroke-width: var\(--wr-radar-chart-grid-width\)/);
    expect(rule('.wr-radar-chart')).toMatch(/--wr-radar-chart-grid-width: 1px/);
  });

  it('tints a fill with more of its colour on a dark surface than on a light one', () => {
    const block = rule('.wr-radar-chart');
    expect(block).toMatch(/--wr-radar-chart-area-opacity: 0\.15/);
    expect(block).toMatch(/--wr-radar-chart-area-opacity-dark: 0\.24/);

    const area = rule('.wr-radar-chart__area').replace(/\s+/g, ' ');
    expect(area).toContain(
      'fill: light-dark(' +
        'color-mix(in srgb, var(--wr-radar-chart-series-color, currentColor) calc(var(--wr-radar-chart-area-opacity) * 100%), transparent), ' +
        'color-mix(in srgb, var(--wr-radar-chart-series-color, currentColor) calc(var(--wr-radar-chart-area-opacity-dark) * 100%), transparent))'
    );
    // One scheme's share for both was the murk: no flat opacity is left on the fill.
    expect(area).not.toMatch(/fill-opacity/);
  });

  it('keeps the fills out of the pointer’s way, since they lie over each other', () => {
    expect(rule('.wr-radar-chart__area')).toMatch(/pointer-events: none/);
    expect(rule('.wr-radar-chart__line')).not.toMatch(/pointer-events/);
  });

  it('centres a ring value on the point it is handed, with no offset from a spoke', () => {
    const label = rule('.wr-radar-chart__ring-label');
    expect(label).toMatch(/left: calc\(var\(--wr-radar-chart-x, 50\) \* 1%\)/);
    expect(label).toMatch(/top: calc\(var\(--wr-radar-chart-y, 0\) \* 1%\)/);
    expect(label).toMatch(/transform: translate\(-50%, -50%\)/);
    expect(css()).not.toMatch(/--wr-radar-chart-ring-label-offset/);
  });

  it('marks the hovered axis with a solid line, and each value as a larger dot in a ring of the surface', () => {
    const crosshair = rule('.wr-radar-chart__crosshair');
    expect(crosshair).toMatch(/stroke: var\(--wr-radar-chart-crosshair-color\)/);
    expect(crosshair).not.toMatch(/stroke-dasharray/);

    const ring = rule('.wr-radar-chart__hover-dot');
    expect(ring).toMatch(/stroke: var\(--wr-radar-chart-hover-ring\)/);
    expect(ring).toMatch(
      /stroke-width: calc\(var\(--wr-radar-chart-dot-size\) \+ 2px \+ 2 \* var\(--wr-radar-chart-hover-ring-width\)\)/
    );
    expect(rule('.wr-radar-chart__hover-dot-center')).toMatch(
      /stroke-width: calc\(var\(--wr-radar-chart-dot-size\) \+ 2px\)/
    );
    expect(css()).toMatch(
      /@media \(forced-colors: active\)\s*\{[^@]*\.wr-radar-chart__hover-dot\s*\{\s*stroke: Canvas;/
    );
  });

  it('dims through the shared rule, and transitions nothing of its own', () => {
    expect(css()).toMatch(
      /:where\(\.wr-chart--dim\) :where\(\[data-wr-series\]:not\(\.wr-chart-mark--on\)\)\s*\{\s*opacity: var\(--wr-chart-dim\)/
    );
    expect(css()).toMatch(
      /:where\(\[data-wr-series\]\)\s*\{\s*transition: opacity var\(--wr-chart-duration-short\) var\(--wr-chart-ease\)/
    );
    const own = [...css().matchAll(/(?:^|\n)(\.wr-radar-chart[^{]*)\{([^}]*)\}/g)].map(match => match[2]).join('\n');
    expect(own).not.toMatch(/transition/);
  });

  it("keeps the legend's room through the chart's own gap hook", () => {
    expect(rule('.wr-radar-chart__legend')).toMatch(/--wr-chart-legend-space: var\(--wr-radar-chart-gap\)/);
    expect(rule('.wr-radar-chart')).not.toMatch(/(?:^|\s)gap:/);
  });

  it('keeps the chart as wide as its parts beside the legend, the drawing shrinking first', () => {
    const side = rule('.wr-radar-chart.wr-chart--legend-side.wr-chart--legend-side');
    expect(side).toMatch(/display: inline-flex/);
    expect(side).toMatch(/flex-direction: row/);
    expect(side).toMatch(/align-items: center/);
    const surface = rule('.wr-radar-chart.wr-chart--legend-side.wr-chart--legend-side > .wr-radar-chart__surface');
    expect(surface).toMatch(/flex: 0 1 auto/);
    expect(surface).toMatch(/min-width: 0/);
  });
});
