import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { WrChartLegendPosition } from 'ngwr/charts/chart-legend';
import { wrChartColor, wrChartMarkerPath } from 'ngwr/charts/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { COMPILE_TIMEOUT, compileSass } from '../../spec-sass';

import { type WrScatterHitPoint, wrScatterHit, wrScatterIndex } from './internal/hit';
import { wrScatterDensePath, wrScatterMarkerCache, wrScatterRelativePath } from './internal/markers';
import { WrScatterChart } from './scatter-chart';
import type { WrScatterSeries } from './types';

/** Two series over x 10..30 and y 100..140: the points sit at 1/6, 1/2 and 5/6 of each axis. */
const SERIES: readonly WrScatterSeries[] = [
  {
    label: 'Laptops',
    data: [
      { x: 10, y: 100 },
      { x: 30, y: 140 },
    ],
  },
  { label: 'Tablets', data: [{ x: 20, y: 120 }] },
];

/** `count` points over two series, laid on a diagonal. */
const many = (count: number): WrScatterSeries[] => [
  { label: 'Even', data: Array.from({ length: Math.ceil(count / 2) }, (_, i) => ({ x: i, y: i })) },
  { label: 'Odd', data: Array.from({ length: Math.floor(count / 2) }, (_, i) => ({ x: i, y: i + 1 })) },
];

@Component({
  imports: [WrScatterChart],
  template: `
    <wr-scatter-chart
      [series]="series()"
      [xLabel]="xLabel()"
      [yLabel]="yLabel()"
      [showGrid]="showGrid()"
      [showAxis]="showAxis()"
      [showLegend]="showLegend()"
      [legendPosition]="legendPosition()"
      [loading]="loading()"
      [error]="error()"
      [emptyLabel]="emptyLabel()"
      [loadingLabel]="loadingLabel()"
      [errorLabel]="errorLabel()"
      [tooltip]="tooltip()"
      [dataTable]="dataTable()"
      [(hiddenSeries)]="hidden"
    />
  `,
})
class Host {
  readonly series = signal<readonly WrScatterSeries[]>(SERIES);
  readonly xLabel = signal<string | null>(null);
  readonly yLabel = signal<string | null>(null);
  readonly showGrid = signal(true);
  readonly showAxis = signal(true);
  readonly showLegend = signal<boolean | 'auto'>('auto');
  readonly legendPosition = signal<WrChartLegendPosition>('bottom');
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly emptyLabel = signal<string | null>(null);
  readonly loadingLabel = signal<string | null>(null);
  readonly errorLabel = signal<string | null>(null);
  readonly tooltip = signal(true);
  readonly dataTable = signal(false);
  readonly hidden = signal<readonly number[]>([]);
}

@Component({ imports: [WrScatterChart], template: `<wr-scatter-chart [series]="series" />` })
class DefaultHost {
  readonly series = SERIES;
}

/**
 * The chart on the shared chart theme: the grid and the scales as two inputs, the
 * legend's position, the three states, the hover, and the DOM the points are drawn with.
 * jsdom lays nothing out, so what is held here is the markup and the numbers handed to
 * the stylesheet; the rules themselves are read off the compiled sheet in the last block.
 */
