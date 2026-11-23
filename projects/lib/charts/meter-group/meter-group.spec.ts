import { Component, LOCALE_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrMeterGroup } from './meter-group';
import type { WrMeterSegment } from './types';

const SEGMENTS: readonly WrMeterSegment[] = [
  { label: 'Used', value: 60 },
  { label: 'Reserved', value: 20, color: '#abcdef' },
];

@Component({
  imports: [WrMeterGroup],
  template: `
    <wr-meter-group
      [segments]="segments()"
      [max]="max()"
      [showLegend]="showLegend()"
      [showValues]="showValues()"
      [ariaLabel]="ariaLabel()"
    />
  `,
})
class Host {
  readonly segments = signal<readonly WrMeterSegment[]>(SEGMENTS);
  readonly max = signal(0);
  readonly showLegend = signal(true);
  readonly showValues = signal(true);
  readonly ariaLabel = signal<string | null>(null);
}

/**
 * Segment widths are inline percentages, so the whole stack is checkable in
 * jsdom. The bar is one `progressbar`, not one per segment — so the numbers it
 * announces have to describe the STACK, and the announced value has to stay
 * inside the range it is announced against.
 */
describe('WrMeterGroup', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const bar = (): HTMLElement => root().querySelector<HTMLElement>('.wr-meter-group__bar')!;
  const slices = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('.wr-meter-group__slice')];
  /** Each band's share of the bar as a percentage: the component writes it as a share from 0 to 1. */
  const widths = (): string[] =>
    slices().map(
      slice => `${Math.round(Number(slice.style.getPropertyValue('--wr-meter-group-slice-size')) * 1e5) / 1e3}%`
    );
  const legendLabels = (): string[] =>
    [...root().querySelectorAll('.wr-meter-group__legend-label')].map(el => el.textContent.trim());
  const legendValues = (): string[] =>
    [...root().querySelectorAll('.wr-meter-group__legend-value')].map(el => el.textContent.trim());

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('is announced as a named progressbar over the summed range', () => {
    expect(bar().getAttribute('role')).toBe('progressbar');
    expect(bar().getAttribute('aria-label')).toBe('Meter');
    expect(bar().getAttribute('aria-valuemin')).toBe('0');
    expect(bar().getAttribute('aria-valuemax')).toBe('80');
    expect(bar().getAttribute('aria-valuenow')).toBe('80');
  });

  it('splits the bar in proportion to the sum when there is no max', () => {
    expect(widths()).toEqual(['75%', '25%']);
  });

  it('leaves the remainder empty when a max is given', () => {
    fixture.componentInstance.max.set(200);
    fixture.detectChanges();

    expect(widths()).toEqual(['30%', '10%']);
    expect(bar().getAttribute('aria-valuemax')).toBe('200');
    expect(bar().getAttribute('aria-valuenow')).toBe('80');
  });

  it('never announces more than the maximum it announced', () => {
    // `aria-valuenow` outside `aria-valuemin`..`aria-valuemax` is not a value a
    // screen reader can turn into a percentage, and segments overflowing an
    // explicit max is exactly the case a meter is used to show.
    fixture.componentInstance.max.set(50);
    fixture.detectChanges();

    expect(bar().getAttribute('aria-valuenow')).toBe('50');
    expect(bar().getAttribute('aria-valuemax')).toBe('50');
  });

  it('keeps one non-finite segment from poisoning the whole stack', () => {
    // The sum is NaN as soon as one value is, so the total fell back to 1, every
    // other slice was asked for `value * 100`% of the bar, and the announced
    // value was the literal text NaN.
    fixture.componentInstance.segments.set([
      { label: 'Used', value: 60 },
      { label: 'Broken', value: Number.NaN },
    ]);
    fixture.detectChanges();

    expect(widths()).toEqual(['100%', '0%']);
    expect(bar().getAttribute('aria-valuenow')).toBe('60');
    expect(root().textContent).not.toContain('NaN');
  });

  it('gives a negative segment no width but keeps its number in the legend', () => {
    fixture.componentInstance.segments.set([
      { label: 'Used', value: 60 },
      { label: 'Refunded', value: -10 },
    ]);
    fixture.detectChanges();

    expect(widths()).toEqual(['100%', '0%']);
    expect(legendValues()).toEqual(['60', '-10']);
  });

  it('renders an empty bar rather than dividing by zero', () => {
    fixture.componentInstance.segments.set([{ label: 'Nothing', value: 0 }]);
    fixture.detectChanges();

    expect(widths()).toEqual(['0%']);
    expect(bar().getAttribute('aria-valuemax')).toBe('1');
    expect(bar().getAttribute('aria-valuenow')).toBe('0');
  });

  it('lists the segments in the legend and can drop the list or the numbers', () => {
    expect(legendLabels()).toEqual(['Used', 'Reserved']);
    expect(legendValues()).toEqual(['60', '20']);

    fixture.componentInstance.showValues.set(false);
    fixture.detectChanges();
    expect(legendValues()).toEqual([]);
    expect(legendLabels()).toEqual(['Used', 'Reserved']);

    fixture.componentInstance.showLegend.set(false);
    fixture.detectChanges();
    expect(root().querySelector('.wr-meter-group__legend')).toBeNull();
  });

  it('drops the legend when there is nothing to list', () => {
    fixture.componentInstance.segments.set([]);
    fixture.detectChanges();

    expect(root().querySelector('.wr-meter-group__legend')).toBeNull();
    expect(slices()).toEqual([]);
  });

  it('takes the colour from the segment, then cycles the palette', () => {
    expect(slices()[1].style.background).toBe('rgb(171, 205, 239)');

    fixture.componentInstance.segments.set(
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'].map(label => ({ label, value: 1 }))
    );
    fixture.detectChanges();

    // Nine segments over the chart palette's eight entries: the ninth starts the cycle
    // again rather than rendering with no colour at all.
    expect(slices()[8].style.background).toBe(slices()[0].style.background);
    expect(slices()[8].style.background).toBeTruthy();
  });

  it('takes a name from the consumer over the catalog', () => {
    fixture.componentInstance.ariaLabel.set('Disk usage');
    fixture.detectChanges();

    expect(bar().getAttribute('aria-label')).toBe('Disk usage');
  });
});

