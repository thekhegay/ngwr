import { Component, signal, viewChild } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { FormField, MAX, MIN, createMetadataKey, form, metadata, required } from '@angular/forms/signals';

import { provideWr } from 'ngwr';
import { withDates, wrToDay } from 'ngwr/date';
import { WrFormField } from 'ngwr/form';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WrDatePicker } from './date-picker';
import type { WrDatePickerMode, WrDatePickerValueFormat } from './types';

@Component({
  imports: [WrDatePicker],
  template: `
    <wr-date-picker
      valueFormat="day"
      format="dd.MM.yyyy"
      [(value)]="day"
      [mode]="mode()"
      [min]="min()"
      [max]="max()"
      [dateFilter]="filter()"
      [readonly]="readonly()"
    />
  `,
})
class DayHost {
  readonly day = signal<string | null>('2026-03-14');
  readonly mode = signal<WrDatePickerMode>('date');
  readonly min = signal<Date | string | undefined>(undefined);
  readonly max = signal<Date | string | undefined>(undefined);
  readonly filter = signal<((date: Date) => boolean) | null>(null);
  readonly readonly = signal(false);
}

const MIN_DAY = createMetadataKey<string | undefined>();
const MAX_DAY = createMetadataKey<string | undefined>();

@Component({
  imports: [WrDatePicker, WrFormField, FormField],
  template: `
    <wr-form-field label="Due">
      <wr-date-picker valueFormat="day" format="dd.MM.yyyy" [formField]="f.due" />
    </wr-form-field>
  `,
})
class DayFormHost {
  readonly model = signal<{ due: string | null }>({ due: '2026-03-14' });
  // Angular refuses `[min]` beside `[formField]` (NG8022) and its `minDate()` takes
  // a `Date` path only, so a day field states its bounds as limits of its own type.
  readonly f = form(this.model, path => {
    required(path.due);
    metadata(path.due, MIN_DAY, () => '2026-03-10');
    metadata(path.due, MIN, () => MIN_DAY);
    metadata(path.due, MAX_DAY, () => '2026-03-20');
    metadata(path.due, MAX, () => MAX_DAY);
  });
}

@Component({
  imports: [WrDatePicker],
  template: `<wr-date-picker format="dd.MM.yyyy" min="2026-03-10" max="2026-03-20" [(value)]="picked" />`,
})
class DateHost {
  readonly picked = signal<Date | null>(new Date(2026, 2, 14));
}

@Component({
  imports: [WrDatePicker],
  template: `<wr-date-picker #picker format="dd.MM.yyyy" [valueFormat]="valueFormat()" [(value)]="value" />`,
})
class SwitchHost {
  readonly picker = viewChild.required<WrDatePicker<WrDatePickerValueFormat>>('picker');
  readonly valueFormat = signal<WrDatePickerValueFormat>('date');
  readonly value = signal<Date | string | null>(new Date(2026, 2, 14));
}

const panelDays = (): HTMLButtonElement[] =>
  [...document.querySelectorAll<HTMLButtonElement>('.wr-calendar__day')].filter(
    cell => !cell.classList.contains('wr-calendar__day--out-of-month')
  );
const panelDay = (date: number): HTMLButtonElement => panelDays().find(c => c.textContent?.trim() === String(date))!;
const chip = (label: string): HTMLButtonElement =>
  [...document.querySelectorAll<HTMLButtonElement>('.wr-calendar__chip')].find(c => c.textContent?.trim() === label)!;

/**
 * `valueFormat="day"`: the model is a `YYYY-MM-DD` string and everything the
 * user sees is unchanged. The runner's zone is `Asia/Almaty` (UTC+5), where a
 * day written through UTC would come out as the day before.
 */
