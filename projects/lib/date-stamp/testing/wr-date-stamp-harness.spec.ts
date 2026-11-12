import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWr } from 'ngwr';
import { withDates } from 'ngwr/date';
import { WrDateStamp } from 'ngwr/date-stamp';
import { beforeEach, describe, expect, it } from 'vitest';

import { WrDateStampHarness } from './wr-date-stamp-harness';

@Component({
  imports: [WrDateStamp],
  template: `
    <wr-date-stamp [value]="created" dateFormat="dd.MM.yyyy" timeFormat="HH:mm" />
    <wr-date-stamp value="2026-11-12" dateFormat="dd.MM.yyyy" />
    <wr-date-stamp [value]="null" emptyLabel="n/a" />
  `,
})
class Host {
  readonly created = new Date(Date.UTC(2026, 10, 12, 8, 45));
}

describe('WrDateStampHarness', () => {
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideWr(withDates({ locale: 'en-US', timeZone: '+05:00' }))] });
    loader = TestbedHarnessEnvironment.loader(TestBed.createComponent(Host));
  });

  it('reads both lines and the instant', async () => {
    const [stamp] = await loader.getAllHarnesses(WrDateStampHarness);
    expect(await stamp.getDate()).toBe('12.11.2026');
    expect(await stamp.getTime()).toBe('13:45');
    expect(await stamp.getDateTime()).toBe('2026-11-12T08:45:00.000Z');
    expect(await stamp.isEmpty()).toBe(false);
    await expect(stamp.getEmptyText()).rejects.toThrow(/shows a date/);
  });

  it('reads a date-only value as a date with no time', async () => {
    const day = (await loader.getAllHarnesses(WrDateStampHarness))[1];
    expect(await day.getDate()).toBe('12.11.2026');
    expect(await day.getTime()).toBeNull();
    expect(await day.getDateTime()).toBe('2026-11-12');
  });

  it('reads an empty stamp', async () => {
    const empty = await loader.getHarness(WrDateStampHarness.with({ empty: true }));
    expect(await empty.getEmptyText()).toBe('n/a');
    expect(await empty.getDate()).toBeNull();
    expect(await empty.getTime()).toBeNull();
    expect(await empty.getDateTime()).toBeNull();
  });

  it('filters by the date line and by emptiness', async () => {
    expect(await loader.getAllHarnesses(WrDateStampHarness.with({ date: '12.11.2026' }))).toHaveLength(2);
    expect(await loader.getAllHarnesses(WrDateStampHarness.with({ date: /^13\./ }))).toHaveLength(0);
    expect(await loader.getAllHarnesses(WrDateStampHarness.with({ empty: false }))).toHaveLength(2);
  });
});
