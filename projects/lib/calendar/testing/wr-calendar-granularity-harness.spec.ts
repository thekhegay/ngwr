import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { provideWr } from 'ngwr';
import { WrCalendar, type WrCalendarGranularity } from 'ngwr/calendar';
import { withDates } from 'ngwr/date';
import { beforeEach, describe, expect, it } from 'vitest';

import { WrCalendarHarness } from './wr-calendar-harness';

@Component({
  imports: [WrCalendar],
  template: `<wr-calendar [granularity]="granularity()" [(date)]="date" [max]="max()" />`,
})
class Host {
  readonly granularity = signal<WrCalendarGranularity>('quarter');
  readonly date = signal<Date | null>(new Date(2026, 4, 20));
  readonly max = signal<Date | null>(new Date(2026, 8, 30));
}

describe('WrCalendarHarness, granularity', () => {
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

  it('reads the granularity and the view it opens on', async () => {
    const calendar = await loader.getHarness(WrCalendarHarness);

    expect(await calendar.getGranularity()).toBe('quarter');
    expect(await calendar.getView()).toBe('quarter');

    host.granularity.set('day');
    expect(await calendar.getGranularity()).toBe('day');
    expect(await calendar.getView()).toBe('day');
  });

  it('reads the quarter chips with their state', async () => {
    const calendar = await loader.getHarness(WrCalendarHarness);

    expect(await calendar.getQuarters()).toEqual([
      { label: 'Q1', selected: false, current: false, disabled: false },
      { label: 'Q2', selected: true, current: true, disabled: false },
      { label: 'Q3', selected: false, current: false, disabled: false },
      { label: 'Q4', selected: false, current: false, disabled: true },
    ]);
  });

  it('picks through selectChip, and stays on the view', async () => {
    const calendar = await loader.getHarness(WrCalendarHarness);
    await calendar.selectChip('Q3');

    expect(host.date()).toEqual(new Date(2026, 6, 1));
    expect(await calendar.getView()).toBe('quarter');
  });

  it('throws for the quarter chips off the quarter view', async () => {
    host.granularity.set('month');
    const calendar = await loader.getHarness(WrCalendarHarness);

    await expect(calendar.getQuarters()).rejects.toThrow(/month view/);
  });
});
