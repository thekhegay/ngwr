import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { provideWr } from 'ngwr';
import { withDates, wrToDay } from 'ngwr/date';
import { WrDatePicker, type WrDatePickerMode } from 'ngwr/date-picker';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrDatePickerHarness } from './wr-date-picker-harness';

@Component({
  imports: [WrDatePicker],
  template: `
    <wr-date-picker
      valueFormat="day"
      placeholder="Day"
      [(value)]="day"
      [mode]="mode()"
      [min]="min()"
      [readonly]="readonly()"
    />
    <wr-date-picker placeholder="Date" [(value)]="date" [mode]="dateMode()" />
  `,
})
class Host {
  readonly day = signal<string | null>('2026-03-14');
  readonly mode = signal<WrDatePickerMode>('date');
  readonly min = signal<string | undefined>(undefined);
  readonly readonly = signal(false);
  readonly date = signal<Date | null>(new Date(2026, 2, 14));
  readonly dateMode = signal<WrDatePickerMode>('date');
}

/** `getDayValue()` and `setDayValue()` of the picker harness. `en-GB`: weeks start on Monday. */
describe('WrDatePickerHarness day values', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const dayPicker = (): Promise<WrDatePickerHarness> =>
    loader.getHarness(WrDatePickerHarness.with({ placeholder: 'Day' }));
  const datePicker = (): Promise<WrDatePickerHarness> =>
    loader.getHarness(WrDatePickerHarness.with({ placeholder: 'Date' }));

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideWr(withDates({ locale: 'en-GB' }))] });
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('reads the held day, and null when there is none', async () => {
    const picker = await dayPicker();
    expect(await picker.getDayValue()).toBe('2026-03-14');

    await picker.clear();
    expect(await picker.getDayValue()).toBeNull();
    expect(host.day()).toBeNull();
  });

  it('reads the model, not text the picker refused', async () => {
    const picker = await dayPicker();

    // Typing clears the field first, so the model is empty under the refused text.
    await picker.setValueText('not a date');

    expect(await picker.getValueText()).toBe('not a date');
    expect(await picker.getDayValue()).toBeNull();
  });

  it('throws on a picker that holds a Date', async () => {
    await expect((await datePicker()).getDayValue()).rejects.toThrow(/holds a Date/);
  });

  it('picks a day in the month on show', async () => {
    const picker = await dayPicker();

    await picker.setDayValue('2026-03-02');

    expect(host.day()).toBe('2026-03-02');
    expect(await picker.getDayValue()).toBe('2026-03-02');
    expect(await picker.isOpen()).toBe(false);
  });

  it.each(['2031-11-30', '1999-01-01', '2024-02-29', '2100-12-31'])('travels to %s', async day => {
    const picker = await dayPicker();

    await picker.setDayValue(day);

    expect(host.day()).toBe(day);
  });

  it('picks from an empty picker and from one already open', async () => {
    host.day.set(null);
    const picker = await dayPicker();
    await picker.open();

    await picker.setDayValue('2026-07-04');

    expect(host.day()).toBe('2026-07-04');
  });

  it('picks a day on a picker that holds a Date', async () => {
    await (await datePicker()).setDayValue('2027-05-06');

    expect(wrToDay(host.date()!)).toBe('2027-05-06');
  });

  it.each([
    ['month', '2027-05-06', '2027-05-01'],
    ['quarter', '2027-05-06', '2027-04-01'],
    ['year', '2027-05-06', '2027-01-01'],
    ['week', '2027-05-06', '2027-05-03'],
  ] as const)('stops where mode="%s" does', async (mode, day, held) => {
    host.mode.set(mode);
    host.day.set(null);
    const picker = await dayPicker();

    await picker.setDayValue(day);

    expect(host.day()).toBe(held);
    expect(await picker.getDayValue()).toBe(held);
  });

  it('refuses a string that is not YYYY-MM-DD', async () => {
    const picker = await dayPicker();

    await expect(picker.setDayValue('14.03.2026')).rejects.toThrow(/YYYY-MM-DD/);
    await expect(picker.setDayValue('2026-3-14')).rejects.toThrow(/YYYY-MM-DD/);
  });

  it('throws on a day the bounds rule out', async () => {
    host.min.set('2026-03-10');
    const picker = await dayPicker();

    await expect(picker.setDayValue('2026-03-09')).rejects.toThrow(/disabled/);
    await expect(picker.setDayValue('2025-06-01')).rejects.toThrow(/disabled/);
    expect(host.day()).toBe('2026-03-14');
  });

  it('throws in a mode that holds a time', async () => {
    host.dateMode.set('datetime');

    await expect((await datePicker()).setDayValue('2026-03-02')).rejects.toThrow(/holds a time/);
  });

  it('leaves a read-only picker where it was', async () => {
    host.readonly.set(true);
    const picker = await dayPicker();

    await picker.setDayValue('2026-03-02');

    expect(await picker.getDayValue()).toBe('2026-03-14');
  });
});
