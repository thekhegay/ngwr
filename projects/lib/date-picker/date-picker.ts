/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directionality } from '@angular/cdk/bidi';
import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { type OverlayRef, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import {
  Component,
  type ComponentRef,
  DestroyRef,
  ElementRef,
  Injector,
  type Signal,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { FormValueControl } from '@angular/forms/signals';

import { WrCalendar } from 'ngwr/calendar';
import { WrDateAdapter, type WrDateFormat } from 'ngwr/date';
import { readI18nText, useI18nText } from 'ngwr/i18n';
import { WrInput, WrInputGroup, WrInputSuffix } from 'ngwr/input';
import { WR_OVERLAY, WrOutsideClick, wrFollowDirection } from 'ngwr/overlay';

import type { WrDateInputError } from './interfaces';
import { WrDateTimePanel } from './internal/date-time-panel';
import {
  WR_DATE_INPUT_FIELD_VIEW_PROVIDER,
  WrDateInputField,
  useDateInputRefusals,
  useFormParseErrors,
} from './internal/input-refusal';
import { WrTimePanel } from './internal/time-panel';

let panelUid = 0;

/** How long a live region stays blank before a repeated refusal is written back. */
const SILENCE_MS = 100;

/**
 * Unified date / time / date-time picker. Same `<input>` + popover skeleton
 * for every mode — the overlay content swaps based on `[mode]`:
 *
 * - `'date'` (default) — popover renders a calendar. Picking a date closes
 *   the overlay.
 * - `'time'` — popover renders an `HH:MM[:SS]` stepper with optional AM/PM.
 *   Stays open while editing; close with outside-click or Escape.
 * - `'datetime'` — popover stacks calendar + time stepper. Picking a date
 *   does NOT close (the user typically wants to set the time next).
 *
 * A signal-forms native control: it implements `FormValueControl<Date | null>`,
 * so `[formField]` binds straight to its `value` model — no
 * `ControlValueAccessor` in between. `[(value)]` works standalone, and classic
 * `[(ngModel)]` / reactive forms keep working through Angular's bridge. Value
 * type is `Date | null` for every mode.
 *
 * Parses the input on every keystroke and emits only a date it can read and the
 * calendar would accept. Anything else is REFUSED, never guessed: the bound value
 * stays where it was, and the text stays in the field so it can be corrected.
 * Enter and leaving the field turn a refusal visible — see {@link inputError}.
 * A committed date is re-formatted canonical on blur and on Enter. Format is
 * driven by {@link WrDateAdapter}: it
 * accepts both named keys (`'shortDate'`, `'mediumDateTime'`, …) and raw
 * token strings (`'dd.MM.yyyy'`, `'HH:mm'`). When `format` is left at the
 * default (`null`), the picker derives the right named key from `mode`:
 * `'date'` gives `'shortDate'`, `'time'` gives `'time'`, `'datetime'` gives
 * `'shortDateTime'`.
 *
 * @example
 * ```html
 * <!-- signal forms -->
 * <wr-date-picker [formField]="form.picked" format="dd.MM.yyyy" [min]="minDate" />
 *
 * <!-- standalone two-way binding, date only -->
 * <wr-date-picker [(value)]="picked" format="dd.MM.yyyy" [min]="minDate" />
 *
 * <!-- Time only -->
 * <wr-date-picker mode="time" [(value)]="picked" timeFormat="24h" />
 *
 * <!-- Date + time -->
 * <wr-date-picker mode="datetime" [(value)]="when" [showSeconds]="true" [step]="5" />
 * ```
 *
 * @see https://ngwr.dev/reference/components/date-picker
 */
@Component({
  selector: 'wr-date-picker',
  templateUrl: './date-picker.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
  imports: [WrInput, WrInputGroup, WrInputSuffix],
  providers: [WrDateInputField],
  viewProviders: [WR_DATE_INPUT_FIELD_VIEW_PROVIDER],
})
export class WrDatePicker implements FormValueControl<Date | null> {
  /** Picker behavior — see class doc. @default 'date' */
  readonly mode = input<'date' | 'time' | 'datetime'>('date');

  /**
   * Format used for both display and parsing. When `null` (default), the
   * format is derived from `mode` (`shortDate` / `time` / `shortDateTime`).
   * Pass a named key or raw token string to override.
   */
  readonly format = input<WrDateFormat | (string & {}) | null>(null);

  /** Placeholder shown when the input is empty. */
  readonly placeholder = input<string>('');

  // Typed `Date | undefined` (not `Date | null`) to satisfy the reserved
  // `FormUiControl` min/max slots, which are keyed to the control's value type
  // and want `Date | undefined`. Both null and undefined stay falsy, so the
  // internal bounds checks below are unaffected.
  /** Min selectable date (forwarded to the calendar). Ignored in `time` mode. */
  readonly min = input<Date | undefined>(undefined);

  /** Max selectable date (forwarded to the calendar). Ignored in `time` mode. */
  readonly max = input<Date | undefined>(undefined);

  /** Predicate to disable specific dates (forwarded to the calendar). Ignored in `time` mode. */
  readonly dateFilter = input<((date: Date) => boolean) | null>(null);

  /** Time-panel 12 / 24-hour format. Applies in `time` + `datetime` modes. @default 'auto' */
  readonly timeFormat = input<'auto' | '12h' | '24h'>('auto');

  /** Render the seconds column. Applies in `time` + `datetime` modes. @default false */
  readonly showSeconds = input(false, { transform: coerceBooleanProperty });

  /** Minute / second step for the time panel. @default 1 */
  readonly step = input(1, { transform: (v: unknown): number => Math.max(1, coerceNumberProperty(v, 1)) });

  /**
   * Disable interaction. Bound automatically from the field's disabled state
   * when used with `[formField]`.
   *
   * @default false
   */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Read-only — input not typeable, but the trigger icon still opens the overlay. @default false */
  readonly readonly = input(false, { transform: coerceBooleanProperty });

  private readonly adapter = inject<WrDateAdapter<Date>>(WrDateAdapter);
  private readonly overlay = inject(WR_OVERLAY);
  private readonly outsideClick = inject(WrOutsideClick);
  private readonly scrollStrategies = inject(ScrollStrategyOptions);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  /**
   * Ambient reading direction, for the open panel alone — nothing in this
   * component reads it directly. Optional so a bare `TestBed` needs no
   * provider; `Directionality` is root-provided anyway, and a missing one
   * simply reads as `ltr`.
   */
  private readonly dir = inject(Directionality, { optional: true });
  protected readonly inputEl = viewChild.required<ElementRef<HTMLInputElement>>('input');
  protected readonly triggerEl = viewChild<ElementRef<HTMLButtonElement>>('trigger');

  /** The picked Date. Bound by `[formField]`, or two-way via `[(value)]`. */
  readonly value = model<Date | null>(null);

  /** Emitted on blur so a bound field can mark itself touched. */
  readonly touch = output<void>();

  /** Text currently in the input (may be partial / invalid mid-type). */
  protected readonly text = signal<string>('');

  /** Whether the popover is currently open. */
  protected readonly overlayOpen = signal(false);

  /**
   * Where focus came from, captured as an explicit argument at open time —
   * never read off `document.activeElement`, which by then may already be the
   * pane. Every close path that took focus INTO the panel hands it back here.
   */
  private openedFrom: HTMLElement | null = null;

  /** Whether the panel this open cycle should take focus. */
  private autoFocusPanel = false;

  /** Resolved format — falls back to a mode-appropriate default. */
  protected readonly resolvedFormat = computed<string>(() => {
    const explicit = this.format();
    if (explicit) return explicit;
    const m = this.mode();
    if (m === 'datetime') return 'shortDateTime';
    // `time`, not `shortTime` — the latter is not a member of WrDateFormat, so
    // adapters fell through to treating it as a raw token pattern. date-fns then
    // threw on the unescaped letters; the native adapter degraded silently.
    if (m === 'time') return 'time';
    return 'shortDate';
  });

  protected readonly isTime = computed(() => this.mode() === 'time');
  protected readonly isDateTime = computed(() => this.mode() === 'datetime');

  // Signals, not plain strings: these used to be read once at injection time,
  // which is before any loader-backed catalog exists — so the trigger announced
  // "Open calendar" while `fieldLabel` below, off the SAME key, announced the
  // Russian one. A runtime `i18n.use()` moved the field's name and not the
  // trigger's, which made the split permanent rather than a startup race.
  private readonly labelDate = readI18nText('datePicker.open', 'Open calendar');
  private readonly labelTime = readI18nText('datePicker.openTime', 'Open time picker');
  private readonly labelDateTime = readI18nText('datePicker.openDateTime', 'Open date and time picker');

  private readonly panelLabelDate = readI18nText('datePicker.panel', 'Choose date');
  private readonly panelLabelTime = readI18nText('datePicker.panelTime', 'Choose time');
  private readonly panelLabelDateTime = readI18nText('datePicker.panelDateTime', 'Choose date and time');

  /**
   * Accessible name of the text field. Falls back to the placeholder, then to
   * the same catalog string the calendar button uses — the field is a
   * `role="combobox"`, and with an empty placeholder it had no name at all.
   */
  readonly ariaLabel = input<string | null>(null);

  private readonly fieldLabel = useI18nText(this.ariaLabel, 'datePicker.open', 'Open calendar');
  protected readonly resolvedAriaLabel = computed(() => {
    // Not `??`: an empty placeholder must fall through to the catalog string.
    const explicit = this.ariaLabel();
    if (explicit) return explicit;
    const placeholder = this.placeholder();
    return placeholder ? placeholder : this.fieldLabel();
  });

  protected readonly triggerLabel = computed(() => {
    const m = this.mode();
    if (m === 'time') return this.labelTime();
    if (m === 'datetime') return this.labelDateTime();
    return this.labelDate();
  });

  /**
   * Accessible name of the popup. The trigger advertises
   * `aria-haspopup="dialog"`, so the panel is a `role="dialog"` — and an unnamed
   * dialog announces as a bare "dialog". Defaults to the catalog's
   * `datePicker.panel*` string for the current `mode`.
   */
  readonly panelAriaLabel = input<string | null>(null);

  /** Popup id — what the trigger's `aria-controls` points at while open. */
  protected readonly panelId = `wr-date-picker-panel-${++panelUid}`;

  protected readonly resolvedPanelLabel = computed(() => {
    const explicit = this.panelAriaLabel();
    if (explicit) return explicit;
    const m = this.mode();
    if (m === 'time') return this.panelLabelTime();
    if (m === 'datetime') return this.panelLabelDateTime();
    return this.panelLabelDate();
  });

  private readonly refusals = useDateInputRefusals();
  private readonly reportToForm = useFormParseErrors(this.value, () => this.onFormReset());
  private readonly inputField = inject(WrDateInputField);

  /**
   * Why the text in the field was not committed — `null` while the text is the value.
   * Raised on the keystroke that makes the text unusable, and reported to a bound form
   * from that keystroke on.
   */
  private readonly refusal = signal<WrDateInputError | null>(null);

  /**
   * Whether the refusal is on show. A refusal is raised on the keystroke but shown
   * only once the user has finished — on Enter, or on leaving the field — because
   * every date is unreadable for most of the time it takes to type one, and a field
   * that turned red on the first digit would be telling the user off for typing.
   * Once shown it follows the text live, so a correction clears it immediately.
   *
   * Leaving counts wherever focus goes, including by way of the open panel: moving
   * into the panel waits, since a pick there replaces the text, but focus that leaves
   * the panel for anything other than the field — or a panel that closes without a
   * pick and without handing focus back to the field — has left too.
   */
  private readonly revealed = signal(false);

  /**
   * Why the text in the field is not the bound value, once the picker is showing it —
   * `null` while the text is the value, and `null` while the user is still typing.
   *
   * A refusal is raised on the keystroke that makes the text unreadable (`dateFormat`),
   * out of `min` / `max` (`minDate` / `maxDate`) or rejected by `dateFilter`, and goes
   * on show on Enter or when the user leaves the field — the same moment the border
   * turns and the reason is announced, so a message rendered from this signal never
   * disagrees with them. Once on show it follows the text, and it clears the moment the
   * text becomes a date the picker commits, is emptied, or is replaced by a pick from
   * the panel, a value written from outside, or a form reset. The value itself is never
   * touched by a refusal.
   *
   * A bound form does NOT wait: `[formField]`, `[formControl]`, `formControlName` and
   * `[(ngModel)]` see the refusal as a parse error from the keystroke, so the form is
   * invalid the whole time the field holds text it could not use, and
   * `<wr-form-field>` shows `message` by its own rule — once the control is touched or
   * dirty. Read this through a template reference when the picker is bound with
   * `[(value)]` alone and the reason should be on screen.
   *
   * @example
   * ```html
   * <wr-date-picker #due [(value)]="due" format="dd.MM.yyyy" />
   * @if (due.inputError(); as error) {
   *   <small>{{ error.message }}</small>
   * }
   * ```
   */
  readonly inputError: Signal<WrDateInputError | null> = computed(() => (this.revealed() ? this.refusal() : null));

  /**
   * Blanked briefly so Enter on an unchanged refusal is announced again. A live region
   * does not repeat text it already holds, and blanking it for one render is not
   * enough: both changes land in the same task, and the accessibility tree sees
   * only the end state. The gap is a timer for that reason — the CDK's
   * `LiveAnnouncer` clears its region the same way.
   */
  private readonly silenced = signal(false);
  private silenceTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly statusId = this.inputField.statusId;

  /**
   * What the picker's own live region says: the refusal on show, unless a surrounding
   * `<wr-form-field>` is already rendering a message for it — that message is a
   * `role="alert"`, and a second voice would repeat it.
   */
  protected readonly announcement = computed(() => {
    const shown = this.inputError();
    if (!shown || this.silenced() || this.inputField.saysAlready(shown)) return '';
    return shown.message;
  });

  /**
   * `aria-invalid` and `aria-describedby` for the text input, bound only with NO
   * field around the picker. Inside one, `wrInput` writes both from the field — see
   * `WrDateInputField` for why the picker feeds them through it rather than binding
   * a second writer beside it.
   */
  protected readonly ownAriaInvalid = computed<'true' | null>(() =>
    !this.inputField.outer && this.inputError() ? 'true' : null
  );
  protected readonly ownDescribedBy = computed(() =>
    !this.inputField.outer && this.announcement() ? this.statusId : null
  );

  protected readonly classes = computed(() => {
    const parts = ['wr-date-picker', `wr-date-picker--${this.mode()}`];
    if (this.disabled()) parts.push('wr-date-picker--disabled');
    if (this.inputError()) parts.push('wr-date-picker--invalid');
    return parts.join(' ');
  });

  private overlayRef: OverlayRef | null = null;

  /** Live calendar ref while the date popover is open — lets the panel track
   * the typed value in real time (not just on reopen). */
  private readonly dateRef = signal<ComponentRef<WrCalendar> | null>(null);
  private readonly timeRef = signal<ComponentRef<WrTimePanel> | null>(null);
  private readonly dateTimeRef = signal<ComponentRef<WrDateTimePanel> | null>(null);

  /** The last value an open panel handed us, so the live push never echoes it back. */
  private lastFromPanel: Date | null = null;

  /** Last value we pushed into the model ourselves — lets the sync effect
   * skip the echo of our own edits (so a live keystroke's raw text is never
   * reformatted mid-type). */
  private lastValue: Date | null = null;

  /** The format the sync effect last rendered with. Paired with `lastValue`
   * because the echo guard has to answer "is the display still current", and a
   * `[format]` / `[mode]` change makes it stale with the value untouched. */
  private lastFormat: string | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.dispose();
      clearTimeout(this.silenceTimer);
    });

    // Mirror external writes to `value` (from `[formField]`, `[(value)]`, or a
    // classic-forms bridge) into the display text — this is the old
    // `writeValue` body. The echo of our own edits is skipped, and a
    // null/undefined write is tolerated (it clears the text, exactly as the old
    // `writeValue(Date | null)` did).
    //
    // The FORMAT is read outside `untracked()` on purpose. It used to be read
    // inside, so the effect depended on `value()` alone and a `[format]` or
    // `[mode]` change left the old rendering on screen — while `onInput` /
    // `onBlur` had already switched to parsing against the NEW format, so an
    // edit to the stale text failed to parse and was silently discarded on
    // blur. Folding the format into the echo guard keeps the mid-type
    // protection (a keystroke changes the value, never the format) and still
    // re-renders when the format itself moves.
    effect(() => {
      const v = this.value();
      const fmt = this.resolvedFormat();
      untracked(() => {
        // Our own commits hand `value` the very object `commitValue` remembered, so a
        // DIFFERENT object holding the same date came from outside — a reset to a fresh
        // copy of the day, say. That is no reason to re-render text the user is
        // typing, but it does replace text the picker refused.
        const outside = v !== this.lastValue;
        const echo = this.sameDate(v, this.lastValue) && fmt === this.lastFormat;
        this.lastValue = v;
        this.lastFormat = fmt;
        if (echo && !(outside && this.refusal())) return;
        this.text.set(v && this.adapter.isValid(v) ? this.adapter.format(v, fmt) : '');
        // The text the refusal was about is gone — replaced by a value written from
        // outside, or re-rendered in a new format.
        this.refuse(null);
      });
    });

    // A panel that is up when `disabled` arrives has to go. `readonly` is
    // deliberately NOT here — this component's contract is that the calendar
    // stays browsable while read-only, and only the write is refused (see
    // `commitValue`). `disabled` is the other flag and means the opposite:
    // `toggleOverlay` and `openOnInput` both refuse to open under it, so a
    // popup left standing is a way in that the component says it does not have.
    effect(() => {
      if (!this.disabled()) return;
      untracked(() => {
        if (this.overlayRef) this.closeOverlay();
      });
    });

    // The input's field (see `WrDateInputField`) marks it invalid for the refusal on show.
    this.inputField.describe(this.inputError);

    // While the calendar popover is open, push every valid typed value into it
    // so the displayed month follows the input live (the calendar snaps its
    // own viewDate to the bound `date`).
    effect(() => {
      const ref = this.dateRef();
      if (ref) ref.setInput('date', this.value());
    });

    // …and the constraints with it. Pushing these only at attach time meant a
    // `[min]` (or `[max]`, or the filter) that changed while the popover was open
    // kept the stale constraint until the next reopen — `wr-date-range-picker`
    // carries the same effect under a comment saying exactly that.
    effect(() => {
      const ref = this.dateRef();
      if (!ref) return;
      ref.setInput('min', this.min());
      ref.setInput('max', this.max());
      ref.setInput('dateFilter', this.dateFilter());
    });

    effect(() => {
      const ref = this.timeRef();
      if (!ref) return;
      ref.setInput('format', this.timeFormat());
      ref.setInput('showSeconds', this.showSeconds());
      ref.setInput('step', this.step());
    });

    // The datetime panel had no live sync at all: a date typed into the field
    // while it was open never reached it, so the next stepper click emitted the
    // panel's own stale value and silently undid the typing.
    effect(() => {
      const ref = this.dateTimeRef();
      if (!ref) return;
      const value = this.value();
      if (value !== this.lastFromPanel) ref.setInput('value', value);
      ref.setInput('min', this.min());
      ref.setInput('max', this.max());
      ref.setInput('dateFilter', this.dateFilter());
      ref.setInput('timeFormat', this.timeFormat());
      ref.setInput('showSeconds', this.showSeconds());
      ref.setInput('step', this.step());
    });
  }

  // Template handlers

  protected onInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.text.set(raw);
    if (!raw) {
      this.commitValue(null);
      this.refuse(null);
      return;
    }
    const parsed = this.adapter.parse(raw, this.resolvedFormat());
    if (!parsed || !this.adapter.isValid(parsed)) {
      this.refuse(this.refusals.unreadable(this.resolvedFormat()));
      return;
    }
    const outOfBounds = this.outOfBounds(parsed);
    if (outOfBounds) {
      this.refuse(outOfBounds);
      return;
    }
    this.commitValue(this.withKeptDate(parsed));
    this.refuse(null);
  }

  /**
   * In `time` mode the typed string carries no date, so the adapter fills one in — and
   * the date already in the model is the better answer than whatever default it picks.
   * The time PANEL has always worked this way (it keeps a `basis` date across edits);
   * the text field silently moved the value to another day.
   */
  private withKeptDate(parsed: Date): Date {
    if (this.mode() !== 'time') return parsed;
    const current = this.value();
    if (!current || !this.adapter.isValid(current)) return parsed;
    return this.adapter.setTime(
      current,
      this.adapter.getHours(parsed),
      this.adapter.getMinutes(parsed),
      this.adapter.getSeconds(parsed)
    );
  }

  protected onBlur(event: FocusEvent): void {
    this.touch.emit();

    // A refused entry STAYS. Blur used to overwrite it with the last committed date,
    // which is how a refusal became invisible: `07.09.1994` typed into a field bounded
    // to 2026 simply turned back into the old date the moment the user moved on, with
    // nothing to say it had been refused or why. The text is what they have to
    // correct, and the value underneath was never changed. Focus moving INTO the open
    // panel is not leaving — a day click there is about to replace the text anyway;
    // `onPaneFocusOut` and `closeOverlay` decide when that visit ends.
    if (this.refusal()) {
      const next = event.relatedTarget as Node | null;
      if (!next || !this.overlayRef?.overlayElement.contains(next)) this.reveal();
      return;
    }

    // Reformat to canonical on blur (cleans up `1/5/25` → `1/5/2025`).
    this.settleText();
  }

  /**
   * Enter is "this is the date". A date the picker committed is re-formatted
   * canonical and the panel closes; text it refused turns invalid on the spot —
   * border, `aria-invalid`, the reason announced — and emits `touch`, which is what
   * makes a surrounding `<wr-form-field>` show its message. The panel closes in both
   * cases: it opens directly below the field, which is exactly where that message
   * renders.
   *
   * Never `preventDefault`: Enter inside a `<form>` still submits it, and a form
   * bound to this picker is invalid while the refusal stands.
   */
  private onEnter(): void {
    // Read before closing: a close can put the refusal on show itself.
    const wasShown = this.revealed();
    if (this.overlayRef) this.closeOverlay();
    const refusal = this.refusal();
    if (!refusal) {
      this.settleText();
      return;
    }
    this.touch.emit();
    if (wasShown) {
      // Already on show, so the live region already holds this sentence — and a live
      // region does not repeat text it already has. Blank it briefly so a second
      // Enter is answered rather than met with silence.
      this.silenced.set(true);
      clearTimeout(this.silenceTimer);
      this.silenceTimer = setTimeout(() => this.silenced.set(false), SILENCE_MS);
    }
    this.revealed.set(true);
  }

  /** Show the committed value canonically, or commit an emptied field as `null`. */
  private settleText(): void {
    const v = this.value();
    if (v && this.adapter.isValid(v)) {
      this.text.set(this.adapter.format(v, this.resolvedFormat()));
    } else if (!this.text()) {
      this.commitValue(null);
    }
  }

  /**
   * Record why the current text was not committed, or that it was. Clearing a
   * refusal also takes it off show, so the next one waits for Enter or blur again.
   */
  private refuse(next: WrDateInputError | null): void {
    this.refusal.set(next);
    if (!next) this.revealed.set(false);
    this.reportToForm(next ? [next] : []);
  }

  /** Put a standing refusal on show — the user has left the field. */
  private reveal(): void {
    if (this.refusal()) this.revealed.set(true);
  }

  /**
   * The bound form was reset while the model stayed where it was — Angular has thrown
   * the parse error away, so the text it was about goes too, and the field shows the
   * value again. (A reset that MOVES the model reaches the text through the sync
   * effect instead, like any other outside write.)
   */
  private onFormReset(): void {
    if (!this.refusal()) return;
    const v = this.value();
    this.text.set(v && this.adapter.isValid(v) ? this.adapter.format(v, this.resolvedFormat()) : '');
    this.refuse(null);
  }

  /**
   * Focus leaving the open panel. Moving within it, or back to the text field, is
   * still the same visit; anywhere else — the page, the trigger, the next control — is
   * leaving, so a refusal that waited while focus went into the panel shows now.
   */
  private readonly onPaneFocusOut = (event: FocusEvent): void => {
    const next = event.relatedTarget as Node | null;
    if (next && (this.overlayRef?.overlayElement.contains(next) || next === this.inputEl().nativeElement)) return;
    this.reveal();
  };

  /** Called by the input's click — opens the overlay if it isn't open already. */
  protected openOnInput(): void {
    if (this.disabled() || this.overlayRef) return;
    // Deliberately WITHOUT focus: this click placed a caret in the text field,
    // and yanking focus into the grid would throw away what the user just did.
    // `Alt+ArrowDown` / `ArrowDown` are the keyboard way in — see onFieldKey.
    this.openOverlay(this.inputEl().nativeElement, false);
  }

  protected toggleOverlay(): void {
    if (this.disabled()) return;
    if (this.overlayRef) {
      // Focus is already on the trigger — nothing to restore.
      this.closeOverlay();
    } else {
      this.openOverlay(this.triggerEl()?.nativeElement ?? null, true);
    }
  }

  /**
   * The keyboard route into the panel, per the APG date-picker pattern.
   *
   * `Alt+ArrowDown` opens and takes focus; a bare arrow moves focus in when the
   * panel is ALREADY open, which is how someone who opened it by clicking the
   * field gets to the grid. Every other key — characters, Backspace, the
   * horizontal arrows, Home / End — is left to the field untouched, so typing a
   * date keeps working exactly as before.
   */
  protected onFieldKey(event: KeyboardEvent): void {
    if (this.disabled()) return;

    if (event.key === 'Enter') {
      this.onEnter();
      return;
    }

    const vertical = event.key === 'ArrowDown' || event.key === 'ArrowUp';
    if (!vertical) return;

    if (event.altKey && event.key === 'ArrowDown' && !this.overlayRef) {
      event.preventDefault();
      this.openOverlay(this.inputEl().nativeElement, true);
      return;
    }

    if (this.overlayRef) {
      event.preventDefault();
      this.focusPanel();
    }
  }

  /**
   * Move focus into an already-mounted panel. A plain query is right HERE and
   * wrong at mount time: the panel has settled, so there is no deferral to get
   * wrong — and it keeps `autoFocus` as the single piece of panel API.
   */
  private focusPanel(): void {
    const pane = this.overlayRef?.overlayElement;
    const target =
      pane?.querySelector<HTMLElement>('.wr-calendar__day--focused:not([disabled])') ??
      pane?.querySelector<HTMLElement>('.wr-time-picker__input');
    target?.focus();
  }

  /** Hand focus back to whatever opened the panel, if it is still on the page. */
  private restoreFocus(): void {
    const target = this.openedFrom?.isConnected ? this.openedFrom : this.inputEl().nativeElement;
    target?.focus();
  }

  // Overlay

  private openOverlay(openedFrom: HTMLElement | null = null, autoFocus = false): void {
    if (this.overlayRef) return;
    this.openedFrom = openedFrom;
    this.autoFocusPanel = autoFocus;

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.host)
      .withPositions([
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
        { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
        { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 4 },
        { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -4 },
      ])
      .withPush(true);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.scrollStrategies.reposition(),
      panelClass: 'wr-date-picker-overlay',
    });

    // Two of the four fallbacks anchor on `end`, and the CDK resolves start /
    // end against the direction it captured when this ref was created. The
    // `wr-calendar` inside the pane reads `Directionality` live, so a flip
    // while the panel was open split the grid's key handling from the box it
    // was drawn in — the same split the docs site's own switch shows off.
    wrFollowDirection(this.overlayRef, this.dir, this.injector);

    // The trigger promises `aria-haspopup="dialog"`; the pane is the element it
    // points at, so the role, the name and the id all belong here. Non-modal on
    // purpose — focus is not trapped, and the panel closes on outside click or
    // Escape.
    const pane = this.overlayRef.overlayElement;
    pane.id = this.panelId;
    pane.setAttribute('role', 'dialog');
    pane.setAttribute('aria-modal', 'false');
    pane.setAttribute('aria-label', this.resolvedPanelLabel());
    pane.addEventListener('focusout', this.onPaneFocusOut);

    this.overlayOpen.set(true);

    // Dispatch by mode — pick the panel + wire its emissions.
    const m = this.mode();
    if (m === 'time') this.attachTime();
    else if (m === 'datetime') this.attachDateTime();
    else this.attachDate();

    this.outsideClick
      .outsidePointerEvents(this.overlayRef)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (this.host.nativeElement.contains(event.target as Node)) return;
        this.closeOverlay();
      });

    this.overlayRef
      .keydownEvents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          // Focus is `closeOverlay()`'s business and nobody else's. Escape
          // reaches this overlay from anywhere in the document (the CDK
          // dispatches it to the topmost one), and `openOnInput` deliberately
          // leaves the caret in the field — so the user can Tab on with the
          // panel still open. Forcing the field back into focus here overrode
          // the guarded restore and dragged the caret backwards out of whatever
          // they had moved on to. Same rule as `wr-date-range-picker`.
          this.closeOverlay();
        }
      });
  }

  private attachDate(): void {
    if (!this.overlayRef) return;
    const ref = this.overlayRef.attach(new ComponentPortal(WrCalendar));
    ref.setInput('date', this.value());
    this.dateRef.set(ref);
    ref.setInput('min', this.min());
    ref.setInput('max', this.max());
    ref.setInput('dateFilter', this.dateFilter());
    ref.setInput('autoFocus', this.autoFocusPanel);
    ref.instance.date.subscribe(next => {
      if (!next) return;
      this.commit(next);
      this.closeOverlay();
    });
  }

  private attachTime(): void {
    if (!this.overlayRef) return;
    const ref = this.overlayRef.attach(new ComponentPortal(WrTimePanel));
    ref.setInput('format', this.timeFormat());
    ref.setInput('showSeconds', this.showSeconds());
    ref.setInput('step', this.step());
    ref.setInput('autoFocus', this.autoFocusPanel);
    ref.setInput('value', this.value() ?? this.adapter.today());
    this.timeRef.set(ref);
    ref.instance.value.subscribe((next: Date | null) => {
      if (!next) return;
      this.lastFromPanel = next;
      this.commit(next);
    });
  }

  private attachDateTime(): void {
    if (!this.overlayRef) return;
    const ref = this.overlayRef.attach(new ComponentPortal(WrDateTimePanel));
    ref.setInput('value', this.value());
    ref.setInput('min', this.min());
    ref.setInput('max', this.max());
    ref.setInput('dateFilter', this.dateFilter());
    ref.setInput('timeFormat', this.timeFormat());
    ref.setInput('showSeconds', this.showSeconds());
    ref.setInput('step', this.step());
    ref.setInput('autoFocus', this.autoFocusPanel);
    this.dateTimeRef.set(ref);
    ref.instance.changed.subscribe(next => {
      this.lastFromPanel = next;
      this.commit(next);
      ref.setInput('value', next);
    });
  }

  private commit(next: Date): void {
    this.text.set(this.adapter.format(next, this.resolvedFormat()));
    this.commitValue(next);
    this.refuse(null);
  }

  /** Push a value to the model while remembering it, so the sync effect treats
   * the resulting change as an echo and leaves the display text alone. */
  private commitValue(next: Date | null): void {
    // The calendar is browsable while `readonly` — the field is untypeable, not
    // inert, which is a contract this component's spec pins deliberately. That
    // makes the popup a SECOND way into the model, and it was unguarded: a
    // `readonly()` schema rule left a day click writing exactly as if the rule
    // were absent. Guarding at the single write point rather than at the three
    // ways in keeps the calendar readable and still refuses the edit.
    //
    // `disabled` belongs here for the same reason and was missing: the ways IN
    // all check it, and a panel already up checks nothing again. A picker
    // disabled mid-session — `[disabled]="saving()"`, a schema rule — took a
    // day click and moved its value, which is the one thing a disabled control
    // must never do.
    if (this.readonly() || this.disabled()) return;
    this.lastValue = next;
    this.value.set(next);
  }

  /**
   * Focus goes back to the opener only when it was still INSIDE the panel —
   * dropped there, it would land on `<body>` and the next Tab would restart
   * from the top of the page. When focus had already moved elsewhere (a click
   * on another control, which is itself what closed us) it is left alone:
   * stealing it back would fight the user for the caret.
   */
  private closeOverlay(): void {
    const pane = this.overlayRef?.overlayElement;
    const inside = !!pane && pane.contains(document.activeElement);

    // Taking the pane out of the document moves focus without the user doing anything,
    // so it must not read as focus leaving the panel.
    pane?.removeEventListener('focusout', this.onPaneFocusOut);
    this.dispose();

    if (inside) this.restoreFocus();

    // A panel that closes is the end of the visit to it. Unless focus is back in the
    // field — Escape handing it there, or a close while the user never left it — the
    // user is somewhere else now, and a refusal that waited for the panel shows. A pick
    // has already cleared its refusal, so this only ever reaches text still refused.
    if (document.activeElement !== this.inputEl().nativeElement) this.reveal();
  }

  private dispose(): void {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
    this.dateRef.set(null);
    this.timeRef.set(null);
    this.dateTimeRef.set(null);
    this.overlayOpen.set(false);
    this.autoFocusPanel = false;
  }

  // Helpers

  private outOfBounds(date: Date): WrDateInputError | null {
    if (this.mode() === 'time') return null;
    // Covers `dateFilter` as well as the bounds — the calendar disables filtered
    // days, so accepting them from the keyboard made the two entry paths
    // disagree. Same check, same reason, as `wr-date-range-picker`.
    return this.refusals.outOfBounds(date, { min: this.min(), max: this.max(), filter: this.dateFilter() });
  }

  private sameDate(a: Date | null, b: Date | null): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    return a.getTime() === b.getTime();
  }
}