describe('WrScatterChart on the chart theme', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): Host => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const chart = (): HTMLElement => root().querySelector<HTMLElement>('wr-scatter-chart')!;
  const plot = (): HTMLElement => root().querySelector<HTMLElement>('.wr-scatter-chart__plot')!;
  const svg = (): SVGSVGElement => root().querySelector<SVGSVGElement>('.wr-scatter-chart__svg')!;
  const all = <T extends Element = HTMLElement>(selector: string, from: ParentNode = root()): T[] => [
    ...from.querySelectorAll<T>(selector),
  ];
  const texts = (selector: string): string[] => all(selector).map(element => element.textContent.trim());
  const set = (change: (h: Host) => void): void => {
    change(host());
    fixture.detectChanges();
  };
  const chip = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-chart-tooltip');
  const moveTo = (clientX: number, clientY: number): void => {
    plot().dispatchEvent(new MouseEvent('mousemove', { clientX, clientY, bubbles: true }));
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

  describe('the points', () => {
    it('paints each series in the next colour of the chart palette', () => {
      expect(all('.wr-scatter-chart__series').map(group => group.getAttribute('fill'))).toEqual([
        wrChartColor(0),
        wrChartColor(1),
      ]);
      expect(wrChartColor(1)).toBe('var(--wr-chart-2)');
    });

    it('draws a plain scatter as one group per series, which carries what its points share', () => {
      expect(
        all('.wr-scatter-chart__series').map(group => [
          group.getAttribute('data-wr-series'),
          group.getAttribute('data-marker'),
          group.querySelectorAll('.wr-scatter-chart__point').length,
        ])
      ).toEqual([
        ['0', 'circle', 2],
        ['1', 'square', 1],
      ]);
    });

    it('leaves a point its place, its path and one attribute for a harness, and nothing else', () => {
      const names = (element: Element): string[] => element.getAttributeNames().sort();
      for (const point of all('.wr-scatter-chart__point')) {
        expect(names(point)).toEqual(['class', 'data-point', 'overflow', 'x', 'y']);
        expect(names(point.querySelector('.wr-scatter-chart__marker')!)).toEqual(['class', 'd']);
      }
      // x, y and the radius; the size joins them only when the point has one.
      expect(all('.wr-scatter-chart__point').map(point => point.getAttribute('data-point'))).toEqual([
        '10 100 3',
        '30 140 3',
        '20 120 3',
      ]);
      expect(root().querySelector('[data-series], [data-x], [data-y], [data-size], [data-radius]')).toBeNull();
    });

    it('draws a plain point at the 6px of the chart theme', () => {
      expect(all('.wr-scatter-chart__marker')[0].getAttribute('d')).toBe(wrChartMarkerPath('circle', 3));
    });

    it('keeps bubbles largest first across series, a group for every stretch of one series', () => {
      set(h =>
        h.series.set([
          {
            label: 'A',
            data: [
              { x: 1, y: 1, size: 100 },
              { x: 2, y: 2, size: 1 },
            ],
          },
          { label: 'B', data: [{ x: 3, y: 3, size: 25 }] },
        ])
      );

      expect(
        all('.wr-scatter-chart__series').map(group => [
          group.getAttribute('data-wr-series'),
          all('.wr-scatter-chart__point', group).map(point => point.getAttribute('data-point')),
        ])
      ).toEqual([
        ['0', ['1 1 20 100']],
        ['1', ['3 3 10 25']],
        ['0', ['2 2 4 1']],
      ]);
    });
  });

  describe('grid and axes', () => {
    const lines = (): number => all('.wr-scatter-chart__grid-line').length;

    it('draws the grid and both scales by default', () => {
      const plain = TestBed.createComponent(DefaultHost);
      plain.detectChanges();
      const el = plain.nativeElement as HTMLElement;

      expect(el.querySelectorAll('.wr-scatter-chart__grid-line:not(.wr-scatter-chart__grid-line--x)')).toHaveLength(7);
      expect(el.querySelectorAll('.wr-scatter-chart__y-tick')).toHaveLength(7);
      expect(el.querySelectorAll('.wr-scatter-chart__x-tick')).toHaveLength(7);
      expect(el.querySelector('wr-scatter-chart')!.classList).toContain('wr-scatter-chart--axis');
      plain.destroy();
    });

    it('drops the gridlines and the scales each on its own', () => {
      set(h => h.showGrid.set(false));
      expect([lines(), texts('.wr-scatter-chart__y-tick').length, texts('.wr-scatter-chart__x-tick').length]).toEqual([
        0, 7, 7,
      ]);

      set(h => {
        h.showGrid.set(true);
        h.showAxis.set(false);
      });
      expect(lines()).toBe(14);
      expect(root().querySelector('.wr-scatter-chart__y-axis, .wr-scatter-chart__x-axis')).toBeNull();
      expect(chart().classList).not.toContain('wr-scatter-chart--axis');
    });

    it('marks the gridline at zero, and only the one across the plot', () => {
      expect(root().querySelector('.wr-scatter-chart__grid-line--zero')).toBeNull();

      set(h =>
        h.series.set([
          {
            label: 'Change',
            data: [
              { x: -10, y: -20 },
              { x: 10, y: 20 },
            ],
          },
        ])
      );
      const zero = all<SVGLineElement>('.wr-scatter-chart__grid-line--zero');
      expect(zero).toHaveLength(1);
      expect(zero[0].classList).not.toContain('wr-scatter-chart__grid-line--x');
      expect(zero[0].getAttribute('y1')).toBe('50%');
    });

    it("turns the y axis' name along the axis, inside the body and before the scale", () => {
      set(h => {
        h.yLabel.set('Rating');
        h.legendPosition.set('top');
      });
      const title = root().querySelector<HTMLElement>('.wr-scatter-chart__y-title')!;

      expect(title.textContent.trim()).toBe('Rating');
      expect(title.parentElement!.classList).toContain('wr-scatter-chart__body');
      expect(title.nextElementSibling!.classList).toContain('wr-scatter-chart__y-axis');
    });
  });

  describe('legend', () => {
    const legend = (): HTMLElement | null => root().querySelector('.wr-scatter-chart__legend');
    const body = (): HTMLElement => root().querySelector<HTMLElement>('.wr-scatter-chart__body')!;
    const before = (): boolean => legend()!.compareDocumentPosition(body()) === Node.DOCUMENT_POSITION_FOLLOWING;

    it('sits below the plot by default, after it in the DOM', () => {
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
      expect(legend()!.parentElement).toBe(chart());
      expect(body().parentElement).toBe(chart());
    });

    it('draws none at `none`, and still hides a series through the model', () => {
      set(h => {
        h.legendPosition.set('none');
        h.hidden.set([0]);
      });

      expect(legend()).toBeNull();
      expect(chart().classList).not.toContain('wr-chart--legend-side');
      expect(all('.wr-scatter-chart__point')).toHaveLength(1);
    });

    it('leaves a single series without a legend, unless asked for one', () => {
      set(h => h.series.set([SERIES[0]]));
      expect(legend()).toBeNull();

      set(h => h.showLegend.set(true));
      expect(texts('.wr-chart-legend__label')).toEqual(['Laptops']);

      set(h => h.showLegend.set(false));
      expect(legend()).toBeNull();
    });
  });

  describe('empty, loading and error', () => {
    const state = (): HTMLElement | null => root().querySelector('wr-chart-state');
    const frame = (): number[] => [
      all('.wr-scatter-chart__grid-line:not(.wr-scatter-chart__grid-line--x)').length,
      all('.wr-scatter-chart__y-tick').length,
      all('.wr-scatter-chart__x-tick').length,
    ];

    it('shows nothing of the kind while there are points to draw', () => {
      expect(state()).toBeNull();
    });

    it('keeps the frame and says "No data" when there is nothing to draw', () => {
      set(h => h.series.set([]));

      expect(state()!.textContent.trim()).toBe('No data');
      expect(state()!.classList).toContain('wr-chart-state--empty');
      // Beside the plot, never inside it: the plot is an `img`.
      expect(state()!.parentElement!.classList).toContain('wr-scatter-chart__body');
      expect(plot().contains(state())).toBe(false);
      expect(frame()).toEqual([5, 5, 5]);
      expect(plot().style.height).toBe('240px');

      set(h => h.emptyLabel.set('No products yet'));
      expect(state()!.textContent.trim()).toBe('No products yet');
    });

    it('is empty for series with no point it can place, and not for series that are all hidden', () => {
      set(h => h.series.set([{ label: 'Rubbish', data: [{ x: Number.NaN, y: 1 }] }]));
      expect(state()!.classList).toContain('wr-chart-state--empty');

      set(h => {
        h.series.set(SERIES);
        h.hidden.set([0, 1]);
      });
      expect(state()).toBeNull();
    });

    it('gives the points way to the loading message, over the axes the chart had', () => {
      set(h => {
        h.dataTable.set(true);
        h.loading.set(true);
      });

      expect(state()!.textContent.trim()).toBe('Loading…');
      expect(state()!.classList).toContain('wr-chart-state--loading');
      expect(all('.wr-scatter-chart__point')).toEqual([]);
      expect(all('.wr-chart-table')).toEqual([]);
      expect(frame()).toEqual([7, 7, 7]);

      set(h => h.loadingLabel.set('Fetching prices'));
      expect(state()!.textContent.trim()).toBe('Fetching prices');

      set(h => h.loading.set(false));
      expect(state()).toBeNull();
      expect(all('.wr-scatter-chart__point')).toHaveLength(3);
      expect(all('.wr-chart-table')).toHaveLength(1);
    });

    it('says a load failed, as an alert, and puts loading over it', () => {
      set(h => h.error.set(true));

      expect(state()!.textContent.trim()).toBe('Could not load');
      expect(state()!.getAttribute('role')).toBe('alert');
      expect(all('.wr-scatter-chart__point')).toEqual([]);

      set(h => h.errorLabel.set('Prices are unavailable'));
      expect(state()!.textContent.trim()).toBe('Prices are unavailable');

      set(h => h.loading.set(true));
      expect(state()!.classList).toContain('wr-chart-state--loading');
    });

    it('reads no point under a state', () => {
      svg().getBoundingClientRect = () => new DOMRect(0, 0, 300, 120);
      set(h => h.loading.set(true));
      moveTo(150, 60);

      expect(chip()).toBeNull();
      expect(root().querySelector('.wr-scatter-chart__halo')).toBeNull();
    });
  });

  describe('hover', () => {
    const on = (): (string | null)[] => all('.wr-chart-mark--on').map(mark => mark.getAttribute('data-wr-series'));

    it('dims every other series from a marker', () => {
      all('.wr-scatter-chart__marker')[2].dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

      expect(chart().classList).toContain('wr-chart--dim');
      // Tablets' group and its legend row.
      expect(on()).toEqual(['1', '1']);

      chart().dispatchEvent(new MouseEvent('mouseleave'));
      expect(chart().classList).not.toContain('wr-chart--dim');
      expect(on()).toEqual([]);
    });

    it('dims every other series from a legend row', () => {
      all('.wr-chart-legend__label')[0].dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

      expect(on()).toEqual(['0', '0']);
      expect(chart().classList).toContain('wr-chart--dim');
    });

    it('draws the point being read again, a pixel larger and in its own colour', () => {
      svg().getBoundingClientRect = () => new DOMRect(0, 0, 300, 120);
      moveTo(150, 60);

      const halo = root().querySelector('.wr-scatter-chart__halo')!;
      expect([halo.getAttribute('x'), halo.getAttribute('y')]).toEqual(['50%', '50%']);
      const marker = halo.querySelector('path')!;
      expect(marker.getAttribute('d')).toBe(wrChartMarkerPath('square', 4));
      expect(marker.getAttribute('fill')).toBe('var(--wr-chart-2)');
      // Outside every series' group, so it is never dimmed with one.
      expect(halo.closest('[data-wr-series]')).toBeNull();
    });
  });

  describe('the pointer', () => {
    it('hears the pointer through one native listener pair on the plot', () => {
      const added = vi.spyOn(EventTarget.prototype, 'addEventListener');
      const plain = TestBed.createComponent(DefaultHost);
      plain.detectChanges();
      const el = plain.nativeElement as HTMLElement;

      const pointer = added.mock.calls
        .map(([type], index) => [type, added.mock.contexts[index]] as const)
        .filter(([type]) => type.startsWith('mouse'));
      expect(pointer.map(([type, target]) => [type, (target as Element).tagName.toLowerCase()]).sort()).toEqual([
        ['mouseleave', 'div'],
        ['mouseleave', 'wr-scatter-chart'],
        ['mousemove', 'div'],
        ['mouseover', 'wr-scatter-chart'],
      ]);
      expect(pointer.filter(([, target]) => target === el.querySelector('.wr-scatter-chart__plot'))).toHaveLength(2);
      plain.destroy();
    });

    it('looks a move up once, whether the chip is open or not', () => {
      const measured = vi.fn(() => new DOMRect(0, 0, 300, 120));
      svg().getBoundingClientRect = measured;

      // Off every point: one read to look, and nothing found.
      moveTo(150, 110);
      expect(chip()).toBeNull();
      expect(measured).toHaveBeenCalledTimes(1);

      // Onto a point: one read to find it, one for the chip to point at it.
      measured.mockClear();
      moveTo(150, 60);
      expect(chip()!.querySelector('.wr-chart-tooltip__label')!.textContent.trim()).toBe('Tablets');
      expect(measured).toHaveBeenCalledTimes(2);

      // With the chip up, a move that stays on its point is looked up once and stops there.
      measured.mockClear();
      moveTo(152, 61);
      expect(measured).toHaveBeenCalledTimes(1);

      // On to another point: one read to find it, one to point at it.
      measured.mockClear();
      moveTo(250, 20);
      expect(chip()!.querySelector('.wr-chart-tooltip__label')!.textContent.trim()).toBe('Laptops');
      expect(measured).toHaveBeenCalledTimes(2);
    });

    it('measures nothing with the tooltip off', () => {
      const measured = vi.fn(() => new DOMRect(0, 0, 300, 120));
      svg().getBoundingClientRect = measured;
      set(h => h.tooltip.set(false));
      moveTo(150, 60);

      expect(measured).not.toHaveBeenCalled();
    });
  });

  describe('many points', () => {
    const paths = (): SVGPathElement[] => all<SVGPathElement>('.wr-scatter-chart__points');

    it('keeps a node per point up to two thousand shown', () => {
      set(h => h.series.set(many(2000)));

      expect(all('.wr-scatter-chart__point')).toHaveLength(2000);
      expect(root().querySelector('.wr-scatter-chart__dense')).toBeNull();
    });

    it('draws one path per series past it, a subpath per marker', () => {
      set(h => h.series.set(many(2001)));

      expect(all('.wr-scatter-chart__point')).toEqual([]);
      expect(all('.wr-scatter-chart__series')).toEqual([]);
      expect(
        paths().map(path => [
          path.getAttribute('data-wr-series'),
          path.getAttribute('data-marker'),
          path.getAttribute('data-count'),
          path.getAttribute('fill'),
          path.getAttribute('d')!.split('M').length - 1,
        ])
      ).toEqual([
        ['0', 'circle', '1001', 'var(--wr-chart-1)', 1001],
        ['1', 'square', '1000', 'var(--wr-chart-2)', 1000],
      ]);
      // Two paths and the box they sit in, where there were four thousand elements.
      expect(svg().querySelectorAll('svg, path')).toHaveLength(3);
      expect(paths()[0].classList).toContain('wr-scatter-chart__marker');
    });

    it('writes the paths for an assumed box until a browser has measured one', () => {
      set(h => h.series.set(many(2001)));

      const dense = root().querySelector('.wr-scatter-chart__dense')!;
      expect(dense.getAttribute('viewBox')).toBe('0 0 560 240');
      expect(dense.getAttribute('preserveAspectRatio')).toBe('none');
      // The axes run -200 to 1000, so the point at 0 / 0 is a sixth of the way along each.
      expect(
        paths()[0]
          .getAttribute('d')!
          .startsWith(`M93.3 200${wrScatterRelativePath(wrChartMarkerPath('circle', 3))}M`)
      ).toBe(true);
    });

    it('dims a series from its path, and still reads a point by position', () => {
      set(h => h.series.set(many(2001)));
      svg().getBoundingClientRect = () => new DOMRect(0, 0, 500, 500);

      paths()[1].dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      expect(all('.wr-chart-mark--on').map(mark => mark.getAttribute('data-wr-series'))).toEqual(['1', '1']);

      // x 500, y 500 of the 0 to 1000 frame is the middle of the box.
      moveTo(250, 250);
      expect(chip()!.querySelector('.wr-chart-tooltip__label')!.textContent.trim()).toBe('Even');
      expect([...chip()!.querySelectorAll('.wr-chart-tooltip__row-value')].map(v => v.textContent.trim())).toEqual([
        '500',
        '500',
      ]);
    });
  });
});

