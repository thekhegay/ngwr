import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrBarChart } from './bar-chart';
import type { WrBarChartDatum, WrBarChartOrientation, WrBarSeries } from './types';

const DATA: readonly WrBarChartDatum[] = [
  { label: 'Mon', value: 10 },
  { label: 'Tue', value: 20 },
  { label: 'Refund', value: -4 },
];

@Component({
  imports: [WrBarChart],
  template: `
    <wr-bar-chart
      [data]="data()"
      [series]="series()"
      [categories]="categories"
      [orientation]="orientation()"
      [showValues]="showValues()"
      [height]="160"
    />
  `,
})
class Host {
  readonly data = signal<readonly WrBarChartDatum[]>(DATA);
  readonly series = signal<readonly WrBarSeries[]>([]);
  readonly categories = ['North', 'South'];
  readonly orientation = signal<WrBarChartOrientation>('horizontal');
  readonly showValues = signal(true);
}

/**
 * Sideways, the categories sit in a gutter inside the plot and every position along the
 * track is a logical inset, so RTL needs no rule of its own. jsdom lays nothing out, so
 * what is held here is the structure and the numbers the template hands the stylesheet;
 * that each row's name sits level with its bars, and that the bars grow leftwards under
 * RTL, is measured in a browser.
 */
describe('WrBarChart horizontal', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): Host => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const chart = (): HTMLElement => root().querySelector<HTMLElement>('wr-bar-chart')!;
  const plot = (): HTMLElement => root().querySelector<HTMLElement>('.wr-bar-chart__plot')!;
  const all = <T extends Element = HTMLElement>(selector: string, from: ParentNode = root()): T[] => [
    ...from.querySelectorAll<T>(selector),
  ];
  const set = (change: (h: Host) => void): void => {
    change(host());
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  describe('with data', () => {
    it('lays one row per datum along a track, the names in a gutter inside the plot', () => {
      expect(chart().classList).toContain('wr-bar-chart--horizontal');
      expect(chart().classList).not.toContain('wr-bar-chart--series');
      const labels = plot().querySelector('.wr-bar-chart__labels')!;
      expect(labels.getAttribute('aria-hidden')).toBe('true');
      expect(all('.wr-bar-chart__label', labels).map(l => l.textContent.trim())).toEqual(['Mon', 'Tue', 'Refund']);
      // The one label row there is: inside the plot, not under it.
      expect(all('.wr-bar-chart__labels')).toHaveLength(1);
      expect(all('.wr-bar-chart__track .wr-bar-chart__column')).toHaveLength(3);
    });

    it("writes `height` as the plot's floor, so rows that need more room grow it", () => {
      // The rows share it, and each keeps `--wr-bar-chart-row-min-size` at the least,
      // which jsdom cannot lay out; what it can hold is that no fixed height is written
      // for the rows to overflow.
      expect(plot().style.minHeight).toBe('160px');
      expect(plot().style.height).toBe('');

      set(h => h.orientation.set('vertical'));
      expect(plot().style.height).toBe('160px');
      expect(plot().style.minHeight).toBe('');
    });

    it('keeps the single-series names, shares and negative rule', () => {
      const columns = all('.wr-bar-chart__column');
      expect(columns.map(c => [c.getAttribute('role'), c.getAttribute('aria-label')])).toEqual([
        ['img', 'Mon: 10'],
        ['img', 'Tue: 20'],
        ['img', 'Refund: -4'],
      ]);
      // A negative value is still an empty bar with its number printed, as standing up.
      expect(all('.wr-bar-chart__bar').map(b => b.style.flexGrow)).toEqual(['0.5', '1', '0']);
      expect(
        root().querySelector<HTMLElement>('.wr-bar-chart__track')!.style.getPropertyValue('--wr-bar-chart-zero')
      ).toBe('0');
    });

    it('places each value past its bar from the same share, and keeps the room for the longest', () => {
      const values = all('.wr-bar-chart__column > .wr-bar-chart__value');
      expect(values.map(v => [v.textContent.trim(), v.style.getPropertyValue('--wr-bar-chart-at')])).toEqual([
        ['10', '0.5'],
        ['20', '1'],
        ['-4', '0'],
      ]);
      expect(all('.wr-bar-chart__room--max .wr-bar-chart__value').map(v => v.textContent.trim())).toEqual([
        '10',
        '20',
        '-4',
      ]);

      set(h => h.showValues.set(false));
      expect(all('.wr-bar-chart__value')).toEqual([]);
    });

    it('goes back to the vertical markup when the orientation does', () => {
      set(h => h.orientation.set('vertical'));

      expect(chart().classList).not.toContain('wr-bar-chart--horizontal');
      expect(all('.wr-bar-chart__track')).toEqual([]);
      expect(plot().querySelector('.wr-bar-chart__labels')).toBeNull();
      expect(plot().nextElementSibling!.classList).toContain('wr-bar-chart__labels');
    });
  });

  describe('with series', () => {
    beforeEach(() =>
      set(h =>
        h.series.set([
          { label: 'Plan', data: [40, 20] },
          { label: 'Actual', data: [30, -10] },
        ])
      )
    );

    it('draws a row per category, a lane per series, and the names in the gutter', () => {
      expect(chart().classList).toContain('wr-bar-chart--horizontal');
      expect(chart().classList).toContain('wr-bar-chart--series');
      expect(all('.wr-bar-chart__category').map(c => c.getAttribute('aria-label'))).toEqual(['North', 'South']);
      expect(all('.wr-bar-chart__label', plot()).map(l => l.textContent.trim())).toEqual(['North', 'South']);
      expect(all('.wr-bar-chart__labels')).toHaveLength(1);
    });

    it('starts each bar at zero and writes it the same shares as standing up', () => {
      // -10 to 40: zero a fifth of the way along.
      const bars = all('.wr-bar-chart__series-bar').map(b => [
        b.getAttribute('aria-label'),
        b.style.getPropertyValue('--wr-bar-chart-start'),
        b.style.getPropertyValue('--wr-bar-chart-size'),
      ]);
      expect(bars).toEqual([
        ['Plan: 40', '0.2', '0.8'],
        ['Actual: 30', '0.2', '0.6'],
        ['Plan: 20', '0.2', '0.4'],
        ['Actual: -10', '0', '0.2'],
      ]);
    });

    it('keeps a room before the track for the values of the bars under zero', () => {
      expect(all('.wr-bar-chart__room--min .wr-bar-chart__value').map(v => v.textContent.trim())).toEqual(['-10']);
      expect(all('.wr-bar-chart__room--max .wr-bar-chart__value').map(v => v.textContent.trim())).toEqual([
        '40',
        '30',
        '20',
      ]);
    });
  });
});