describe('WrMeterGroup under a localized catalog', () => {
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

    const bar = (fixture.nativeElement as HTMLElement).querySelector('.wr-meter-group__bar')!;
    expect(bar.getAttribute('aria-label')).toBeTruthy();
    expect(bar.getAttribute('aria-label')).not.toBe('Meter');

    fixture.destroy();
  });
});

@Component({
  imports: [WrMeterGroup],
  template: `<wr-meter-group [segments]="segments" [showValues]="false" [tooltip]="tooltip()" />`,
})
class TooltipHost {
  readonly segments = SEGMENTS;
  readonly tooltip = signal(true);
}

describe('WrMeterGroup tooltip', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TooltipHost>>;

  const slices = (): HTMLElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.wr-meter-group__slice'),
  ];
  const chip = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-chart-tooltip');
  const part = (name: string): HTMLElement | null =>
    chip()?.querySelector<HTMLElement>(`.wr-chart-tooltip__${name}`) ?? null;

  const hover = (el: HTMLElement): void => {
    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(TooltipHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('shows the label, value and colour of the band — even with the legend values off', () => {
    hover(slices()[1]);

    expect(part('label')!.textContent.trim()).toBe('Reserved');
    expect(part('value')!.textContent.trim()).toBe('20');
    expect(part('swatch')!.style.background).toBe('rgb(171, 205, 239)');
  });

  it('writes no `title` while it shows its own, so the browser does not open a second copy', () => {
    expect(slices().map(slice => slice.getAttribute('title'))).toEqual([null, null]);
    // What the harness reads a band's label from, whichever way `tooltip` is set.
    expect(slices().map(slice => slice.getAttribute('data-label'))).toEqual(['Used', 'Reserved']);
  });

  it('goes back to the `title` with `tooltip` off', () => {
    fixture.componentInstance.tooltip.set(false);
    fixture.detectChanges();

    hover(slices()[0]);

    expect(chip()).toBeNull();
    expect(slices().map(slice => slice.getAttribute('title'))).toEqual(['Used', 'Reserved']);
  });
});

@Component({
  imports: [WrMeterGroup],
  template: `<wr-meter-group [segments]="segments" [valueFormat]="valueFormat()" />`,
})
class FormatHost {
  readonly segments: readonly WrMeterSegment[] = [
    { label: 'Used', value: 1234.5 },
    { label: 'Free', value: 765.5 },
  ];
  readonly valueFormat = signal<((value: number) => string) | null>(null);
}

