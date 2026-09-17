import { type Direction, Directionality } from '@angular/cdk/bidi';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FormField, form } from '@angular/forms/signals';

import { provideWrDateAdapter } from 'ngwr/date';
import type { WrDateFormat } from 'ngwr/date';
import { WrFormField } from 'ngwr/form';
import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrDatePicker } from './date-picker';

/**
 * The picker is a text field plus a popover, and the popover is a CDK overlay —
 * the calendar / time panel land in the overlay container, not in the fixture,
 * so every query for panel content goes through the document. `provideWrOverlay`
 * keeps that container private to this file (a shared CDK root would hand its
 * leftovers to the next spec), and `provideWrDateAdapter` is mandatory: without
 * an adapter the picker cannot format or parse anything.
 *
 * The locale is pinned to `en-US` so the grid's first day of week is stable, and
 * the host passes an explicit token `format` — the named keys (`shortDate`, …)
 * go through `Intl`, whose output varies by ICU build.
 */
@Component({
  imports: [WrDatePicker],
  template: `
    <wr-date-picker
      placeholder="Pick a day"
      [(value)]="picked"
      [mode]="mode()"
      [format]="format()"
      [min]="min()"
      [max]="max()"
      [dateFilter]="dateFilter()"
      [timeFormat]="timeFormat()"
      [panelAriaLabel]="panelAriaLabel()"
      [disabled]="disabled()"
      [readonly]="readonly()"
      (touch)="touched.set(touched() + 1)"
    />
  `,
})
class Host {
  readonly picked = signal<Date | null>(new Date(2025, 0, 15, 10, 30));
  readonly mode = signal<'date' | 'time' | 'datetime'>('date');
  readonly format = signal<string | null>('dd.MM.yyyy');
  readonly min = signal<Date | undefined>(undefined);
  readonly max = signal<Date | undefined>(undefined);
  readonly dateFilter = signal<((date: Date) => boolean) | null>(null);
  readonly timeFormat = signal<'auto' | '12h' | '24h'>('24h');
  readonly panelAriaLabel = signal<string | null>(null);
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  readonly touched = signal(0);
}

