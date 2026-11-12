import { Directionality } from '@angular/cdk/bidi';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { provideWr } from 'ngwr';
import { WrDateAdapter, withDates } from 'ngwr/date';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WrDateRangePicker } from './date-range-picker';
import { wrLastDays, wrLastMonth, wrThisMonth, wrThisWeek } from './presets';
import { WrDateRangePickerHarness } from './testing/wr-date-range-picker-harness';
import type { WrDateRange, WrDateRangePreset, WrDateRangePresetFn } from './types';

const PRESETS: readonly WrDateRangePreset[] = [
  { label: 'Last 7 days', range: wrLastDays(7) },
  { label: 'This month', range: wrThisMonth() },
  { label: 'Last month', range: wrLastMonth() },
  { label: 'Launch week', range: [new Date(2026, 0, 5, 9, 30), new Date(2026, 0, 11, 18, 0)] },
];

@Component({
  imports: [WrDateRangePicker],
  template: `
    <wr-date-range-picker
      format="dd.MM.yyyy"
      presetsLabel="Quick ranges"
      [(value)]="period"
      [mode]="mode()"
      [presets]="presets()"
      [minDate]="minDate()"
      (touch)="touched.set(touched() + 1)"
    />
  `,
})
class Host {
  readonly period = signal<WrDateRange | null>(null);
  readonly mode = signal<'date' | 'datetime'>('date');
  readonly presets = signal<readonly WrDateRangePreset[]>(PRESETS);
  readonly minDate = signal<Date | null>(null);
  readonly touched = signal(0);
}

/** A local day as `y-m-d h:m:s`, so a case reads the same in any runner zone. */
const local = (d: Date | null | undefined): string | null =>
  d
    ? `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`
    : null;

