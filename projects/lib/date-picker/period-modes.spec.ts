import { Component, type EnvironmentProviders, type Provider, signal, viewChild } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { provideWr } from 'ngwr';
import { withDates } from 'ngwr/date';
import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { afterEach, describe, expect, it } from 'vitest';

import { WrDatePicker } from './date-picker';
import { WrDateRangePicker } from './date-range-picker';
import type { WrDatePickerMode, WrDateRange, WrDateRangePickerMode } from './types';

@Component({
  imports: [WrDatePicker],
  template: `
    <wr-date-picker
      #picker
      [(value)]="picked"
      [mode]="mode()"
      [format]="format()"
      [min]="min()"
      [max]="max()"
      [dateFilter]="filter()"
    />
  `,
})
class Host {
  readonly picker = viewChild.required<WrDatePicker>('picker');
  readonly picked = signal<Date | null>(new Date(2026, 2, 18));
  readonly mode = signal<WrDatePickerMode>('month');
  readonly format = signal<string | null>(null);
  readonly min = signal<Date | undefined>(undefined);
  readonly max = signal<Date | undefined>(undefined);
  readonly filter = signal<((d: Date) => boolean) | null>(null);
}

@Component({
  imports: [WrDateRangePicker],
  template: `<wr-date-range-picker [(value)]="period" [mode]="mode()" [minDate]="min()" />`,
})
class RangeHost {
  readonly period = signal<WrDateRange | null>(null);
  readonly mode = signal<WrDateRangePickerMode>('month');
  readonly min = signal<Date | null>(null);
}

const ymd = (date: Date | null | undefined): string | null =>
  date ? `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}` : null;

const chips = (): HTMLButtonElement[] => [...document.querySelectorAll<HTMLButtonElement>('.wr-calendar__chip')];
const chip = (label: string): HTMLButtonElement => chips().find(c => c.textContent?.trim() === label)!;
const panelDay = (date: number): HTMLButtonElement =>
  [...document.querySelectorAll<HTMLButtonElement>('.wr-calendar__day')]
    .filter(cell => !cell.classList.contains('wr-calendar__day--out-of-month'))
    .find(cell => cell.textContent?.trim() === String(date))!;

/**
 * The period modes of `<wr-date-picker>`: which view opens, what a pick
 * commits, what the field writes and reads back. `en-GB`, so months are spelled
 * the way the assertions spell them and a week starts on Monday (ISO weeks).
 */