/** How a number is written: `Intl` in Angular's `LOCALE_ID` unless `valueFormat` says otherwise. */
describe('WrMeterGroup number format', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<FormatHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const bar = (): HTMLElement => root().querySelector<HTMLElement>('[role="progressbar"]')!;
  const legendValues = (): string[] =>
    [...root().querySelectorAll('.wr-meter-group__legend-value')].map(el => el.textContent.trim());
  const tooltipValue = (index: number): string => {
    root()
      .querySelectorAll('.wr-meter-group__slice')
      [index].dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    fixture.detectChanges();
    return document.querySelector('.wr-chart-tooltip__value')!.textContent.trim();
  };
  const create = (locale?: string): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: locale ? [{ provide: LOCALE_ID, useValue: locale }] : [] });
    fixture = TestBed.createComponent(FormatHost);
    fixture.detectChanges();
  };

  afterEach(() => fixture.destroy());

  it('groups the figures in English by default', () => {
    create();
    expect(legendValues()).toEqual(['1,234.5', '765.5']);
  });

  it("follows LOCALE_ID's own convention by default", () => {
    create('de');
    expect(legendValues()).toEqual(['1.234,5', '765,5']);
    expect(tooltipValue(0)).toBe('1.234,5');
    // The bar's own value stays a number; what it announces is the total as the legend
    // writes its figures.
    expect(bar().getAttribute('aria-valuenow')).toBe('2000');
    expect(bar().getAttribute('aria-valuetext')).toBe('2.000');
  });

  it('writes every number through `valueFormat` when one is given, over the locale', () => {
    create('de');
    fixture.componentInstance.valueFormat.set(value => `${value} GB`);
    fixture.detectChanges();

    expect(legendValues()).toEqual(['1234.5 GB', '765.5 GB']);
    expect(tooltipValue(1)).toBe('765.5 GB');
    // A screen reader hears the unit the legend prints rather than a bare percentage —
    // the gauge routes the same input into `aria-valuetext` the same way.
    expect(bar().getAttribute('aria-valuetext')).toBe('2000 GB');
    expect(bar().getAttribute('aria-valuenow')).toBe('2000');
  });
});

@Component({
  imports: [WrMeterGroup],
  template: `
    <wr-meter-group
      [segments]="segments()"
      [max]="max()"
      [dataTable]="dataTable()"
      [showLegend]="showLegend()"
      [showValues]="showValues()"
      [ariaLabel]="ariaLabel()"
      [valueFormat]="valueFormat()"
      [loading]="loading()"
      [(hiddenSegments)]="hidden"
    />
  `,
})
class TableHost {
  readonly segments = signal<readonly WrMeterSegment[]>(SEGMENTS);
  readonly max = signal(0);
  readonly dataTable = signal(true);
  readonly showLegend = signal(true);
  readonly showValues = signal(true);
  readonly ariaLabel = signal<string | null>(null);
  readonly valueFormat = signal<((value: number) => string) | null>(null);
  readonly loading = signal(false);
  readonly hidden = signal<readonly number[]>([]);
}

/**
 * The figures as a table beside the bar: the `progressbar` announces the total alone, and
 * the legend, the only other place a segment's value is in text, is optional.
 */
