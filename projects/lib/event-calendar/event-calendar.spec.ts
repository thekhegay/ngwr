import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrDateFnsAdapter } from 'ngwr/date-adapter-fns';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrEventCalendar } from './event-calendar';
import type { WrCalendarEvent, WrCalendarEventChange, WrCalendarSlot, WrCalendarView } from './interfaces';

const AT = (day: number, hour = 9, minute = 0): Date => new Date(2026, 0, day, hour, minute);

const EVENTS: readonly WrCalendarEvent[] = [
  { id: 'standup', title: 'Standup', start: AT(14, 9), end: AT(14, 9, 30) },
  { id: 'review', title: 'Review', start: AT(14, 14), end: AT(14, 15) },
  { id: 'offsite', title: 'Offsite', start: AT(20, 10), end: AT(20, 12) },
];

@Component({
  imports: [WrEventCalendar],
  template: `
    <wr-event-calendar
      editable
      [events]="events()"
      [(view)]="view"
      [(date)]="date"
      (eventClick)="clicked.set($event)"
      (slotClick)="slot.set($event)"
      (eventChange)="changed.set($event)"
    />
  `,
})
class Host {
  readonly events = signal(EVENTS);
  readonly view = signal<WrCalendarView>('month');
  readonly date = signal(AT(14));
  readonly clicked = signal<WrCalendarEvent | null>(null);
  readonly slot = signal<WrCalendarSlot | null>(null);
  readonly changed = signal<WrCalendarEventChange | null>(null);
}

/**
 * Three views in one component, and two rules that hold across all of them.
 *
 * The first is structural: a chip always lives INSIDE the `role="gridcell"` it
 * starts in and reaches out with a `calc()` width. A floating events layer
 * would be simpler in the template and would leave `role="row"` owning
 * something other than cells, which the axe gate rejects — so "the chip's
 * closest ancestor is a gridcell" is a contract, not an implementation detail.
 *
 * The second is that `events` is an input the component NEVER mutates. A drag
 * or an `Alt` + arrow emits `eventChange` and the host applies it; an unhandled
 * output is a cancelled drag, and nothing on screen moves until the host says
 * so. Both are easy to "fix" into something that looks better and is wrong.
 */
@Component({
  imports: [WrEventCalendar],
  template: ` <wr-event-calendar view="day" [events]="events()" [date]="date" (eventChange)="changed.set($event)" /> `,
})
class ReadOnlyHost {
  readonly events = signal(EVENTS);
  readonly date = AT(14);
  readonly changed = signal<WrCalendarEventChange | null>(null);
}

