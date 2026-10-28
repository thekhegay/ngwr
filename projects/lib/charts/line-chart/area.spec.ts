import { createRequire } from 'node:module';
import { join } from 'node:path';

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrLineChart } from './line-chart';
import type { WrLineSeries } from './types';

/**
 * The area mode, the stack and the data table, all opt-in since 15.1. Every coordinate
 * is exact — the drawing is a fixed 600×300 viewBox run edge to edge — so a fill's `d`
 * and a line's `d` are checked as numbers, and what the stack does is read where a
 * reader meets it: the line's height, the axis, the tooltip and the table.
 *
 * With three points the x positions are 0, 300 and 600, and with an axis from 0 to 40 a
 * value v sits at y = (40 − v) / 40 × 300.
 */
const SERIES: readonly WrLineSeries[] = [
  { label: 'Visits', data: [10, 20, 30] },
  { label: 'Signups', data: [1, 2, 3] },
];

@Component({
  imports: [WrLineChart],
  template: `
    <wr-line-chart
      [series]="series()"
      [xLabels]="xLabels()"
      [showArea]="showArea()"
      [stacked]="stacked()"
      [dataTable]="dataTable()"
      [ariaLabel]="ariaLabel()"
      [valueFormat]="valueFormat()"
      [(hiddenSeries)]="hidden"
    />
  `,
})
class Host {
  readonly series = signal<readonly WrLineSeries[]>(SERIES);
  readonly xLabels = signal<readonly string[]>(['Mon', 'Tue', 'Wed']);
  readonly showArea = signal(false);
  readonly stacked = signal(false);
  readonly dataTable = signal(false);
  readonly ariaLabel = signal<string | null>(null);
  readonly valueFormat = signal<((value: number) => string) | null>(null);
  readonly hidden = signal<readonly number[]>([]);
}