describe('WrDatePicker valueFormat="day"', () => {
  let fixture: ComponentFixture<unknown>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const field = (): HTMLInputElement => root().querySelector<HTMLInputElement>('input.wr-input')!;
  const pickerEl = (): HTMLElement => root().querySelector<HTMLElement>('wr-date-picker')!;
  const trigger = (): HTMLButtonElement => root().querySelector<HTMLButtonElement>('.wr-date-picker__trigger')!;

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function render<T>(cmp: new () => T, setup: (host: T) => void = () => undefined): Promise<T> {
    TestBed.configureTestingModule({ providers: [provideWr(withDates({ locale: 'en-GB' }))] });
    const created = TestBed.createComponent(cmp);
    fixture = created;
    setup(created.componentInstance);
    await settle();
    return created.componentInstance;
  }

  async function type(text: string): Promise<void> {
    field().value = text;
    field().dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
  }

  async function open(): Promise<void> {
    trigger().click();
    await settle();
  }

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  it('shows a day string in the field format and publishes it on the host', async () => {
    await render(DayHost);

    expect(field().value).toBe('14.03.2026');
    expect(pickerEl().getAttribute('data-day')).toBe('2026-03-14');
  });

  it('commits a typed date as a day string, the local day', async () => {
    const host = await render(DayHost);

    await type('01.03.2026');

    expect(host.day()).toBe('2026-03-01');
    expect(pickerEl().getAttribute('data-day')).toBe('2026-03-01');
    // The text the user typed is theirs until blur.
    expect(field().value).toBe('01.03.2026');
  });

  it('commits a calendar pick as a day string and selects the held day on reopen', async () => {
    const host = await render(DayHost);

    await open();
    expect(panelDay(14).getAttribute('aria-selected')).toBe('true');
    panelDay(20).click();
    await settle();

    expect(host.day()).toBe('2026-03-20');
    expect(field().value).toBe('20.03.2026');
    expect(document.querySelector('wr-calendar')).toBeNull();
  });

  it('follows a write from outside', async () => {
    const host = await render(DayHost);

    host.day.set('2027-01-02');
    await settle();

    expect(field().value).toBe('02.01.2027');
  });

  it('holds null when emptied, with an empty data-day', async () => {
    const host = await render(DayHost);

    await type('');

    expect(host.day()).toBeNull();
    expect(pickerEl().getAttribute('data-day')).toBe('');
  });

  it.each(['2026-02-30', '2026-03-14T10:00:00Z', '14.03.2026', ''])(
    'reads %j in the model as empty, and leaves the model alone',
    async value => {
      const host = await render(DayHost, h => h.day.set(value));

      expect(field().value).toBe('');
      expect(pickerEl().getAttribute('data-day')).toBe('');
      expect(host.day()).toBe(value);
    }
  );

  it('refuses a write while read-only', async () => {
    const host = await render(DayHost, h => h.readonly.set(true));

    await open();
    panelDay(20).click();
    await settle();

    expect(host.day()).toBe('2026-03-14');
    expect(field().value).toBe('14.03.2026');
  });

  describe('bounds as day strings', () => {
    it('disables the days outside min and max, both inclusive', async () => {
      await render(DayHost, h => {
        h.min.set('2026-03-10');
        h.max.set('2026-03-20');
      });

      await open();

      expect(panelDay(9).disabled).toBe(true);
      expect(panelDay(10).disabled).toBe(false);
      expect(panelDay(20).disabled).toBe(false);
      expect(panelDay(21).disabled).toBe(true);
    });

    it('refuses a typed date outside them and keeps the model', async () => {
      const host = await render(DayHost, h => {
        h.min.set('2026-03-10');
        h.max.set('2026-03-20');
      });

      await type('09.03.2026');
      expect(host.day()).toBe('2026-03-14');
      await type('21.03.2026');
      expect(host.day()).toBe('2026-03-14');
      await type('10.03.2026');
      expect(host.day()).toBe('2026-03-10');
    });

    it('takes a Date bound as before, and ignores a string that is no day', async () => {
      const host = await render(DayHost, h => {
        h.min.set(new Date(2026, 2, 10));
        h.max.set('2026-02-30');
      });

      await type('09.03.2026');
      expect(host.day()).toBe('2026-03-14');
      await type('01.01.2030');
      expect(host.day()).toBe('2030-01-01');
    });

    it('takes day strings on a picker that holds a Date', async () => {
      const host = await render(DateHost);

      await type('09.03.2026');
      expect(wrToDay(host.picked()!)).toBe('2026-03-14');
      await type('12.03.2026');
      expect(host.picked()).toBeInstanceOf(Date);
      expect(wrToDay(host.picked()!)).toBe('2026-03-12');
      expect(pickerEl().hasAttribute('data-day')).toBe(false);
    });
  });

  it('calls dateFilter with a Date at local midnight', async () => {
    const seen: unknown[] = [];
    const host = await render(DayHost, h =>
      h.filter.set(date => {
        seen.push(date);
        return date.getDate() !== 15;
      })
    );

    await type('15.03.2026');
    expect(host.day()).toBe('2026-03-14');
    await type('16.03.2026');
    expect(host.day()).toBe('2026-03-16');

    expect(seen.length).toBeGreaterThan(0);
    for (const date of seen) {
      expect(date).toBeInstanceOf(Date);
      expect((date as Date).getHours()).toBe(0);
    }
  });

  describe('in a Signal Form', () => {
    const due = (host: DayFormHost): ReturnType<DayFormHost['f']['due']> => host.f.due();

    it('round-trips the day string through the field', async () => {
      const host = await render(DayFormHost);
      expect(field().value).toBe('14.03.2026');

      await type('15.03.2026');
      expect(host.model().due).toBe('2026-03-15');
      expect(due(host).valid()).toBe(true);

      host.model.set({ due: '2026-03-18' });
      await settle();
      expect(field().value).toBe('18.03.2026');

      await open();
      panelDay(11).click();
      await settle();
      expect(host.model().due).toBe('2026-03-11');
      expect(due(host).dirty()).toBe(true);
    });

    it('holds null when emptied, which required refuses', async () => {
      const host = await render(DayFormHost);

      await type('');

      expect(host.model().due).toBeNull();
      expect(
        due(host)
          .errors()
          .map(error => error.kind)
      ).toEqual(['required']);
    });

    it('reports a refusal under the same keys, with Dates in the payload', async () => {
      const host = await render(DayFormHost);

      await type('09.03.2026');
      expect(host.model().due).toBe('2026-03-14');
      const [min] = due(host).errors() as unknown as { kind: string; date: Date; min: Date }[];
      expect(min.kind).toBe('minDate');
      expect(min.date).toBeInstanceOf(Date);
      expect(wrToDay(min.date)).toBe('2026-03-09');
      expect(wrToDay(min.min)).toBe('2026-03-10');

      await type('21.03.2026');
      const [max] = due(host).errors() as unknown as { kind: string; max: Date }[];
      expect(max.kind).toBe('maxDate');
      expect(wrToDay(max.max)).toBe('2026-03-20');

      await type('nonsense');
      expect(
        due(host)
          .errors()
          .map(error => error.kind)
      ).toEqual(['dateFormat']);

      await type('12.03.2026');
      expect(due(host).errors()).toEqual([]);
      expect(host.model().due).toBe('2026-03-12');
    });

    it('shows the value again when the form resets over refused text', async () => {
      const host = await render(DayFormHost);

      await type('nonsense');
      due(host).reset();
      await settle();

      expect(field().value).toBe('14.03.2026');
      expect(due(host).errors()).toEqual([]);
    });
  });

  describe('modes', () => {
    it('holds the first day of a period', async () => {
      const host = await render(DayHost, h => {
        h.mode.set('month');
        h.day.set('2026-03-01');
      });
      await open();
      chip('May').click();
      await settle();

      expect(host.day()).toBe('2026-05-01');
    });

    it.each(['time', 'datetime'] as const)('is ignored in %s mode, which keeps a Date and warns', async mode => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      @Component({
        imports: [WrDatePicker],
        template: `<wr-date-picker #picker valueFormat="day" [mode]="mode" [(value)]="value" />`,
      })
      class ClockHost {
        readonly mode = mode;
        readonly picker = viewChild.required<WrDatePicker<'day'>>('picker');
        // The type follows `valueFormat`; what the mode holds does not.
        readonly value = signal<string | null>(new Date(2026, 2, 14, 9, 30) as unknown as string);
      }
      const host = await render(ClockHost);

      expect(field().value).not.toBe('');
      expect(pickerEl().hasAttribute('data-day')).toBe(false);
      expect(host.value()).toBeInstanceOf(Date);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('ignores valueFormat="day"'));
    });

    it('does not warn where it applies', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      await render(DayHost);

      expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('valueFormat'));
    });
  });

  it('reads the model the other way when valueFormat changes', async () => {
    const host = await render(SwitchHost);
    expect(pickerEl().hasAttribute('data-day')).toBe(false);

    host.valueFormat.set('day');
    host.value.set('2026-03-20');
    await settle();
    expect(field().value).toBe('20.03.2026');

    await type('21.03.2026');
    expect(host.value()).toBe('2026-03-21');
  });
});