describe('WrDateRangePicker presets', () => {
  let fixture: ComponentFixture<Host>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const trigger = (): HTMLButtonElement => root().querySelector<HTMLButtonElement>('.wr-date-picker__trigger')!;
  const fields = (): string[] => [...root().querySelectorAll<HTMLInputElement>('input.wr-input')].map(f => f.value);
  const panel = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-date-range-panel');
  const list = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-date-range-presets');
  const buttons = (): HTMLButtonElement[] => [
    ...document.querySelectorAll<HTMLButtonElement>('.wr-date-range-presets__item'),
  ];
  const button = (label: string): HTMLButtonElement => buttons().find(b => b.textContent?.trim() === label)!;
  const period = (): WrDateRange | null => fixture.componentInstance.period();

  const open = (): void => {
    trigger().click();
    fixture.detectChanges();
  };

  const pick = (label: string): void => {
    button(label).click();
    fixture.detectChanges();
  };

  /** Only `Date` is faked: no timer or frame is held back. */
  const setup = (
    options: { now?: Date; timeZone?: string; locale?: string; configure?: (host: Host) => void } = {}
  ): void => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(options.now ?? new Date(2026, 10, 12, 10, 0));
    TestBed.configureTestingModule({
      providers: [provideWr(withDates({ locale: options.locale ?? 'en-US', timeZone: options.timeZone }))],
    });
    fixture = TestBed.createComponent(Host);
    options.configure?.(fixture.componentInstance);
    fixture.detectChanges();
  };

  afterEach(() => {
    fixture?.destroy();
    vi.useRealTimers();
  });

  it('draws no list and no modifier without presets', () => {
    setup({ configure: host => host.presets.set([]) });
    open();

    expect(list()).toBeNull();
    expect(panel()!.classList.contains('wr-date-range-panel--presets')).toBe(false);
    expect(panel()!.firstElementChild!.classList.contains('wr-calendar')).toBe(true);
  });

  it('draws the presets as buttons with the labels the app gave', () => {
    setup();
    open();

    expect(buttons().map(b => b.textContent?.trim())).toEqual([
      'Last 7 days',
      'This month',
      'Last month',
      'Launch week',
    ]);
    expect(buttons().every(b => b.tagName === 'BUTTON' && b.type === 'button')).toBe(true);
    expect(list()!.getAttribute('role')).toBe('group');
    expect(list()!.getAttribute('aria-label')).toBe('Quick ranges');
    expect(panel()!.classList.contains('wr-date-range-panel--presets')).toBe(true);
  });

  it('commits the range on a click, closes the panel and emits touch', () => {
    setup();
    open();
    pick('Last 7 days');

    expect(period()!.map(local)).toEqual(['2026-11-6 0:0:0', '2026-11-12 0:0:0']);
    expect(fields()).toEqual(['06.11.2026', '12.11.2026']);
    expect(panel()).toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(fixture.componentInstance.touched()).toBe(1);
  });

  it('marks the preset whose range equals the value, and only that one', () => {
    setup();
    open();
    expect(buttons().map(b => b.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'false', 'false']);

    pick('This month');
    open();
    expect(button('This month').getAttribute('aria-pressed')).toBe('true');
    expect(button('This month').classList.contains('wr-date-range-presets__item--active')).toBe(true);
    expect(buttons().filter(b => b.getAttribute('aria-pressed') === 'true')).toHaveLength(1);

    fixture.componentInstance.period.set([new Date(2026, 10, 1), new Date(2026, 10, 29)]);
    fixture.detectChanges();
    expect(buttons().filter(b => b.getAttribute('aria-pressed') === 'true')).toHaveLength(0);
  });

  it('cuts a range to whole days in date mode', () => {
    setup();
    open();
    pick('Launch week');

    expect(period()!.map(local)).toEqual(['2026-1-5 0:0:0', '2026-1-11 0:0:0']);
  });

  it('commits a fixed pair as given in datetime mode', () => {
    setup({ configure: host => host.mode.set('datetime') });
    open();
    pick('Launch week');

    expect(period()!.map(local)).toEqual(['2026-1-5 9:30:0', '2026-1-11 18:0:0']);
    expect(panel()).toBeNull();
  });

  it('runs a helper from the start of the first day to the end of the last in datetime mode', () => {
    setup({ configure: host => host.mode.set('datetime') });
    open();
    pick('Last month');

    expect(period()!.map(local)).toEqual(['2026-10-1 0:0:0', '2026-10-31 23:59:59']);
    open();
    expect(button('Last month').getAttribute('aria-pressed')).toBe('true');
  });

  it('disables a preset that reaches outside minDate', () => {
    setup({ configure: host => host.minDate.set(new Date(2026, 10, 1)) });
    open();

    expect(button('Last month').disabled).toBe(true);
    expect(button('This month').disabled).toBe(false);
  });

  it('keeps the list first in the panel under RTL, where logical properties mirror it', () => {
    setup();
    TestBed.inject(Directionality).valueSignal.set('rtl');
    open();

    expect(panel()!.classList.contains('wr-date-range-panel--presets')).toBe(true);
    expect(panel()!.firstElementChild).toBe(list());
    expect(list()!.nextElementSibling!.classList.contains('wr-calendar')).toBe(true);
  });

  describe('in a display time zone', () => {
    // 20:00 UTC on the 12th is 01:30 on the 13th at +05:30.
    const now = new Date(Date.UTC(2026, 10, 12, 20, 0));

    // Noon UTC is the 13th at +14:00 and the 12th at -12:00, so whatever zone the
    // runner is in, one of the two is not its own day.
    it.each([
      ['+14:00', ['2026-11-7 0:0:0', '2026-11-13 0:0:0']],
      ['-12:00', ['2026-11-6 0:0:0', '2026-11-12 0:0:0']],
    ])('reads today at %s and keeps a date-only range browser-local days', (timeZone, expected) => {
      setup({ now: new Date(Date.UTC(2026, 10, 12, 12, 0)), timeZone });
      open();
      pick('Last 7 days');

      expect(period()!.map(local)).toEqual(expected);
    });

    it('commits the days of the zone as instants in datetime mode', () => {
      setup({ now, timeZone: '+05:30', configure: host => host.mode.set('datetime') });
      open();
      pick('Last 7 days');

      expect(period()!.map(d => d!.getTime())).toEqual([
        Date.UTC(2026, 10, 6, 18, 30),
        Date.UTC(2026, 10, 13, 18, 29, 59),
      ]);
    });
  });

  describe('through the harness', () => {
    it('lists the presets, selects one by label and names the active one', async () => {
      setup();
      const picker = await TestbedHarnessEnvironment.loader(fixture).getHarness(WrDateRangePickerHarness);
      await picker.open();

      expect(await picker.getPresets()).toEqual(['Last 7 days', 'This month', 'Last month', 'Launch week']);
      expect(await picker.getActivePreset()).toBeNull();

      await picker.selectPreset('This month');
      expect(await picker.isOpen()).toBe(false);
      expect([await picker.getStartText(), await picker.getEndText()]).toEqual(['01.11.2026', '30.11.2026']);

      await picker.open();
      expect(await picker.getActivePreset()).toBe('This month');
    });

    it('throws for a label the popup does not show and for a disabled preset', async () => {
      setup({ configure: host => host.minDate.set(new Date(2026, 10, 1)) });
      const picker = await TestbedHarnessEnvironment.loader(fixture).getHarness(WrDateRangePickerHarness);
      await picker.open();

      await expect(picker.selectPreset('Next year')).rejects.toThrow(/no such preset/);
      await expect(picker.selectPreset('Last month')).rejects.toThrow(/disabled/);
    });

    it('answers with no presets for a picker that has none', async () => {
      setup({ configure: host => host.presets.set([]) });
      const picker = await TestbedHarnessEnvironment.loader(fixture).getHarness(WrDateRangePickerHarness);
      await picker.open();

      expect(await picker.getPresets()).toEqual([]);
    });
  });
});

