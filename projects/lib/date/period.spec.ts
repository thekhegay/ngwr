import { TestBed } from '@angular/core/testing';

import { provideWr } from 'ngwr';
import { WrDateAdapter, withDates, wrPeriodEnd, wrPeriodStart, wrWeekOfYear, wrWeekStart } from 'ngwr/date';
import { describe, expect, it } from 'vitest';

/** `en-GB` weeks start on Monday, `en-US` weeks on Sunday. */
function adapterFor(locale: string): WrDateAdapter<Date> {
  TestBed.configureTestingModule({ providers: [provideWr(withDates({ locale }))] });
  return TestBed.inject<WrDateAdapter<Date>>(WrDateAdapter);
}

const ymd = (date: Date | null): string | null =>
  date ? `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}` : null;

describe('wrPeriodStart / wrPeriodEnd', () => {
  it('gives the first and last day of the month, quarter and year', () => {
    const adapter = adapterFor('en-GB');
    const date = new Date(2026, 4, 20, 15, 45);

    expect(ymd(wrPeriodStart(adapter, date, 'month'))).toBe('2026-5-1');
    expect(ymd(wrPeriodEnd(adapter, date, 'month'))).toBe('2026-5-31');
    expect(ymd(wrPeriodStart(adapter, date, 'quarter'))).toBe('2026-4-1');
    expect(ymd(wrPeriodEnd(adapter, date, 'quarter'))).toBe('2026-6-30');
    expect(ymd(wrPeriodStart(adapter, date, 'year'))).toBe('2026-1-1');
    expect(ymd(wrPeriodEnd(adapter, date, 'year'))).toBe('2026-12-31');
  });

  it('returns the start of the day, whatever time the date carries', () => {
    const start = wrPeriodStart(adapterFor('en-GB'), new Date(2026, 4, 20, 15, 45, 30), 'month');

    expect([start.getHours(), start.getMinutes(), start.getSeconds()]).toEqual([0, 0, 0]);
  });

  it('ends February on the 29th in a leap year', () => {
    const adapter = adapterFor('en-GB');

    expect(ymd(wrPeriodEnd(adapter, new Date(2028, 1, 3), 'month'))).toBe('2028-2-29');
    expect(ymd(wrPeriodEnd(adapter, new Date(2028, 0, 3), 'quarter'))).toBe('2028-3-31');
  });

  it('starts a week on the first day the adapter names', () => {
    // Wednesday 18 March 2026.
    const date = new Date(2026, 2, 18);

    const mondayFirst = adapterFor('en-GB');
    expect(ymd(wrPeriodStart(mondayFirst, date, 'week'))).toBe('2026-3-16');
    expect(ymd(wrPeriodEnd(mondayFirst, date, 'week'))).toBe('2026-3-22');

    TestBed.resetTestingModule();
    const sundayFirst = adapterFor('en-US');
    expect(ymd(wrPeriodStart(sundayFirst, date, 'week'))).toBe('2026-3-15');
    expect(ymd(wrPeriodEnd(sundayFirst, date, 'week'))).toBe('2026-3-21');
  });
});

describe('wrWeekOfYear / wrWeekStart', () => {
  it('counts ISO weeks when the week starts on Monday', () => {
    const adapter = adapterFor('en-GB');

    expect(wrWeekOfYear(adapter, new Date(2026, 2, 18))).toEqual({ week: 12, year: 2026 });
    // Thursday 1 January 2026 is in week 1, which opens on Monday 29 December 2025.
    expect(wrWeekOfYear(adapter, new Date(2025, 11, 29))).toEqual({ week: 1, year: 2026 });
    // 1 January 2027 is a Friday: still week 53 of 2026.
    expect(wrWeekOfYear(adapter, new Date(2027, 0, 1))).toEqual({ week: 53, year: 2026 });
  });

  it('reads a week number back to its first day', () => {
    const adapter = adapterFor('en-GB');

    expect(ymd(wrWeekStart(adapter, 2026, 12))).toBe('2026-3-16');
    expect(ymd(wrWeekStart(adapter, 2026, 1))).toBe('2025-12-29');
    expect(ymd(wrWeekStart(adapter, 2026, 53))).toBe('2026-12-28');
  });

  it('answers null for a week the year does not have', () => {
    const adapter = adapterFor('en-GB');

    expect(wrWeekStart(adapter, 2025, 53)).toBeNull();
    expect(wrWeekStart(adapter, 2026, 0)).toBeNull();
    expect(wrWeekStart(adapter, 2026, 54)).toBeNull();
  });

  it('runs the same rule on a Sunday-first week', () => {
    const adapter = adapterFor('en-US');

    // Week 1 holds 4 January, here Sunday 4 January 2026 itself.
    expect(ymd(wrWeekStart(adapter, 2026, 1))).toBe('2026-1-4');
    expect(wrWeekOfYear(adapter, new Date(2026, 0, 2))).toEqual({ week: 53, year: 2025 });
  });

  it('round-trips every week of a year', () => {
    const adapter = adapterFor('en-GB');

    for (let week = 1; week <= 53; week++) {
      const start = wrWeekStart(adapter, 2026, week);
      expect(start && wrWeekOfYear(adapter, start)).toEqual({ week, year: 2026 });
    }
  });
});