describe('WrLineChart area, stack and data table', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): Host => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const chart = (): HTMLElement => root().querySelector<HTMLElement>('wr-line-chart')!;
  const plot = (): HTMLElement => root().querySelector<HTMLElement>('.wr-line-chart__plot')!;
  const drawing = (): SVGSVGElement => root().querySelector<SVGSVGElement>('.wr-line-chart__svg')!;
  const areas = (): SVGPathElement[] => [...root().querySelectorAll<SVGPathElement>('.wr-line-chart__area')];
  const lines = (): SVGPathElement[] => [...root().querySelectorAll<SVGPathElement>('.wr-line-chart__line')];
  const dots = (): string[] => [...root().querySelectorAll('.wr-line-chart__dot')].map(d => d.getAttribute('d')!);
  const ticks = (): string[] => [...root().querySelectorAll('.wr-line-chart__tick')].map(t => t.textContent.trim());
  const table = (): HTMLTableElement | null => root().querySelector<HTMLTableElement>('wr-chart-table table');
  const columns = (): string[] =>
    [...(table()?.querySelectorAll('thead th[scope="col"]') ?? [])].map(th => th.textContent.trim());
  const rows = (): string[][] =>
    [...(table()?.querySelectorAll('tbody tr') ?? [])].map(tr =>
      [...tr.querySelectorAll('th, td')].map(cell => cell.textContent.trim())
    );
  const render = (): void => fixture.detectChanges();

  /** jsdom lays nothing out, so the drawing reads a clientX as a viewBox x. Bubbling: the plot listens. */
  const hoverAt = (clientX: number): void => {
    drawing().getBoundingClientRect = () => new DOMRect(0, 0, 600, 300);
    drawing().dispatchEvent(new MouseEvent('mousemove', { clientX, bubbles: true }));
    render();
  };
  const tooltipValues = (): string[] =>
    [...root().querySelectorAll('.wr-line-chart__tooltip-value')].map(el => el.textContent.trim());
  /** The hover rings: a coloured one and a white one per point, both drawn at the marker. */
  const rings = (): string[] =>
    [...drawing().querySelectorAll('path.wr-line-chart__hover-dot')].map(p => p.getAttribute('d')!);

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    render();
  });

  afterEach(() => fixture.destroy());

  it('draws no fill, no stack and no table by default', () => {
    expect(areas()).toHaveLength(0);
    expect(chart().classList).not.toContain('wr-line-chart--area');
    expect(chart().classList).not.toContain('wr-line-chart--stacked');
    expect(root().querySelector('wr-chart-table')).toBeNull();
    expect(lines()[1].getAttribute('d')).toBe('M 0.00 292.50 L 300.00 285.00 L 600.00 277.50');
  });

  describe('showArea', () => {
    beforeEach(() => {
      host().showArea.set(true);
      render();
    });

    it('fills under each line down to zero, in its colour, and marks the host', () => {
      expect(chart().classList).toContain('wr-line-chart--area');
      expect(areas().map(a => a.getAttribute('d'))).toEqual([
        'M 0.00 225.00 L 300.00 150.00 L 600.00 75.00 L 600.00 300.00 L 300.00 300.00 L 0.00 300.00 Z',
        'M 0.00 292.50 L 300.00 285.00 L 600.00 277.50 L 600.00 300.00 L 300.00 300.00 L 0.00 300.00 Z',
      ]);
      expect(areas().map(a => a.getAttribute('fill'))).toEqual(['var(--wr-color-primary)', 'var(--wr-color-success)']);
      // The colour alone is the path's; its share is the stylesheet's hook.
      for (const area of areas()) expect(area.hasAttribute('fill-opacity')).toBe(false);
    });

    it('draws every fill under every line, so the dashes stay on top', () => {
      const all = [...drawing().querySelectorAll('path')];
      const lastArea = Math.max(...areas().map(a => all.indexOf(a)));
      const firstLine = Math.min(...lines().map(l => all.indexOf(l)));
      expect(lastArea).toBeLessThan(firstLine);
      // The lines themselves are where they always were.
      expect(lines()[0].getAttribute('d')).toBe('M 0.00 225.00 L 300.00 150.00 L 600.00 75.00');
    });

    it('breaks a fill where the data breaks, and gives a lone point none', () => {
      host().series.set([{ label: 'Gaps', data: [5, Number.NaN, 10, 20, Number.NaN, 15, 25] }]);
      render();
      // [5] alone, then [10, 20], then [15, 25]: two runs wide enough to fill.
      expect(areas()).toHaveLength(2);
      expect(areas()[0].getAttribute('d')).toMatch(/^M 200\.00 \S+ L 300\.00 \S+ L 300\.00 \S+ L 200\.00 \S+ Z$/);
    });

    it('takes zero into the axis, since the fills reach it', () => {
      host().series.set([{ label: 'Loss', data: [-12, -30, -18] }]);
      render();
      // A plain line chart ends an all-negative axis just above its peak…
      host().showArea.set(false);
      render();
      expect(ticks()[0]).toBe('-10');
      // …while an area chart runs it up to the zero its fills start from.
      host().showArea.set(true);
      render();
      expect(ticks()[0]).toBe('0');
      expect(areas()[0].getAttribute('d')).toContain('L 600.00 0.00 L 300.00 0.00 L 0.00 0.00 Z');
    });

    it('takes its name from the area key, and an explicit name still wins', () => {
      expect(plot().getAttribute('aria-label')).toBe('Area chart');
      host().showArea.set(false);
      render();
      expect(plot().getAttribute('aria-label')).toBe('Line chart');
      host().showArea.set(true);
      host().ariaLabel.set('Visits and signups');
      render();
      expect(plot().getAttribute('aria-label')).toBe('Visits and signups');
    });

    it('drops the fill of a hidden series', () => {
      host().hidden.set([0]);
      render();
      expect(areas()).toHaveLength(1);
      expect(areas()[0].getAttribute('fill')).toBe('var(--wr-color-success)');
    });
  });

  describe('stacked', () => {
    beforeEach(() => {
      host().stacked.set(true);
      render();
    });

    it('draws each series on top of the ones before it, and marks the host', () => {
      expect(chart().classList).toContain('wr-line-chart--stacked');
      // Signups at 11 / 22 / 33, on top of Visits; the axis still ends at 40.
      expect(ticks()).toEqual(['40', '30', '20', '10', '0']);
      expect(lines()[0].getAttribute('d')).toBe('M 0.00 225.00 L 300.00 150.00 L 600.00 75.00');
      expect(lines()[1].getAttribute('d')).toBe('M 0.00 217.50 L 300.00 135.00 L 600.00 52.50');
      expect(dots().slice(3)).toEqual(['M 0.00 217.50 h 0', 'M 300.00 135.00 h 0', 'M 600.00 52.50 h 0']);
      // Stacking alone fills nothing.
      expect(areas()).toHaveLength(0);
    });

    it('fills each band from the series below to its own line with showArea', () => {
      host().showArea.set(true);
      render();
      expect(areas()[1].getAttribute('d')).toBe(
        'M 0.00 217.50 L 300.00 135.00 L 600.00 52.50 L 600.00 75.00 L 300.00 150.00 L 0.00 225.00 Z'
      );
    });

    it('puts the markers on the stacked tops and reads out the raw values', () => {
      hoverAt(600);
      expect(tooltipValues()).toEqual(['30', '3']);
      expect(rings()).toEqual(['M 600.00 75.00 h 0', 'M 600.00 52.50 h 0']);
    });

    it('stacks positive values up and negative values down, each sign on its own', () => {
      host().showArea.set(true);
      host().series.set([
        { label: 'A', data: [10, -10, 10] },
        { label: 'B', data: [-5, 5, 10] },
      ]);
      render();
      // Up: 10 at Mon, 5 at Tue, 20 at Wed. Down: -5 at Mon, -10 at Tue. So the axis runs
      // from -10 to 30 (a peak on a tick is lifted a step), and v sits at y = (30 − v) / 40 × 300.
      expect(ticks()).toEqual(['30', '20', '10', '0', '-10']);
      // B at Mon goes down from zero, not up from A's 10: the bands cannot cross there.
      // At Tue it goes up from zero, while A went down. At Wed it sits on A's 10.
      expect(areas()[1].getAttribute('d')).toBe(
        'M 0.00 262.50 L 300.00 187.50 L 600.00 75.00 L 600.00 150.00 L 300.00 225.00 L 0.00 225.00 Z'
      );
    });

    it("counts a hole as nothing in the stack, and breaks only that series' line", () => {
      host().series.set([
        { label: 'A', data: [10, Number.NaN, 10] },
        { label: 'B', data: [1, 1, 1] },
      ]);
      render();
      // B at 11 / 1 / 11, unbroken; A has two lone points, each a repeated subpath.
      expect(lines()[1].getAttribute('d')).not.toContain('M 300');
      expect(lines()[1].getAttribute('d')).toMatch(/^M 0\.00 \S+ L 300\.00 \S+ L 600\.00 \S+$/);
      expect((lines()[0].getAttribute('d')!.match(/M /g) ?? []).length).toBe(2);
      hoverAt(300);
      expect(tooltipValues()).toEqual(['1']);
    });

    it('takes a hidden series out of the stack', () => {
      host().hidden.set([0]);
      render();
      expect(lines()).toHaveLength(1);
      // Signups on their own: 1 / 2 / 3 on an axis that ends at 4.
      expect(ticks()[0]).toBe('4');
      expect(lines()[0].getAttribute('d')).toBe('M 0.00 225.00 L 300.00 150.00 L 600.00 75.00');
    });
  });

  describe('dataTable', () => {
    beforeEach(() => {
      host().dataTable.set(true);
      render();
    });

    it("renders beside the plot's img, never inside it", () => {
      const tableHost = root().querySelector('wr-chart-table')!;
      expect(tableHost.classList).toContain('wr-chart-table');
      expect(plot().contains(tableHost)).toBe(false);
      expect(tableHost.closest('[role="img"]')).toBeNull();
      expect(chart().contains(tableHost)).toBe(true);
    });

    it("captions itself with the plot's name and tabulates x down, series across", () => {
      expect(table()!.caption!.textContent.trim()).toBe('Line chart');
      expect(columns()).toEqual(['Visits', 'Signups']);
      expect(rows()).toEqual([
        ['Mon', '10', '1'],
        ['Tue', '20', '2'],
        ['Wed', '30', '3'],
      ]);
    });

    it("keeps each series' own values when stacked, and writes them through valueFormat", () => {
      host().stacked.set(true);
      host().showArea.set(true);
      host().valueFormat.set(v => `${v} u`);
      render();
      expect(table()!.caption!.textContent.trim()).toBe('Area chart');
      expect(rows()[2]).toEqual(['Wed', '30 u', '3 u']);
    });

    it('leaves a hole as an empty cell and heads an unlabelled x as the tooltip does', () => {
      host().series.set([{ label: 'Visits', data: [10, Number.NaN, 30, 40] }]);
      render();
      // By its position counting from 1, as a reader counts: from 0 the fourth x read "3".
      expect(rows()).toEqual([
        ['Mon', '10'],
        ['Tue', ''],
        ['Wed', '30'],
        ['4', '40'],
      ]);
    });

    it('drops the column of a hidden series, and every row with all of them hidden', () => {
      host().hidden.set([1]);
      render();
      expect(columns()).toEqual(['Visits']);
      expect(rows()[0]).toEqual(['Mon', '10']);

      host().hidden.set([0, 1]);
      render();
      expect(columns()).toEqual([]);
      expect(rows()).toEqual([]);
    });

    it('goes when it is switched off', () => {
      host().dataTable.set(false);
      render();
      expect(root().querySelector('wr-chart-table')).toBeNull();
    });
  });
});

