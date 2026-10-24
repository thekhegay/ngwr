import { Component, LOCALE_ID, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { chartColor } from 'ngwr/charts/core';
import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrBoxplotChart } from './boxplot-chart';
import type { WrBoxplotGroup } from './types';

/**
 * One group from raw values and one from a summary. 1..10 and 30 has its quartiles at
 * 3.5, 6 and 8.5 and its fences at -4 and 16, so 30 is an outlier and the whiskers end at
 * 1 and 10. Every number drawn runs from 1 to 30, which the axis reads as 0 to 40 in
 * tens — a step of room above the outlier — so a value v sits (40 − v) / 40 down.
 */
const GROUPS: readonly WrBoxplotGroup[] = [
  { label: 'North', values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 30] },
  { label: 'South', stats: { min: 4, q1: 8, median: 12, q3: 16, max: 20 } },
];

@Component({
  imports: [WrBoxplotChart],
  template: `
    <wr-boxplot-chart
      [groups]="groups()"
      [ariaLabel]="ariaLabel()"
      [xLabel]="xLabel()"
      [yLabel]="yLabel()"
      [valueFormat]="valueFormat()"
      [color]="color()"
      [height]="height()"
      [showGrid]="showGrid()"
      [tooltip]="tooltip()"
      [dataTable]="dataTable()"
    />
  `,
})
class Host {
  readonly groups = signal<readonly WrBoxplotGroup[]>(GROUPS);
  readonly ariaLabel = signal<string | null>(null);
  readonly xLabel = signal<string | null>(null);
  readonly yLabel = signal<string | null>(null);
  readonly valueFormat = signal<((value: number) => string) | null>(null);
  readonly color = signal('var(--wr-color-primary)');
  readonly height = signal<number>(240);
  readonly showGrid = signal(true);
  readonly tooltip = signal(true);
  readonly dataTable = signal(false);
}

/** One group's marks as the component placed them: the custom properties it wrote, as numbers. */
interface Placed {
  readonly upper: readonly number[];
  readonly lower: readonly number[];
  readonly box: readonly number[];
  readonly caps: readonly number[];
  readonly median: number;
  readonly outliers: readonly number[];
}