describe('WrDatePicker', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-date-picker')!;
  const field = (): HTMLInputElement => root().querySelector<HTMLInputElement>('input.wr-input')!;
  const trigger = (): HTMLButtonElement => root().querySelector<HTMLButtonElement>('.wr-date-picker__trigger')!;

  const calendar = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-calendar');
  const timePanel = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-time-picker');
  const stepper = (label: string): HTMLButtonElement =>
    document.querySelector<HTMLButtonElement>(`.wr-time-picker__step[aria-label="${label}"]`)!;
  const timeInput = (label: string): HTMLInputElement =>
    document.querySelector<HTMLInputElement>(`.wr-time-picker__input[aria-label="${label}"]`)!;
  const picked = (): Date | null => fixture.componentInstance.picked();

  /** Day cells of the displayed month only — the grid always spills into its neighbours. */
  const day = (date: number): HTMLButtonElement =>
    [...document.querySelectorAll<HTMLButtonElement>('.wr-calendar__day')]
      .filter(cell => !cell.classList.contains('wr-calendar__day--out-of-month'))
      .find(cell => cell.textContent?.trim() === String(date))!;

  const open = (): void => {
    trigger().click();
    fixture.detectChanges();
  };

  /** A real `.click()` on a disabled control is swallowed by the DOM, which would
   * make "clicking it does nothing" true for the wrong reason. Dispatching the
   * event directly still reaches the Angular listener, so the component's own
   * guard is what gets tested. */
  const clickThrough = (el: Element): void => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  const type = (text: string): void => {
    field().value = text;
    field().dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideWrOverlay(), provideWrDateAdapter({ locale: 'en-US' })] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders the bound value through the given format', () => {
    expect(field().value).toBe('15.01.2025');
  });

  it('re-renders the field when [format] changes under an unchanged value', () => {
    // The sync effect used to read the format inside `untracked()`, so it
    // depended on `value()` alone and the field kept the old rendering.
    fixture.componentInstance.format.set('yyyy/MM/dd');
    fixture.detectChanges();

    expect(field().value).toBe('2025/01/15');
  });

  it('re-renders the field when [mode] changes the derived format', () => {
    fixture.componentInstance.format.set(null);
    fixture.detectChanges();
    const asDate = field().value;

    fixture.componentInstance.mode.set('datetime');
    fixture.detectChanges();

    // `shortDate` to `shortDateTime` — the exact strings come out of `Intl`,
    // so the assertion is that the rendering MOVED, and gained a time.
    expect(field().value).not.toBe(asDate);
    expect(field().value).toContain(asDate);
  });

  it('keeps the text the user is typing, which is what the echo guard is for', () => {
    // The guard has to skip our own writes without also skipping a format
    // change; a partial string must survive every keystroke.
    field().value = '16.01.202';
    field().dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    expect(field().value).toBe('16.01.202');
  });

  it('parses an edit to the displayed text against the format that produced it', () => {
    // The damaging half. The edit below starts from whatever is ON SCREEN, the
    // way a user's does. With a stale rendering there, `onInput` parsed it
    // against the NEW format, the parse failed, the model kept the old day and
    // `onBlur` overwrote the field — the edit vanished with no feedback.
    fixture.componentInstance.format.set('yyyy/MM/dd');
    fixture.detectChanges();

    field().value = field().value.replace('15', '16');
    field().dispatchEvent(new Event('input', { bubbles: true }));
    field().dispatchEvent(new Event('blur', { bubbles: true }));
    fixture.detectChanges();

    expect(picked()?.getDate()).toBe(16);
    expect(field().value).toBe('2025/01/16');
  });

  it('carries the public BEM classes, including the mode modifier', () => {
    // These are public API — consumers style against them.
    expect(host().classList.contains('wr-date-picker')).toBe(true);
    expect(host().classList.contains('wr-date-picker--date')).toBe(true);
    expect(trigger().classList.contains('wr-date-picker__trigger')).toBe(true);
  });

  it('names the text field after the placeholder when no ariaLabel is given', () => {
    // The field is the thing a screen reader lands on; with an empty placeholder
    // and no `ariaLabel` it would fall through to the catalog string instead of
    // going unnamed.
    expect(field().getAttribute('aria-label')).toBe('Pick a day');
  });

  it('puts the popup contract on the trigger, not on the text field', () => {
    // Per the APG date-picker-dialog pattern: `aria-haspopup` / `aria-expanded`
    // are not permitted on a plain textbox, so the button owns them.
    expect(trigger().getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(field().hasAttribute('aria-haspopup')).toBe(false);
    expect(field().hasAttribute('aria-expanded')).toBe(false);
  });

  it('renders no panel until it is opened', () => {
    expect(calendar()).toBeNull();
  });

  it('opens the calendar into the overlay container and flips aria-expanded', () => {
    open();

    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(calendar()).toBeTruthy();
    // The panel is NOT in the fixture — it is a portal in ngwr's own container,
    // which is what keeps it off CDK's shared root.
    expect(root().querySelector('.wr-calendar')).toBeNull();
    expect(document.querySelector('.wr-overlay-container')).toBeTruthy();
    expect(document.querySelector('.wr-date-picker-overlay')).toBeTruthy();
  });

  it('opens the calendar on the bound month, not on today', () => {
    open();
    expect(document.querySelector('.wr-calendar__label')?.textContent?.trim()).toBe('January 2025');
  });

  it('opens from a click on the text field too', () => {
    field().click();
    fixture.detectChanges();
    expect(calendar()).toBeTruthy();
  });

  it('closes again when the trigger is clicked a second time', () => {
    open();
    open();
    expect(calendar()).toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('writes the picked day back through the two-way binding and closes', () => {
    open();
    day(20).click();
    fixture.detectChanges();

    expect(picked()?.getFullYear()).toBe(2025);
    expect(picked()?.getMonth()).toBe(0);
    expect(picked()?.getDate()).toBe(20);
    // Date mode normalises to midnight — the 10:30 the value came in with is
    // gone. `datetime` mode is the one that preserves it (pinned below).
    expect(picked()?.getHours()).toBe(0);

    expect(field().value).toBe('20.01.2025');
    expect(calendar()).toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('marks the bound day as selected in the grid', () => {
    open();
    expect(day(15).getAttribute('aria-selected')).toBe('true');
    expect(day(15).classList.contains('wr-calendar__day--selected')).toBe(true);
  });

  it('closes on Escape without changing the value, and hands focus back to whatever opened it', () => {
    // The trigger opened it and the grid took focus, so the guarded restore
    // hands the caret back to the trigger — the element the user actually
    // pressed, which is the APG behaviour and what the range picker does.
    open();
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(calendar()).toBeNull();
    expect(picked()?.getDate()).toBe(15);
    expect(document.activeElement).toBe(trigger());
  });

  it('leaves focus where the user put it when Escape comes from outside the panel', () => {
    // Clicking the input opens the panel WITHOUT moving focus (see
    // `openOnInput`), so the user can carry on Tabbing with it open — and
    // Escape reaches this overlay from anywhere, the CDK dispatches it to the
    // topmost one. An unconditional `.focus()` on the field overrode the
    // guarded restore and dragged the caret backwards into the date field from
    // wherever the user had moved on to.
    const elsewhere = document.createElement('textarea');
    document.body.appendChild(elsewhere);

    try {
      field().click();
      fixture.detectChanges();
      expect(calendar()).toBeTruthy();

      elsewhere.focus();
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      fixture.detectChanges();

      expect(calendar()).toBeNull();
      expect(document.activeElement, 'the close stole the caret').toBe(elsewhere);
    } finally {
      elsewhere.remove();
    }
  });

  it('closes on a click outside the panel', () => {
    open();
    document.body.click();
    fixture.detectChanges();

    expect(calendar()).toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('refuses days outside min / max', () => {
    fixture.componentInstance.min.set(new Date(2025, 0, 10));
    fixture.componentInstance.max.set(new Date(2025, 0, 20));
    fixture.detectChanges();
    open();

    expect(day(5).getAttribute('aria-disabled')).toBe('true');
    expect(day(5).disabled).toBe(true);
    expect(day(25).getAttribute('aria-disabled')).toBe('true');
    expect(day(15).getAttribute('aria-disabled')).toBe('false');

    clickThrough(day(5));
    expect(picked()?.getDate()).toBe(15);
    expect(calendar()).toBeTruthy();
  });

  it('waits for a number rather than reading an emptied time box as zero', () => {
    // `Number('')` is 0, not NaN, so clearing the minutes to retype them committed
    // 00 and the padded display wrote it straight back into the box the user had
    // just cleared — retyping a time was impossible.
    fixture.componentInstance.mode.set('time');
    fixture.detectChanges();
    open();

    const box = timeInput('Minutes');
    expect(box.value).toBe('30');

    box.value = '';
    box.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    expect(picked()?.getMinutes()).toBe(30);
    expect(timeInput('Minutes').value).toBe('');
  });

  it('takes the number once it is typed', () => {
    fixture.componentInstance.mode.set('time');
    fixture.detectChanges();
    open();

    const box = timeInput('Minutes');
    box.value = '45';
    box.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    expect(picked()?.getMinutes()).toBe(45);
  });

  it('refuses a day rejected by dateFilter', () => {
    fixture.componentInstance.dateFilter.set(date => date.getDate() !== 20);
    fixture.detectChanges();
    open();

    expect(day(20).getAttribute('aria-disabled')).toBe('true');
    clickThrough(day(20));
    expect(picked()?.getDate()).toBe(15);
  });

  it('refuses a typed date rejected by dateFilter, as well as a clicked one', () => {
    // The grid disables filtered days, so accepting them from the keyboard let the
    // two entry paths disagree — the range picker carries this check with a
    // comment saying exactly that; the single picker had only min / max.
    fixture.componentInstance.dateFilter.set(date => date.getDate() !== 20);
    fixture.detectChanges();

    type('20.01.2025');
    expect(picked()?.getDate()).toBe(15);
  });

  it('still commits a typed date the filter allows', () => {
    fixture.componentInstance.dateFilter.set(date => date.getDate() !== 20);
    fixture.detectChanges();

    type('21.01.2025');
    expect(picked()?.getDate()).toBe(21);
  });

  it('takes a constraint that arrives while the panel is open', () => {
    // The bounds were pushed once, at attach — so a `[min]` that changed while
    // the popover was open kept the stale constraint until the next reopen, and
    // the grid went on offering days the model would refuse.
    open();
    expect(day(5).getAttribute('aria-disabled')).not.toBe('true');

    fixture.componentInstance.min.set(new Date(2025, 0, 10));
    fixture.detectChanges();

    expect(day(5).getAttribute('aria-disabled')).toBe('true');
  });

  it('shows a typed date in the datetime panel it has open', () => {
    // Nothing pushed the field's value into the datetime panel, so the panel kept
    // its own stale copy — and the next stepper click emitted that copy, silently
    // undoing what had just been typed.
    fixture.componentInstance.mode.set('datetime');
    fixture.componentInstance.format.set('dd.MM.yyyy HH:mm');
    fixture.detectChanges();
    open();

    type('20.01.2025 10:30');
    stepper('Increment hours').click();
    fixture.detectChanges();

    expect(picked()?.getDate()).toBe(20);
    expect(picked()?.getHours()).toBe(11);
  });

  it('commits a typed date that parses', () => {
    type('20.01.2025');
    expect(picked()?.getDate()).toBe(20);
    expect(picked()?.getMonth()).toBe(0);
  });

  it('ignores a typed date outside min / max', () => {
    // Bounds are enforced on the typed path too, not only in the grid — the
    // keyboard is the easy way around a disabled cell.
    fixture.componentInstance.min.set(new Date(2025, 0, 10));
    fixture.componentInstance.max.set(new Date(2025, 0, 20));
    fixture.detectChanges();

    type('25.01.2025');
    expect(picked()?.getDate()).toBe(15);

    // Control: the same keystrokes inside the bounds do commit, so the case
    // above cannot be passing merely because the text failed to parse.
    type('18.01.2025');
    expect(picked()?.getDate()).toBe(18);
  });

  it('clears the bound value when the field is emptied', () => {
    type('');
    expect(picked()).toBeNull();
  });

  it('keeps the last valid value while a partial entry is being typed, and keeps the entry on blur', () => {
    type('20.0');
    expect(picked()?.getDate()).toBe(15);

    // Blur used to write `15.01.2025` back over the entry, which is how a refusal
    // vanished without a word. The value is still untouched; the text stays for
    // the user to correct, and the field now says it was refused.
    field().dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(field().value).toBe('20.0');
    expect(picked()?.getDate()).toBe(15);
    expect(field().getAttribute('aria-invalid')).toBe('true');
  });

  it('emits touch on blur so a bound field can mark itself touched', () => {
    field().dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(fixture.componentInstance.touched()).toBe(1);
  });

  it('follows a value written from outside', () => {
    fixture.componentInstance.picked.set(new Date(2025, 5, 3));
    fixture.detectChanges();
    expect(field().value).toBe('03.06.2025');
  });

  it('offers a time stepper instead of a calendar in time mode', () => {
    fixture.componentInstance.mode.set('time');
    fixture.componentInstance.format.set('HH:mm');
    fixture.detectChanges();
    open();

    expect(calendar()).toBeNull();
    expect(timePanel()).toBeTruthy();
    expect(timeInput('Hours').value).toBe('10');
    expect(timeInput('Minutes').value).toBe('30');
    expect(host().classList.contains('wr-date-picker--time')).toBe(true);
    expect(trigger().getAttribute('aria-label')).toBe('Open time picker');
  });

  it('stays open while the time is being stepped', () => {
    // Unlike a date pick, editing a time is not a single decisive action — the
    // panel has to survive until the user dismisses it.
    fixture.componentInstance.mode.set('time');
    fixture.componentInstance.format.set('HH:mm');
    fixture.detectChanges();
    open();

    stepper('Increment hours').click();
    fixture.detectChanges();

    expect(picked()?.getHours()).toBe(11);
    expect(picked()?.getMinutes()).toBe(30);
    expect(picked()?.getDate()).toBe(15);
    expect(field().value).toBe('11:30');
    expect(timePanel()).toBeTruthy();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
  });

  it('renders the AM / PM column only in 12-hour mode', () => {
    fixture.componentInstance.mode.set('time');
    fixture.detectChanges();
    open();
    expect(document.querySelector('.wr-time-picker__col--ampm')).toBeNull();
    open(); // close

    fixture.componentInstance.timeFormat.set('12h');
    fixture.detectChanges();
    open();
    expect(document.querySelector('.wr-time-picker__col--ampm')).toBeTruthy();
    expect(timeInput('Hours').value).toBe('10');
  });

  it('opens the datetime steppers on the bound time, not on midnight', () => {
    fixture.componentInstance.mode.set('datetime');
    fixture.componentInstance.format.set('dd.MM.yyyy HH:mm');
    fixture.componentInstance.picked.set(new Date(2025, 0, 5, 16, 40));
    fixture.detectChanges();
    open();

    // Bound through `[ngModel]`, the panel showed 00:00 for a 16:40 value and
    // the first click on a stepper committed midnight over it. The `time` mode
    // path was already asserted and was fine — it feeds the panel directly —
    // so only `datetime`, which went through the forms bridge, was affected.
    expect([timeInput('Hours').value, timeInput('Minutes').value]).toEqual(['16', '40']);
  });

  it('offers calendar and time together in datetime mode, and keeps the time when a day is picked', () => {
    fixture.componentInstance.mode.set('datetime');
    fixture.componentInstance.format.set('dd.MM.yyyy HH:mm');
    fixture.detectChanges();
    open();

    expect(calendar()).toBeTruthy();
    expect(timePanel()).toBeTruthy();
    expect(trigger().getAttribute('aria-label')).toBe('Open date and time picker');

    day(20).click();
    fixture.detectChanges();

    expect(picked()?.getDate()).toBe(20);
    expect(picked()?.getHours()).toBe(10);
    expect(picked()?.getMinutes()).toBe(30);
    // Documented difference from date mode: the panel stays up, because the
    // user is usually about to set the time next.
    expect(calendar()).toBeTruthy();
    expect(field().value).toBe('20.01.2025 10:30');
  });

  it('does not open while disabled', () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect(host().classList.contains('wr-date-picker--disabled')).toBe(true);
    expect(trigger().disabled).toBe(true);
    expect(field().disabled).toBe(true);

    clickThrough(trigger());
    clickThrough(field());
    expect(calendar()).toBeNull();
  });

  // The disabled surface fill is a stylesheet rule — `.wr-input-group:has(> .wr-input:disabled)`
  // in `ngwr/input` — and jsdom loads no stylesheet, so no spec can read the painted
  // colour. What it CAN hold is the shape that rule selects on, which is the half that
  // silently broke: the field melts into `<wr-input-group>` (the group paints, the input
  // goes transparent), so the GROUP is what has to carry `--wr-color-fill`, and until the
  // rule existed a disabled form left the date fields as the only ones still reading as
  // editable beside a greyed `[wrInput]` / `<wr-textarea>` / `<wr-select>`. Wrap the input
  // in anything and the fill stops applying with nothing else in the suite to notice.
  it('leaves the disabled field selectable by the rule that fills the group', () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    const group = host().querySelector<HTMLElement>('wr-input-group')!;
    expect(field().disabled).toBe(true);
    expect(field().parentElement).toBe(group);
    expect(group.matches(':has(> .wr-input:disabled)')).toBe(true);

    fixture.componentInstance.disabled.set(false);
    fixture.detectChanges();
    expect(group.matches(':has(> .wr-input:disabled)')).toBe(false);
  });

  it('still opens while readonly — the field is untypeable, not inert', () => {
    fixture.componentInstance.readonly.set(true);
    fixture.detectChanges();

    expect(field().readOnly).toBe(true);
    open();
    expect(calendar()).toBeTruthy();
  });

  it('closes the open calendar when disabled arrives, and refuses the write', () => {
    open();
    expect(calendar()).toBeTruthy();
    const before = picked();

    // `toggleOverlay` and `openOnInput` both refuse to open under `disabled`,
    // and a panel already up consults neither: a picker disabled mid-session
    // (`[disabled]="saving()"`, a schema rule) kept its calendar and a day
    // click moved the value — the one thing a disabled control must not do.
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect(calendar()).toBeNull();
    expect(picked()).toBe(before);
  });

  it('refuses a write while disabled even where readonly would allow the browse', () => {
    // The two flags part company here, on purpose. `readonly` keeps the
    // calendar browsable and refuses only the write; `disabled` refuses both.
    // This drives the write path with the panel already gone, so the guard is
    // asserted on its own rather than through the close above.
    const before = picked();
    fixture.componentInstance.disabled.set(true);
    fixture.componentInstance.format.set('yyyy-MM-dd');
    fixture.detectChanges();

    type('2026-03-04');
    field().dispatchEvent(new FocusEvent('blur'));
    fixture.detectChanges();

    expect(picked()).toBe(before);
  });

  it('presents the popup as a named dialog, as aria-haspopup="dialog" promises', () => {
    // The trigger advertised `aria-haspopup="dialog"` while the overlay content
    // was a bare calendar — no `role="dialog"`, no accessible name on the popup,
    // and no `aria-controls` tying the two together. The role, the name and the
    // id now live on the overlay pane itself.
    open();

    const panel = document.querySelector<HTMLElement>('.wr-date-picker-overlay')!;
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.getAttribute('aria-label')).toBe('Choose date');
    // Non-modal on purpose: focus is not trapped, and outside click / Escape close it.
    expect(panel.getAttribute('aria-modal')).toBe('false');

    expect(panel.id).toBeTruthy();
    expect(trigger().getAttribute('aria-controls')).toBe(panel.id);
  });

  it('names the popup for the mode, and lets the host override it', () => {
    fixture.componentInstance.mode.set('time');
    fixture.componentInstance.format.set('HH:mm');
    fixture.detectChanges();
    open();

    expect(document.querySelector('.wr-date-picker-overlay')?.getAttribute('aria-label')).toBe('Choose time');
    open(); // close

    fixture.componentInstance.panelAriaLabel.set('Delivery window');
    fixture.detectChanges();
    open();

    expect(document.querySelector('.wr-date-picker-overlay')?.getAttribute('aria-label')).toBe('Delivery window');
  });

  it('drops aria-controls again once the popup is gone', () => {
    // A dangling `aria-controls` points at nothing after the overlay is disposed.
    expect(trigger().hasAttribute('aria-controls')).toBe(false);

    open();
    expect(trigger().hasAttribute('aria-controls')).toBe(true);

    open(); // close
    expect(trigger().hasAttribute('aria-controls')).toBe(false);
  });

  describe('focus, moving into the panel and back out', () => {
    const ring = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-calendar__day--focused');

    const keyOnField = (init: KeyboardEventInit): KeyboardEvent => {
      const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
      field().dispatchEvent(event);
      fixture.detectChanges();
      return event;
    };

    it('moves focus to the roving day cell when opened from the trigger button', async () => {
      trigger().focus();
      open();
      await fixture.whenStable();

      // The disabled assertion is load bearing: jsdom will happily focus a
      // disabled button, so asserting only `activeElement` would greenlight a
      // seed that lands on an unselectable day.
      expect(document.activeElement).toBe(ring());
      expect((document.activeElement as HTMLButtonElement).disabled).toBe(false);
    });

    it('leaves the caret alone when the panel is opened by clicking the field', async () => {
      field().focus();
      field().setSelectionRange(3, 3);
      field().click();
      fixture.detectChanges();
      await fixture.whenStable();

      // A click that placed a caret must not be overruled — this is the whole
      // reason focus-on-open is split by open path rather than applied to both.
      expect(calendar()).not.toBeNull();
      expect(document.activeElement).toBe(field());
      expect(field().selectionStart).toBe(3);
    });

    it('opens and takes focus on Alt+ArrowDown in the field', async () => {
      field().focus();
      const event = keyOnField({ key: 'ArrowDown', altKey: true });
      await fixture.whenStable();

      expect(calendar()).not.toBeNull();
      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(ring());
    });

    it('leaves a bare ArrowDown to the field while the panel is closed', () => {
      field().focus();
      const event = keyOnField({ key: 'ArrowDown' });

      // Typing must keep working: the field owns its own keys.
      expect(calendar()).toBeNull();
      expect(event.defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(field());
    });

    it('leaves typing alone while the panel is open', async () => {
      field().focus();
      field().click();
      fixture.detectChanges();
      await fixture.whenStable();

      // The vertical-arrow guard is what makes the open panel harmless to a
      // typist. Drop it and EVERY key routes into `focusPanel()`: the caret
      // jumps to the grid on the first character and the field becomes
      // untypeable the moment it is open.
      for (const key of ['1', 'Backspace', 'ArrowLeft', 'Home', '/']) {
        const event = keyOnField({ key });
        await fixture.whenStable();

        expect({ key, prevented: event.defaultPrevented, focused: document.activeElement === field() }).toEqual({
          key,
          prevented: false,
          focused: true,
        });
      }
    });

    it('walks focus into the calendar on ArrowDown once a field click has opened it', async () => {
      field().focus();
      field().click();
      fixture.detectChanges();

      const event = keyOnField({ key: 'ArrowDown' });
      await fixture.whenStable();

      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(ring());
    });

    it('focuses the hours field, not its stepper, for a trigger-opened time picker', async () => {
      fixture.componentInstance.mode.set('time');
      fixture.detectChanges();
      open();
      await fixture.whenStable();

      expect(timePanel()).not.toBeNull();
      expect(document.activeElement).toBe(timeInput('Hours'));
      expect(document.activeElement).not.toBe(stepper('Increment hours'));
    });

    it('lands on the day grid, not the hours field, in datetime mode', async () => {
      fixture.componentInstance.mode.set('datetime');
      fixture.detectChanges();
      trigger().focus();
      open();
      await fixture.whenStable();

      // Both panels are mounted here, so "focus went somewhere sensible" is not
      // enough — the assertion has to name WHICH one won.
      expect(document.activeElement).toBe(ring());
      expect(document.activeElement).not.toBe(timeInput('Hours'));
    });

    it('hands focus back to the trigger after a day is picked', async () => {
      trigger().focus();
      open();
      await fixture.whenStable();

      day(20).click();
      fixture.detectChanges();
      await fixture.whenStable();

      // Never `<body>`: a close that drops focus restarts the next Tab from the
      // top of the page.
      expect(document.activeElement).toBe(trigger());
      expect(document.activeElement).not.toBe(document.body);
    });

    it('hands focus back to the field when the field opened it', async () => {
      field().focus();
      field().click();
      fixture.detectChanges();

      day(20).click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(document.activeElement).toBe(field());
    });

    it('does not steal focus when an outside click closes the panel', async () => {
      trigger().focus();
      open();
      await fixture.whenStable();

      // The outside pointer has already put focus where the user wanted it.
      const outside = document.createElement('input');
      document.body.appendChild(outside);
      outside.focus();
      document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      document.dispatchEvent(new PointerEvent('click', { bubbles: true }));
      fixture.detectChanges();
      await fixture.whenStable();

      expect(document.activeElement).toBe(outside);
      outside.remove();
    });

    it('leaves focus on the trigger when the trigger closes the panel again', async () => {
      trigger().focus();
      open();
      await fixture.whenStable();

      trigger().click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(calendar()).toBeNull();
      expect(document.activeElement).toBe(trigger());
    });
  });
});

/**
 * One picker, one catalog key, one language.
 *
 * The field's name (`useI18nText`) and the calendar button's (`readI18nText`)
 * both resolve `datePicker.open`, and they used to disagree: the button's was a
 * plain string captured in a field initializer, which runs before any
 * loader-backed catalog exists. The field read "Открыть календарь" and the
 * button beside it "Open calendar", and a runtime `i18n.use()` moved only the
 * first of them.
 *
 * No placeholder, because a non-empty one is what the field is named after —
 * the catalog string is its last resort, and that is the one shared with the
 * trigger.
 */
@Component({ imports: [WrDatePicker], template: `<wr-date-picker />` })
class LocalizedHost {}

describe('WrDatePicker under a localized catalog', () => {
  beforeEach(() => localStorage.clear());

  it('announces the field and the trigger in the same language', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrDateAdapter(),
        provideWrOverlay(),
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    const fixture = TestBed.createComponent(LocalizedHost);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.wr-date-picker__trigger')!.getAttribute('aria-label')).toBe('Открыть календарь');
    expect(el.querySelector('input.wr-input')!.getAttribute('aria-label')).toBe('Открыть календарь');

    fixture.destroy();
  });
});

/**
 * The audit's blocker (findings 1 and 1b): the field could not read what it had just
 * printed. A named format went to `Intl` on the way out and to `new Date(raw)` on the way
 * back, and `new Date` understands only Anglo-American forms — so retyping a de-DE date
 * committed 1 January 2001 on the FIRST keystroke and refused every one after it, and
 * `mode="time"` collapsed to midnight in every locale, en-US included.
 *
 * These cases drive the field the way a person does — select all, delete, type the
 * characters back one at a time, leave — because that sequence is what made the defect
 * visible and a single `type(whole)` call would have passed throughout.
 */
describe('WrDatePicker retyping its own value', () => {
  const retype = (fixture: ReturnType<typeof TestBed.createComponent<Host>>, text: string): void => {
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input.wr-input')!;
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    for (let i = 1; i <= text.length; i++) {
      input.value = text.slice(0, i);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();
    }

    input.dispatchEvent(new Event('blur', { bubbles: true }));
    fixture.detectChanges();
  };

  const mount = (
    locale: string,
    mode: 'date' | 'time' | 'datetime',
    value: Date
  ): ReturnType<typeof TestBed.createComponent<Host>> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay(), provideWrDateAdapter({ locale })] });
    const fixture = TestBed.createComponent(Host);
    // `null` is the case that broke: the picker then derives a NAMED format from the mode.
    fixture.componentInstance.format.set(null);
    fixture.componentInstance.mode.set(mode);
    fixture.componentInstance.picked.set(value);
    fixture.detectChanges();
    return fixture;
  };

  afterEach(() => TestBed.resetTestingModule());

  for (const locale of ['de-DE', 'ru-RU', 'fi-FI', 'en-US', 'ja-JP']) {
    it(`keeps the date when it is retyped verbatim in ${locale}`, () => {
      const fixture = mount(locale, 'date', new Date(2026, 2, 15));
      const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input.wr-input')!;
      const printed = input.value;

      retype(fixture, printed);

      expect(input.value, `printed ${printed}`).toBe(printed);
      const picked = fixture.componentInstance.picked()!;
      expect([picked.getFullYear(), picked.getMonth(), picked.getDate()], `printed ${printed}`).toEqual([2026, 2, 15]);
      fixture.destroy();
    });

    it(`keeps the time when it is retyped verbatim in ${locale}`, () => {
      const fixture = mount(locale, 'time', new Date(2026, 2, 15, 14, 30));
      const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input.wr-input')!;
      const printed = input.value;

      retype(fixture, printed);

      expect(input.value, `printed ${printed}`).toBe(printed);
      const picked = fixture.componentInstance.picked()!;
      expect([picked.getHours(), picked.getMinutes()], `printed ${printed}`).toEqual([14, 30]);
      fixture.destroy();
    });
  }

  it('leaves the committed value alone when the text cannot be read', () => {
    // The contract `wr-input-number` follows: refusing is correct, committing a guess is
    // the defect. `3/15/2026` in a `d.M.y` locale is unreadable, not 3 January.
    const fixture = mount('de-DE', 'date', new Date(2026, 2, 15));
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input.wr-input')!;

    input.value = '3/15/2026';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    // A pass between the two events, the way the browser runs them: without it the
    // binding never sees the intermediate text and the repaint has nothing to undo.
    fixture.detectChanges();
    input.dispatchEvent(new Event('blur', { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.picked()!.getDate()).toBe(15);
    // The unreadable text stays, marked invalid, and the reason shows the order the
    // locale wants — rather than the old date silently coming back on blur.
    expect(input.value).toBe('3/15/2026');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const reason = (fixture.nativeElement as HTMLElement).querySelector('[role="status"]')!.textContent.trim();
    expect(reason).toBe(`Expected format: 31.12.${new Date().getFullYear()}`);
    fixture.destroy();
  });

  it('edits the clock without moving the day', () => {
    // `time` carries no date, so the adapter has to fill one in — and the date already in
    // the model is the right one. The time PANEL has always kept its `basis`; the text
    // field used to hand back today.
    const fixture = mount('en-US', 'time', new Date(2026, 2, 15, 14, 30));
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input.wr-input')!;

    input.value = input.value.replace('02', '03');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    input.dispatchEvent(new Event('blur', { bubbles: true }));
    fixture.detectChanges();

    const picked = fixture.componentInstance.picked()!;
    expect([picked.getFullYear(), picked.getMonth(), picked.getDate()]).toEqual([2026, 2, 15]);
    expect([picked.getHours(), picked.getMinutes()]).toEqual([15, 30]);
    fixture.destroy();
  });
});