describe('WrScatterChart paths of many markers, measured', () => {
  /** A `ResizeObserver` a spec delivers sizes through. */
  class FakeObserver {
    static built: FakeObserver[] = [];
    readonly targets = new Set<Element>();

    constructor(private readonly callback: (entries: unknown[]) => void) {
      FakeObserver.built.push(this);
    }

    observe(target: Element): void {
      this.targets.add(target);
    }

    unobserve(target: Element): void {
      this.targets.delete(target);
    }

    disconnect(): void {
      this.targets.clear();
    }

    deliver(entries: unknown[]): void {
      this.callback(entries);
    }
  }

  const original = globalThis.ResizeObserver;

  afterEach(() => {
    globalThis.ResizeObserver = original;
    FakeObserver.built = [];
  });

  it("writes them again in px of the drawing's own size, so nothing is stretched", () => {
    globalThis.ResizeObserver = FakeObserver as unknown as typeof ResizeObserver;
    TestBed.resetTestingModule();
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.series.set(many(2001));
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const drawing = root.querySelector('.wr-scatter-chart__svg')!;

    const observer = FakeObserver.built.find(built => built.targets.has(drawing))!;
    observer.deliver([{ target: drawing, contentRect: { width: 300, height: 120 } }]);
    fixture.detectChanges();

    expect(root.querySelector('.wr-scatter-chart__dense')!.getAttribute('viewBox')).toBe('0 0 300 120');
    expect(root.querySelector('.wr-scatter-chart__points')!.getAttribute('d')).toMatch(/^M50 100m-3 0/);
    fixture.destroy();
  });
});