describe('WrDatePicker period modes', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const field = (): HTMLInputElement => root().querySelector<HTMLInputElement>('input.wr-input')!;
  const trigger = (): HTMLButtonElement => root().querySelector<HTMLButtonElement>('.wr-date-picker__trigger')!;
  const pickerEl = (): HTMLElement => root().querySelector<HTMLElement>('wr-date-picker')!;

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function render(
    mode: WrDatePickerMode,
    setup: (host: Host) => void = () => undefined,
    providers: (Provider | EnvironmentProviders)[] = [provideWr(withDates({ locale: 'en-GB' }))]
  ): Promise<void> {
    TestBed.configureTestingModule({ providers });
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    host.mode.set(mode);
    setup(host);
    await settle();
  }

  async function open(): Promise<void> {
    trigger().click();
    await settle();
  }

  async function type(text: string): Promise<void> {
    field().value = text;
    field().dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
  }

  async function enter(): Promise<void> {
    field().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await settle();
  }

  afterEach(() => fixture.destroy());

  describe('month', () => {
    it('shows the month and year of the value, and leaves a mid-month value alone', async () => {
      await render('month');

      expect(field().value).toBe('March 2026');
      expect(ymd(host.picked())).toBe('2026-3-18');
      expect(pickerEl().classList).toContain('wr-date-picker--month');
    });

    it('opens on the month view and closes on a pick, committing the first day of the month', async () => {
      await render('month');
      await open();

      expect(document.querySelector('.wr-calendar__months')).not.toBeNull();
      expect(document.querySelector('.wr-calendar [role="grid"]')).toBeNull();

      chip('Jun').click();
      await settle();

      expect(ymd(host.picked())).toBe('2026-6-1');
      expect(host.picked()!.getHours()).toBe(0);
      expect(field().value).toBe('June 2026');
      expect(document.querySelector('.wr-calendar')).toBeNull();
    });

    it('reads back what it writes, and the short name the chips show', async () => {
      await render('month');

      await type('November 2027');
      expect(ymd(host.picked())).toBe('2027-11-1');

      await type('feb 2025');
      expect(ymd(host.picked())).toBe('2025-2-1');
    });

    it('refuses text that names no month, keeping the value and the text', async () => {
      await render('month');

      await type('Smarch 2026');
      await enter();

      expect(ymd(host.picked())).toBe('2026-3-18');
      expect(field().value).toBe('Smarch 2026');
      expect(host.picker().inputError()?.kind).toBe('dateFormat');
      expect(pickerEl().classList).toContain('wr-date-picker--invalid');
    });

    it('holds min and max to the month: open while one day is, refused when none is', async () => {
      await render('month', h => {
        h.min.set(new Date(2026, 2, 15));
        h.max.set(new Date(2026, 5, 1));
      });

      await type('March 2026');
      expect(ymd(host.picked())).toBe('2026-3-1');
      expect(host.picker().inputError()).toBeNull();

      await type('February 2026');
      await enter();
      expect(ymd(host.picked())).toBe('2026-3-1');
      expect(host.picker().inputError()?.kind).toBe('minDate');

      await type('July 2026');
      await enter();
      expect(host.picker().inputError()?.kind).toBe('maxDate');

      await open();
      expect(chips().flatMap((c, i) => (c.disabled ? [] : [i]))).toEqual([2, 3, 4, 5]);
    });

    it('refuses a month the filter closes every day of', async () => {
      await render('month', h => h.filter.set(d => d.getMonth() !== 7));

      await type('August 2026');
      await enter();
      expect(host.picker().inputError()?.kind).toBe('dateFilter');

      await type('September 2026');
      expect(ymd(host.picked())).toBe('2026-9-1');
    });

    it('lets [format] replace the period text, reading the typed date as its month', async () => {
      await render('month', h => h.format.set('MM.yyyy'));
      expect(field().value).toBe('03.2026');

      await type('06.2026');
      expect(ymd(host.picked())).toBe('2026-6-1');
    });

    it('takes the keyboard into the month list and moves the ring there', async () => {
      await render('month');
      field().focus();
      field().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true }));
      await settle();

      expect(document.activeElement).toBe(chip('Mar'));

      chip('Mar').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await settle();
      expect(document.activeElement).toBe(chip('Apr'));

      // Enter on a button is a click.
      chip('Apr').click();
      await settle();
      expect(ymd(host.picked())).toBe('2026-4-1');
      expect(document.activeElement).toBe(field());
    });
  });

  describe('year', () => {
    it('opens on the year view and commits 1 January', async () => {
      await render('year');
      expect(field().value).toBe('2026');

      await open();
      expect(document.querySelector('.wr-calendar__years')).not.toBeNull();

      chip('2027').click();
      await settle();

      expect(ymd(host.picked())).toBe('2027-1-1');
      expect(field().value).toBe('2027');
      expect(document.querySelector('.wr-calendar')).toBeNull();
    });

    it('reads a typed year, and only a whole one', async () => {
      await render('year');

      await type('203');
      expect(ymd(host.picked())).toBe('2026-3-18');

      await type('2031');
      expect(ymd(host.picked())).toBe('2031-1-1');
    });

    it('refuses a year that ends before min', async () => {
      await render('year', h => h.min.set(new Date(2026, 5, 1)));

      await type('2025');
      await enter();
      expect(host.picker().inputError()?.kind).toBe('minDate');

      await type('2026');
      expect(host.picker().inputError()).toBeNull();
      expect(ymd(host.picked())).toBe('2026-1-1');
    });
  });

  describe('quarter', () => {
    it('shows the quarter through the catalog template', async () => {
      await render('quarter');

      expect(field().value).toBe('Q1 2026');
    });

    it('opens on four quarters and commits the first day of the picked one', async () => {
      await render('quarter');
      await open();

      expect(chips().map(c => c.textContent?.trim())).toEqual(['Q1', 'Q2', 'Q3', 'Q4']);

      chip('Q3').click();
      await settle();

      expect(ymd(host.picked())).toBe('2026-7-1');
      expect(field().value).toBe('Q3 2026');
      expect(document.querySelector('.wr-calendar')).toBeNull();
    });

    it('reads a typed quarter and refuses a fifth one', async () => {
      await render('quarter');

      await type('q4 2025');
      expect(ymd(host.picked())).toBe('2025-10-1');

      await type('Q5 2025');
      await enter();
      expect(ymd(host.picked())).toBe('2025-10-1');
      expect(host.picker().inputError()).toEqual(expect.objectContaining({ kind: 'dateFormat' }));
      // The example is this year's last quarter, written the way the field writes it.
      expect(host.picker().inputError()).toEqual(
        expect.objectContaining({ example: `Q4 ${new Date().getFullYear()}` })
      );
    });

    it('writes and reads the arrangement of the active catalog', async () => {
      await render('quarter', undefined, [
        provideWr(withDates({ locale: 'ru-RU' })),
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ]);
      // The static loader lands a microtask after the first pass.
      await settle();

      expect(field().value).toBe('1 кв. 2026');

      await type('3 кв. 2027');
      expect(ymd(host.picked())).toBe('2027-7-1');
    });
  });

  describe('week', () => {
    it('shows the ISO week of the value', async () => {
      await render('week');

      expect(field().value).toBe('Week 12, 2026');
    });

    it('opens on the day grid and commits the first day of the clicked week', async () => {
      await render('week');
      await open();

      expect(document.querySelector('.wr-calendar [role="grid"]')).not.toBeNull();
      expect(document.querySelector('.wr-calendar')!.classList).toContain('wr-calendar--week');

      panelDay(26).click();
      await settle();

      expect(ymd(host.picked())).toBe('2026-3-23');
      expect(field().value).toBe('Week 13, 2026');
      expect(document.querySelector('.wr-calendar')).toBeNull();
    });

    it('reads a typed week, across the turn of the year', async () => {
      await render('week');

      await type('Week 1, 2026');
      expect(ymd(host.picked())).toBe('2025-12-29');

      await type('week 53,2026');
      expect(ymd(host.picked())).toBe('2026-12-28');
    });

    it('refuses a week the year does not have', async () => {
      await render('week');

      await type('Week 53, 2025');
      await enter();

      expect(ymd(host.picked())).toBe('2026-3-18');
      expect(host.picker().inputError()?.kind).toBe('dateFormat');
    });

    it('keeps a week open while one of its days is inside min', async () => {
      // Wednesday 18 March: the week of the 16th has days on both sides of it.
      await render('week', h => h.min.set(new Date(2026, 2, 18)));

      await type('Week 12, 2026');
      expect(ymd(host.picked())).toBe('2026-3-16');

      await type('Week 11, 2026');
      await enter();
      expect(host.picker().inputError()?.kind).toBe('minDate');
    });

    it('starts the week where the locale does', async () => {
      await render('week', undefined, [provideWr(withDates({ locale: 'en-US' }))]);
      await open();

      panelDay(18).click();
      await settle();

      expect(ymd(host.picked())).toBe('2026-3-15');
    });
  });

  it('re-renders the field when the mode moves between periods', async () => {
    await render('month');
    expect(field().value).toBe('March 2026');

    host.mode.set('quarter');
    await settle();
    expect(field().value).toBe('Q1 2026');

    host.mode.set('date');
    host.format.set('dd.MM.yyyy');
    await settle();
    expect(field().value).toBe('18.03.2026');
  });
});