/**
 * Every documented named `[format]`, driven once each.
 *
 * The value the FIELD shows is the whole contract of this input — the adapter
 * builds it from `Intl`, and since v14 parses it back with the same formatter,
 * so a name that stops resolving does not throw, it silently formats with the
 * mode default. Only the five date-bearing names are here: `time` and the
 * time-only pair are the same code path with no date in the output, and the
 * mode defaults already cover them.
 */
describe('WrDatePicker renders every documented named format', () => {
  @Component({
    imports: [WrDatePicker],
    template: `<wr-date-picker mode="datetime" [format]="format()" [(value)]="picked" />`,
  })
  class FormatHost {
    readonly format = signal<WrDateFormat>('shortDate');
    readonly picked = signal<Date | null>(new Date(2026, 2, 15, 14, 30));
  }

  const NAMED: readonly WrDateFormat[] = ['shortDate', 'mediumDate', 'longDate', 'shortDateTime', 'mediumDateTime'];
  let fixture: ReturnType<typeof TestBed.createComponent<FormatHost>>;
  const field = (): HTMLInputElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input.wr-input')!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideWrOverlay(), provideWrDateAdapter({ locale: 'en-US' })],
    });
    fixture = TestBed.createComponent(FormatHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it.each(NAMED)('%s produces a non-empty field distinct from the raw date', format => {
    fixture.componentInstance.format.set(format);
    fixture.detectChanges();

    const shown = field().value;
    expect(shown.length).toBeGreaterThan(0);
    // Every named format carries the year and the day; what differs is how much
    // else. Asserting the exact string would pin `Intl`'s output rather than
    // ours, and that moves with the ICU data the runtime ships.
    expect(shown).toContain('2026');
    expect(shown).toMatch(/15/);
  });

  it('a datetime name shows a time and a date-only name does not', () => {
    fixture.componentInstance.format.set('mediumDateTime');
    fixture.detectChanges();
    expect(field().value).toMatch(/\d{1,2}:\d{2}/);

    fixture.componentInstance.format.set('mediumDate');
    fixture.detectChanges();
    expect(field().value).not.toMatch(/\d{1,2}:\d{2}/);
  });
});

