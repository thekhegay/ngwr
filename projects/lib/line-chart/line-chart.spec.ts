import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { WrLineSeries } from './interfaces';
import { WrLineChart } from './line-chart';

const SERIES: readonly WrLineSeries[] = [
  { label: 'Visits', data: [10, 20, 30] },
  { label: 'Signups', data: [1, 2, 3], color: '#abcdef' },
];

@Component({
  imports: [WrLineChart],
  template: `
    <wr-line-chart [series]="series()" [xLabels]="xLabels()" [showLegend]="showLegend()" [showGrid]="showGrid()" />
  `,
})
class Host {
  readonly series = signal<readonly WrLineSeries[]>(SERIES);
  readonly xLabels = signal<readonly string[]>(['Mon', 'Tue', 'Wed']);
  readonly showLegend = signal(true);
  readonly showGrid = signal(true);
}

/**
 * The chart is a fixed 600×300 viewBox with a known padding, so every coordinate is exact
 * and no layout is needed to check it. What the legend shows is only the series NAMES —
 * unlike the donut, the numbers are not in text anywhere — so the plot's own name is the
 * whole of what a screen reader gets.
 */
describe('WrLineChart', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const svg = (): SVGSVGElement => root().querySelector<SVGSVGElement>('svg')!;
  const lines = (): SVGPathElement[] => [...root().querySelectorAll<SVGPathElement>('path.wr-line-chart__line')];
  const legendLabels = (): string[] =>
    [...root().querySelectorAll('.wr-line-chart__legend-item')].map(el => el.textContent.trim());
  const allPaths = (): string[] => [...root().querySelectorAll('path')].map(el => el.getAttribute('d') ?? '');

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('draws one line per series', () => {
    expect(lines().length).toBe(2);
    for (const line of lines()) expect(line.getAttribute('d')).not.toContain('NaN');
  });

  it('names itself, because the numbers are nowhere in text', () => {
    // The legend carries labels only, so without a name on the plot the chart is nothing
    // at all to a screen reader.
    const plot = root().querySelector<HTMLElement>('.wr-line-chart__plot')!;
    expect(plot.getAttribute('role')).toBe('img');
    expect(plot.getAttribute('aria-label')).toBe('Line chart');
  });

  it('uses the given colour and falls back through the palette', () => {
    expect(lines()[0].getAttribute('stroke')).toBe('var(--wr-color-primary)');
    expect(lines()[1].getAttribute('stroke')).toBe('#abcdef');
  });

  it('lists the series in the legend, and drops the list when asked', () => {
    expect(legendLabels()).toEqual(['Visits', 'Signups']);

    fixture.componentInstance.showLegend.set(false);
    fixture.detectChanges();
    expect(root().querySelector('.wr-line-chart__legend')).toBeNull();
  });

  it('spans the plot from the left padding to the right edge', () => {
    // 600 wide with 36 left and 16 right padding: the first point sits at 36 and the last
    // at 584, whatever the values are.
    const d = lines()[0].getAttribute('d')!;
    expect(d.startsWith('M 36.00 ')).toBe(true);
    expect(d).toContain('L 584.00 ');
  });

  it('draws nothing for an empty series list', () => {
    fixture.componentInstance.series.set([]);
    fixture.componentInstance.xLabels.set([]);
    fixture.detectChanges();

    expect(lines()).toEqual([]);
    expect(root().querySelector('.wr-line-chart__legend')).toBeNull();
  });

  it('centres a flat series instead of dividing by a zero span', () => {
    fixture.componentInstance.series.set([{ label: 'Flat', data: [5, 5, 5] }]);
    fixture.detectChanges();

    const d = lines()[0].getAttribute('d')!;
    expect(d).not.toContain('NaN');
    expect(d).not.toContain('Infinity');
  });

  it('keeps one non-finite datum from taking out every line', () => {
    // `Math.min(...data)` and `Math.max(...data)` are both NaN as soon as one datum is, so
    // every coordinate in EVERY series became `NaN` — invalid path geometry, and the whole
    // chart disappeared rather than the one bad point.
    fixture.componentInstance.series.set([
      { label: 'Good', data: [10, 20, 30] },
      { label: 'Bad', data: [1, Number.NaN, 3] },
    ]);
    fixture.detectChanges();

    for (const d of allPaths()) {
      expect(d).not.toContain('NaN');
      expect(d).not.toContain('Infinity');
    }
    // And the bad datum must not shift the SCALE either. The y axis is shared across
    // series, so the comparison is against the same two series with only the NaN gone —
    // dropping the whole series would legitimately rescale the chart.
    const withBad = lines()[0].getAttribute('d');
    fixture.componentInstance.series.set([
      { label: 'Good', data: [10, 20, 30] },
      { label: 'Bad', data: [1, 3] },
    ]);
    fixture.detectChanges();
    expect(lines()[0].getAttribute('d')).toBe(withBad);
  });

  it('labels the y axis with five ticks and drops the grid on request', () => {
    expect(root().querySelectorAll('.wr-line-chart__grid-line').length).toBe(5);

    fixture.componentInstance.showGrid.set(false);
    fixture.detectChanges();
    expect(root().querySelectorAll('.wr-line-chart__grid-line').length).toBe(0);
  });

  it('keeps the svg stretchable', () => {
    expect(svg().getAttribute('preserveAspectRatio')).toBe('none');
    expect(svg().getAttribute('viewBox')).toBe('0 0 600 300');
  });
});

describe('WrLineChart under a localized catalog', () => {
  it('takes its name from the catalog', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const plot = (fixture.nativeElement as HTMLElement).querySelector('.wr-line-chart__plot')!;
    expect(plot.getAttribute('aria-label')).toBe('Линейный график');

    fixture.destroy();
  });
});
