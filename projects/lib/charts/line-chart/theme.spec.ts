import { FlexibleConnectedPositionStrategy } from '@angular/cdk/overlay';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { WrChartLegendPosition } from 'ngwr/charts/chart-legend';
import { wrChartColor } from 'ngwr/charts/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { COMPILE_TIMEOUT, compileSass } from '../../spec-sass';

import { WR_LINE_CHART_BREAK, wrLineChartCrowded, wrLineChartKeep } from './internal/decimate';
import { WrLineChart } from './line-chart';
import type { WrLineSeries } from './types';

const SERIES: readonly WrLineSeries[] = [
  { label: 'Visits', data: [10, 20, 30] },
  { label: 'Signups', data: [1, 2, 3] },
  { label: 'Sales', data: [5, 15, 25] },
];

@Component({
  imports: [WrLineChart],
  template: `
    <wr-line-chart
      [series]="series()"
      [xLabels]="xLabels()"
      [showGrid]="showGrid()"
      [showAxis]="showAxis()"
      [showArea]="showArea()"
      [showDots]="showDots()"
      [showLegend]="showLegend()"
      [legendPosition]="legendPosition()"
      [loading]="loading()"
      [error]="error()"
      [emptyLabel]="emptyLabel()"
      [loadingLabel]="loadingLabel()"
      [errorLabel]="errorLabel()"
      [decimate]="decimate()"
      [dataTable]="dataTable()"
      [tooltip]="tooltip()"
      [(hiddenSeries)]="hidden"
    />
  `,
})
class Host {
  readonly series = signal<readonly WrLineSeries[]>(SERIES);
  readonly xLabels = signal<readonly string[]>(['Mon', 'Tue', 'Wed']);
  readonly showGrid = signal(true);
  readonly showAxis = signal(true);
  readonly showArea = signal(false);
  readonly showDots = signal(true);
  readonly showLegend = signal<boolean | 'auto'>('auto');
  readonly legendPosition = signal<WrChartLegendPosition>('bottom');
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly emptyLabel = signal<string | null>(null);
  readonly loadingLabel = signal<string | null>(null);
  readonly errorLabel = signal<string | null>(null);
  readonly decimate = signal(true);
  readonly dataTable = signal(false);
  readonly tooltip = signal(true);
  readonly hidden = signal<readonly number[]>([]);
}

@Component({ imports: [WrLineChart], template: `<wr-line-chart [series]="series" [xLabels]="labels" />` })
class DefaultHost {
  readonly series = SERIES;
  readonly labels = ['Mon', 'Tue', 'Wed'];
}

/**
 * The chart on the shared chart theme: the grid and the scale as two inputs, the zero
 * line, the palette, the legend's position, the three states, the shared tooltip and the
 * hover dim. jsdom lays nothing out, so what is held here is the markup and the numbers
 * handed to the stylesheet; the rules themselves are read off the compiled sheet in the
 * last block, and that each paints what it says is measured in a browser.
 */