describe('the preset helpers', () => {
  const run = (preset: WrDateRangePresetFn, locale: string, today: Date): (string | null)[] => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWr(withDates({ locale }))] });
    const adapter = TestBed.inject<WrDateAdapter<Date>>(WrDateAdapter);
    return preset({ adapter, today }).map(local);
  };

  // A Thursday.
  const today = new Date(2026, 10, 12);

  it('wrLastDays counts today in', () => {
    expect(run(wrLastDays(7), 'en-US', today)).toEqual(['2026-11-6 0:0:0', '2026-11-12 23:59:59']);
  });

  it('wrLastDays(1) is today, and so is anything smaller', () => {
    expect(run(wrLastDays(1), 'en-US', today)).toEqual(['2026-11-12 0:0:0', '2026-11-12 23:59:59']);
    expect(run(wrLastDays(0), 'en-US', today)).toEqual(['2026-11-12 0:0:0', '2026-11-12 23:59:59']);
  });

  it('wrThisWeek starts on the first day of the week of the locale', () => {
    expect(run(wrThisWeek(), 'en-US', today)).toEqual(['2026-11-8 0:0:0', '2026-11-14 23:59:59']);
  });

  it('wrThisWeek starts on Monday where the week does', () => {
    expect(run(wrThisWeek(), 'en-GB', today)).toEqual(['2026-11-9 0:0:0', '2026-11-15 23:59:59']);
  });

  it('wrThisMonth and wrLastMonth cover whole months, across a year boundary too', () => {
    expect(run(wrThisMonth(), 'en-US', today)).toEqual(['2026-11-1 0:0:0', '2026-11-30 23:59:59']);
    expect(run(wrLastMonth(), 'en-US', new Date(2027, 0, 31))).toEqual(['2026-12-1 0:0:0', '2026-12-31 23:59:59']);
    expect(run(wrLastMonth(), 'en-US', new Date(2024, 2, 31))).toEqual(['2024-2-1 0:0:0', '2024-2-29 23:59:59']);
  });
});