/**
 * A flip of the reading direction while the popover is OPEN.
 *
 * The CDK reads the direction once, as a string, when an overlay is created and
 * writes it as the host's `dir` on attach; `updatePosition()` never touches it
 * again. Two of this picker's four fallbacks anchor on `end`, so the side the
 * panel hangs off is direction-decided — and the `wr-calendar` inside it reads
 * `Directionality` LIVE, which is what makes the mismatch visible: the grid
 * starts navigating one way inside a box still drawn the other.
 *
 * Both halves are asserted, because only one of them is visible in the markup:
 * the `dir` attribute is what every logical CSS rule inside the pane reads, and
 * the anchored edge is what says the CDK re-resolved the position rather than
 * merely relabelling the box.
 */
describe('WrDatePicker follows a direction flip while its panel is open', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const trigger = (): HTMLButtonElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.wr-date-picker__trigger')!;
  const pane = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-date-picker-overlay');
  /**
   * `panelClass` lands on the PANE; the `dir` attribute and the position styles
   * are written on the host wrapper around it, so that is what these read.
   */
  const overlayHost = (): HTMLElement => pane()!.parentElement!;
  /**
   * jsdom gives every element a 0×0 rect, so there are no coordinates to
   * compare — what survives is which viewport edge the CDK anchored the box to,
   * and that is decided by `start` resolving against the overlay's direction.
   */
  const anchoredEdge = (): [string, string] => [overlayHost().style.left, overlayHost().style.right];

  /** A signal write is state, not an event: it lands on the next change detection. */
  const flipTo = (direction: Direction): void => {
    TestBed.inject(Directionality).valueSignal.set(direction);
    TestBed.tick();
    fixture.detectChanges();
  };

  const open = (): void => {
    trigger().click();
    fixture.detectChanges();
  };

  const escape = (): void => {
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay(), provideWrDateAdapter({ locale: 'en-US' })] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('rewrites the open panel’s `dir`', () => {
    open();
    expect(overlayHost().getAttribute('dir')).toBe('ltr');

    flipTo('rtl');

    expect(overlayHost().getAttribute('dir')).toBe('rtl');
  });

  it('re-anchors the panel against the direction just set', () => {
    open();
    expect(anchoredEdge()).toEqual(['0px', 'auto']);

    flipTo('rtl');

    // `setDirection()` rewrites the attribute and nothing else — without the
    // reposition that follows it, the panel keeps hanging off the edge the
    // direction it left resolved `start` to.
    expect(anchoredEdge()).toEqual(['auto', '0px']);
  });

  it('follows in `time` mode too — the follower belongs to the ref, not the panel', () => {
    // Every mode goes through the one `openOverlay()`, and the time panel is a
    // different ComponentPortal into the same ref. Nothing here may depend on
    // which one was attached.
    fixture.componentInstance.mode.set('time');
    fixture.detectChanges();
    open();

    flipTo('rtl');

    expect(overlayHost().getAttribute('dir')).toBe('rtl');
  });

  it('gives a panel reopened after a flip a follower of its own', () => {
    open();
    escape();
    expect(pane()).toBeNull();

    // The follower went down with the disposed ref; nothing here may write
    // through it. Reopening is always a NEW ref in this library, so the second
    // panel has to install its own.
    flipTo('rtl');
    open();
    expect(overlayHost().getAttribute('dir')).toBe('rtl');

    flipTo('ltr');

    expect(overlayHost().getAttribute('dir')).toBe('ltr');
  });
});

