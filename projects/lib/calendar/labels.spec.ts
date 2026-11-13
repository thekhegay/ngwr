import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { WrFormField } from 'ngwr/form';
import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { afterEach, describe, expect, it } from 'vitest';

import { WrCalendar } from './calendar';

type Labels = Partial<
  Record<
    | 'prevMonthLabel'
    | 'nextMonthLabel'
    | 'prevYearLabel'
    | 'nextYearLabel'
    | 'monthListLabel'
    | 'prevYearsLabel'
    | 'nextYearsLabel'
    | 'yearListLabel',
    string
  >
>;

const CUSTOM: Labels = {
  prevMonthLabel: 'x-prevMonthLabel',
  nextMonthLabel: 'x-nextMonthLabel',
  prevYearLabel: 'x-prevYearLabel',
  nextYearLabel: 'x-nextYearLabel',
  monthListLabel: 'x-monthListLabel',
  prevYearsLabel: 'x-prevYearsLabel',
  nextYearsLabel: 'x-nextYearsLabel',
  yearListLabel: 'x-yearListLabel',
};

@Component({
  imports: [WrCalendar, WrFormField],
  template: `
    <wr-calendar
      data-k="alone"
      [ariaLabel]="name()"
      [prevMonthLabel]="labels().prevMonthLabel ?? null"
      [nextMonthLabel]="labels().nextMonthLabel ?? null"
      [prevYearLabel]="labels().prevYearLabel ?? null"
      [nextYearLabel]="labels().nextYearLabel ?? null"
      [monthListLabel]="labels().monthListLabel ?? null"
      [prevYearsLabel]="labels().prevYearsLabel ?? null"
      [nextYearsLabel]="labels().nextYearsLabel ?? null"
      [yearListLabel]="labels().yearListLabel ?? null"
    />
    <wr-form-field label="Due date">
      <wr-calendar data-k="field" [ariaLabel]="name()" />
    </wr-form-field>
  `,
})
class Host {
  readonly labels = signal<Labels>({});
  readonly name = signal<string | null>(null);
}

describe('WrCalendar per-instance labels', () => {
  let fixture: ComponentFixture<Host>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const mount = async (russian = false): Promise<void> => {
    TestBed.configureTestingModule({
      providers: russian
        ? [provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }), provideWrI18nStaticLoader({ ru: wrRu })]
        : [],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const set = async (labels: Labels): Promise<void> => {
    fixture.componentInstance.labels.set(labels);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  afterEach(() => TestBed.resetTestingModule());

  const alone = (): HTMLElement => root().querySelector<HTMLElement>('[data-k="alone"]')!;
  const arrow = (side: 'prev' | 'next'): string =>
    alone().querySelector(`.wr-calendar__nav--${side}`)!.getAttribute('aria-label') ?? '';
  const list = (): string => alone().querySelector('[role="listbox"]')!.getAttribute('aria-label') ?? '';
  const zoomOut = async (): Promise<void> => {
    alone().querySelector<HTMLElement>('.wr-calendar__label')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
  };

  /** Walks day, month, year: each view names the arrows its own way. */
  const read = async (): Promise<Labels> => {
    const day = { prevMonthLabel: arrow('prev'), nextMonthLabel: arrow('next') };
    await zoomOut();
    const month = { prevYearLabel: arrow('prev'), nextYearLabel: arrow('next'), monthListLabel: list() };
    await zoomOut();
    const year = { prevYearsLabel: arrow('prev'), nextYearsLabel: arrow('next'), yearListLabel: list() };
    // Picking a year, then a month, walks back to the day view for the next read.
    for (let step = 0; step < 2; step++) {
      alone().querySelector<HTMLElement>('.wr-calendar__chip:not([disabled])')!.click();
      fixture.detectChanges();
      await fixture.whenStable();
    }
    return { ...day, ...month, ...year };
  };

  it('prints each input in place of its built-in string', async () => {
    await mount();
    await set(CUSTOM);

    expect(await read()).toEqual({
      prevMonthLabel: 'x-prevMonthLabel',
      nextMonthLabel: 'x-nextMonthLabel',
      prevYearLabel: 'x-prevYearLabel',
      nextYearLabel: 'x-nextYearLabel',
      monthListLabel: 'x-monthListLabel',
      prevYearsLabel: 'x-prevYearsLabel',
      nextYearsLabel: 'x-nextYearsLabel',
      yearListLabel: 'x-yearListLabel',
    });
  });

  it('falls back to the built-in English with every input null', async () => {
    await mount();

    expect(await read()).toEqual({
      prevMonthLabel: 'Previous month',
      nextMonthLabel: 'Next month',
      prevYearLabel: 'Previous year',
      nextYearLabel: 'Next year',
      monthListLabel: 'Months',
      prevYearsLabel: 'Previous 12 years',
      nextYearsLabel: 'Next 12 years',
      yearListLabel: 'Years',
    });
  });

  it('keeps a registered catalog under a null input, and an input over the catalog', async () => {
    await mount(true);

    expect(await read()).toEqual({
      prevMonthLabel: 'Предыдущий месяц',
      nextMonthLabel: 'Следующий месяц',
      prevYearLabel: 'Предыдущий год',
      nextYearLabel: 'Следующий год',
      monthListLabel: 'Месяцы',
      prevYearsLabel: 'Предыдущие 12 лет',
      nextYearsLabel: 'Следующие 12 лет',
      yearListLabel: 'Годы',
    });

    await set({ prevMonthLabel: 'x-prevMonthLabel' });

    expect(await read()).toEqual({
      prevMonthLabel: 'x-prevMonthLabel',
      nextMonthLabel: 'Следующий месяц',
      prevYearLabel: 'Предыдущий год',
      nextYearLabel: 'Следующий год',
      monthListLabel: 'Месяцы',
      prevYearsLabel: 'Предыдущие 12 лет',
      nextYearsLabel: 'Следующие 12 лет',
      yearListLabel: 'Годы',
    });
  });

  it('names a standalone day grid from ariaLabel, and leaves it unnamed without one', async () => {
    await mount();
    const grid = (): HTMLElement => alone().querySelector<HTMLElement>('[role="grid"]')!;

    expect(grid().hasAttribute('aria-label')).toBe(false);

    fixture.componentInstance.name.set('Delivery day');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(grid().getAttribute('aria-label')).toBe('Delivery day');
  });

  it('lets the field label keep naming the grid inside a form field', async () => {
    await mount();
    fixture.componentInstance.name.set('Delivery day');
    fixture.detectChanges();
    await fixture.whenStable();

    const grid = root().querySelector<HTMLElement>('[data-k="field"] [role="grid"]')!;
    const label = root().querySelector('wr-form-field label')!;

    expect(grid.getAttribute('aria-labelledby')).toBe(label.id);
    expect(grid.hasAttribute('aria-label')).toBe(false);
  });
});