describe('WrBoxplotChart', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): Host => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const render = (): void => fixture.detectChanges();
  const plot = (): HTMLElement => root().querySelector<HTMLElement>('.wr-boxplot-chart__plot')!;
  const groups = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('.wr-boxplot-chart__group')];
  const texts = (selector: string): string[] =>
    [...root().querySelectorAll(selector)].map(element => element.textContent.trim());
  const prop = (element: Element | null, name: string): number =>
    Number.parseFloat((element as HTMLElement | null)?.style.getPropertyValue(`--wr-boxplot-chart-${name}`) ?? '');
  const range = (element: Element | null): number[] => [prop(element, 'top'), prop(element, 'bottom')];
  const placed = (group: HTMLElement): Placed => ({
    upper: range(group.querySelector('.wr-boxplot-chart__whisker--upper')),
    lower: range(group.querySelector('.wr-boxplot-chart__whisker--lower')),
    box: range(group.querySelector('.wr-boxplot-chart__box')),
    caps: [...group.querySelectorAll('.wr-boxplot-chart__cap')].map(cap => prop(cap, 'y')),
    median: prop(group.querySelector('.wr-boxplot-chart__median'), 'y'),
    outliers: [...group.querySelectorAll('.wr-boxplot-chart__outlier')].map(dot => prop(dot, 'y')),
  });

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    render();
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  describe('drawing', () => {
    it('gives every group an equal slot, left to right, with its name under it', () => {
      expect(groups().map(group => [prop(group, 'slot-start'), prop(group, 'slot-width')])).toEqual([
        [0, 50],
        [50, 50],
      ]);
      expect(texts('.wr-boxplot-chart__x-label')).toEqual(['North', 'South']);
      const labels = [...root().querySelectorAll('.wr-boxplot-chart__x-label')];
      expect(labels.map(label => [prop(label, 'slot-start'), prop(label, 'slot-width')])).toEqual([
        [0, 50],
        [50, 50],
      ]);
    });

    it('places the whiskers, the box, the median and the outliers worked out from raw values', () => {
      expect(placed(groups()[0])).toEqual({
        upper: [75, 78.75],
        lower: [91.25, 97.5],
        box: [78.75, 91.25],
        caps: [75, 97.5],
        median: 85,
        outliers: [25],
      });
    });

    it('draws a summary exactly as given', () => {
      expect(placed(groups()[1])).toEqual({
        upper: [50, 60],
        lower: [80, 90],
        box: [60, 80],
        caps: [50, 90],
        median: 70,
        outliers: [],
      });
    });

    it("writes each group's numbers beside its placement, and an outlier's on its dot", () => {
      const read = (group: HTMLElement): (string | null)[] =>
        ['min', 'q1', 'median', 'q3', 'max'].map(name => group.getAttribute(`data-${name}`));
      expect(groups().map(read)).toEqual([
        ['1', '3.5', '6', '8.5', '10'],
        ['4', '8', '12', '16', '20'],
      ]);
      expect(root().querySelector('.wr-boxplot-chart__outlier')!.getAttribute('data-value')).toBe('30');
    });

    it('takes a summary over raw values when a group has both', () => {
      host().groups.set([
        { label: 'Both', values: [1, 2, 3], stats: { min: 10, q1: 20, median: 30, q3: 40, max: 50 } },
      ]);
      render();

      expect(groups()[0].getAttribute('data-median')).toBe('30');
    });

    it("paints every group in the chart's colour unless it has its own", () => {
      // The input keeps the literal default the docs print; this holds it to the palette.
      expect(groups().map(group => group.style.getPropertyValue('--wr-boxplot-chart-group-color'))).toEqual([
        chartColor(0),
        chartColor(0),
      ]);

      host().color.set('var(--wr-color-success)');
      host().groups.set([GROUPS[0], { ...GROUPS[1], color: 'rebeccapurple' }]);
      render();

      expect(groups().map(group => group.style.getPropertyValue('--wr-boxplot-chart-group-color'))).toEqual([
        'var(--wr-color-success)',
        'rebeccapurple',
      ]);
    });

    it('keeps the slot and the name of a group with nothing to draw, and draws no box in it', () => {
      host().groups.set([
        { label: 'Values', values: [2, 4] },
        { label: 'Nothing' },
        { label: 'Not finite', values: [Number.NaN] },
      ]);
      render();

      expect(groups().map(group => group.classList.contains('wr-boxplot-chart__group--empty'))).toEqual([
        false,
        true,
        true,
      ]);
      expect(root().querySelectorAll('.wr-boxplot-chart__box')).toHaveLength(1);
      expect(groups()[1].children).toHaveLength(0);
      expect(groups()[1].hasAttribute('data-median')).toBe(false);
      expect(texts('.wr-boxplot-chart__x-label')).toEqual(['Values', 'Nothing', 'Not finite']);
      expect(prop(groups()[2], 'slot-start')).toBeCloseTo(66.667, 3);
    });

    it('leaves out the outliers of a summary that are not finite, and draws the rest ascending', () => {
      host().groups.set([
        {
          label: 'Given',
          stats: { min: 2, q1: 3, median: 4, q3: 5, max: 6, outliers: [9, Number.NaN, 0, Number.POSITIVE_INFINITY] },
        },
      ]);
      render();

      const dots = [...root().querySelectorAll('.wr-boxplot-chart__outlier')].map(dot =>
        dot.getAttribute('data-value')
      );
      expect(dots).toEqual(['0', '9']);
    });

    it('draws the empty frame and no box for no groups', () => {
      host().groups.set([]);
      render();

      expect(groups()).toHaveLength(0);
      expect(texts('.wr-boxplot-chart__y-tick')).toEqual(['1', '0.75', '0.5', '0.25', '0']);
    });
  });

  describe('a summary that is not one', () => {
    let warn: MockInstance<typeof console.warn>;

    beforeEach(() => {
      warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    it('draws numbers out of order as given, inside an axis that holds every one of them, and says so once', () => {
      host().groups.set([{ label: 'Upside down', stats: { min: 20, q1: 16, median: 12, q3: 8, max: 4 } }]);
      render();
      render();

      // The axis is fitted to 4..20, which it reads as 0 to 25 in fives.
      expect(texts('.wr-boxplot-chart__y-tick')).toEqual(['25', '20', '15', '10', '5', '0']);
      expect(placed(groups()[0]).box).toEqual([36, 68]);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toMatch(/"Upside down" is not in order .* drawn as given/);
    });

    it('draws nothing for a number that is not finite, and says so', () => {
      host().groups.set([{ label: 'Broken', stats: { min: 1, q1: 2, median: Number.NaN, q3: 4, max: 5 } }]);
      render();

      expect(root().querySelector('.wr-boxplot-chart__box')).toBeNull();
      expect(String(warn.mock.calls[0][0])).toMatch(/"Broken" has a number that is not finite, so it draws nothing/);
    });

    it('says nothing about a summary in order', () => {
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe('axis', () => {
    it('fits the ticks to every number drawn, outliers included, with no zero forced in', () => {
      expect(texts('.wr-boxplot-chart__y-tick')).toEqual(['40', '30', '20', '10', '0']);

      host().groups.set([{ label: 'High', stats: { min: 210, q1: 220, median: 230, q3: 240, max: 250 } }]);
      render();
      expect(texts('.wr-boxplot-chart__y-tick')).toEqual(['260', '250', '240', '230', '220', '210', '200']);
    });

    it('hands every tick its gridline, so the labels and the lines agree', () => {
      const lines = [...root().querySelectorAll('.wr-boxplot-chart__grid-line')].map(line => prop(line, 'y'));
      const labels = [...root().querySelectorAll('.wr-boxplot-chart__y-tick')].map(label => prop(label, 'y'));
      expect(lines).toEqual([0, 25, 50, 75, 100]);
      expect(labels).toEqual(lines);
    });

    it('aims for fewer ticks on a short plot, so their labels keep clear of one another', () => {
      host().height.set(80);
      render();

      expect(texts('.wr-boxplot-chart__y-tick')).toEqual(['40', '20', '0']);
    });

    it('centres a single value with a step either side', () => {
      host().groups.set([{ label: 'Flat', values: [120, 120, 120] }]);
      render();

      expect(texts('.wr-boxplot-chart__y-tick')).toEqual(['140', '120', '100']);
      expect(placed(groups()[0]).median).toBe(50);
    });

    it('drops the gridlines and the tick labels with `showGrid` off, and keeps the group names', () => {
      host().showGrid.set(false);
      render();

      expect(root().querySelector('.wr-boxplot-chart__grid-line')).toBeNull();
      expect(root().querySelector('.wr-boxplot-chart__y-axis')).toBeNull();
      expect(texts('.wr-boxplot-chart__x-label')).toEqual(['North', 'South']);
    });

    it('writes the ticks through `valueFormat`', () => {
      host().valueFormat.set(value => `${value} ms`);
      render();

      expect(texts('.wr-boxplot-chart__y-tick')).toEqual(['40 ms', '30 ms', '20 ms', '10 ms', '0 ms']);
    });

    it('draws an axis name only when one is given', () => {
      expect(root().querySelector('.wr-boxplot-chart__x-title')).toBeNull();
      expect(root().querySelector('.wr-boxplot-chart__y-title')).toBeNull();

      host().xLabel.set('Region');
      host().yLabel.set('Response time, ms');
      render();

      expect(texts('.wr-boxplot-chart__x-title')).toEqual(['Region']);
      expect(texts('.wr-boxplot-chart__y-title')).toEqual(['Response time, ms']);
    });

    it('hides the tick labels, which the plot name and the data table speak for', () => {
      expect(root().querySelector('.wr-boxplot-chart__y-axis')!.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('accessibility', () => {
    it('is one named image, with no tab stop', () => {
      expect(plot().getAttribute('role')).toBe('img');
      expect(plot().getAttribute('aria-label')).toBe('Box plot');
      expect(root().querySelectorAll('[tabindex], button, a[href]')).toHaveLength(0);
      expect(root().querySelector('.wr-boxplot-chart__drawing')!.getAttribute('aria-hidden')).toBe('true');

      host().ariaLabel.set('Response time by region');
      render();
      expect(plot().getAttribute('aria-label')).toBe('Response time by region');
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

    beforeEach(() => {
      host().dataTable.set(true);
      render();
    });

    it('renders none unless asked', () => {
      host().dataTable.set(false);
      render();

      expect(root().querySelector('.wr-chart-table')).toBeNull();
    });

    it('tabulates every group beside the image, never inside it, its five numbers ascending', () => {
      expect(table()!.closest('[role="img"]')).toBeNull();
      expect(table()!.caption!.textContent.trim()).toBe('Box plot');
      expect(texts('.wr-chart-table thead th[scope="col"]')).toEqual([
        'Group',
        'Lower whisker',
        'Q1',
        'Median',
        'Q3',
        'Upper whisker',
        'Outliers',
      ]);
      expect(rows()).toEqual([
        ['North', '1', '3.5', '6', '8.5', '10', '30'],
        ['South', '4', '8', '12', '16', '20', ''],
      ]);
    });

    it('adds the outliers column only once a group has an outlier, and lists them in the locale', () => {
      host().groups.set([GROUPS[1]]);
      render();
      expect(texts('.wr-chart-table thead th[scope="col"]')).not.toContain('Outliers');

      host().groups.set([
        { label: 'Spread', stats: { min: 4, q1: 8, median: 12, q3: 16, max: 20, outliers: [40, 1] } },
      ]);
      render();
      expect(rows()).toEqual([['Spread', '4', '8', '12', '16', '20', '1, 40']]);
    });

    it('gives a group with nothing to draw a row of empty cells', () => {
      host().groups.set([{ label: 'Nothing' }, GROUPS[1]]);
      render();

      expect(rows()).toEqual([
        ['Nothing', '', '', '', '', ''],
        ['South', '4', '8', '12', '16', '20'],
      ]);
    });

    it('heads the group column with `xLabel`, and writes the numbers through `valueFormat`', () => {
      host().xLabel.set('Region');
      host().valueFormat.set(value => `${value} ms`);
      render();

      expect(texts('.wr-chart-table thead th[scope="col"]')[0]).toBe('Region');
      expect(rows()[0]).toEqual(['North', '1 ms', '3.5 ms', '6 ms', '8.5 ms', '10 ms', '30 ms']);
    });
  });

  describe('tooltip', () => {
    const chip = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-chart-tooltip');
    const chipTexts = (selector: string): string[] =>
      [...(chip()?.querySelectorAll(selector) ?? [])].map(element => element.textContent.trim());
    const hover = (group: HTMLElement): void => {
      group.dispatchEvent(new MouseEvent('mouseenter'));
      render();
    };

    it("reads the hovered group's five numbers top to bottom, then its outliers' values", () => {
      hover(groups()[0]);

      expect(chipTexts('.wr-chart-tooltip__label')).toEqual(['North']);
      expect(chipTexts('.wr-chart-tooltip__row-label')).toEqual([
        'Upper whisker',
        'Q3',
        'Median',
        'Q1',
        'Lower whisker',
        'Outliers',
      ]);
      // The outliers row lists VALUES, as the data table's column of the same name does:
      // North's one outlier is 30, which a count would have written as 1.
      expect(chipTexts('.wr-chart-tooltip__row-value')).toEqual(['10', '8.5', '6', '3.5', '1', '30']);
      expect(chip()!.querySelector<HTMLElement>('.wr-chart-tooltip__swatch')!.style.background).toBe(chartColor(0));
      expect(groups()[0].classList).toContain('wr-boxplot-chart__group--active');
    });

    it('drops the outliers row for a group with none, and writes the numbers through `valueFormat`', () => {
      host().valueFormat.set(value => `${value} ms`);
      render();
      hover(groups()[1]);

      expect(chipTexts('.wr-chart-tooltip__row-label')).not.toContain('Outliers');
      expect(chipTexts('.wr-chart-tooltip__row-value')).toEqual(['20 ms', '16 ms', '12 ms', '8 ms', '4 ms']);
    });

    it('writes out the lowest three outliers a row each under one label, and counts the rest', () => {
      host().valueFormat.set(value => `${value} ms`);
      host().groups.set([
        { label: 'Three', stats: { min: 10, q1: 20, median: 25, q3: 30, max: 40, outliers: [60, 1, 2] } },
        { label: 'Five', stats: { min: 10, q1: 20, median: 25, q3: 30, max: 40, outliers: [70, 1, 2, 60, 3] } },
      ]);
      render();
      // Past the five numbers: one row per value, so a long figure never shares a line.
      const outlierRows = (): string[][] => {
        const labels = chipTexts('.wr-chart-tooltip__row-label').slice(5);
        return chipTexts('.wr-chart-tooltip__row-value')
          .slice(5)
          .map((value, i) => [labels[i], value]);
      };

      hover(groups()[0]);
      expect(outlierRows()).toEqual([
        ['Outliers', '1 ms'],
        ['', '2 ms'],
        ['', '60 ms'],
      ]);

      hover(groups()[1]);
      expect(outlierRows()).toEqual([
        ['Outliers', '1 ms'],
        ['', '2 ms'],
        ['', '3 ms'],
        ['', '+2 more'],
      ]);
    });

    it('keeps one chip for the chart as the pointer crosses the groups', () => {
      hover(groups()[0]);
      hover(groups()[1]);

      expect(document.querySelectorAll('.wr-chart-tooltip')).toHaveLength(1);
      expect(chipTexts('.wr-chart-tooltip__label')).toEqual(['South']);
      expect(groups().map(group => group.classList.contains('wr-boxplot-chart__group--active'))).toEqual([false, true]);
    });

    it('opens on nothing over a group with nothing to draw', () => {
      host().groups.set([{ label: 'Nothing' }]);
      render();
      hover(groups()[0]);

      expect(chip()).toBeNull();
      expect(groups()[0].classList).not.toContain('wr-boxplot-chart__group--active');
    });

    it('shows nothing with `tooltip` off', () => {
      host().tooltip.set(false);
      render();
      hover(groups()[0]);

      expect(chip()).toBeNull();
      expect(groups()[0].classList).not.toContain('wr-boxplot-chart__group--active');
    });
  });
});

/**
 * Where the chip points. jsdom lays nothing out, so the hovered group's extent — the span
 * from its outlier at the top to its lower whisker — is given a box, and the case reads
 * the box the CDK lays the pane out in, whose bottom edge is the anchor's top.
 */
describe('WrBoxplotChart tooltip anchor', () => {
  const doc = document.documentElement;
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    Object.defineProperty(doc, 'clientWidth', { configurable: true, value: 1024 });
    Object.defineProperty(doc, 'clientHeight', { configurable: true, value: 768 });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      if (this.classList.contains('wr-boxplot-chart__extent')) return new DOMRect(200, 300, 0, 180);
      return this.classList.contains('cdk-overlay-pane') ? new DOMRect(0, 0, 120, 140) : new DOMRect();
    });
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
    Reflect.deleteProperty(doc, 'clientWidth');
    Reflect.deleteProperty(doc, 'clientHeight');
  });

  it('points at the top of everything the group draws, centred on it', () => {
    const group = (fixture.nativeElement as HTMLElement).querySelector('.wr-boxplot-chart__group')!;
    group.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();

    const style = document.querySelector<HTMLElement>('.wr-tooltip-overlay')!.parentElement!.style;
    expect(768 - Number.parseFloat(style.bottom)).toBeCloseTo(300, 3);
    expect(Number.parseFloat(style.left) + Number.parseFloat(style.width) / 2).toBeCloseTo(200, 3);
  });

  it('spans the outliers as well as the whiskers', () => {
    const extent = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-boxplot-chart__extent')!;
    // The outlier at 30 is the topmost mark, 25% down; the lower whisker ends 97.5% down.
    expect([
      extent.style.getPropertyValue('--wr-boxplot-chart-top'),
      extent.style.getPropertyValue('--wr-boxplot-chart-bottom'),
    ]).toEqual(['25', '97.5']);
  });
});

describe('WrBoxplotChart on the server', () => {
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
    expect(root.querySelectorAll('.wr-boxplot-chart__box')).toHaveLength(2);
    expect(root.querySelectorAll('.wr-boxplot-chart__y-tick')).toHaveLength(5);
    expect(root.querySelectorAll('.wr-chart-table tbody tr')).toHaveLength(2);
    expect(measure).not.toHaveBeenCalled();
    fixture.destroy();
    measure.mockRestore();
  });
});

@Component({
  imports: [WrBoxplotChart],
  template: `<wr-boxplot-chart dataTable [groups]="groups" />`,
})
class LocaleHost {
  readonly groups: readonly WrBoxplotGroup[] = [
    {
      label: 'Big',
      stats: { min: 0.0004, q1: 1234.5, median: 2000, q3: 3000.25, max: 4000, outliers: [9000, 12000.5] },
    },
  ];
}

describe('WrBoxplotChart number format', () => {
  afterEach(() => TestBed.resetTestingModule());

  const cells = (locale?: string): string[] => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: locale ? [{ provide: LOCALE_ID, useValue: locale }] : [] });
    const fixture = TestBed.createComponent(LocaleHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    return [...root.querySelectorAll('.wr-chart-table tbody td')].map(cell => cell.textContent.trim());
  };

  it('writes the exact figures in the table, a tiny one not as zero', () => {
    expect(cells()).toEqual(['0.0004', '1,234.5', '2,000', '3,000.25', '4,000', '9,000, 12,000.5']);
  });

  it("follows LOCALE_ID's own convention, for the numbers and for the list", () => {
    expect(cells('de')).toEqual(['0,0004', '1.234,5', '2.000', '3.000,25', '4.000', '9.000 und 12.000,5']);
  });
});
