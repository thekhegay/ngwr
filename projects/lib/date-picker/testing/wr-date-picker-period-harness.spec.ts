import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { provideWr } from 'ngwr';
import { withDates } from 'ngwr/date';
import {
  WrDatePicker,
  type WrDatePickerMode,
  type WrDateRange,
  WrDateRangePicker,
  type WrDateRangePickerMode,
} from 'ngwr/date-picker';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrDatePickerHarness } from './wr-date-picker-harness';
import { WrDateRangePickerHarness } from './wr-date-range-picker-harness';

@Component({
  imports: [WrDatePicker, WrDateRangePicker],
  template: `
    <wr-date-picker [(value)]="picked" [mode]="mode()" [min]="min()" />
    <wr-date-range-picker [(value)]="period" [mode]="rangeMode()" />
  `,
})
class Host {
  readonly picked = signal<Date | null>(new Date(2026, 2, 18));
  readonly mode = signal<WrDatePickerMode>('month');
  readonly min = signal<Date | undefined>(undefined);
  readonly period = signal<WrDateRange | null>([new Date(2026, 0, 1), new Date(2026, 0, 31)]);
  readonly rangeMode = signal<WrDateRangePickerMode>('quarter');
}

const ymd = (date: Date | null | undefined): string | null =>
  date ? `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}` : null;

/** The period methods of the two picker harnesses. `en-GB`: weeks start on Monday. */
describe('date picker harnesses, period modes', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideWr(withDates({ locale: 'en-GB' }))] });
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('reads a period mode and the view it opens on', async () => {
    const picker = await loader.getHarness(WrDatePickerHarness.with({ mode: 'month' }));
    await picker.open();

    expect(await picker.getMode()).toBe('month');
    expect(await picker.getView()).toBe('month');
    expect(await picker.getValueText()).toBe('March 2026');
  });

  it('picks a month and a year where the mode makes them the pick', async () => {
    const picker = await loader.getHarness(WrDatePickerHarness);
    await picker.open();
    await picker.selectMonth(5);

    expect(ymd(host.picked())).toBe('2026-6-1');
    expect(await picker.isOpen()).toBe(false);

    host.mode.set('year');
    await picker.open();
    expect(await picker.getView()).toBe('year');
    await picker.selectYear(2027);

    expect(ymd(host.picked())).toBe('2027-1-1');
    expect(await picker.getValueText()).toBe('2027');
  });

  it('picks a quarter by its number', async () => {
    host.mode.set('quarter');
    const picker = await loader.getHarness(WrDatePickerHarness);
    await picker.open();

    expect(await picker.getView()).toBe('quarter');
    await picker.selectQuarter(3);

    expect(ymd(host.picked())).toBe('2026-7-1');
    expect(await picker.getValueText()).toBe('Q3 2026');
  });

  it('refuses a disabled quarter, and a quarter where there is no quarter view', async () => {
    const picker = await loader.getHarness(WrDatePickerHarness);
    await picker.open();
    await expect(picker.selectQuarter(1)).rejects.toThrow(/quarter view/);
    await picker.close();

    host.mode.set('quarter');
    host.min.set(new Date(2026, 6, 1));
    await picker.open();
    await expect(picker.selectQuarter(2)).rejects.toThrow(/disabled/);
  });

  it('picks the week a day is in, and only in week mode', async () => {
    host.mode.set('week');
    const picker = await loader.getHarness(WrDatePickerHarness);
    await picker.open();
    await picker.selectWeek(26);

    expect(ymd(host.picked())).toBe('2026-3-23');
    expect(await picker.getValueText()).toBe('Week 13, 2026');

    host.mode.set('date');
    await picker.open();
    await expect(picker.selectWeek(26)).rejects.toThrow(/mode="week"/);
  });

  it('picks a range of quarters through the range harness', async () => {
    const picker = await loader.getHarness(WrDateRangePickerHarness.with({ mode: 'quarter' }));
    await picker.open();
    await picker.selectQuarter(2);
    await picker.selectQuarter(4);

    expect((host.period() ?? []).map(ymd)).toEqual(['2026-4-1', '2026-12-31']);
    expect(await picker.getStartText()).toBe('Q2 2026');
    expect(await picker.getEndText()).toBe('Q4 2026');
    expect(await picker.getMode()).toBe('quarter');
  });
});