/**
 * Text the picker will not commit — unreadable, out of `min` / `max`, or rejected by
 * `dateFilter` — and what the user is told about it.
 *
 * The refusal itself is old and correct: the value is never guessed at. What this
 * pins is that it is no longer SILENT. It was: `07.09.1994` typed into a field
 * bounded to 2026 changed nothing on Enter, and turned back into the old date on
 * blur, with no border, no `aria-invalid` and no reason anywhere. Every case below
 * drives the field the way a person does and reads the result off the DOM — the
 * input's ARIA, the host's public `--invalid` class, and the text a screen reader
 * would reach through `aria-describedby`.
 *
 * What jsdom cannot hold: the danger border is a stylesheet rule, and whether a
 * screen reader actually SPEAKS a `role="status"` change is up to the reader. The
 * border was measured in Chromium instead; the live region is asserted as text.
 */
describe('WrDatePicker refusing typed text', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-date-picker')!;
  const field = (): HTMLInputElement => root().querySelector<HTMLInputElement>('input.wr-input')!;
  const trigger = (): HTMLButtonElement => root().querySelector<HTMLButtonElement>('.wr-date-picker__trigger')!;
  const calendar = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-calendar');
  const picked = (): Date | null => fixture.componentInstance.picked();
  const year = new Date().getFullYear();

  const type = (text: string): void => {
    field().value = text;
    field().dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  };
  const enter = (): void => {
    field().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };
  const blurTo = (next: Element | null): void => {
    field().dispatchEvent(new FocusEvent('blur', { relatedTarget: next }));
    fixture.detectChanges();
  };
  const open = (): void => {
    trigger().click();
    fixture.detectChanges();
  };

  /** What `aria-describedby` resolves to IN THE DOCUMENT — an id naming nothing describes nothing. */
  const description = (): string | null => {
    const ids = field().getAttribute('aria-describedby');
    if (!ids) return null;
    return ids
      .split(' ')
      .map(id => {
        const target = document.getElementById(id);
        if (!target) throw new Error(`aria-describedby names "${id}", which is not in the document`);
        return target.textContent?.trim() ?? '';
      })
      .join(' | ');
  };
  const announced = (): string => root().querySelector('[role="status"]')!.textContent.trim();

  /** Nothing on show: no ARIA, no class, nothing said. */
  const expectQuiet = (): void => {
    expect(field().hasAttribute('aria-invalid')).toBe(false);
    expect(field().hasAttribute('aria-describedby')).toBe(false);
    expect(host().classList.contains('wr-date-picker--invalid')).toBe(false);
    expect(announced()).toBe('');
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideWrOverlay(), provideWrDateAdapter({ locale: 'en-US' })] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('refuses unreadable text without touching the value — and waits for the user to finish', () => {
    // Every date is unreadable for most of the time it takes to type one, so a
    // field that went red on the first digit would be telling the user off for
    // typing. The refusal exists from this keystroke; it is not yet on show.
    type('07.09');

    expect(field().value).toBe('07.09');
    expect(picked()?.getDate()).toBe(15);
    expectQuiet();
  });

  it('shows the refusal on Enter: invalid, described, announced — and emits touch', () => {
    type('07.09.19');
    enter();

    expect(field().value).toBe('07.09.19');
    expect(picked()?.getDate()).toBe(15);
    expect(field().getAttribute('aria-invalid')).toBe('true');
    expect(host().classList.contains('wr-date-picker--invalid')).toBe(true);
    expect(announced()).toBe(`Expected format: 31.12.${year}`);
    expect(description()).toBe(`Expected format: 31.12.${year}`);
    // `touch` is what makes a surrounding <wr-form-field> show its message.
    expect(fixture.componentInstance.touched()).toBe(1);
  });

  it('shows the refusal when focus leaves the field, and KEEPS the text', () => {
    type('07.09.19');
    blurTo(null);

    expect(field().value).toBe('07.09.19');
    expect(picked()?.getDate()).toBe(15);
    expect(field().getAttribute('aria-invalid')).toBe('true');
    expect(host().classList.contains('wr-date-picker--invalid')).toBe(true);
    expect(announced()).toBe(`Expected format: 31.12.${year}`);
  });

  it('does not show it when focus moves into the open panel — a pick there replaces the text', () => {
    open();
    type('07.09.19');
    blurTo(document.querySelector('.wr-calendar__day'));

    expect(field().hasAttribute('aria-invalid')).toBe(false);
    expect(announced()).toBe('');
  });

  describe('leaving by way of the open panel', () => {
    // Moving INTO the panel is not leaving, which is why the refusal waits there.
    // But the panel is a detour: wherever focus goes from it, other than back to the
    // field, the user has left — and a refusal that waited for them has to show, or
    // the field keeps text that is not the value with nothing saying so.
    let outside: HTMLInputElement;

    /** Type refused text into the field, then walk focus into the calendar. */
    const intoPanel = async (): Promise<void> => {
      field().focus();
      field().click();
      fixture.detectChanges();
      type('07.09.19');
      field().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(document.activeElement?.closest('.wr-date-picker-overlay')).not.toBeNull();
      expectQuiet();
    };
    const expectShown = (): void => {
      expect(field().value).toBe('07.09.19');
      expect(picked()?.getDate()).toBe(15);
      expect(field().getAttribute('aria-invalid')).toBe('true');
      expect(host().classList.contains('wr-date-picker--invalid')).toBe(true);
      expect(announced()).toBe(`Expected format: 31.12.${year}`);
    };

    beforeEach(() => {
      outside = document.createElement('input');
      document.body.appendChild(outside);
    });
    afterEach(() => outside.remove());

    it('shows it when a click outside closes the panel focus was in', async () => {
      await intoPanel();

      // A real pointer moves focus first, then the click closes the panel.
      outside.focus();
      document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      document.dispatchEvent(new PointerEvent('click', { bubbles: true }));
      fixture.detectChanges();

      expect(calendar()).toBeNull();
      expectShown();
    });

    it('shows it when focus leaves the panel and the panel stays up', async () => {
      await intoPanel();

      outside.focus();
      fixture.detectChanges();

      expect(calendar()).not.toBeNull();
      expectShown();
    });

    it('shows it when Escape hands focus to the trigger that opened the panel, not to the field', async () => {
      // Opened from the trigger, so that is where a close from inside the panel hands
      // focus back. No focus leaves the panel on the way — the pane is simply gone —
      // so it is the CLOSE that has to say the visit is over.
      trigger().focus();
      open();
      await fixture.whenStable();
      field().focus();
      type('07.09.19');
      field().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(document.activeElement?.closest('.wr-date-picker-overlay')).not.toBeNull();
      expectQuiet();

      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      fixture.detectChanges();

      expect(calendar()).toBeNull();
      expect(document.activeElement).toBe(trigger());
      expectShown();
    });

    it('stays quiet when Escape hands focus back to the field — the user is there again', async () => {
      await intoPanel();

      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      fixture.detectChanges();

      expect(calendar()).toBeNull();
      expect(document.activeElement).toBe(field());
      expectQuiet();

      // …and leaving the field from there shows it, as it always did.
      blurTo(null);
      expectShown();
    });

    it('stays quiet when focus goes from the panel straight back to the field', async () => {
      await intoPanel();

      field().focus();
      fixture.detectChanges();

      expectQuiet();
    });
  });

  it('names the bound a READABLE date broke, in the same words a form field uses', () => {
    fixture.componentInstance.min.set(new Date(2025, 0, 10));
    fixture.componentInstance.max.set(new Date(2025, 0, 20));
    fixture.componentInstance.dateFilter.set(date => date.getDate() !== 17);
    fixture.detectChanges();

    // rk's case: `dd.MM.yyyy` reads `07.09.1994` perfectly well; the refusal is the
    // bound, and saying "unreadable" there would send the user after the wrong fix.
    type('07.09.1994');
    enter();
    expect(announced()).toBe('Choose a later date.');

    type('25.01.2025');
    expect(announced()).toBe('Choose an earlier date.');

    type('17.01.2025');
    expect(announced()).toBe('This date is not available.');

    expect(picked()?.getDate()).toBe(15);
  });

  it('follows the text live once on show, and clears the moment it commits', () => {
    type('07.09.19');
    enter();
    expect(field().getAttribute('aria-invalid')).toBe('true');

    type('20.01.2025');

    expect(picked()?.getDate()).toBe(20);
    expectQuiet();

    // Cleared means cleared: the next refusal waits for Enter or blur again.
    type('20.01.20');
    expectQuiet();
  });

  it('clears when the field is emptied, which commits null', () => {
    type('07.09.19');
    enter();
    type('');

    expect(picked()).toBeNull();
    expectQuiet();
  });

  it('lets a pick from the panel replace refused text', () => {
    type('07.09.19');
    blurTo(null);
    open();
    const cell = [...document.querySelectorAll<HTMLButtonElement>('.wr-calendar__day')].find(
      c => !c.classList.contains('wr-calendar__day--out-of-month') && c.textContent?.trim() === '22'
    )!;
    cell.click();
    fixture.detectChanges();

    expect(field().value).toBe('22.01.2025');
    expectQuiet();
  });

  it('lets a value written from outside replace refused text', () => {
    type('07.09.19');
    blurTo(null);

    fixture.componentInstance.picked.set(new Date(2025, 5, 3));
    fixture.detectChanges();

    expect(field().value).toBe('03.06.2025');
    expectQuiet();
  });

  it('re-formats a committed date on Enter, and closes the panel either way', () => {
    // The named format reads `1/5/25` and prints `1/5/2025`: Enter visibly settles it.
    fixture.componentInstance.format.set(null);
    fixture.detectChanges();
    open();
    type('1/5/25');
    enter();

    expect(field().value).toBe('1/5/2025');
    expect(calendar()).toBeNull();
    expectQuiet();

    // The panel opens right below the field, which is where a form field's message
    // renders — so it closes on a refused Enter too.
    open();
    type('07.09.1994');
    enter();
    expect(calendar()).toBeNull();
    expect(announced()).toBe(`Expected format: 12/31/${year}`);
  });

  it('answers a second Enter on an unchanged refusal, rather than meeting it with silence', async () => {
    // A live region does not repeat text it already holds, so the second Enter
    // blanks it first — for a real interval, since two writes in one task reach
    // the accessibility tree as one.
    type('07.09.19');
    enter();
    expect(announced()).not.toBe('');

    enter();
    expect(announced()).toBe('');

    await new Promise(resolve => setTimeout(resolve, 150));
    fixture.detectChanges();
    expect(announced()).toBe(`Expected format: 31.12.${year}`);
  });

  it('never calls time-mode text out of bounds — a clock has no date to bound', () => {
    fixture.componentInstance.mode.set('time');
    fixture.componentInstance.format.set('HH:mm');
    fixture.componentInstance.min.set(new Date(2030, 0, 1));
    fixture.detectChanges();

    type('14:3x');
    enter();
    expect(announced()).toBe('Expected format: 18:45');

    type('09:15');
    expect(picked()?.getHours()).toBe(9);
    expectQuiet();
  });
});

