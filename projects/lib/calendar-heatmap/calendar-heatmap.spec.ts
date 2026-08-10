import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WR_DATE_LOCALE } from 'ngwr/date-adapter';
import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrCalendarHeatmap } from './calendar-heatmap';
import type { WrHeatmapDatum } from './interfaces';

@Component({
  imports: [WrCalendarHeatmap],
  template: `
    <wr-calendar-heatmap [data]="data()" [endDate]="endDate()" [weeks]="weeks()" [showLabels]="showLabels()" />
  `,
})
class Host {
  readonly data = signal<readonly WrHeatmapDatum[]>([
    { date: '2025-08-11', value: 4 },
    { date: '2025-08-12', value: 8 },
  ]);
  readonly endDate = signal<string | Date | null>('2025-08-16');
  readonly weeks = signal(4);
  readonly showLabels = signal(true);
}

/**
 * The grid is CSS Grid placed by `grid-column` / `grid-row` inline styles, which jsdom does
 * report — so where every cell sits is checkable without layout. `endDate` is pinned in each
 * test because the default is "today", and a spec that drifts with the clock is worse than
 * no spec.
 */
describe('WrCalendarHeatmap', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const grid = (): HTMLElement => root().querySelector<HTMLElement>('.wr-calendar-heatmap__grid')!;
  const cells = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('.wr-calendar-heatmap__cell')];
  const weekdayLabels = (): string[] =>
    [...root().querySelectorAll('.wr-calendar-heatmap__weekday')].map(el => el.textContent.trim());
  const monthLabels = (): string[] =>
    [...root().querySelectorAll('.wr-calendar-heatmap__month')].map(el => el.textContent.trim());
  const cellFor = (iso: string): HTMLElement | undefined =>
    cells().find(cell => cell.getAttribute('title')?.startsWith(iso));

  const mount = (locale = 'en-GB'): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: WR_DATE_LOCALE, useValue: locale }] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  };

  beforeEach(() => mount());
  afterEach(() => fixture.destroy());

  it('lays out one column per week and one row per weekday', () => {
    // Four weeks ending on a Saturday: 28 days, plus whatever the Sunday alignment adds.
    expect(cells().length % 7).toBe(0);
    const rows = new Set(cells().map(cell => cell.style.gridRow));
    expect(rows.size).toBe(7);
  });

  it('places a day in the row its weekday sits on', () => {
    // 11 Aug 2025 is a Monday, and row 1 is Monday when column 0 starts on Sunday.
    expect(cellFor('2025-08-11')!.style.gridRow).toBe('2');
    expect(cellFor('2025-08-10')!.style.gridRow).toBe('1');
  });

  it('sums two entries that fall on the same day', () => {
    fixture.componentInstance.data.set([
      { date: '2025-08-11', value: 3 },
      { date: '2025-08-11', value: 5 },
    ]);
    fixture.detectChanges();

    expect(cellFor('2025-08-11')!.getAttribute('title')).toBe('2025-08-11: 8');
  });

  it('leaves a day with no entry at zero', () => {
    expect(cellFor('2025-08-13')!.getAttribute('title')).toBe('2025-08-13: 0');
  });

  it('announces itself as one picture, with the cells kept quiet', () => {
    // Every cell used to be a bare `<span>` carrying a `title`, which a screen reader on a
    // role-less span does not read — so the grid was several hundred anonymous nodes and no
    // name at all. One name for the picture, and the cells out of the tree.
    expect(grid().getAttribute('role')).toBe('img');
    expect(grid().getAttribute('aria-label')).toBeTruthy();
    expect(cells()[0].getAttribute('aria-hidden')).toBe('true');
  });

  it('names the weekdays in the locale, keeping every other one blank', () => {
    // The blanks are deliberate — a label on all seven rows does not fit — but the three
    // that show were hard-coded English.
    expect(weekdayLabels().length).toBe(7);
    expect(weekdayLabels()[1]).toBe('Mon');
    expect(weekdayLabels()[0]).toBe('');
    expect(weekdayLabels()[2]).toBe('');
  });

  it('names the months in the locale', () => {
    expect(monthLabels()).toContain('Aug');
  });

  it('drops both label rows when asked', () => {
    fixture.componentInstance.showLabels.set(false);
    fixture.detectChanges();

    expect(weekdayLabels()).toEqual([]);
    expect(monthLabels()).toEqual([]);
  });

  it('follows the locale it was given', () => {
    mount('ru-RU');

    // Russian short weekday names are lower-case and abbreviated differently.
    expect(weekdayLabels()[1]).not.toBe('Mon');
    expect(weekdayLabels()[1].length).toBeGreaterThan(0);
    expect(monthLabels().some(label => /[а-яА-Я]/.test(label))).toBe(true);
  });

  it('renders an empty grid rather than nothing when there is no data', () => {
    fixture.componentInstance.data.set([]);
    fixture.detectChanges();

    expect(cells().length).toBeGreaterThan(0);
    for (const cell of cells()) expect(cell.getAttribute('title')).toMatch(/: 0$/);
  });
});

describe('WrCalendarHeatmap under a localized catalog', () => {
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

    const grid = (fixture.nativeElement as HTMLElement).querySelector('.wr-calendar-heatmap__grid')!;
    expect(grid.getAttribute('aria-label')).toBe('Календарная тепловая карта');

    fixture.destroy();
  });
});
