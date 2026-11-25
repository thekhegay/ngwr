import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { provideWr } from 'ngwr';
import { withDates } from 'ngwr/date';
import { describe, expect, it, vi } from 'vitest';

import { WrCalendar } from './calendar';
import type { WrCalendarGranularity, WrCalendarMode } from './types';

@Component({
  imports: [WrCalendar],
  template: `<wr-calendar
    [showToday]="show()"
    [mode]="mode()"
    [granularity]="granularity()"
    [(date)]="date"
    [min]="min()"
    [max]="max()"
    [readonly]="readonly()"
  />`,
})
class Host {
  readonly show = signal(true);
  readonly mode = signal<WrCalendarMode>('single');
  readonly granularity = signal<WrCalendarGranularity>('day');
  readonly date = signal<Date | null>(new Date(2020, 0, 15));
  readonly min = signal<Date | null>(null);
  readonly max = signal<Date | null>(null);
  readonly readonly = signal(false);
}

describe('WrCalendar showToday', () => {
  const setup = (): { fixture: ComponentFixture<Host>; root: HTMLElement; button: () => HTMLButtonElement | null } => {
    TestBed.configureTestingModule({ providers: [provideWr(withDates())] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const button = (): HTMLButtonElement | null => root.querySelector('.wr-calendar__today');
    return { fixture, root, button };
  };
  const sameDay = (a: Date | null, b: Date): boolean => !!a && a.toDateString() === b.toDateString();

  it('renders no button by default', () => {
    const { fixture, button } = setup();
    fixture.componentInstance.show.set(false);
    fixture.detectChanges();
    expect(button()).toBeNull();
  });

  it('picks today and shows its month on click', () => {
    const { fixture, root, button } = setup();
    expect(button()?.textContent?.trim()).toBe('Today');

    button()!.click();
    fixture.detectChanges();

    const now = new Date();
    expect(sameDay(fixture.componentInstance.date(), now)).toBe(true);
    expect(root.querySelector('.wr-calendar__day--selected')?.classList.contains('wr-calendar__day--today')).toBe(true);
  });

  it('is disabled and picks nothing when today is out of range', () => {
    const { fixture, button } = setup();
    fixture.componentInstance.max.set(new Date(2020, 11, 31));
    fixture.detectChanges();

    expect(button()!.disabled).toBe(true);
    button()!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.date()).toEqual(new Date(2020, 0, 15));
  });

  it('is disabled while readonly', () => {
    const { fixture, button } = setup();
    fixture.componentInstance.readonly.set(true);
    fixture.detectChanges();
    expect(button()!.disabled).toBe(true);
  });

  it('activates from the keyboard instead of selecting the focused day', () => {
    const { fixture, button } = setup();
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    button()!.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(fixture.componentInstance.date()).toEqual(new Date(2020, 0, 15));
  });

  it('reads the current day when it activates', () => {
    const { fixture, button } = setup();
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(new Date(2031, 4, 9, 12));
      button()!.click();
      fixture.detectChanges();
      expect(fixture.componentInstance.date()?.toDateString()).toBe(new Date(2031, 4, 9).toDateString());
    } finally {
      vi.useRealTimers();
    }
  });

  it('is not rendered in range mode or under a period granularity', () => {
    const { fixture, button } = setup();
    fixture.componentInstance.mode.set('range');
    fixture.detectChanges();
    expect(button()).toBeNull();

    fixture.componentInstance.mode.set('single');
    fixture.componentInstance.granularity.set('month');
    fixture.detectChanges();
    expect(button()).toBeNull();
  });
});