@Component({
  imports: [WrDatePicker],
  template: `
    <wr-date-picker #picker [(value)]="picked" format="dd.MM.yyyy" [min]="min" />
    <output>{{ picker.inputError()?.kind ?? 'none' }}|{{ picker.inputError()?.message ?? '' }}</output>
  `,
})
class ErrorReadingHost {
  readonly picked = signal<Date | null>(new Date(2026, 8, 16));
  readonly min = new Date(2026, 8, 7);
}

describe('WrDatePicker inputError', () => {
  it('hands a host the reason the picker is SHOWING, so a rendered message agrees with the border', () => {
    TestBed.configureTestingModule({ providers: [provideWrOverlay(), provideWrDateAdapter({ locale: 'en-US' })] });
    const fixture = TestBed.createComponent(ErrorReadingHost);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector<HTMLInputElement>('input')!;
    const output = (): string => el.querySelector('output')!.textContent.trim();
    const type = (text: string): void => {
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();
    };

    expect(output()).toBe('none|');

    // Held back while the user is typing, exactly as the border is: the documented
    // `@if (picker.inputError())` would otherwise print a scolding on the first digit.
    type('0');
    expect(output()).toBe('none|');
    type('07.09.1994');
    expect(output()).toBe('none|');
    expect(fixture.componentInstance.picked()?.getFullYear()).toBe(2026);

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(output()).toBe('minDate|Choose a later date.');
    expect(input.getAttribute('aria-invalid')).toBe('true');

    // Once on show it follows the text, and a commit clears it.
    type('07.09.19');
    expect(output()).toBe(`dateFormat|Expected format: 31.12.${new Date().getFullYear()}`);
    type('17.09.2026');
    expect(output()).toBe('none|');
    fixture.destroy();
  });
});

