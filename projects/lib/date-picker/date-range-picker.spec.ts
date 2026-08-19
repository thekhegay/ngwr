import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { provideWrDateAdapter } from 'ngwr/date-adapter';
import { WrFormField } from 'ngwr/form';
import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrDateRangePicker } from './date-range-picker';
import type { WrDateRange } from './interfaces';

/**
 * Sibling of `date-picker.spec.ts`, and the same overlay caveat applies: the
 * panel mounts into the CDK container rather than the fixture, so panel content
 * is queried off `document` and `provideWrOverlay()` keeps this file's container
 * out of the next one's.
 *
 * What is NOT shared is the reason this suite exists. The range picker carries
 * two text inputs over one calendar, and almost everything that can go wrong
 * here is about which of the two ends an interaction belongs to — which end
 * opened the popup, which end a typed date lands in, which end keeps its time
 * when the dates swap. A single-field suite cannot reach any of it.
 */
@Component({
  imports: [WrDateRangePicker],
  template: `
    <wr-date-range-picker
      startPlaceholder="From"
      endPlaceholder="To"
      [(value)]="period"
      [mode]="mode()"
      [format]="format()"
      [minDate]="minDate()"
      [maxDate]="maxDate()"
      [dateFilter]="dateFilter()"
      [timeFormat]="timeFormat()"
      [disabled]="disabled()"
      [readonly]="readonly()"
      (touch)="touched.set(touched() + 1)"
    />
  `,
})
class Host {
  readonly period = signal<WrDateRange | null>(null);
  readonly mode = signal<'date' | 'datetime'>('date');
  readonly format = signal<string | null>('dd.MM.yyyy');
  readonly minDate = signal<Date | null>(null);
  readonly maxDate = signal<Date | null>(null);
  readonly dateFilter = signal<((date: Date) => boolean) | null>(null);
  readonly timeFormat = signal<'auto' | '12h' | '24h'>('24h');
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  readonly touched = signal(0);
}

@Component({
  imports: [WrDateRangePicker, WrFormField],
  template: `<wr-form-field label="Trip dates"><wr-date-range-picker /></wr-form-field>`,
})
class FieldHost {}

