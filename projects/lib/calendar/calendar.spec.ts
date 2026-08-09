import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrDateFnsAdapter } from 'ngwr/date-adapter-fns';
import { beforeEach, describe, expect, it } from 'vitest';

import { WrCalendar } from './calendar';
import type { WrCalendarRange } from './interfaces';

@Component({
  imports: [WrCalendar],
  template: `<wr-calendar [date]="date()" [min]="min()" [max]="max()" [dateFilter]="filter()" />`,
})
class Host {
  readonly date = signal<Date | null>(new Date(2026, 0, 15));
  readonly min = signal<Date | null>(null);
  readonly max = signal<Date | null>(null);
  readonly filter = signal<((d: Date) => boolean) | null>(null);
}

@Component({
  imports: [WrCalendar],
  template: `<wr-calendar [mode]="mode()" [range]="range()" [autoFocus]="autoFocus()" />`,
})
class AutoFocusHost {
  readonly mode = signal<'single' | 'range'>('range');
  readonly range = signal<WrCalendarRange>([null, null]);
  readonly autoFocus = signal(true);
}

describe('WrCalendar keyboard focus', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const grid = (): HTMLElement => root().querySelector<HTMLElement>('[role="grid"]')!;
  const ring = (): string | undefined => root().querySelector('.wr-calendar__day--focused')?.textContent?.trim();
  const active = (): string | undefined => (document.activeElement as HTMLElement | null)?.textContent?.trim();
  const tabStops = (): HTMLButtonElement[] => [
    ...root().querySelectorAll<HTMLButtonElement>('.wr-calendar__day[tabindex="0"]'),
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideWrDateFnsAdapter()] });
    fixture = TestBed.createComponent(Host);
  });

  it('moves REAL focus with the ring, not just the ring', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    root().querySelector<HTMLElement>('.wr-calendar__day--focused')!.focus();

    // Dispatch and let ONLY the scheduler settle it. A synchronous
    // `detectChanges()` here would update the DOM before the deferred focus
    // call and hide the very thing this guards: under zoneless CD the
    // scheduler runs in a macrotask, so the old `queueMicrotask` fired first
    // and focused the cell we had just left. The ring said 16, the screen
    // reader said 15, for the rest of the session.
    grid().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    await fixture.whenStable();

    expect(ring()).toBe('16');
    expect(active()).toBe('16');
  });

  it('keeps them together across several moves', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    root().querySelector<HTMLElement>('.wr-calendar__day--focused')!.focus();

    for (const key of ['ArrowRight', 'ArrowRight', 'ArrowDown']) {
      grid().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      await fixture.whenStable();
    }

    expect(active()).toBe(ring());
    expect(ring()).toBe('24');
  });

  it('refuses to step the ring below min, keeping the grid tabbable', async () => {
    // The roving tabindex means the ring IS the grid's only tab stop. Parked on
    // a `disabled` button it is unfocusable, so the grid drops out of the tab
    // order entirely — tab out once and there is no way back in. The count is
    // the assertion that matters: jsdom refuses to focus disabled buttons too,
    // so `activeElement` alone would call this fixed while it was still broken.
    fixture.componentInstance.min.set(new Date(2026, 0, 15));
    fixture.detectChanges();
    await fixture.whenStable();

    grid().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    await fixture.whenStable();

    expect(ring()).toBe('15');
    expect(tabStops()).toHaveLength(1);
    expect(tabStops()[0].disabled).toBe(false);
  });

  it('steps the ring ACROSS a disabled weekend rather than onto it', async () => {
    // Direction is the whole point: probing forward first — which is what the
    // seeding helper does — would bounce an ArrowLeft back onto the Monday it
    // started from, and the ring could never cross the hole at all.
    fixture.componentInstance.date.set(new Date(2026, 0, 12)); // a Monday
    fixture.componentInstance.filter.set(d => d.getDay() !== 0 && d.getDay() !== 6);
    fixture.detectChanges();
    await fixture.whenStable();

    grid().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    await fixture.whenStable();

    expect(ring()).toBe('9'); // the Friday before, not Sunday the 11th
    expect(active()).toBe('9');
    expect(tabStops()[0].disabled).toBe(false);
  });

  it('seeds the tab stop on a selectable day when today is out of range', async () => {
    // The roving tabindex means this cell is the grid's ONLY tab stop. Seeded
    // on a disabled day — which a `min` in the future does to "today" — that
    // stop is an unfocusable button and the whole grid drops out of the tab
    // order.
    fixture.componentInstance.date.set(null);
    fixture.componentInstance.min.set(new Date(2027, 0, 1));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(tabStops()).toHaveLength(1);
    expect(tabStops()[0].disabled).toBe(false);
  });

  it('steps past a dateFilter hole to reach a selectable day', async () => {
    fixture.componentInstance.date.set(null);
    // Everything up to the 20th of the current month is closed off.
    fixture.componentInstance.filter.set(d => d.getDate() > 20);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(tabStops()).toHaveLength(1);
    expect(tabStops()[0].disabled).toBe(false);
  });

  it('still seeds on the selected date when that date is selectable', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(ring()).toBe('15');
    expect(tabStops()[0].disabled).toBe(false);
  });
});

describe('WrCalendar autoFocus', () => {
  const cell = (): HTMLElement | null => document.querySelector('.wr-calendar__day--focused');

  beforeEach(() => TestBed.configureTestingModule({ providers: [provideWrDateFnsAdapter()] }));

  it('takes focus in range mode with neither end picked', async () => {
    // The seed reads `date() ?? range()[0] ?? today()`, so range mode leans on
    // the LAST fallback here. `wr-date-range-picker` opens in exactly this
    // state, which makes it the case that matters and the one a single-mode
    // test would never reach.
    const fixture = TestBed.createComponent(AutoFocusHost);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(document.activeElement).toBe(cell());
    expect((document.activeElement as HTMLButtonElement).disabled).toBe(false);
  });

  it('seeds on the start of a half-picked range, not on today', async () => {
    const fixture = TestBed.createComponent(AutoFocusHost);
    fixture.componentInstance.range.set([new Date(2026, 5, 9), null]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(cell()?.textContent?.trim()).toBe('9');
    expect(document.activeElement).toBe(cell());
  });

  it('stays off by default so a calendar in a page does not steal focus', async () => {
    const fixture = TestBed.createComponent(AutoFocusHost);
    fixture.componentInstance.autoFocus.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    // The ring is still seeded — it is the tab stop. What must NOT happen is
    // real focus moving to it on load.
    expect(cell()).not.toBeNull();
    expect(document.activeElement).not.toBe(cell());
  });
});