@Component({
  imports: [WrDatePicker, WrFormField, ReactiveFormsModule],
  template: `
    <wr-form-field label="Due">
      <wr-date-picker [formControl]="due" format="dd.MM.yyyy" />
    </wr-form-field>
  `,
})
class ReactiveFieldHost {
  readonly due = new FormControl<Date | null>(new Date(2025, 0, 15));
}

@Component({
  imports: [WrDatePicker, WrFormField, FormField],
  template: `
    <wr-form-field label="Due">
      <wr-date-picker [formField]="f.due" format="dd.MM.yyyy" />
    </wr-form-field>
  `,
})
class SignalFieldHost {
  private readonly model = signal<{ due: Date | null }>({ due: new Date(2025, 0, 15) });
  readonly f = form(this.model);
}

@Component({
  imports: [WrDatePicker, WrFormField],
  template: `
    <wr-form-field label="Due">
      <wr-date-picker [(value)]="due" format="dd.MM.yyyy" />
    </wr-form-field>
  `,
})
class UnboundFieldHost {
  readonly due = signal<Date | null>(new Date(2025, 0, 15));
}

/**
 * A refusal reaches the FORM, not only the field's border: the pickers report it
 * through Angular's parse-error channel, so a form holding refused text is invalid
 * and cannot quietly submit the old date. And `<wr-form-field>` describes the input
 * with the reason, whichever of the field and the picker is saying it.
 */