describe('WrDateRangePicker', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const fields = (): HTMLInputElement[] => [...root().querySelectorAll<HTMLInputElement>('input.wr-input')];
  const startField = (): HTMLInputElement => fields()[0];
  const endField = (): HTMLInputElement => fields()[1];
  const trigger = (): HTMLButtonElement => root().querySelector<HTMLButtonElement>('.wr-date-picker__trigger')!;

  const calendar = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-calendar');
  const period = (): WrDateRange | null => fixture.componentInstance.period();

  /** Day cells of the displayed month only — the grid always spills into its neighbours. */
  const day = (date: number): HTMLButtonElement =>
    [...document.querySelectorAll<HTMLButtonElement>('.wr-calendar__day')]
      .filter(cell => !cell.classList.contains('wr-calendar__day--out-of-month'))
      .find(cell => cell.textContent?.trim() === String(date))!;

  const open = (): void => {
    trigger().click();
    fixture.detectChanges();
  };

  const type = (field: HTMLInputElement, text: string): void => {
    field.value = text;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  };

  /** Blur with an explicit `relatedTarget`, which is what decides `touch`. */
  const blurTo = (field: HTMLInputElement, next: Element | null): void => {
    field.dispatchEvent(new FocusEvent('blur', { relatedTarget: next, bubbles: false }));
    fixture.detectChanges();
  };

  const iso = (d: Date | null | undefined): string | null =>
    d ? `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:${d.getMinutes()}` : null;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideWrOverlay(), provideWrDateAdapter({ locale: 'en-US' })] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders two named inputs and a trigger', () => {
    expect(fields()).toHaveLength(2);
    expect(startField().getAttribute('aria-label')).toBe('Range start');
    expect(endField().getAttribute('aria-label')).toBe('Range end');
    expect(trigger().getAttribute('aria-haspopup')).toBe('dialog');
  });

  it('carries the public BEM classes, including the mode modifier', () => {
    const host = root().querySelector('wr-date-range-picker')!;
    expect([...host.classList]).toEqual(expect.arrayContaining(['wr-date-range-picker', 'wr-date-range-picker--date']));
  });

  it('renders the bound range through the given format, one end per input', () => {
    fixture.componentInstance.period.set([new Date(2025, 0, 15), new Date(2025, 0, 20)]);
    fixture.detectChanges();

    expect([startField().value, endField().value]).toEqual(['15.01.2025', '20.01.2025']);
  });

  it('leaves the other input empty while the range is half-picked', () => {
    fixture.componentInstance.period.set([new Date(2025, 0, 15), null]);
    fixture.detectChanges();

    expect([startField().value, endField().value]).toEqual(['15.01.2025', '']);
  });

  it('commits a typed date into the end it was typed in', () => {
    type(endField(), '20.01.2025');

    expect(iso(period()?.[1])).toBe('2025-1-20 0:0');
    expect(period()?.[0]).toBeNull();
  });

  it('refuses a typed date outside minDate / maxDate', () => {
    fixture.componentInstance.minDate.set(new Date(2025, 0, 10));
    fixture.detectChanges();
    type(startField(), '05.01.2025');

    expect(period()).toBeNull();
  });

  it('refuses a typed date the dateFilter rejects, matching what the grid disables', () => {
    fixture.componentInstance.dateFilter.set(d => d.getDate() !== 17);
    fixture.detectChanges();
    type(startField(), '17.01.2025');

    expect(period()).toBeNull();
  });

  it('does not reorder mid-keystroke — only on blur', () => {
    type(startField(), '20.01.2025');
    type(endField(), '15.01.2025');

    // Swapping here would move the text the user is still typing into the other
    // input, under their cursor.
    expect([iso(period()?.[0]), iso(period()?.[1])]).toEqual(['2025-1-20 0:0', '2025-1-15 0:0']);

    blurTo(endField(), null);
    expect([iso(period()?.[0]), iso(period()?.[1])]).toEqual(['2025-1-15 0:0', '2025-1-20 0:0']);
    expect([startField().value, endField().value]).toEqual(['15.01.2025', '20.01.2025']);
  });

  it('does not reorder on the hop from one end to the other', () => {
    fixture.componentInstance.period.set([new Date(2025, 0, 10), new Date(2025, 0, 20)]);
    fixture.detectChanges();

    type(startField(), '25.01.2025');
    blurTo(startField(), endField());

    // Sorting here swapped the fields under the user: the start they had just
    // typed jumped into the end field they were tabbing into, and the old end
    // date appeared under their cursor.
    expect([startField().value, endField().value]).toEqual(['25.01.2025', '20.01.2025']);

    blurTo(endField(), null);
    expect([startField().value, endField().value]).toEqual(['20.01.2025', '25.01.2025']);
  });

  it('emits touch when focus leaves the pair, not when it moves between the ends', () => {
    blurTo(startField(), endField());
    expect(fixture.componentInstance.touched()).toBe(0);

    blurTo(endField(), null);
    expect(fixture.componentInstance.touched()).toBe(1);
  });

  it('does not mark a bound field dirty just for tabbing through an untouched pair', () => {
    // `normalise()` allocates a fresh tuple every call and `model()` compares by
    // reference, so an unconditional write would emit on every blur.
    blurTo(startField(), null);
    blurTo(endField(), null);

    // Not just reference equality: writing `[null, null]` over the bound `null`
    // also flips a consumer's `@if (period())` from empty to truthy with neither
    // end picked.
    expect(period()).toBeNull();
    expect(fixture.componentInstance.period()).toBeFalsy();
  });

  it('picks a whole range from the grid and closes once both ends exist', () => {
    open();
    day(10).click();
    fixture.detectChanges();

    expect(calendar()).not.toBeNull();
    day(14).click();
    fixture.detectChanges();

    expect([period()?.[0]?.getDate(), period()?.[1]?.getDate()]).toEqual([10, 14]);
    expect(calendar()).toBeNull();
  });

  it('stays open in datetime mode, where the hours still have to be set', () => {
    fixture.componentInstance.mode.set('datetime');
    fixture.componentInstance.format.set('dd.MM.yyyy HH:mm');
    fixture.detectChanges();
    open();
    day(10).click();
    fixture.detectChanges();
    day(14).click();
    fixture.detectChanges();

    expect(calendar()).not.toBeNull();
  });

  describe('per-end time editing in datetime mode', () => {
    const stepUp = (end: 0 | 1): HTMLButtonElement =>
      [...document.querySelectorAll<HTMLButtonElement>('.wr-time-picker__step[aria-label="Increment hours"]')][end];
    const hoursOf = (end: 0 | 1): number | undefined => period()?.[end]?.getHours();

    const openDateTime = (start: Date, end: Date): void => {
      fixture.componentInstance.mode.set('datetime');
      fixture.componentInstance.format.set('dd.MM.yyyy HH:mm');
      fixture.componentInstance.period.set([start, end]);
      fixture.detectChanges();
      open();
    };

    it('opens the steppers on the bound time, not on midnight', () => {
      openDateTime(new Date(2025, 0, 5, 16, 0), new Date(2025, 0, 5, 17, 30));
      const hours = [...document.querySelectorAll<HTMLInputElement>('.wr-time-picker__input[aria-label="Hours"]')];
      const minutes = [...document.querySelectorAll<HTMLInputElement>('.wr-time-picker__input[aria-label="Minutes"]')];

      // Bound through `[ngModel]`, the steppers showed 00:00 for both ends and
      // the first click committed midnight-plus-one over the real value — the
      // popup lied about the range and then destroyed it.
      expect([hours[0].value, minutes[0].value]).toEqual(['16', '00']);
      expect([hours[1].value, minutes[1].value]).toEqual(['17', '30']);
    });

    it('keeps a start-time edit on the START, even past the end', () => {
      openDateTime(new Date(2025, 0, 5, 16, 0), new Date(2025, 0, 5, 17, 0));

      stepUp(0).click();
      fixture.detectChanges();
      expect([hoursOf(0), hoursOf(1)]).toEqual([17, 17]);

      // The click that crosses the other end. Sorting here left the start stuck
      // at 17 and moved the END to 18 — the user pressed the start's + button
      // and watched the other end change, once per click, forever.
      stepUp(0).click();
      fixture.detectChanges();
      expect([hoursOf(0), hoursOf(1)]).toEqual([18, 17]);
    });

    it('settles the ordering once the popup closes', () => {
      openDateTime(new Date(2025, 0, 5, 16, 0), new Date(2025, 0, 5, 17, 0));
      stepUp(0).click();
      stepUp(0).click();
      fixture.detectChanges();
      expect([hoursOf(0), hoursOf(1)]).toEqual([18, 17]);

      trigger().click();
      fixture.detectChanges();

      // Inverted is allowed WHILE editing, not after. Closing is the end of the
      // interaction, and the only exit an outside click passes through.
      expect([hoursOf(0), hoursOf(1)]).toEqual([17, 18]);
      expect([startField().value, endField().value]).toEqual(['05.01.2025 17:00', '05.01.2025 18:00']);
    });

    it('still sorts a range drawn backwards on the calendar', () => {
      // The calendar path keeps sorting: clicking the 20th and then the 10th is
      // one gesture with no "end being edited", so there is nothing to protect.
      open();
      day(20).click();
      fixture.detectChanges();
      day(10).click();
      fixture.detectChanges();

      expect([period()?.[0]?.getDate(), period()?.[1]?.getDate()]).toEqual([10, 20]);
    });
  });

  describe('the popup as a named dialog', () => {
    it('presents the pane as a dialog the trigger points at', () => {
      open();
      const pane = document.querySelector('.wr-date-picker-overlay')!;

      // The trigger has always advertised `aria-haspopup="dialog"`. Until the
      // pane carried a role and a name, following that promise landed a screen
      // reader on an anonymous group.
      expect(pane.getAttribute('role')).toBe('dialog');
      expect(pane.getAttribute('aria-label')).toBe('Choose date range');
      expect(pane.getAttribute('aria-modal')).toBe('false');
      expect(trigger().getAttribute('aria-controls')).toBe(pane.id);
      expect(pane.id).toBeTruthy();
    });

    it('names the popup for the mode, and lets the host override it', () => {
      fixture.componentInstance.mode.set('datetime');
      fixture.detectChanges();
      open();
      expect(document.querySelector('.wr-date-picker-overlay')!.getAttribute('aria-label')).toBe(
        'Choose date and time range'
      );
    });

    it('drops aria-controls again once the popup is gone', () => {
      open();
      expect(trigger().getAttribute('aria-controls')).toBeTruthy();

      trigger().click();
      fixture.detectChanges();
      expect(trigger().getAttribute('aria-controls')).toBeNull();
      expect(trigger().getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('focus, moving into the popup and back out', () => {
    const ring = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-calendar__day--focused');

    const keyOn = (field: HTMLInputElement, init: KeyboardEventInit): KeyboardEvent => {
      const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
      field.dispatchEvent(event);
      fixture.detectChanges();
      return event;
    };

    it('moves focus to the roving day cell when opened from the trigger', async () => {
      trigger().focus();
      open();
      await fixture.whenStable();

      // jsdom will happily focus a disabled button, so `activeElement` alone
      // would greenlight a seed that lands on an unselectable day.
      expect(document.activeElement).toBe(ring());
      expect((document.activeElement as HTMLButtonElement).disabled).toBe(false);
    });

    it('leaves the caret alone when a field click opens it', async () => {
      endField().focus();
      endField().click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(calendar()).not.toBeNull();
      expect(document.activeElement).toBe(endField());
    });

    it('opens and takes focus on Alt+ArrowDown, from either end', async () => {
      for (const field of [startField, endField]) {
        field().focus();
        const event = keyOn(field(), { key: 'ArrowDown', altKey: true });
        await fixture.whenStable();

        expect({ open: calendar() !== null, prevented: event.defaultPrevented }).toEqual({
          open: true,
          prevented: true,
        });
        expect(document.activeElement).toBe(ring());

        trigger().click();
        fixture.detectChanges();
      }
    });

    it('leaves a bare ArrowDown to the field while the popup is closed', () => {
      for (const field of [startField, endField]) {
        field().focus();
        const event = keyOn(field(), { key: 'ArrowDown' });

        // Alt is what means "open the popup". Without it the arrow belongs to
        // the field, or every text cursor movement would raise a dialog and
        // take the caret with it.
        expect({ open: calendar() !== null, prevented: event.defaultPrevented }).toEqual({
          open: false,
          prevented: false,
        });
        expect(document.activeElement).toBe(field());
      }
    });

    it('walks focus in on a bare ArrowDown once the popup is open', async () => {
      startField().focus();
      startField().click();
      fixture.detectChanges();

      const event = keyOn(startField(), { key: 'ArrowDown' });
      await fixture.whenStable();

      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(ring());
    });

    it('leaves typing alone while the popup is open', async () => {
      endField().focus();
      endField().click();
      fixture.detectChanges();
      await fixture.whenStable();

      // Without the vertical-arrow guard EVERY key routes into the panel: the
      // caret jumps to the grid on the first character and both fields become
      // untypeable the moment the popup is up.
      for (const key of ['1', 'Backspace', 'ArrowLeft', 'Home', '.']) {
        const event = keyOn(endField(), { key });
        await fixture.whenStable();

        expect({ key, prevented: event.defaultPrevented, focused: document.activeElement === endField() }).toEqual({
          key,
          prevented: false,
          focused: true,
        });
      }
    });

    it('leaves focus where the user put it when Escape comes from a field', () => {
      // Escape reaches this overlay from anywhere — the CDK dispatches it to
      // the topmost one. Forcing a restore would drag the caret out of the end
      // field, which the user is typing in, back to the start field that
      // happened to open the popup.
      startField().focus();
      startField().click();
      fixture.detectChanges();
      endField().focus();

      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      fixture.detectChanges();

      expect(calendar()).toBeNull();
      expect(document.activeElement).toBe(endField());
    });

    it('hands focus back to the END field when the end field opened it', async () => {
      // The case the old code could not express: it restored to the start input
      // unconditionally, so dismissing from the end field threw the caret
      // across the control to the other end.
      endField().focus();
      endField().click();
      fixture.detectChanges();
      keyOn(endField(), { key: 'ArrowDown' });
      await fixture.whenStable();
      expect(document.activeElement).toBe(ring());

      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      fixture.detectChanges();

      expect(calendar()).toBeNull();
      expect(document.activeElement).toBe(endField());
    });

    it('hands focus back to the trigger after the range completes', async () => {
      trigger().focus();
      open();
      await fixture.whenStable();

      day(10).click();
      fixture.detectChanges();
      day(14).click();
      fixture.detectChanges();

      expect(calendar()).toBeNull();
      expect(document.activeElement).toBe(trigger());
    });

    it('does not steal focus when an outside click closes the popup', () => {
      const elsewhere = document.createElement('button');
      document.body.appendChild(elsewhere);
      try {
        startField().focus();
        startField().click();
        fixture.detectChanges();

        elsewhere.focus();
        document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        elsewhere.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        fixture.detectChanges();

        // Focus already moved on by itself; yanking it back would fight the
        // user for the control they just clicked.
        expect(document.activeElement).toBe(elsewhere);
      } finally {
        elsewhere.remove();
      }
    });

    it('lands on the day grid, not a time field, in datetime mode', async () => {
      fixture.componentInstance.mode.set('datetime');
      fixture.detectChanges();
      trigger().focus();
      open();
      await fixture.whenStable();

      expect(document.querySelector('.wr-time-picker')).not.toBeNull();
      expect(document.activeElement).toBe(ring());
    });
  });

  it('refuses to open while readonly — the calendar would rewrite both ends', () => {
    fixture.componentInstance.readonly.set(true);
    fixture.detectChanges();
    trigger().dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    startField().dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    // Stricter than the single picker on purpose — see the `readonly` doc.
    expect(calendar()).toBeNull();
    // And the trigger says so: left enabled it was a focusable button promising
    // `aria-haspopup="dialog"` for a dialog that never arrives.
    expect(trigger().disabled).toBe(true);
  });

  it('does not open while disabled', () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    trigger().dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(calendar()).toBeNull();
  });
});

/**
 * `<wr-form-field>` renders its `<label for>` before it can see what was
 * projected into it, so the id travels the other way: `wrInput` adopts the
 * field's `controlId`. This component renders TWO of them, and both adopted —
 * the same id twice in one document, which is invalid and leaves `label[for]`
 * resolving to whichever input happens to come first.
 *
 * The rule is the one `wr-slider` settled on for its two thumbs: one label
 * names one value, so the START input owns the id and the end input carries
 * none.
 */
describe('WrDateRangePicker inside a form field', () => {
  let fixture: ComponentFixture<FieldHost>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideWrOverlay(), provideWrDateAdapter({ locale: 'en-US' })] });
    fixture = TestBed.createComponent(FieldHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('gives the label exactly one target — the start input', () => {
    const root = fixture.nativeElement as HTMLElement;
    const label = root.querySelector<HTMLLabelElement>('label')!;
    const inputs = [...root.querySelectorAll<HTMLInputElement>('input.wr-input')];

    // Through the document rather than the attribute alone: an id that merely
    // exists somewhere is what the bug already looked like.
    expect(root.querySelectorAll(`#${CSS.escape(label.htmlFor)}`)).toHaveLength(1);
    expect(root.querySelector(`#${CSS.escape(label.htmlFor)}`)).toBe(inputs[0]);
    expect(inputs[1].getAttribute('id')).toBeNull();
  });
});