describe('WrLineChart on the chart theme', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): Host => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const chart = (): HTMLElement => root().querySelector<HTMLElement>('wr-line-chart')!;
  const all = <T extends Element = HTMLElement>(selector: string, from: ParentNode = root()): T[] => [
    ...from.querySelectorAll<T>(selector),
  ];
  const svg = (): SVGSVGElement => root().querySelector<SVGSVGElement>('.wr-line-chart__svg')!;
  const ticks = (): string[] => all('.wr-line-chart__tick').map(tick => tick.textContent.trim());
  const set = (change: (h: Host) => void): void => {
    change(host());
    fixture.detectChanges();
  };
  /** jsdom lays nothing out, so the drawing is given a box: a clientX reads as a viewBox x. */
  const hoverAt = (clientX: number, clientY = 100): void => {
    svg().getBoundingClientRect = () => new DOMRect(0, 0, 600, 300);
    svg().dispatchEvent(new MouseEvent('mousemove', { clientX, clientY, bubbles: true }));
    fixture.detectChanges();
  };
  const chip = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-chart-tooltip');
  const chipTexts = (selector: string): string[] =>
    [...(chip()?.querySelectorAll(selector) ?? [])].map(element => element.textContent.trim());

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  describe('grid, axis and zero line', () => {
    it('draws the grid and the scale by default', () => {
      const plain = TestBed.createComponent(DefaultHost);
      plain.detectChanges();
      const el = plain.nativeElement as HTMLElement;

      expect(el.querySelectorAll('.wr-line-chart__grid-line')).toHaveLength(5);
      expect(el.querySelectorAll('.wr-line-chart__tick')).toHaveLength(5);
      expect(el.querySelector('wr-line-chart')!.classList).toContain('wr-line-chart--axis');
      plain.destroy();
    });

    it('drops the grid and the scale each on its own', () => {
      set(h => h.showGrid.set(false));
      expect(all('.wr-line-chart__grid-line')).toEqual([]);
      expect(ticks()).toEqual(['40', '30', '20', '10', '0']);
      expect(chart().classList).toContain('wr-line-chart--axis');

      set(h => {
        h.showGrid.set(true);
        h.showAxis.set(false);
      });
      expect(all('.wr-line-chart__grid-line')).toHaveLength(5);
      expect(root().querySelector('.wr-line-chart__y-axis')).toBeNull();
      expect(chart().classList).not.toContain('wr-line-chart--axis');

      set(h => h.showGrid.set(false));
      expect(all('.wr-line-chart__grid-line, .wr-line-chart__tick')).toEqual([]);
      // The x labels are the chart's own input, and stay.
      expect(all('.wr-line-chart__x-label')).toHaveLength(3);
    });

    it('marks the gridline at zero, wherever zero falls on the axis', () => {
      const zeros = (): boolean[] =>
        all('.wr-line-chart__grid-line').map(line => line.classList.contains('wr-line-chart__grid-line--zero'));
      expect(zeros()).toEqual([false, false, false, false, true]);

      set(h => h.series.set([{ label: 'Balance', data: [-20, 10, 20] }]));
      expect(ticks()).toEqual(['30', '20', '10', '0', '-10', '-20']);
      expect(zeros()).toEqual([false, false, false, true, false, false]);
    });

    it('leaves the widths and the colours of the frame to the stylesheet', () => {
      for (const line of all('.wr-line-chart__grid-line, .wr-line-chart__line, .wr-line-chart__dot')) {
        expect(line.getAttribute('stroke-width'), line.getAttribute('class')!).toBeNull();
      }
      expect(all('.wr-line-chart__line').map(line => line.getAttribute('stroke-linecap'))).toEqual([
        'round',
        'round',
        'round',
      ]);
    });
  });

  describe('palette', () => {
    it('takes each series the next colour of the chart palette, and its own where it names one', () => {
      set(h => h.series.set([...SERIES, { label: 'Refunds', data: [1, 1, 1], color: '#abcdef' }]));

      expect(all('.wr-line-chart__line').map(line => line.getAttribute('stroke'))).toEqual([
        wrChartColor(0),
        wrChartColor(1),
        wrChartColor(2),
        '#abcdef',
      ]);
      expect(wrChartColor(1)).toBe('var(--wr-chart-2)');
    });

    it('paints the fills and the dots in the same colours', () => {
      set(h => h.showArea.set(true));

      expect(all('.wr-line-chart__area').map(area => area.getAttribute('fill'))).toEqual([
        'var(--wr-chart-1)',
        'var(--wr-chart-2)',
        'var(--wr-chart-3)',
      ]);
      expect(all('.wr-line-chart__dot').map(dot => dot.getAttribute('stroke'))).toEqual([
        'var(--wr-chart-1)',
        'var(--wr-chart-2)',
        'var(--wr-chart-3)',
      ]);
    });
  });

  describe('tooltip', () => {
    it('opens the chip every chart shares, with the x as its heading and a row per series', () => {
      hoverAt(310);

      expect(chip()).not.toBeNull();
      expect(chip()!.classList).toContain('wr-chart-tooltip--rows');
      expect(chipTexts('.wr-chart-tooltip__label')).toEqual(['Tue']);
      expect(chipTexts('.wr-chart-tooltip__value')).toEqual([]);
      expect(chipTexts('.wr-chart-tooltip__row-label')).toEqual(['Visits', 'Signups', 'Sales']);
      expect(chipTexts('.wr-chart-tooltip__row-value')).toEqual(['20', '2', '15']);
      expect(
        all('.wr-chart-tooltip__row-swatch', chip()!).map(swatch => swatch.style.getPropertyValue('background'))
      ).toEqual(['var(--wr-chart-1)', 'var(--wr-chart-2)', 'var(--wr-chart-3)']);
    });

    it("draws it in the overlay under the chart's own class, and nothing of it inside the chart", () => {
      hoverAt(310);

      expect(chip()!.classList).toContain('wr-line-chart__tooltip');
      expect(chart().contains(chip())).toBe(false);
      expect(
        root().querySelector(
          '.wr-line-chart__tooltip, .wr-line-chart__tooltip-layer, .wr-line-chart__tooltip-row, .wr-line-chart__tooltip-label'
        )
      ).toBeNull();
    });

    it('points the chip at the box round the markers of its x', () => {
      const origin = vi.spyOn(FlexibleConnectedPositionStrategy.prototype, 'setOrigin');
      hoverAt(300);

      // On a 0 to 40 axis over 300px: Visits 20 at y 150, Sales 15 at 187.5, Signups 2 at 285.
      const markers = all<SVGPathElement>('.wr-line-chart__hover-dot').map(dot => dot.getAttribute('d'));
      expect(markers).toEqual(['M 300.00 150.00 h 0', 'M 300.00 285.00 h 0', 'M 300.00 187.50 h 0']);
      // The crosshair's x, from the highest marker to the lowest, widened by a marker's 6px reach.
      expect(origin.mock.calls.at(-1)![0]).toEqual({ x: 294, y: 144, width: 12, height: 147 });
      expect(document.querySelector<HTMLElement>('.wr-tooltip-overlay')!.getAttribute('aria-hidden')).toBe('true');
    });

    it('rings every marker in the surface, under the marker in its colour', () => {
      hoverAt(0);

      const parts = all('.wr-line-chart__crosshair ~ path').map(path => [
        path.getAttribute('class'),
        path.getAttribute('stroke'),
      ]);
      expect(parts).toEqual([
        ['wr-line-chart__hover-dot-ring', null],
        ['wr-line-chart__hover-dot', 'var(--wr-chart-1)'],
        ['wr-line-chart__hover-dot-ring', null],
        ['wr-line-chart__hover-dot', 'var(--wr-chart-2)'],
        ['wr-line-chart__hover-dot-ring', null],
        ['wr-line-chart__hover-dot', 'var(--wr-chart-3)'],
      ]);
      expect(root().querySelector('.wr-line-chart__hover-dot-center')).toBeNull();
    });

    it('follows the pointer from x to x, and leaves a hidden series out', () => {
      hoverAt(0);
      expect(chipTexts('.wr-chart-tooltip__label')).toEqual(['Mon']);

      hoverAt(590);
      expect(chipTexts('.wr-chart-tooltip__label')).toEqual(['Wed']);
      expect(document.querySelectorAll('.wr-chart-tooltip')).toHaveLength(1);

      set(h => h.hidden.set([1]));
      expect(chipTexts('.wr-chart-tooltip__row-label')).toEqual(['Visits', 'Sales']);
    });

    it('measures the drawing once for a move, open or not', () => {
      hoverAt(0);
      const measured = vi.fn(() => new DOMRect(0, 0, 600, 300));
      svg().getBoundingClientRect = measured;

      // One read to find the x, one for the chip to point at its markers.
      svg().dispatchEvent(new MouseEvent('mousemove', { clientX: 590, clientY: 100, bubbles: true }));
      fixture.detectChanges();
      expect(chipTexts('.wr-chart-tooltip__label')).toEqual(['Wed']);
      expect(measured).toHaveBeenCalledTimes(2);

      // A move that stays on its x finds it and stops there.
      measured.mockClear();
      svg().dispatchEvent(new MouseEvent('mousemove', { clientX: 588, clientY: 100, bubbles: true }));
      fixture.detectChanges();
      expect(measured).toHaveBeenCalledTimes(1);
    });

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
        ['mouseleave', 'wr-line-chart'],
        ['mousemove', 'div'],
        ['mouseover', 'wr-line-chart'],
      ]);
      expect(pointer.filter(([, target]) => target === el.querySelector('.wr-line-chart__plot'))).toHaveLength(2);
      plain.destroy();
    });
  });

  describe('hover', () => {
    const on = (): (string | null)[] => all('.wr-chart-mark--on').map(mark => mark.getAttribute('data-wr-series'));

    it('keys every mark of a series by its legend row', () => {
      set(h => h.showArea.set(true));

      for (const part of ['line', 'dot', 'area']) {
        expect(
          all(`.wr-line-chart__${part}`).map(mark => mark.getAttribute('data-wr-series')),
          part
        ).toEqual(['0', '1', '2']);
      }
      expect(all('.wr-chart-legend__item').map(row => row.getAttribute('data-wr-series'))).toEqual(['0', '1', '2']);
    });

    it('keeps a series its own key when one before it is hidden', () => {
      set(h => h.hidden.set([0]));

      expect(all('.wr-line-chart__line').map(mark => mark.getAttribute('data-wr-series'))).toEqual(['1', '2']);
    });

    it('dims every other series from a line, and from a legend row', () => {
      all('.wr-line-chart__line')[1].dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

      expect(chart().classList).toContain('wr-chart--dim');
      // Signups' line, its dots and its legend row.
      expect(on()).toEqual(['1', '1', '1']);

      all('.wr-chart-legend__label')[2].dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      expect(on()).toEqual(['2', '2', '2']);

      chart().dispatchEvent(new MouseEvent('mouseleave'));
      expect(chart().classList).not.toContain('wr-chart--dim');
      expect(on()).toEqual([]);
    });
  });

  describe('legend', () => {
    const legend = (): HTMLElement | null => root().querySelector('.wr-line-chart__legend');
    const body = (): HTMLElement => root().querySelector<HTMLElement>('.wr-line-chart__body')!;
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
      // The legend and the body are the host's own children, which the side layout needs.
      expect(legend()!.parentElement).toBe(chart());
      expect(body().parentElement).toBe(chart());
    });

    it('draws none at `none`, and still hides a series through the model', () => {
      set(h => {
        h.legendPosition.set('none');
        h.hidden.set([2]);
      });

      expect(legend()).toBeNull();
      expect(chart().classList).not.toContain('wr-chart--legend-side');
      expect(all('.wr-line-chart__line')).toHaveLength(2);
    });

    it('leaves a single series without a legend, unless asked for one', () => {
      set(h => h.series.set([SERIES[0]]));
      expect(legend()).toBeNull();

      set(h => h.showLegend.set(true));
      expect(all('.wr-chart-legend__label').map(label => label.textContent.trim())).toEqual(['Visits']);

      set(h => h.showLegend.set(false));
      expect(legend()).toBeNull();
    });

    it('keeps the rows the classes the chart drew them with', () => {
      expect(all('.wr-line-chart__legend-item')).toHaveLength(3);
      expect(all('.wr-line-chart__swatch')).toHaveLength(3);
    });
  });

  describe('empty, loading and error', () => {
    const state = (): HTMLElement | null => root().querySelector('wr-chart-state');
    const frame = (): number[] => [all('.wr-line-chart__grid-line').length, all('.wr-line-chart__tick').length];

    it('shows nothing of the kind while there are lines to draw', () => {
      expect(state()).toBeNull();
    });

    it('keeps the frame and says "No data" when there is nothing to draw', () => {
      set(h => h.series.set([]));

      expect(state()!.textContent.trim()).toBe('No data');
      expect(state()!.classList).toContain('wr-chart-state--empty');
      // Beside the plot and not inside it: the plot is an `img`, and the message is a live region.
      expect(state()!.parentElement!.classList).toContain('wr-line-chart__body');
      expect(state()!.closest('[role="img"]')).toBeNull();
      expect(state()!.getAttribute('role')).toBe('status');
      // The empty axis runs from 0 to 1 in quarters.
      expect(frame()).toEqual([5, 5]);
      expect(root().querySelector<HTMLElement>('.wr-line-chart__plot')!.style.height).toBe('240px');

      set(h => h.emptyLabel.set('No visits this week'));
      expect(state()!.textContent.trim()).toBe('No visits this week');
    });

    it('is empty for series with no point, and not for series that are all hidden', () => {
      set(h => h.series.set([{ label: 'Visits', data: [] }]));
      expect(state()!.classList).toContain('wr-chart-state--empty');

      set(h => {
        h.series.set(SERIES);
        h.hidden.set([0, 1, 2]);
      });
      expect(state()).toBeNull();
    });

    it('gives the lines way to the loading message, over the axis the chart had', () => {
      set(h => h.loading.set(true));

      expect(state()!.textContent.trim()).toBe('Loading…');
      expect(state()!.classList).toContain('wr-chart-state--loading');
      expect(all('.wr-line-chart__line, .wr-line-chart__dot, .wr-line-chart__area')).toEqual([]);
      // The data's own axis, 0 to 40, stays under the message.
      expect(ticks()).toEqual(['40', '30', '20', '10', '0']);
      expect(frame()).toEqual([5, 5]);

      set(h => h.loadingLabel.set('Fetching visits'));
      expect(state()!.textContent.trim()).toBe('Fetching visits');

      set(h => h.loading.set(false));
      expect(state()).toBeNull();
      expect(all('.wr-line-chart__line')).toHaveLength(3);
    });

    it('says a load failed, as an alert, and puts loading over it', () => {
      set(h => h.error.set(true));

      expect(state()!.textContent.trim()).toBe('Could not load');
      expect(state()!.getAttribute('role')).toBe('alert');
      expect(all('.wr-line-chart__line')).toEqual([]);

      set(h => h.errorLabel.set('Visits are unavailable'));
      expect(state()!.textContent.trim()).toBe('Visits are unavailable');

      set(h => h.loading.set(true));
      expect(state()!.classList).toContain('wr-chart-state--loading');
    });

    it('opens no readout and renders no data table under a state', () => {
      set(h => h.dataTable.set(true));
      expect(all('.wr-chart-table')).toHaveLength(1);

      set(h => h.loading.set(true));
      expect(all('.wr-chart-table')).toEqual([]);

      hoverAt(300);
      expect(chip()).toBeNull();
      expect(root().querySelector('.wr-line-chart__crosshair')).toBeNull();
    });
  });
});