describe('WrDatePicker refusals and forms', () => {
  const year = new Date().getFullYear();

  const setUp = <T>(cmp: new () => T): ReturnType<typeof TestBed.createComponent<T>> => {
    TestBed.configureTestingModule({ providers: [provideWrOverlay(), provideWrDateAdapter({ locale: 'en-US' })] });
    const fixture = TestBed.createComponent(cmp);
    fixture.detectChanges();
    return fixture;
  };
  const input = (fixture: { nativeElement: unknown }): HTMLInputElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input.wr-input')!;
  const type = async (fixture: ReturnType<typeof setUp>, text: string): Promise<void> => {
    input(fixture).value = text;
    input(fixture).dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const enter = async (fixture: ReturnType<typeof setUp>): Promise<void> => {
    input(fixture).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const description = (fixture: ReturnType<typeof setUp>): string =>
    (input(fixture).getAttribute('aria-describedby') ?? '')
      .split(' ')
      .filter(Boolean)
      .map(id => document.getElementById(id)?.textContent?.trim() ?? `<missing #${id}>`)
      .join(' | ');

  afterEach(() => TestBed.resetTestingModule());

  it('makes a reactive FormControl invalid with the reason, and leaves its value alone', async () => {
    const fixture = setUp(ReactiveFieldHost);
    const due = fixture.componentInstance.due;

    await type(fixture, '07.09.19');
    expect(due.value?.getDate()).toBe(15);
    expect(due.errors?.['dateFormat']).toMatchObject({ kind: 'dateFormat', example: `31.12.${year}` });
    expect(due.valid).toBe(false);

    await enter(fixture);
    expect(input(fixture).getAttribute('aria-invalid')).toBe('true');
    expect(description(fixture)).toContain(`Expected format: 31.12.${year}`);

    await type(fixture, '20.01.2025');
    expect(due.value?.getDate()).toBe(20);
    expect(due.errors).toBeNull();
    expect(input(fixture).hasAttribute('aria-invalid')).toBe(false);
    fixture.destroy();
  });

  it('puts the value back in the field when the control is reset to the value it already holds', async () => {
    // A Cancel button: the user typed something unusable and the form goes back to
    // where it was. The model does not move, so nothing but the reset itself says
    // the refused text is gone — Angular clears its copy of the error, and the
    // picker has to drop its own and the text with it, or the field shows garbage
    // over a valid form.
    const fixture = setUp(ReactiveFieldHost);
    const due = fixture.componentInstance.due;

    await type(fixture, '07.09.19');
    await enter(fixture);
    expect(due.errors?.['dateFormat']).toBeTruthy();

    due.reset(due.value);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(due.errors).toBeNull();
    expect(input(fixture).value).toBe('15.01.2025');
    expect(input(fixture).hasAttribute('aria-invalid')).toBe(false);
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="status"]')!.textContent.trim()).toBe('');
    fixture.destroy();
  });

  it('puts the value back when a reset writes an EQUAL date — a fresh copy of the same day', async () => {
    const fixture = setUp(ReactiveFieldHost);
    const due = fixture.componentInstance.due;

    await type(fixture, '07.09.19');
    await enter(fixture);

    due.reset(new Date(2025, 0, 15));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(due.errors).toBeNull();
    expect(input(fixture).value).toBe('15.01.2025');
    expect(input(fixture).hasAttribute('aria-invalid')).toBe(false);
    fixture.destroy();
  });

  it('puts the value back when a Signal Forms field is reset', async () => {
    const fixture = setUp(SignalFieldHost);
    const due = fixture.componentInstance.f.due;

    await type(fixture, '07.09.19');
    await enter(fixture);
    expect(due().invalid()).toBe(true);

    due().reset();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(due().errors()).toEqual([]);
    expect(input(fixture).value).toBe('15.01.2025');
    expect(input(fixture).hasAttribute('aria-invalid')).toBe(false);
    fixture.destroy();
  });

  it('joins a Signal Forms field’s errors, and the field says it — once', async () => {
    const fixture = setUp(SignalFieldHost);
    const due = fixture.componentInstance.f.due;
    const el = fixture.nativeElement as HTMLElement;

    await type(fixture, '07.09.19');
    expect(
      due()
        .errors()
        .map(e => e.kind)
    ).toEqual(['dateFormat']);
    expect(due().invalid()).toBe(true);

    await enter(fixture);
    expect(el.querySelector('.wr-form-field__error')?.textContent?.trim()).toBe(`Expected format: 31.12.${year}`);
    expect(input(fixture).getAttribute('aria-invalid')).toBe('true');
    expect(description(fixture)).toBe(`Expected format: 31.12.${year}`);
    // The field's message is a role="alert"; the picker's own region stays quiet.
    expect(el.querySelector('[role="status"]')!.textContent.trim()).toBe('');

    await type(fixture, '20.01.2025');
    expect(due().errors()).toEqual([]);
    expect(el.querySelector('.wr-form-field__error')).toBeNull();
    fixture.destroy();
  });

  it('still says it inside a field bound only by [(value)], which has no control to read', async () => {
    const fixture = setUp(UnboundFieldHost);
    const el = fixture.nativeElement as HTMLElement;

    await type(fixture, '07.09.19');
    await enter(fixture);

    expect(el.querySelector('.wr-form-field__error')).toBeNull();
    expect(input(fixture).getAttribute('aria-invalid')).toBe('true');
    expect(description(fixture)).toBe(`Expected format: 31.12.${year}`);
    // The label still points at the input: the picker stands between wrInput and the
    // field, and must not cost the field its `for`.
    const label = el.querySelector<HTMLLabelElement>('label')!;
    expect(document.getElementById(label.htmlFor)).toBe(input(fixture));
    fixture.destroy();
  });
});
