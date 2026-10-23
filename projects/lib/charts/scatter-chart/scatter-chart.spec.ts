import { Component, LOCALE_ID, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrScatterChart } from './scatter-chart';
import type { WrScatterAxis, WrScatterSeries } from './types';

/**
 * Two series over x 10..30 and y 100..140. Fitted with a step's room at both ends and no
 * zero forced in, the x axis runs 5..35 in fives and the y axis 90..150 in tens, so the
 * three points sit at 1/6, 1/2 and 5/6 of each axis.
 */
const SERIES: readonly WrScatterSeries[] = [
  {
    label: 'Laptops',
    data: [
      { x: 10, y: 100 },
      { x: 30, y: 140, label: 'Pro' },
    ],
  },
  { label: 'Tablets', data: [{ x: 20, y: 120 }] },
];

@Component({
  imports: [WrScatterChart],
  template: `
    <wr-scatter-chart
      [series]="series()"
      [ariaLabel]="ariaLabel()"
      [xLabel]="xLabel()"
      [yLabel]="yLabel()"
      [sizeLabel]="sizeLabel()"
      [valueFormat]="valueFormat()"
      [height]="height()"
      [showGrid]="showGrid()"
      [showLegend]="showLegend()"
      [toggleableLegend]="toggleable()"
      [tooltip]="tooltip()"
      [dataTable]="dataTable()"
      [maxRadius]="maxRadius()"
      [(hiddenSeries)]="hidden"
    />
  `,
})
class Host {
  readonly series = signal<readonly WrScatterSeries[]>(SERIES);
  readonly ariaLabel = signal<string | null>(null);
  readonly xLabel = signal<string | null>(null);
  readonly yLabel = signal<string | null>(null);
  readonly sizeLabel = signal<string | null>(null);
  readonly valueFormat = signal<((value: number, axis: WrScatterAxis) => string) | null>(null);
  readonly height = signal<number>(240);
  readonly showGrid = signal(true);
  readonly showLegend = signal(true);
  readonly toggleable = signal(false);
  readonly tooltip = signal(true);
  readonly dataTable = signal(false);
  readonly maxRadius = signal(20);
  readonly hidden = signal<readonly number[]>([]);
}

interface Drawn {
  readonly series: string | null;
  readonly x: string | null;
  readonly y: string | null;
  readonly size: string | null;
  readonly radius: string | null;
  readonly marker: string | null;
  readonly left: string | null;
  readonly top: string | null;
  readonly fill: string | null;
}