describe('WrEventCalendar', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const grid = (): HTMLElement => root().querySelector<HTMLElement>('[role="grid"]')!;
  const rows = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('[role="row"]')];
  const cells = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('[role="gridcell"]')];
  const chips = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('.wr-event-calendar__chip')];
  const chipFor = (title: string): HTMLElement | undefined =>
    chips().find(c => (c.textContent ?? '').includes(title) || (c.getAttribute('aria-label') ?? '').includes(title));

  const setView = (view: WrCalendarView): void => {
    fixture.componentInstance.view.set(view);
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrDateFnsAdapter()] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  describe('the grid structure, in every view', () => {
    const views: readonly WrCalendarView[] = ['month', 'week', 'day'];

    it('builds a grid of rows of cells, whichever view is on', () => {
      for (const view of views) {
        setView(view);

        expect(grid()).not.toBeNull();
        expect(rows().length).toBeGreaterThan(0);
        expect(cells().length).toBeGreaterThan(0);
      }
    });

    it('keeps every chip inside a gridcell, whichever view is on', () => {
      for (const view of views) {
        setView(view);
        const found = chips();
        if (found.length === 0) continue;

        // The rule the template comment spells out: a floating events layer
        // would leave `role="row"` owning something that is not a cell, and the
        // axe gate rejects exactly that.
        expect(found.every(c => c.closest('[role="gridcell"]') !== null)).toBe(true);
      }
    });

    it('lets a row own nothing but cells and column headers', () => {
      for (const view of views) {
        setView(view);

        for (const row of rows()) {
          const owned = [...row.children].map(c => c.getAttribute('role') ?? '-');
          // `rowheader` is the time gutter down the left of the week / day
          // grids — it labels its row, which is exactly what the role is for.
          expect(owned.every(r => r === 'gridcell' || r === 'columnheader' || r === 'rowheader' || r === '-')).toBe(
            true
          );
        }
      }
    });
  });

  describe('views', () => {
    it('shows a month of cells in month view', () => {
      setView('month');

      // Six weeks of seven days is the standard month grid.
      expect(cells().length).toBeGreaterThanOrEqual(28);
    });

    it('narrows to a single date column in day view', () => {
      const dateColumns = (): number => [...root().querySelectorAll('.wr-event-calendar__colhead')].length;

      setView('week');
      expect(dateColumns()).toBe(7);

      setView('day');
      expect(dateColumns()).toBe(1);

      // Counting CELLS would say the opposite: a day is a time grid of
      // half-hour slots, so it holds more of them than a month holds days.
      expect(cells().length).toBeGreaterThan(0);
    });

    it('shows only the events that fall in the visible range', () => {
      setView('day');

      // The 14th holds two; the offsite on the 20th is out of range.
      expect(chipFor('Standup')).toBeTruthy();
      expect(chipFor('Offsite')).toBeFalsy();
    });

    it('follows the date it is told to show', () => {
      setView('day');
      fixture.componentInstance.date.set(AT(20));
      fixture.detectChanges();

      expect(chipFor('Offsite')).toBeTruthy();
      expect(chipFor('Standup')).toBeFalsy();
    });
  });

  describe('outputs', () => {
    it('reports a clicked event rather than acting on it', () => {
      setView('day');
      chipFor('Standup')!.click();
      fixture.detectChanges();

      expect(fixture.componentInstance.clicked()?.id).toBe('standup');
    });

    it('reports a clicked empty slot with the date it was on', () => {
      setView('month');
      const empty = cells().find(c => c.querySelector('.wr-event-calendar__chip') === null)!;
      empty.click();
      fixture.detectChanges();

      const picked = fixture.componentInstance.slot();
      expect(picked?.start).toBeInstanceOf(Date);
      // Month view has no time of day, so the slot is the whole day.
      expect(picked?.allDay).toBe(true);
    });

    it('never mutates the events array it was given', () => {
      const before = fixture.componentInstance.events();
      setView('day');

      const chip = chipFor('Standup')!;
      chip.focus();
      chip.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true, cancelable: true })
      );
      fixture.detectChanges();

      // `editable` is on, so this is the real move path rather than a refusal.
      // The input is still the host's data: an unhandled `eventChange` is a
      // cancelled drag, nothing moves until the host applies it, and the array
      // must come back IDENTICAL rather than merely equal.
      expect(fixture.componentInstance.events()).toBe(before);
      expect(before[0].start.getTime()).toBe(AT(14, 9).getTime());
    });

    it('emits the move as a before / after pair for the host to apply', () => {
      setView('day');

      const chip = chipFor('Standup')!;
      chip.focus();
      chip.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true, cancelable: true })
      );
      fixture.detectChanges();

      const change = fixture.componentInstance.changed();
      expect(change?.event.id).toBe('standup');
      // Alt + arrow is the keyboard equivalent of the drag and emits the same
      // output, so a host that handles one handles both.
      expect(change?.start.getTime()).not.toBe(AT(14, 9).getTime());
    });

    it('refuses to move anything in a read-only calendar', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [provideWrDateFnsAdapter()] });
      const readOnly = TestBed.createComponent(ReadOnlyHost);
      readOnly.detectChanges();

      const chip = [
        ...(readOnly.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.wr-event-calendar__chip'),
      ][0];
      chip.focus();
      chip.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true, cancelable: true })
      );
      readOnly.detectChanges();

      // `editable` is off by default, and a calendar that is only being READ
      // must not hand its host a move to apply.
      expect(readOnly.componentInstance.changed()).toBeNull();
      readOnly.destroy();
    });

    it('leaves a bare arrow to the grid rather than moving the event', () => {
      setView('day');

      const chip = chipFor('Standup')!;
      chip.focus();
      chip.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
      fixture.detectChanges();

      // Without Alt the arrows navigate. Moving on a bare arrow would make the
      // grid impossible to walk without editing it.
      expect(fixture.componentInstance.changed()).toBeNull();
    });
  });

  it('names every chip for a screen reader', () => {
    setView('day');

    // The title text inside is `aria-hidden` so it is not read twice; the name
    // has to come from the button itself.
    expect(chips().every(c => (c.getAttribute('aria-label') ?? '').length > 0)).toBe(true);
  });

  it('carries the public BEM classes', () => {
    expect(root().querySelector('wr-event-calendar')!.className).toContain('wr-event-calendar');
  });
});