/** The index the pointer looks a point up in, against a scan of every point. */
describe('wrScatterIndex and wrScatterHit', () => {
  const WIDTH = 600;
  const HEIGHT = 240;

  /** The scan the chart ran before: every point measured, the nearest within its reach. */
  const scan = (points: readonly WrScatterHitPoint[], left: number, top: number): number | null => {
    let best: number | null = null;
    let nearest = Number.POSITIVE_INFINITY;
    points.forEach((point, index) => {
      const distance = Math.hypot(((point.left - left) / 100) * WIDTH, ((point.top - top) / 100) * HEIGHT);
      if (distance <= point.reach && distance < nearest) {
        nearest = distance;
        best = index;
      }
    });
    return best;
  };

  /** A seeded generator, so a failure names the same points every run. */
  const random = (seed: number): (() => number) => {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 2 ** 32;
      return state / 2 ** 32;
    };
  };

  it('answers what a scan of every point answers', () => {
    const next = random(11);
    const points = Array.from({ length: 5000 }, () => ({
      left: next() * 100,
      top: next() * 100,
      reach: 16 + next() * 24,
    }));
    const index = wrScatterIndex(points);

    for (let query = 0; query < 400; query++) {
      // Some past the frame, where a marker on it still reaches.
      const left = next() * 110 - 5;
      const top = next() * 110 - 5;
      expect(wrScatterHit(index, left, top, WIDTH, HEIGHT), `${left} ${top}`).toBe(scan(points, left, top));
    }
  });

  it('looks at the cells the pointer can reach, not at every point', () => {
    const next = random(3);
    const points = Array.from({ length: 10_000 }, () => ({ left: next() * 100, top: next() * 100, reach: 16 }));
    const index = wrScatterIndex(points);
    const hypot = vi.spyOn(Math, 'hypot');

    wrScatterHit(index, 50, 50, WIDTH, HEIGHT);

    // 16px either way on a 600 by 240 drawing takes in about 1% of its area.
    expect(hypot.mock.calls.length).toBeGreaterThan(0);
    expect(hypot.mock.calls.length).toBeLessThan(500);
    hypot.mockRestore();
  });

  it('keeps each point its own reach, and takes the earlier of two equally near', () => {
    const points = [
      { left: 40, top: 50, reach: 16 },
      { left: 60, top: 50, reach: 16 },
      { left: 90, top: 50, reach: 40 },
    ];
    const index = wrScatterIndex(points);

    // Midway between the first two, 60px from each: past both reaches.
    expect(wrScatterHit(index, 50, 50, WIDTH, HEIGHT)).toBeNull();
    // 30px from the third, inside its 40px and nobody else's.
    expect(wrScatterHit(index, 85, 50, WIDTH, HEIGHT)).toBe(2);
    // 6px from each of the first two on a narrow drawing: the earlier one.
    expect(wrScatterHit(index, 50, 50, 60, HEIGHT)).toBe(0);
  });

  it('answers nothing for no point and for a drawing with no box', () => {
    expect(wrScatterHit(wrScatterIndex([]), 50, 50, WIDTH, HEIGHT)).toBeNull();
    const index = wrScatterIndex([{ left: 50, top: 50, reach: 16 }]);
    expect(wrScatterHit(index, 50, 50, 0, HEIGHT)).toBeNull();
    expect(wrScatterHit(index, 50, 50, WIDTH, 0)).toBeNull();
    expect(wrScatterHit(index, 50, 50, WIDTH, HEIGHT)).toBe(0);
  });
});

