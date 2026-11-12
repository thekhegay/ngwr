import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { provideWr } from 'ngwr';
import { withDates } from 'ngwr/date';
import { afterEach, describe, expect, it } from 'vitest';

import { WrDatePicker } from './date-picker';
import { WrDateRangePicker } from './date-range-picker';
import type { WrDateRange } from './types';

/**
 * Instants are written as UTC and zones as offsets, so the expectations hold in
 * whatever zone the runner is. `+05:30` is the offset a whole-hour shortcut
 * gets wrong.
 */
const INSTANT = new Date(Date.UTC(2026, 10, 12, 8, 15));

@Component({
  imports: [WrDatePicker],
  template: `<wr-date-picker [mode]="mode()" [format]="format()" timeFormat="24h" [(value)]="picked" />`,
})
class Host {
  readonly mode = signal<'date' | 'time' | 'datetime'>('datetime');
  readonly format = signal<string | null>('dd.MM.yyyy HH:mm');
  readonly picked = signal<Date | null>(INSTANT);
}

@Component({
  imports: [WrDateRangePicker],
  template: `<wr-date-range-picker mode="datetime" format="dd.MM.yyyy HH:mm" [(value)]="range" />`,
})
class RangeHost {
  readonly range = signal<WrDateRange | null>([INSTANT, new Date(Date.UTC(2026, 10, 13, 20, 0))]);
}

describe('the date pickers in a display time zone', () => {
  const zone = signal<string | null>('+05:30');
  let fixture: ComponentFixture<Host>;

  const field = (): HTMLInputElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input.wr-input')!;
  const timeInput = (label: string): HTMLInputElement =>
    document.querySelector<HTMLInputElement>(`.wr-time-picker__input[aria-label="${label}"]`)!;
  const selectedDay = (): string =>
    document.querySelector<HTMLElement>('.wr-calendar__day--selected')?.textContent?.trim() ?? '';

  const type = (text: string): void => {
    field().value = text;
    field().dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  };

  const open = (): void => {
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.wr-date-picker__trigger')!.click();
    fixture.detectChanges();
  };

  const setup = (configure?: (host: Host) => void): void => {
    zone.set('+05:30');
    TestBed.configureTestingModule({
      providers: [provideWr(withDates({ locale: 'en-US', timeZone: zone }))],
    });
    fixture = TestBed.createComponent(Host);
    configure?.(fixture.componentInstance);
    fixture.detectChanges();
  };

  afterEach(() => fixture?.destroy());

  it('shows a datetime value on the wall clock of the zone', () => {
    setup();
    expect(field().value).toBe('12.11.2026 13:45');
  });

  it('reads typed text on the wall clock of the zone and keeps the model an instant', () => {
    setup();
    type('13.11.2026 00:10');
    expect(fixture.componentInstance.picked()?.getTime()).toBe(Date.UTC(2026, 10, 12, 18, 40));
  });

  it('draws the panel on the wall clock of the zone', () => {
    // 20:00 UTC on the 12th is 01:30 on the 13th at +05:30.
    setup(host => host.picked.set(new Date(Date.UTC(2026, 10, 12, 20, 0))));
    open();
    expect(selectedDay()).toBe('13');
    expect(timeInput('Hours').value).toBe('01');
    expect(timeInput('Minutes').value).toBe('30');
  });

  it('commits a day picked in the panel as that day in the zone, the time kept', () => {
    setup();
    open();
    const day = [...document.querySelectorAll<HTMLButtonElement>('.wr-calendar__day')]
      .filter(cell => !cell.classList.contains('wr-calendar__day--out-of-month'))
      .find(cell => cell.textContent?.trim() === '20')!;
    day.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.picked()?.getTime()).toBe(Date.UTC(2026, 10, 20, 8, 15));
    expect(field().value).toBe('20.11.2026 13:45');
  });

  it('shows a time-only value on the wall clock of the zone', () => {
    setup(host => {
      host.mode.set('time');
      host.format.set('HH:mm');
    });
    expect(field().value).toBe('13:45');
    type('14:00');
    expect(fixture.componentInstance.picked()?.getTime()).toBe(Date.UTC(2026, 10, 12, 8, 30));
  });

  it('rewrites the field when the zone arrives later, the model untouched', () => {
    setup();
    zone.set('-03:00');
    fixture.detectChanges();
    expect(field().value).toBe('12.11.2026 05:15');
    expect(fixture.componentInstance.picked()).toBe(INSTANT);
  });

  it.each(['+14:00', '-12:00'])('does not move a date-only value: %s', offset => {
    // A day is the browser-local midnight the calendar emits, in every zone.
    setup(host => {
      host.mode.set('date');
      host.format.set('dd.MM.yyyy');
      host.picked.set(new Date(2026, 10, 12));
    });
    zone.set(offset);
    fixture.detectChanges();
    expect(field().value).toBe('12.11.2026');

    type('15.11.2026');
    expect(fixture.componentInstance.picked()?.getTime()).toBe(new Date(2026, 10, 15).getTime());

    open();
    expect(selectedDay()).toBe('15');
  });

  it('shows both ends of a datetime range on the wall clock of the zone', () => {
    zone.set('+05:30');
    TestBed.configureTestingModule({
      providers: [provideWr(withDates({ locale: 'en-US', timeZone: zone }))],
    });
    const range = TestBed.createComponent(RangeHost);
    range.detectChanges();
    const inputs = (range.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>(
      '.wr-date-range-picker__input'
    );
    expect([inputs[0].value, inputs[1].value]).toEqual(['12.11.2026 13:45', '14.11.2026 01:30']);

    inputs[0].value = '12.11.2026 10:00';
    inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    range.detectChanges();
    expect(range.componentInstance.range()?.[0]?.getTime()).toBe(Date.UTC(2026, 10, 12, 4, 30));
    range.destroy();
  });
});
