import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrDateAdapter } from 'ngwr/date-adapter';
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

  it('closes on Escape without changing the value, and hands focus back to the field', () => {
    open();
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(calendar()).toBeNull();
    expect(picked()?.getDate()).toBe(15);
    expect(document.activeElement).toBe(field());
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

  it('refuses a day rejected by dateFilter', () => {
    fixture.componentInstance.dateFilter.set(date => date.getDate() !== 20);
    fixture.detectChanges();
    open();

    expect(day(20).getAttribute('aria-disabled')).toBe('true');
    clickThrough(day(20));
    expect(picked()?.getDate()).toBe(15);
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

  it('keeps the last valid value while a partial entry is being typed, and restores it on blur', () => {
    type('20.0');
    expect(picked()?.getDate()).toBe(15);

    field().dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(field().value).toBe('15.01.2025');
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

  it('still opens while readonly — the field is untypeable, not inert', () => {
    fixture.componentInstance.readonly.set(true);
    fixture.detectChanges();

    expect(field().readOnly).toBe(true);
    open();
    expect(calendar()).toBeTruthy();
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
});