describe('WrScatterChart', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): Host => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const render = (): void => fixture.detectChanges();
  const plot = (): HTMLElement => root().querySelector<HTMLElement>('.wr-scatter-chart__plot')!;
  const drawing = (): SVGSVGElement => root().querySelector<SVGSVGElement>('.wr-scatter-chart__svg')!;
  const texts = (selector: string): string[] =>
    [...root().querySelectorAll(selector)].map(element => element.textContent.trim());
  const points = (): Drawn[] =>
    [...root().querySelectorAll<SVGSVGElement>('.wr-scatter-chart__point')].map(point => ({
      series: point.getAttribute('data-series'),
      x: point.getAttribute('data-x'),
      y: point.getAttribute('data-y'),
      size: point.getAttribute('data-size'),
      radius: point.getAttribute('data-radius'),
      marker: point.getAttribute('data-marker'),
      left: point.getAttribute('x'),
      top: point.getAttribute('y'),
      fill: point.querySelector('.wr-scatter-chart__marker')!.getAttribute('fill'),
    }));

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    render();
  });

  afterEach(() => fixture.destroy());

  describe('drawing', () => {
    it('draws a marker per point, each series in its own shape and palette colour', () => {
      expect(points().map(({ series, marker, fill }) => [series, marker, fill])).toEqual([
        ['0', 'circle', 'var(--wr-color-primary)'],
        ['0', 'circle', 'var(--wr-color-primary)'],
        ['1', 'square', 'var(--wr-color-success)'],
      ]);
    });

    it('keeps a colour the series asks for', () => {
      host().series.set([{ label: 'Only', color: 'rebeccapurple', data: [{ x: 1, y: 1 }] }]);
      render();

      expect(points()[0].fill).toBe('rebeccapurple');
    });

    it('places every point by percentage on axes that are not forced to zero', () => {
      expect(points().map(({ x, y, left, top }) => [x, y, left, top])).toEqual([
        ['10', '100', '16.667%', '83.333%'],
        ['30', '140', '83.333%', '16.667%'],
        ['20', '120', '50%', '50%'],
      ]);
      // A step of room at both ends, and no zero: x 10..30 reads 5..35, y 100..140 reads 90..150.
      expect(texts('.wr-scatter-chart__x-tick')).toEqual(['5', '10', '15', '20', '25', '30', '35']);
      expect(texts('.wr-scatter-chart__y-tick')).toEqual(['150', '140', '130', '120', '110', '100', '90']);
    });

    it('hands every tick its gridline, so the labels and the lines agree', () => {
      const xLines = [...root().querySelectorAll('.wr-scatter-chart__grid-line--x')].map(l => l.getAttribute('x1'));
      const xLabels = [...root().querySelectorAll<HTMLElement>('.wr-scatter-chart__x-tick')].map(
        label => `${label.style.getPropertyValue('--wr-scatter-chart-x')}%`
      );
      expect(xLabels).toEqual(xLines);
      expect(xLines[0]).toBe('0%');
      expect(xLines.at(-1)).toBe('100%');
    });

    it('centres a single point with a step either side', () => {
      host().series.set([{ label: 'One', data: [{ x: 5, y: 5 }] }]);
      render();

      expect(points().map(({ left, top }) => [left, top])).toEqual([['50%', '50%']]);
      // The value is a tick of its own, in the middle: a lone 5 reads 4 / 5 / 6.
      expect(texts('.wr-scatter-chart__x-tick')).toEqual(['4', '5', '6']);
      expect(texts('.wr-scatter-chart__y-tick')).toEqual(['6', '5', '4']);
    });

    it('centres a lone value that a plain snap would leave off-centre', () => {
      // Snapped outward, 120 sits on an axis from 100 to 150, two fifths of the way up.
      host().series.set([{ label: 'One', data: [{ x: 0.3, y: 120 }] }]);
      render();

      expect(points().map(({ left, top }) => [left, top])).toEqual([['50%', '50%']]);
      expect(texts('.wr-scatter-chart__y-tick')).toEqual(['140', '120', '100']);
      expect(texts('.wr-scatter-chart__x-tick')).toEqual(['0.25', '0.3', '0.35']);
    });

    it('centres a column of points that share one x', () => {
      host().series.set([
        {
          label: 'Column',
          data: [
            { x: 0, y: 1 },
            { x: 0, y: 3 },
          ],
        },
      ]);
      render();

      expect(points().map(({ left }) => left)).toEqual(['50%', '50%']);
    });

    it('draws the empty frame and no point for no data', () => {
      host().series.set([]);
      render();

      expect(points()).toEqual([]);
      expect(texts('.wr-scatter-chart__x-tick')).toEqual(['0', '0.25', '0.5', '0.75', '1']);
      expect(texts('.wr-scatter-chart__y-tick')).toEqual(['1', '0.75', '0.5', '0.25', '0']);
      expect(root().querySelector('.wr-scatter-chart__legend')).toBeNull();
    });

    it('leaves out a point it cannot place, and nothing else', () => {
      host().series.set([
        {
          label: 'Rubbish',
          data: [
            { x: Number.NaN, y: 1 },
            { x: 1, y: Number.POSITIVE_INFINITY },
            { x: 2, y: 3 },
            { x: 4, y: 5 },
          ],
        },
      ]);
      render();

      expect(points().map(({ x, y }) => [x, y])).toEqual([
        ['2', '3'],
        ['4', '5'],
      ]);
      // Fitted to the two that remain: x 2..4 reads 1.5..4.5.
      expect(texts('.wr-scatter-chart__x-tick')[0]).toBe('1.5');
      expect(points().every(({ left, top }) => !`${left}${top}`.includes('NaN'))).toBe(true);
    });
  });

  describe('bubbles', () => {
    const BUBBLES: readonly WrScatterSeries[] = [
      {
        label: 'Cities',
        data: [
          { x: 1, y: 1, size: 25 },
          { x: 2, y: 2, size: 100 },
          { x: 3, y: 3 },
          { x: 4, y: 4, size: 0 },
          { x: 5, y: 5, size: Number.NaN },
          { x: 6, y: 6, size: -4 },
        ],
      },
    ];

    beforeEach(() => {
      host().series.set(BUBBLES);
      render();
    });

    it('scales each point by area against the largest, drawn largest first', () => {
      expect(points().map(({ x, size, radius }) => [x, size, radius])).toEqual([
        // The largest at `maxRadius`; a quarter of the size is a quarter of the area, half the radius.
        ['2', '100', '20'],
        ['1', '25', '10'],
        // No size, or one that is not a finite number at or above zero: the plain point.
        ['3', null, '5'],
        ['5', null, '5'],
        ['6', null, '5'],
        // A size of nothing is still a mark, at the 4px floor.
        ['4', '0', '4'],
      ]);
    });

    it('marks the chart as a bubble chart, which the stylesheet draws see-through', () => {
      const chart = (): HTMLElement => root().querySelector<HTMLElement>('wr-scatter-chart')!;
      expect(chart().classList).toContain('wr-scatter-chart--bubbles');

      host().series.set(SERIES);
      render();
      expect(chart().classList).not.toContain('wr-scatter-chart--bubbles');
    });

    it('follows `maxRadius`, never under the 4px floor', () => {
      host().maxRadius.set(40);
      render();
      expect(points()[0].radius).toBe('40');

      host().maxRadius.set(1);
      render();
      // Every sized point is at the floor now, under the plain points, which draw first.
      expect(points().map(({ x, radius }) => [x, radius])).toEqual([
        ['3', '5'],
        ['5', '5'],
        ['6', '5'],
        ['1', '4'],
        ['2', '4'],
        ['4', '4'],
      ]);
    });

    it('hands the stylesheet how far the largest marker reaches, ring and shape included', () => {
      const chart = (): HTMLElement => root().querySelector<HTMLElement>('wr-scatter-chart')!;
      const reach = (): [string, string] => [
        chart().style.getPropertyValue('--wr-scatter-chart-reach-x'),
        chart().style.getPropertyValue('--wr-scatter-chart-reach-y'),
      ];
      // The 20px circle and its ring 3px out: the plot's padding grows to 23px plus the
      // ring's stroke, so the bubble stays inside the plot wherever it sits.
      expect(reach()).toEqual(['23', '23']);

      // A triangle's point reaches 1.56 times its radius up, past the circle of that radius.
      host().series.set([
        { label: 'A', data: [] },
        { label: 'B', data: [] },
        { label: 'C', data: [{ x: 1, y: 1, size: 9 }] },
      ]);
      render();
      expect(reach()).toEqual(['30.976', '35.768']);

      // Up or down, never past a quarter of the plot's height.
      host().height.set(80);
      render();
      expect(reach()).toEqual(['30.976', '20']);

      // The plain 5px point reaches its ring, 8px out.
      host().series.set(SERIES);
      render();
      expect(reach()).toEqual(['8', '8']);

      host().series.set([]);
      render();
      expect(reach()).toEqual(['0', '0']);
    });
  });

  describe('hidden series', () => {
    it('draws no point for a hidden series and refits both axes to the rest', () => {
      host().hidden.set([0]);
      render();

      expect(points().map(({ series, left, top }) => [series, left, top])).toEqual([['1', '50%', '50%']]);
      expect(texts('.wr-scatter-chart__x-tick')).toEqual(['15', '20', '25']);
      // The legend keeps the row, struck through, so the series can come back.
      expect(texts('.wr-chart-legend__label')).toEqual(['Laptops', 'Tablets']);
      expect(root().querySelectorAll('.wr-chart-legend__item--hidden')).toHaveLength(1);
    });

    it('hides and shows a series from a toggleable legend, and says so to the host', () => {
      host().toggleable.set(true);
      render();
      const buttons = (): HTMLButtonElement[] => [
        ...root().querySelectorAll<HTMLButtonElement>('.wr-chart-legend__toggle'),
      ];

      buttons()[1].click();
      render();
      expect(host().hidden()).toEqual([1]);
      expect(buttons().map(button => button.getAttribute('aria-pressed'))).toEqual(['true', 'false']);
      expect(points().map(({ series }) => series)).toEqual(['0', '0']);

      buttons()[1].click();
      render();
      expect(host().hidden()).toEqual([]);
      expect(points()).toHaveLength(3);
    });

    it('draws the empty frame with every series hidden', () => {
      host().hidden.set([0, 1]);
      render();

      expect(points()).toEqual([]);
      expect(texts('.wr-scatter-chart__y-tick')).toEqual(['1', '0.75', '0.5', '0.25', '0']);
    });
  });

  describe('legend', () => {
    it("keys each row by its series' marker", () => {
      const keys = [...root().querySelectorAll('.wr-chart-legend__swatch')].map(key => [
        key.getAttribute('data-marker'),
        key.getAttribute('aria-hidden'),
      ]);
      expect(keys).toEqual([
        ['circle', 'true'],
        ['square', 'true'],
      ]);
    });

    it('goes with `showLegend` off', () => {
      host().showLegend.set(false);
      render();

      expect(root().querySelector('.wr-scatter-chart__legend')).toBeNull();
    });
  });

  describe('axes', () => {
    it('draws an axis name only when one is given', () => {
      expect(root().querySelector('.wr-scatter-chart__x-title')).toBeNull();
      expect(root().querySelector('.wr-scatter-chart__y-title')).toBeNull();

      host().xLabel.set('Price');
      host().yLabel.set('Rating');
      render();

      expect(texts('.wr-scatter-chart__x-title')).toEqual(['Price']);
      expect(texts('.wr-scatter-chart__y-title')).toEqual(['Rating']);
    });

    it('drops the gridlines and the tick labels with `showGrid` off', () => {
      host().showGrid.set(false);
      render();

      expect(root().querySelector('.wr-scatter-chart__grid-line')).toBeNull();
      expect(root().querySelector('.wr-scatter-chart__x-tick')).toBeNull();
      expect(root().querySelector('.wr-scatter-chart__y-tick')).toBeNull();
      expect(points()).toHaveLength(3);
    });

    it('tells `valueFormat` which axis a number is for', () => {
      host().valueFormat.set((value, axis) => `${axis}:${value}`);
      render();

      expect(texts('.wr-scatter-chart__x-tick')[0]).toBe('x:5');
      expect(texts('.wr-scatter-chart__y-tick')[0]).toBe('y:150');
    });

    it('takes a one-argument formatter written for another chart', () => {
      host().valueFormat.set((value: number) => `$${value}`);
      render();

      expect(texts('.wr-scatter-chart__x-tick')[0]).toBe('$5');
    });

    it('hides the tick labels, which the plot name and the data table speak for', () => {
      expect(root().querySelector('.wr-scatter-chart__x-axis')!.getAttribute('aria-hidden')).toBe('true');
      expect(root().querySelector('.wr-scatter-chart__y-axis')!.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('accessibility', () => {
    it('is one named image, with no tab stop', () => {
      expect(plot().getAttribute('role')).toBe('img');
      expect(plot().getAttribute('aria-label')).toBe('Scatter chart');
      expect(root().querySelectorAll('[tabindex], button, a[href]')).toHaveLength(0);
      // A node per point is work for nothing inside an `img`, whose children are presentational.
      expect(drawing().getAttribute('aria-hidden')).toBe('true');

      host().ariaLabel.set('Price against rating');
      render();
      expect(plot().getAttribute('aria-label')).toBe('Price against rating');
    });

    it('writes the plot height, at least 80px', () => {
      expect(plot().style.height).toBe('240px');

      host().height.set(40);
      render();
      expect(plot().style.height).toBe('80px');
    });
  });

  describe('data table', () => {
    const table = (): HTMLTableElement | null => root().querySelector<HTMLTableElement>('.wr-chart-table table');
    const rows = (): string[][] =>
      [...table()!.querySelectorAll('tbody tr')].map(row => [...row.children].map(cell => cell.textContent.trim()));

    it('renders none unless asked', () => {
      expect(root().querySelector('.wr-chart-table')).toBeNull();
    });

    it('tabulates every point beside the image, never inside it', () => {
      host().dataTable.set(true);
      render();

      expect(table()).not.toBeNull();
      expect(table()!.closest('[role="img"]')).toBeNull();
      expect(table()!.caption!.textContent.trim()).toBe('Scatter chart');
      expect(texts('.wr-chart-table thead th[scope="col"]')).toEqual(['X', 'Y']);
      // A group per series, headed by its name down a column of its own; a row per point,
      // headed by its label or its position in the series.
      expect(table()!.tBodies).toHaveLength(2);
      expect(texts('.wr-chart-table th[scope="rowgroup"]')).toEqual(['Laptops', 'Tablets']);
      expect(rows()).toEqual([
        ['Laptops', '1', '10', '100'],
        ['Pro', '30', '140'],
        ['Tablets', '1', '20', '120'],
      ]);
    });

    it('names its columns after the axes and adds size once a point has one', () => {
      host().dataTable.set(true);
      host().xLabel.set('Price');
      host().sizeLabel.set('Sales');
      host().series.set([
        {
          label: 'Shops',
          data: [
            { x: 1, y: 2, size: 30 },
            { x: 3, y: 4 },
          ],
        },
      ]);
      render();

      expect(texts('.wr-chart-table thead th[scope="col"]')).toEqual(['Price', 'Y', 'Sales']);
      expect(rows()).toEqual([
        ['Shops', '1', '1', '2', '30'],
        ['2', '3', '4', ''],
      ]);
    });

    it('numbers rows as the consumer numbered the points, past one that was left out', () => {
      host().dataTable.set(true);
      host().series.set([
        {
          label: 'Gaps',
          data: [
            { x: Number.NaN, y: 1 },
            { x: 2, y: 3 },
          ],
        },
      ]);
      render();

      expect(rows()).toEqual([['Gaps', '2', '2', '3']]);
    });

    it('drops a hidden series, and writes values through `valueFormat`', () => {
      host().dataTable.set(true);
      host().hidden.set([0]);
      host().valueFormat.set((value, axis) => `${axis}:${value}`);
      render();

      expect(rows()).toEqual([['Tablets', '1', 'x:20', 'y:120']]);
    });
  });

  describe('tooltip', () => {
    const chip = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-chart-tooltip');
    const chipTexts = (selector: string): string[] =>
      [...(chip()?.querySelectorAll(selector) ?? [])].map(element => element.textContent.trim());
    const halo = (): SVGSVGElement | null => root().querySelector<SVGSVGElement>('.wr-scatter-chart__halo');
    const moveTo = (clientX: number, clientY: number): void => {
      plot().dispatchEvent(new MouseEvent('mousemove', { clientX, clientY, bubbles: true }));
      render();
    };

    beforeEach(() => {
      // jsdom lays nothing out, so the drawing is given a 300 × 120 box at the origin:
      // a point at 50% / 50% is at (150, 60).
      drawing().getBoundingClientRect = () => new DOMRect(0, 0, 300, 120);
    });

    it("reads the nearest point's series, x and y, and rings it", () => {
      moveTo(158, 64);

      expect(chipTexts('.wr-chart-tooltip__label')).toEqual(['Tablets']);
      expect(chipTexts('.wr-chart-tooltip__value')).toEqual([]);
      expect(chipTexts('.wr-chart-tooltip__row-label')).toEqual(['X', 'Y']);
      expect(chipTexts('.wr-chart-tooltip__row-value')).toEqual(['20', '120']);
      expect([halo()?.getAttribute('x'), halo()?.getAttribute('y')]).toEqual(['50%', '50%']);
    });

    it("heads the reading with the point's own label, and names the rows after the axes", () => {
      host().xLabel.set('Price');
      host().yLabel.set('Rating');
      render();

      // 30 / 140 sits at 5/6 across and 1/6 down: (250, 20).
      moveTo(250, 20);

      expect(chipTexts('.wr-chart-tooltip__label')).toEqual(['Laptops']);
      expect(chipTexts('.wr-chart-tooltip__value')).toEqual(['Pro']);
      expect(chipTexts('.wr-chart-tooltip__row-label')).toEqual(['Price', 'Rating']);
    });

    it('adds the size row for a bubble, and reaches a large one anywhere inside it', () => {
      host().sizeLabel.set('Population');
      host().series.set([{ label: 'Cities', data: [{ x: 1, y: 1, size: 9 }] }]);
      render();

      // A 20px bubble at (150, 60): 18px out is past the 16px reach, inside the bubble.
      moveTo(168, 60);

      expect(chipTexts('.wr-chart-tooltip__row-label')).toEqual(['X', 'Y', 'Population']);
      expect(chipTexts('.wr-chart-tooltip__row-value')).toEqual(['1', '1', '9']);
    });

    it("reaches a triangle's point, which stands past the circle of its radius", () => {
      host().series.set([
        { label: 'A', data: [] },
        { label: 'B', data: [] },
        { label: 'C', data: [{ x: 5, y: 5, size: 100, label: 'Big triangle' }] },
      ]);
      render();

      // A 20px triangle centred on (150, 60): its point is 31px up and its ring 36px.
      // Past the ring reads nothing; on the point, below the old 20px reach, the triangle.
      moveTo(150, 22);
      expect(chip()).toBeNull();

      moveTo(150, 31);
      expect(chipTexts('.wr-chart-tooltip__value')).toEqual(['Big triangle']);
    });

    it('opens on nothing away from every point', () => {
      moveTo(150, 110);

      expect(chip()).toBeNull();
      expect(halo()).toBeNull();
    });

    it('cannot land on a hidden series', () => {
      host().hidden.set([1]);
      render();
      // Tablets' point would be at (150, 60); Laptops' are refitted, but none is there.
      moveTo(150, 60);

      expect(chip()).toBeNull();
    });

    it('shows nothing with `tooltip` off', () => {
      host().tooltip.set(false);
      render();
      moveTo(150, 60);

      expect(chip()).toBeNull();
      expect(halo()).toBeNull();
    });

    it('answers nothing for a drawing that has not been laid out', () => {
      drawing().getBoundingClientRect = () => new DOMRect(0, 0, 0, 0);
      moveTo(0, 0);

      expect(chip()).toBeNull();
    });
  });
});

describe('WrScatterChart on the server', () => {
  it('draws everything from its inputs and measures nothing', () => {
    // Every position is a percentage worked out from the data; only the tooltip measures
    // a box, and only after a pointer has moved. A prerendered page carries the drawing.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const measure = vi.spyOn(Element.prototype, 'getBoundingClientRect');
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.dataTable.set(true);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.wr-scatter-chart__point')).toHaveLength(3);
    expect(root.querySelectorAll('.wr-scatter-chart__x-tick')).toHaveLength(7);
    expect(root.querySelectorAll('.wr-chart-table tbody tr')).toHaveLength(3);
    expect(measure).not.toHaveBeenCalled();
    fixture.destroy();
    measure.mockRestore();
  });
});

@Component({
  imports: [WrScatterChart],
  template: `<wr-scatter-chart dataTable [series]="series" />`,
})
class LocaleHost {
  readonly series: readonly WrScatterSeries[] = [
    {
      label: 'Big',
      data: [
        { x: 1234.5, y: 0.0004 },
        { x: 2000, y: 1 },
      ],
    },
  ];
}

describe('WrScatterChart number format', () => {
  afterEach(() => TestBed.resetTestingModule());

  const cells = (locale?: string): string[][] => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: locale ? [{ provide: LOCALE_ID, useValue: locale }] : [] });
    const fixture = TestBed.createComponent(LocaleHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    return [...root.querySelectorAll('.wr-chart-table tbody tr')].map(row =>
      [...row.querySelectorAll('td')].map(cell => cell.textContent.trim())
    );
  };

  it('writes the exact figures in the table, a tiny one not as zero', () => {
    expect(cells()).toEqual([
      ['1,234.5', '0.0004'],
      ['2,000', '1'],
    ]);
  });

  it("follows LOCALE_ID's own convention", () => {
    expect(cells('de')[0]).toEqual(['1.234,5', '0,0004']);
  });
});
