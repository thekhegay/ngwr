import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrDateFnsAdapter } from 'ngwr/date-adapter-fns';
import { beforeEach, describe, expect, it } from 'vitest';

import { WrCalendar } from './calendar';

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