/**
 * Decimation, as the chart draws it. Nothing is measured in jsdom, so the chart works
 * against the 560px it assumes before a browser has measured the drawing: a series is
 * decimated past 1120 points.
 */
describe('WrLineChart decimation', () => {
  const COUNT = 10_000;
  const WAVE = Array.from({ length: COUNT }, (_, i) => Math.sin(i / 40) * 100 + ((i * 7919) % 13));

  @Component({
    imports: [WrLineChart],
    template: `<wr-line-chart
      [series]="series()"
      [decimate]="decimate()"
      [showArea]="showArea()"
      [dataTable]="dataTable()"
    />`,
  })
  class LongHost {
    readonly series = signal<readonly WrLineSeries[]>([{ label: 'Load', data: WAVE }]);
    readonly decimate = signal(true);
    readonly showArea = signal(false);
    readonly dataTable = signal(false);
  }

  let fixture: ReturnType<typeof TestBed.createComponent<LongHost>>;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  /** The points a path is drawn through, as `[x, y]` in viewBox units. */
  const points = (selector: string): [number, number][] =>
    [...(root().querySelector(selector)?.getAttribute('d') ?? '').matchAll(/[ML] (\S+) (\S+)/g)].map(match => [
      Number(match[1]),
      Number(match[2]),
    ]);

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(LongHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('draws a long series through four points a pixel column at the most', () => {
    const drawn = points('.wr-line-chart__line');

    expect(drawn.length).toBeLessThanOrEqual(4 * 560);
    expect(drawn.length).toBeGreaterThan(560);
    // In x order, from the first point to the last.
    expect(drawn[0][0]).toBe(0);
    expect(drawn[drawn.length - 1][0]).toBe(600);
    for (let i = 1; i < drawn.length; i++) expect(drawn[i][0]).toBeGreaterThanOrEqual(drawn[i - 1][0]);
  });

  it('keeps the highest and the lowest point of the series where they were', () => {
    fixture.componentInstance.decimate.set(false);
    fixture.detectChanges();
    const full = points('.wr-line-chart__line');
    expect(full).toHaveLength(COUNT);
    const ys = full.map(([, y]) => y);

    fixture.componentInstance.decimate.set(true);
    fixture.detectChanges();
    const kept = points('.wr-line-chart__line').map(([, y]) => y);

    expect(Math.min(...kept)).toBe(Math.min(...ys));
    expect(Math.max(...kept)).toBe(Math.max(...ys));
    expect(kept[0]).toBe(ys[0]);
    expect(kept[kept.length - 1]).toBe(ys[ys.length - 1]);
  });

  it('draws every point with `decimate` off, dots included', () => {
    expect(root().querySelector('.wr-line-chart__dot')).toBeNull();

    fixture.componentInstance.decimate.set(false);
    fixture.detectChanges();

    expect(points('.wr-line-chart__line')).toHaveLength(COUNT);
    expect(root().querySelector('.wr-line-chart__dot')!.getAttribute('d')!.match(/M/g)).toHaveLength(COUNT);
  });

  it('leaves a series of ordinary length alone, dots and all', () => {
    fixture.componentInstance.series.set([{ label: 'Load', data: WAVE.slice(0, 90) }]);
    fixture.detectChanges();

    expect(points('.wr-line-chart__line')).toHaveLength(90);
    expect(root().querySelector('.wr-line-chart__dot')!.getAttribute('d')!.match(/M/g)).toHaveLength(90);
  });

  it('drops the dots once the points sit closer than a dot is wide, before any point is', () => {
    // 200 points over 560px are 2.8px apart: every point is drawn, and no dot.
    fixture.componentInstance.series.set([{ label: 'Load', data: WAVE.slice(0, 200) }]);
    fixture.detectChanges();

    expect(points('.wr-line-chart__line')).toHaveLength(200);
    expect(root().querySelector('.wr-line-chart__dot')).toBeNull();
  });

  it('fills under the points the line is drawn through, and keeps a hole a hole', () => {
    const holed = [...WAVE];
    holed[5000] = Number.NaN;
    fixture.componentInstance.series.set([{ label: 'Load', data: holed }]);
    fixture.componentInstance.showArea.set(true);
    fixture.detectChanges();

    expect(root().querySelectorAll('.wr-line-chart__area')).toHaveLength(2);
    expect(root().querySelector('.wr-line-chart__line')!.getAttribute('d')!.match(/M/g)).toHaveLength(2);
    // Out along the line and back along the base: twice the line's points, less nothing.
    const line = points('.wr-line-chart__line').length;
    const fills = [...root().querySelectorAll('.wr-line-chart__area')].reduce(
      (sum, area) => sum + area.getAttribute('d')!.match(/[ML]/g)!.length,
      0
    );
    expect(fills).toBe(2 * line);
  });

  it('still reads every point in the data table and on the axis', () => {
    // 2,000 points, still past two a pixel: the line is thinned, the table is not.
    fixture.componentInstance.series.set([{ label: 'Load', data: WAVE.slice(0, 2000) }]);
    fixture.componentInstance.dataTable.set(true);
    fixture.detectChanges();

    expect(points('.wr-line-chart__line').length).toBeLessThan(2000);
    expect(root().querySelectorAll('.wr-chart-table tbody tr')).toHaveLength(2000);
    expect(root().querySelector('.wr-line-chart__tick')!.textContent.trim()).toBe('200');
  });
});

describe('wrLineChartKeep', () => {
  const ramp = (count: number): number[] => Array.from({ length: count }, (_, i) => i);

  it('keeps every point while there are two a column or fewer', () => {
    expect(wrLineChartKeep(ramp(8), 4)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(wrLineChartKeep(ramp(8), 0)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(wrLineChartKeep([], 4)).toEqual([]);
  });

  it('keeps the first, the lowest, the highest and the last of each column, in order', () => {
    // Two columns of six: the extremes sit inside each.
    const values = [5, 9, 1, 4, 6, 5, 2, 3, 0, 8, 7, 4];
    expect(wrLineChartKeep(values, 2)).toEqual([0, 1, 2, 5, 6, 8, 9, 11]);
  });

  it('writes a point once when it is two of the four', () => {
    // A rising column: its first is its lowest and its last its highest.
    expect(wrLineChartKeep(ramp(12), 2)).toEqual([0, 5, 6, 11]);
    // A flat one: the first stands for both extremes.
    expect(wrLineChartKeep(new Array<number>(12).fill(3), 2)).toEqual([0, 5, 6, 11]);
  });

  it('breaks at a hole, decimated or not, and never ends or starts on a break', () => {
    expect(wrLineChartKeep([null, 1, 2, null, null, 3, null], 0)).toEqual([1, 2, WR_LINE_CHART_BREAK, 5]);

    const values: (number | null)[] = ramp(12);
    values[3] = null;
    // The hole flushes the column it is in: 0 to 2, then 4 and 5 of the same column.
    expect(wrLineChartKeep(values, 2)).toEqual([0, 2, WR_LINE_CHART_BREAK, 4, 5, 6, 11]);
  });

  it('holds a long series to four points a column and keeps its extremes', () => {
    const values = Array.from({ length: 200_000 }, (_, i) => Math.sin(i / 300) * 50 + ((i * 31) % 17));
    const kept = wrLineChartKeep(values, 500);
    const drawn = kept.map(i => values[i]);

    expect(kept.length).toBeLessThanOrEqual(2000);
    expect(kept[0]).toBe(0);
    expect(kept[kept.length - 1]).toBe(values.length - 1);
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const value of values) {
      if (value < min) min = value;
      if (value > max) max = value;
    }
    expect(Math.min(...drawn)).toBe(min);
    expect(Math.max(...drawn)).toBe(max);
  });

  it('says when the points are closer than a dot is wide', () => {
    expect(wrLineChartCrowded(94, 560, 6)).toBe(false);
    expect(wrLineChartCrowded(95, 560, 6)).toBe(true);
    expect(wrLineChartCrowded(1, 560, 6)).toBe(false);
    expect(wrLineChartCrowded(500, 0, 6)).toBe(false);
  });
});

describe('WrLineChart stylesheet on the chart theme', { timeout: COMPILE_TIMEOUT }, () => {
  const css = (): string => compileSass(`@use 'charts/line-chart/styles';`).replace(/\/\*[\s\S]*?\*\//g, '');
  const pattern = (selector: string): string => selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/, /g, ',\\s*');
  const rule = (selector: string): string =>
    new RegExp(`(?:^|\\n)${pattern(selector)}\\s*\\{([^}]*)\\}`).exec(css())?.[1] ?? '';

  it('points every hook that paints the frame at the shared chart token', () => {
    const block = rule('.wr-line-chart');
    expect(block).toMatch(/--wr-line-chart-grid-color: var\(--wr-chart-grid\)/);
    expect(block).toMatch(/--wr-line-chart-zero-color: var\(--wr-chart-zero\)/);
    expect(block).toMatch(/--wr-line-chart-crosshair-color: var\(--wr-chart-axis\)/);
    expect(block).toMatch(/--wr-line-chart-line-width: var\(--wr-chart-stroke\)/);
    expect(block).toMatch(/--wr-line-chart-dot-size: var\(--wr-chart-marker\)/);
    expect(block).toMatch(/--wr-line-chart-hover-center: var\(--wr-chart-separator\)/);
    expect(block).toMatch(/--wr-line-chart-tick-color: var\(--wr-chart-label\)/);
    expect(block).toMatch(/--wr-line-chart-tick-font-size: var\(--wr-chart-label-size\)/);
    const strip = rule('.wr-line-chart__x-labels');
    expect(strip).toMatch(/--wr-line-chart-x-labels-color: var\(--wr-chart-label\)/);
    expect(strip).toMatch(/--wr-line-chart-x-labels-font-size: var\(--wr-chart-label-size\)/);
  });

  it('draws the gridlines in the grid hook and the one at zero in the stronger one', () => {
    expect(rule('.wr-line-chart__grid-line')).toMatch(/stroke: var\(--wr-line-chart-grid-color\)/);
    expect(rule('.wr-line-chart__grid-line--zero')).toMatch(/stroke: var\(--wr-line-chart-zero-color\)/);
    // After the plain rule, so it wins at equal specificity.
    expect(css().indexOf('.wr-line-chart__grid-line--zero {')).toBeGreaterThan(
      css().indexOf('.wr-line-chart__grid-line {')
    );
  });

  it('sizes a line, a dot and the hover marker from hooks', () => {
    expect(rule('.wr-line-chart__line')).toMatch(/stroke-width: var\(--wr-line-chart-line-width\)/);
    expect(rule('.wr-line-chart__dot')).toMatch(/stroke-width: var\(--wr-line-chart-dot-size\)/);
    expect(rule('.wr-line-chart')).toMatch(/--wr-line-chart-hover-dot-size: 8px/);
    expect(rule('.wr-line-chart')).toMatch(/--wr-line-chart-hover-ring-width: 2px/);
    expect(rule('.wr-line-chart__hover-dot')).toMatch(/stroke-width: var\(--wr-line-chart-hover-dot-size\)/);
    const ring = rule('.wr-line-chart__hover-dot-ring');
    expect(ring).toMatch(/stroke: var\(--wr-line-chart-hover-center\)/);
    expect(ring).toMatch(
      /stroke-width: calc\(var\(--wr-line-chart-hover-dot-size\) \+ 2 \* var\(--wr-line-chart-hover-ring-width\)\)/
    );
  });

  it('prints the scale small, muted and tabular', () => {
    const axis = rule('.wr-line-chart__y-axis');
    expect(axis).toMatch(/font-size: var\(--wr-line-chart-tick-font-size\)/);
    expect(axis).toMatch(/color: var\(--wr-line-chart-tick-color\)/);
    expect(axis).toMatch(/font-variant-numeric: tabular-nums/);
  });

  it('keeps the top number of the scale inside the chart', () => {
    expect(rule('.wr-line-chart--axis .wr-line-chart__body')).toMatch(
      /padding-block-start: max\(0px, var\(--wr-line-chart-tick-line-height\) \/ 2 - var\(--wr-line-chart-plot-inset-y\)\)/
    );
  });

  it("gives the legend its room through the chart's own hook, and its gaps", () => {
    const legend = rule('.wr-line-chart__legend');
    expect(legend).toMatch(/--wr-chart-legend-space: var\(--wr-line-chart-legend-margin-bottom\)/);
    expect(legend).toMatch(/--wr-chart-legend-gap-y: var\(--wr-line-chart-legend-row-gap\)/);
    expect(legend).toMatch(/--wr-chart-legend-gap-x: var\(--wr-line-chart-legend-column-gap\)/);
  });

  it('puts the state message in the plot’s cell, beside the img', () => {
    const state = rule('.wr-line-chart__body > .wr-chart-state');
    expect(state).toMatch(/grid-column: 2/);
    expect(state).toMatch(/grid-row: 1/);
    expect(state).toMatch(/position: relative/);
  });

  it("keeps the tooltip's own hooks, each handed to the shared chip", () => {
    const hooks = rule('.wr-line-chart__tooltip');
    for (const hook of [
      'border',
      'radius',
      'padding-y',
      'padding-x',
      'font-size',
      'bg',
      'shadow',
      'label-font-weight',
      'label-margin-bottom',
      'row-gap',
      'name-color',
      'value-font-weight',
    ]) {
      expect(hooks, hook).toMatch(new RegExp(`--wr-line-chart-tooltip-${hook}:`));
    }

    const chip = rule('.wr-line-chart__tooltip.wr-chart-tooltip');
    expect(chip).toMatch(/--wr-tooltip-border: var\(--wr-line-chart-tooltip-border\)/);
    expect(chip).toMatch(/--wr-tooltip-radius: var\(--wr-line-chart-tooltip-radius\)/);
    expect(chip).toMatch(/--wr-tooltip-padding-y: var\(--wr-line-chart-tooltip-padding-y\)/);
    expect(chip).toMatch(/--wr-tooltip-padding-x: var\(--wr-line-chart-tooltip-padding-x\)/);
    expect(chip).toMatch(/--wr-tooltip-font-size: var\(--wr-line-chart-tooltip-font-size\)/);
    expect(chip).toMatch(/--wr-tooltip-bg: var\(--wr-line-chart-tooltip-bg\)/);
    expect(chip).toMatch(/--wr-chart-tooltip-gap: var\(--wr-line-chart-tooltip-row-gap\)/);
    expect(chip).toMatch(/box-shadow: var\(--wr-line-chart-tooltip-shadow\)/);
    expect(rule('.wr-line-chart__tooltip.wr-chart-tooltip .wr-chart-tooltip__head')).toMatch(
      /--wr-chart-tooltip-head-font-weight: var\(--wr-line-chart-tooltip-label-font-weight\)/
    );
    expect(rule('.wr-line-chart__tooltip.wr-chart-tooltip .wr-chart-tooltip__row-label')).toMatch(
      /--wr-chart-tooltip-row-label-color: var\(--wr-line-chart-tooltip-name-color\)/
    );
    expect(rule('.wr-line-chart__tooltip.wr-chart-tooltip .wr-chart-tooltip__row-value')).toMatch(
      /--wr-chart-tooltip-row-value-font-weight: var\(--wr-line-chart-tooltip-value-font-weight\)/
    );
    // The chip's own sheet is loaded with the chart's.
    expect(rule('.wr-chart-tooltip')).toMatch(/display: inline-flex/);
  });

  it('draws no tooltip of its own inside the chart any more', () => {
    expect(css()).not.toMatch(/\.wr-line-chart__tooltip-(layer|row|label|name|value)\b/);
    expect(css()).not.toMatch(/\.wr-line-chart__tooltip--(below|left|right)/);
  });

  it('transitions nothing but opacity, which is the shared hover dim', () => {
    const own = [...css().matchAll(/([^{}]*)\{([^{}]*)\}/g)].filter(
      ([, selector, body]) => selector.includes('wr-line-chart') && body.includes('transition')
    );
    expect(own).toEqual([]);
    // The dim itself comes with the chart's sheet.
    expect(css()).toMatch(/:where\(\[data-wr-series\]\) \{\s*transition: opacity var\(--wr-chart-duration-short\)/);
    for (const value of [...css().matchAll(/transition:([^;]*);/g)].map(match => match[1])) {
      expect(value).not.toMatch(/\b(height|width|top|bottom|left|right|inset[a-z-]*|inline-size|block-size)\b/);
    }
  });

  it('gives forced colors its own strokes for the frame and the ring', () => {
    const forced = /@media \(forced-colors: active\)\s*\{([\s\S]*?)\n\}/.exec(css())?.[1] ?? '';
    expect(forced).toMatch(/\.wr-line-chart__grid-line \{\s*stroke: GrayText/);
    expect(forced).toMatch(/\.wr-line-chart__grid-line--zero,\s*\.wr-line-chart__crosshair \{\s*stroke: CanvasText/);
    expect(forced).toMatch(/\.wr-line-chart__hover-dot-ring \{\s*stroke: Canvas;/);
  });
});