describe('scatter marker helpers', () => {
  it('builds a marker once per shape and radius', () => {
    const markerOf = wrScatterMarkerCache();

    expect(markerOf('triangle', 3)).toBe(markerOf('triangle', 3));
    expect(markerOf('triangle', 3)).not.toBe(markerOf('triangle', 4));
    expect(markerOf('triangle', 3)).not.toBe(markerOf('square', 3));
    expect(markerOf('circle', 5).d).toBe(wrChartMarkerPath('circle', 5));
    expect(markerOf('circle', 5).extent).toEqual({ top: 5, bottom: 5, side: 5, radius: 5 });
  });

  it('writes a marker in relative commands, to follow a move to its centre', () => {
    expect(wrScatterRelativePath(wrChartMarkerPath('circle', 3))).toBe('m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0z');
    expect(wrScatterRelativePath('M -2 -2 L 2 -2 L 2 2 L -2 2 Z')).toBe('m-2 -2l4 0l0 4l-4 0z');
    // A command the shared markers never write is not guessed at.
    expect(wrScatterRelativePath('M 0 0 C 1 1 2 2 3 3')).toBe('');
  });

  it('places every marker of a path in px of the box it is written for', () => {
    const points = [
      { left: 0, top: 100, relative: 'm-1 0z' },
      { left: 33.333, top: 50, relative: 'm-1 0z' },
    ];

    expect(wrScatterDensePath(points, 300, 120)).toBe('M0 120m-1 0zM100 60m-1 0z');
    expect(wrScatterDensePath([], 300, 120)).toBe('');
  });
});