describe('WrMeterGroup data table', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TableHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const table = (): HTMLElement | null => root().querySelector<HTMLElement>('.wr-chart-table');
  const text = (selector: string): string[] => [...root().querySelectorAll(selector)].map(el => el.textContent.trim());
  const rows = (): string[][] =>
    [...root().querySelectorAll('.wr-chart-table tbody tr')].map(row =>
      [...row.querySelectorAll('th, td')].map(cell => cell.textContent.trim())
    );
  const create = (providers: Parameters<typeof TestBed.configureTestingModule>[0] = {}): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule(providers);
    fixture = TestBed.createComponent(TableHost);
    fixture.detectChanges();
  };
  const set = (change: (host: TableHost) => void): void => {
    change(fixture.componentInstance);
    fixture.detectChanges();
  };

  afterEach(() => fixture.destroy());

  it('renders a row per segment, with its value and its share of the sum, beside the bar', () => {
    create();
    expect(text('.wr-chart-table caption')).toEqual(['Meter']);
    expect(text('.wr-chart-table thead th[scope="col"]')).toEqual(['Value', 'Share']);
    expect(rows()).toEqual([
      ['Used', '60', '75%'],
      ['Reserved', '20', '25%'],
    ]);
    expect(text('.wr-chart-table tbody th[scope="row"]')).toEqual(['Used', 'Reserved']);
    // Beside the `progressbar`, never inside it: the role makes its children presentational.
    expect(table()!.closest('[role="progressbar"]')).toBeNull();
    expect(table()!.parentElement).toBe(root().querySelector('wr-meter-group'));
  });

  it('renders none while `dataTable` is off, and leaves the rest as it was', () => {
    create();
    set(h => h.dataTable.set(false));
    expect(table()).toBeNull();
    const off = root().querySelector('wr-meter-group')!.innerHTML;
    set(h => h.dataTable.set(true));
    table()!.remove();
    expect(root().querySelector('wr-meter-group')!.innerHTML).toBe(off);
  });

  it('writes each share against `max` when one is given', () => {
    create();
    set(h => h.max.set(200));
    expect(rows()).toEqual([
      ['Used', '60', '30%'],
      ['Reserved', '20', '10%'],
    ]);
  });

  it('carries the figures the legend leaves out: `showLegend` or `showValues` off', () => {
    create();
    set(h => h.showLegend.set(false));
    expect(root().querySelector('.wr-meter-group__legend')).toBeNull();
    expect(rows()).toHaveLength(2);

    set(h => {
      h.showLegend.set(true);
      h.showValues.set(false);
    });
    expect(root().querySelector('.wr-meter-group__legend-value')).toBeNull();
    expect(rows().map(row => row[1])).toEqual(['60', '20']);
  });

  it('follows the data, the name and the hidden segments', () => {
    create();
    set(h => {
      h.segments.set([
        { label: 'A', value: 1 },
        { label: 'B', value: 3 },
      ]);
      h.ariaLabel.set('Disk usage');
    });
    expect(text('.wr-chart-table caption')).toEqual(['Disk usage']);
    expect(rows()).toEqual([
      ['A', '1', '25%'],
      ['B', '3', '75%'],
    ]);

    // A hidden segment has no row, and with no `max` the rest share the whole bar.
    set(h => h.hidden.set([1]));
    expect(rows()).toEqual([['A', '1', '100%']]);
  });

  it('keeps a sliver from reading as 0%, and gives a segment with no band no share', () => {
    create();
    set(h =>
      h.segments.set([
        { label: 'Most', value: 99_960 },
        { label: 'Sliver', value: 40 },
        { label: 'Debt', value: -5 },
      ])
    );
    expect(rows()).toEqual([
      ['Most', '99,960', '100%'],
      ['Sliver', '40', '0.04%'],
      ['Debt', '-5', ''],
    ]);
  });

  it('writes its numbers as the legend does: LOCALE_ID, then `valueFormat` over it', () => {
    create({ providers: [{ provide: LOCALE_ID, useValue: 'de' }] });
    set(h =>
      h.segments.set([
        { label: 'A', value: 1234.5 },
        { label: 'B', value: 3703.5 },
      ])
    );
    const legendValues = (): string[] => text('.wr-meter-group__legend-value');
    expect(rows()).toEqual([
      ['A', '1.234,5', '25 %'],
      ['B', '3.703,5', '75 %'],
    ]);
    expect(rows().map(row => row[1])).toEqual(legendValues());

    set(h => h.valueFormat.set(value => `${value} GB`));
    expect(rows().map(row => row[1])).toEqual(['1234.5 GB', '3703.5 GB']);
    expect(rows().map(row => row[1])).toEqual(legendValues());
  });

  it('gives way with the legend under a state, and with no segment', () => {
    create();
    set(h => h.loading.set(true));
    expect(table()).toBeNull();
    set(h => h.loading.set(false));
    expect(table()).not.toBeNull();
    set(h => h.segments.set([]));
    expect(table()).toBeNull();
  });

  it('heads its columns from the catalog', async () => {
    create({
      providers: [
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(text('.wr-chart-table caption')).toEqual(['Шкала']);
    expect(text('.wr-chart-table thead th[scope="col"]')).toEqual(['Значение', 'Доля']);
  });
});