/**
 * The fill's share of its colour is a hook the stylesheet reads, so a consumer restyles
 * it without reaching for the path. jsdom applies no sheet, so the compiled CSS is read.
 */
describe('wr-line-chart area stylesheet', () => {
  interface Sass {
    compileString(source: string, options: { loadPaths: string[]; style: 'expanded' }): { css: string };
  }
  const sass = createRequire(createRequire(import.meta.url).resolve('@angular/build/package.json'))('sass') as Sass;
  const css = (): string =>
    sass.compileString(`@use 'charts/line-chart/styles';`, {
      loadPaths: [join(process.cwd(), 'projects/lib')],
      style: 'expanded',
    }).css;
  const rule = (source: string, selector: string): string =>
    new RegExp(`(?:^|\\n)${selector.replace(/[.-]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(source)?.[1] ?? '';

  it('paints a fill at the hook, which a stacked chart doubles', () => {
    const source = css();
    expect(rule(source, '.wr-line-chart__area')).toMatch(/fill-opacity:\s*var\(--wr-line-chart-area-opacity\)/);
    expect(rule(source, '.wr-line-chart')).toMatch(/--wr-line-chart-area-opacity:\s*0\.15/);
    expect(rule(source, '.wr-line-chart--stacked')).toMatch(/--wr-line-chart-area-opacity:\s*0\.3/);
  });

  it('paints the grid, the crosshair and the hover centre through hooks, and gives forced colors its own', () => {
    // They were presentation attributes holding theme colours, which forced colors keeps
    // as written: on a dark forced canvas the gridlines measured about 1.3:1.
    const source = css();
    expect(rule(source, '.wr-line-chart__grid-line')).toMatch(/stroke:\s*var\(--wr-line-chart-grid-color\)/);
    expect(rule(source, '.wr-line-chart__crosshair')).toMatch(/stroke:\s*var\(--wr-line-chart-crosshair-color\)/);
    expect(rule(source, '.wr-line-chart__hover-dot-center')).toMatch(/stroke:\s*var\(--wr-line-chart-hover-center\)/);
    const forced = /@media \(forced-colors: active\)\s*\{([\s\S]*?)\n\}/.exec(source)?.[1] ?? '';
    expect(rule(forced.replace(/^ {2}/gm, ''), '.wr-line-chart__grid-line')).toMatch(/stroke:\s*GrayText/);
    expect(rule(forced.replace(/^ {2}/gm, ''), '.wr-line-chart__crosshair')).toMatch(/stroke:\s*CanvasText/);
    expect(rule(forced.replace(/^ {2}/gm, ''), '.wr-line-chart__hover-dot-center')).toMatch(/stroke:\s*Canvas\b/);
  });

  it('keeps the sign of a tick and of a tooltip value before its digits on an RTL page', () => {
    const source = css();
    for (const selector of ['.wr-line-chart__tick', '.wr-line-chart__tooltip-value', '.wr-line-chart__x-label']) {
      expect(rule(source, selector), selector).toMatch(/unicode-bidi:\s*plaintext/);
    }
    // Shrunk to its text, so following its own direction does not move a tick off the plot's side.
    expect(rule(source, '.wr-line-chart__tick')).toMatch(/justify-self:\s*end/);
  });

  it("sizes the x labels' strip to one line of their own leading", () => {
    const strip = rule(css(), '.wr-line-chart__x-labels');
    expect(strip).toMatch(/line-height:\s*var\(--wr-line-chart-x-labels-line-height\)/);
    expect(strip).toMatch(/height:\s*1lh/);
  });

  it('loads the data table sheet, which clips the table out of sight', () => {
    expect(rule(css(), '.wr-chart-table')).toMatch(/clip-path:\s*inset\(50%\)/);
  });

  // The table is out of flow, so its containing block has to be the chart: with a static
  // host it resolves against an ancestor outside it and can add blank scroll to the page.
  it('positions the host, which the out-of-flow data table resolves against', () => {
    expect(rule(css(), '.wr-line-chart')).toMatch(/position:\s*relative/);
  });
});