describe('WrScatterChart stylesheet on the chart theme', { timeout: COMPILE_TIMEOUT }, () => {
  const css = (): string => compileSass(`@use 'charts/scatter-chart/styles';`).replace(/\/\*[\s\S]*?\*\//g, '');
  const pattern = (selector: string): string => selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/, /g, ',\\s*');
  const rule = (selector: string): string =>
    new RegExp(`(?:^|\\n)${pattern(selector)}\\s*\\{([^}]*)\\}`).exec(css())?.[1] ?? '';

  it('points every hook that paints the frame at the shared chart token', () => {
    const block = rule('.wr-scatter-chart');
    expect(block).toMatch(/--wr-scatter-chart-grid-color: var\(--wr-chart-grid\)/);
    expect(block).toMatch(/--wr-scatter-chart-zero-color: var\(--wr-chart-zero\)/);
    expect(block).toMatch(/--wr-scatter-chart-tick-color: var\(--wr-chart-label\)/);
    expect(block).toMatch(/--wr-scatter-chart-tick-font-size: var\(--wr-chart-label-size\)/);
    expect(block).toMatch(/--wr-scatter-chart-point-ring: var\(--wr-chart-separator\)/);
    expect(block).toMatch(/--wr-scatter-chart-halo-color: var\(--wr-chart-separator\)/);
    expect(block).toMatch(/--wr-scatter-chart-halo-width: 2px/);
  });

  it('draws the gridlines across the plot, the one at zero stronger, and none up it', () => {
    expect(rule('.wr-scatter-chart__grid-line')).toMatch(/stroke: var\(--wr-scatter-chart-grid-color\)/);
    expect(rule('.wr-scatter-chart__grid-line--zero')).toMatch(/stroke: var\(--wr-scatter-chart-zero-color\)/);
    expect(rule('.wr-scatter-chart')).toMatch(/--wr-scatter-chart-grid-x-color: transparent/);
    expect(rule('.wr-scatter-chart__grid-line--x')).toMatch(/stroke: var\(--wr-scatter-chart-grid-x-color\)/);
    // After the plain rule, so each wins over it.
    expect(css().indexOf('.wr-scatter-chart__grid-line--zero {')).toBeGreaterThan(
      css().indexOf('.wr-scatter-chart__grid-line {')
    );
  });

  it('sets the tick labels small, muted and tabular', () => {
    for (const axis of ['.wr-scatter-chart__y-axis', '.wr-scatter-chart__x-axis']) {
      const block = rule(axis);
      expect(block, axis).toMatch(/font-size: var\(--wr-scatter-chart-tick-font-size\)/);
      expect(block, axis).toMatch(/color: var\(--wr-scatter-chart-tick-color\)/);
      expect(block, axis).toMatch(/font-variant-numeric: tabular-nums/);
    }
  });

  it("turns the y axis' name along its axis, heavier and in full ink, in a column of its own", () => {
    const block = rule('.wr-scatter-chart');
    expect(block).toMatch(/--wr-scatter-chart-title-font-weight: var\(--wr-font-weight-semibold\)/);
    expect(block).toMatch(/--wr-scatter-chart-title-color: var\(--wr-color-on-surface\)/);
    expect(block).toMatch(/--wr-scatter-chart-title-font-size: var\(--wr-chart-label-size\)/);

    const title = rule('.wr-scatter-chart__y-title');
    expect(title).toMatch(/writing-mode: vertical-rl/);
    expect(title).toMatch(/text-orientation: sideways/);
    expect(title).toMatch(/transform: rotate\(180deg\)/);
    expect(title).toMatch(/grid-column: 1;/);
    expect(title).toMatch(/grid-row: 1;/);
    expect(title).toMatch(/text-overflow: ellipsis/);
    expect(rule('.wr-scatter-chart__body')).toMatch(/grid-template-columns: auto auto minmax\(0, 1fr\)/);
    expect(rule('.wr-scatter-chart__plot')).toMatch(/grid-column: 3;/);
  });

  it('rings the point being read in the surface, outside its marker', () => {
    const halo = rule('.wr-scatter-chart__halo');
    expect(halo).toMatch(/stroke: var\(--wr-scatter-chart-halo-color\)/);
    expect(halo).toMatch(/stroke-width: calc\(2 \* var\(--wr-scatter-chart-halo-width\)\)/);
    expect(halo).toMatch(/paint-order: stroke/);
    expect(halo).toMatch(/pointer-events: none/);
  });

  it("keeps the legend its room through the chart's own hook, and the state in the plot's cell", () => {
    expect(rule('.wr-scatter-chart__legend')).toMatch(
      /--wr-chart-legend-space: var\(--wr-scatter-chart-legend-margin-bottom\)/
    );
    expect(rule('.wr-scatter-chart__legend')).not.toMatch(/margin-block/);
    const state = rule('.wr-scatter-chart__body > .wr-chart-state');
    expect(state).toMatch(/grid-column: 3;/);
    expect(state).toMatch(/grid-row: 1;/);
    expect(state).toMatch(/position: relative/);
  });

  it('keeps room for the top of the scale', () => {
    expect(rule('.wr-scatter-chart--axis .wr-scatter-chart__body')).toMatch(
      /padding-block-start: max\(0px, var\(--wr-scatter-chart-tick-line-height\) \/ 2 - var\(--wr-scatter-chart-plot-inset-y\)\)/
    );
  });

  it('transitions nothing but the shared hover dim', () => {
    const own = css()
      .split('\n')
      .filter(line => line.includes('transition'))
      .map(line => line.trim());
    // The chart theme's own rules: the dim on every `data-wr-series` mark, and the legend's.
    for (const line of own)
      expect(line).not.toMatch(/\b(height|width|top|bottom|left|right|inset[a-z-]*|margin|padding)\b/);
    expect(css()).toMatch(/:where\(\[data-wr-series\]\)\s*\{\s*transition: opacity/);
    expect(css()).not.toMatch(/\.wr-scatter-chart[^{]*\{[^}]*transition/);
  });

  it('swaps the theme colours for the system ones under forced colors', () => {
    expect(css()).toMatch(
      /@media \(forced-colors: active\) \{\s*\.wr-scatter-chart \{\s*--wr-scatter-chart-point-ring: Canvas;\s*--wr-scatter-chart-halo-color: Canvas;\s*--wr-scatter-chart-grid-color: GrayText;\s*--wr-scatter-chart-zero-color: CanvasText;/
    );
  });
});