describe('WrDateRangePicker period modes', () => {
  let fixture: ComponentFixture<RangeHost>;
  let host: RangeHost;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const fields = (): HTMLInputElement[] => [...root().querySelectorAll<HTMLInputElement>('input.wr-input')];
  const trigger = (): HTMLButtonElement => root().querySelector<HTMLButtonElement>('.wr-date-picker__trigger')!;
  const range = (): (string | null)[] => (host.period() ?? [null, null]).map(ymd);

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function render(
    mode: WrDateRangePickerMode,
    setup: (host: RangeHost) => void = () => undefined
  ): Promise<void> {
    TestBed.configureTestingModule({ providers: [provideWr(withDates({ locale: 'en-GB' }))] });
    fixture = TestBed.createComponent(RangeHost);
    host = fixture.componentInstance;
    host.mode.set(mode);
    setup(host);
    await settle();
  }

  async function open(): Promise<void> {
    trigger().click();
    await settle();
  }

  async function pick(label: string): Promise<void> {
    chip(label).click();
    await settle();
  }

  async function type(end: 0 | 1, text: string): Promise<void> {
    fields()[end].value = text;
    fields()[end].dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
  }

  afterEach(() => fixture.destroy());

  it('picks months from the first day of the start to the last day of the end', async () => {
    // A complete range, so the panel opens on 2026 and the first click starts a new one.
    await render('month', h => h.period.set([new Date(2026, 0, 1), new Date(2026, 0, 31)]));
    await open();
    expect(document.querySelector('.wr-calendar__months')).not.toBeNull();

    await pick('Mar');
    expect(range()).toEqual(['2026-3-1', null]);
    expect(document.querySelector('.wr-calendar')).not.toBeNull();

    await pick('Jun');

    expect(range()).toEqual(['2026-3-1', '2026-6-30']);
    expect(fields().map(f => f.value)).toEqual(['March 2026', 'June 2026']);
    expect(document.querySelector('.wr-calendar')).toBeNull();
  });

  it('picks quarters and years the same way', async () => {
    await render('quarter', h => h.period.set([new Date(2026, 0, 1), new Date(2026, 2, 31)]));
    await open();
    await pick('Q2');
    await pick('Q3');

    expect(range()).toEqual(['2026-4-1', '2026-9-30']);
    expect(fields().map(f => f.value)).toEqual(['Q2 2026', 'Q3 2026']);

    host.mode.set('year');
    await settle();
    expect(fields().map(f => f.value)).toEqual(['2026', '2026']);

    await open();
    await pick('2026');
    await pick('2027');

    expect(range()).toEqual(['2026-1-1', '2027-12-31']);
    expect(fields().map(f => f.value)).toEqual(['2026', '2027']);
  });

  it('reads each typed end as its side of the period', async () => {
    await render('month');

    await type(0, 'February 2026');
    await type(1, 'April 2026');

    expect(range()).toEqual(['2026-2-1', '2026-4-30']);
  });

  it('orders two typed periods on leaving, widening each to the side it moved to', async () => {
    await render('quarter');

    await type(0, 'Q3 2026');
    await type(1, 'Q1 2026');
    expect(range()).toEqual(['2026-7-1', '2026-3-31']);

    fields()[1].dispatchEvent(new FocusEvent('blur'));
    await settle();

    expect(range()).toEqual(['2026-1-1', '2026-9-30']);
    expect(fields().map(f => f.value)).toEqual(['Q1 2026', 'Q3 2026']);
  });

  it('holds minDate to the period', async () => {
    await render('month', h => h.min.set(new Date(2026, 2, 15)));

    await type(0, 'March 2026');
    expect(range()).toEqual(['2026-3-1', null]);

    await type(1, 'February 2026');
    expect(range()).toEqual(['2026-3-1', null]);

    await open();
    expect(chips().flatMap((c, i) => (c.disabled ? [i] : []))).toEqual([0, 1]);
  });
});
