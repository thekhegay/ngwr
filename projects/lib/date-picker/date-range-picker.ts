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

import { WrDateAdapter, type WrDateFormat } from 'ngwr/date';
import { readI18nText } from 'ngwr/i18n';
import { WrInput, WrInputGroup, WrInputSuffix } from 'ngwr/input';
import { WR_OVERLAY, WrOutsideClick, wrFollowDirection } from 'ngwr/overlay';
import { toClassList, type WrClassInput } from 'ngwr/utils';

import type { WrDateInputError, WrDateRange, WrDateRangeInputError } from './interfaces';
import { WrDateRangePanel } from './internal/date-range-panel';
import {
  WR_DATE_INPUT_FIELD_VIEW_PROVIDER,
  WrDateInputField,
  useDateInputRefusals,
  useFormParseErrors,
} from './internal/input-refusal';
import { WrDateRangeEndInput } from './internal/range-end-input';

/** Which end of the range an edit applies to. */
type RangeEnd = 0 | 1;

/** Per-instance popup ids, so `aria-controls` can point at one panel. */
let rangePanelUid = 0;

/** How long a live region stays blank before a repeated refusal is written back. */
const SILENCE_MS = 100;

/** One refusal per end, start first — `null` where that end's text is its date. */
type EndRefusals = readonly [WrDateInputError | null, WrDateInputError | null];

/**
 * Date-range picker — two text inputs sharing one range calendar.
 *
 * Separate from `<wr-date-picker>` because the value is a different type: a
 * range is `[start, end]`, and folding that into the single picker's
 * `Date | null` would break `[formField]` inference for every existing usage.
 * Everything else matches — same input skeleton, same overlay, same
 * {@link WrDateAdapter} formats.
 *
 * - `'date'` (default) — popover renders a range calendar. Picking the second
 *   date closes the overlay.
 * - `'datetime'` — popover adds a time stepper per end. Picking dates does NOT
 *   close, since the user typically sets the times next.
 *
 * A signal-forms native control: it implements
 * `FormValueControl<WrDateRange | null>`, so `[formField]` binds straight to
 * its `value` model. `[(value)]` works standalone, and classic `[(ngModel)]` /
 * reactive forms keep working through Angular's bridge.
 *
 * Either end may be `null` while the range is half-picked. Out-of-order ends
 * are swapped on commit, matching the calendar's own behaviour.
 *
 * Each end refuses text it cannot use exactly as `<wr-date-picker>` does — never
 * guessing, keeping the text, and showing the refusal on Enter or when focus
 * leaves that end. See {@link inputErrors}.
 *
 * @example
 * ```html
 * <!-- signal forms -->
 * <wr-date-range-picker [formField]="form.period" format="dd.MM.yyyy" />
 *
 * <!-- standalone two-way binding -->
 * <wr-date-range-picker [(value)]="period" [minDate]="minDate" />
 *
 * <!-- date + time on both ends -->
 * <wr-date-range-picker mode="datetime" [(value)]="window" timeFormat="24h" />
 * ```
 *
 * @see https://ngwr.dev/reference/components/date-picker
 */
@Component({
  selector: 'wr-date-range-picker',
  templateUrl: './date-range-picker.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
  imports: [WrDateRangeEndInput, WrInput, WrInputGroup, WrInputSuffix],
  providers: [WrDateInputField],
  viewProviders: [WR_DATE_INPUT_FIELD_VIEW_PROVIDER],
})
export class WrDateRangePicker implements FormValueControl<WrDateRange | null> {
  /** Picker behavior — see class doc. @default 'date' */
  readonly mode = input<'date' | 'datetime'>('date');

  /**
   * Format used for both display and parsing, on both ends. When `null`
   * (default), it is derived from `mode` (`shortDate` / `shortDateTime`). Pass
   * a named key or raw token string to override.
   */
  readonly format = input<WrDateFormat | (string & {}) | null>(null);

  /** Placeholder for the start input. */
  readonly startPlaceholder = input<string>('');

  /** Placeholder for the end input. */
  readonly endPlaceholder = input<string>('');

  /** Glyph rendered between the two inputs. @default '–' */
  readonly separator = input<string>('–');

  // Named `minDate` / `maxDate`, not `min` / `max`: `FormUiControl` reserves
  // those slots for the control's own value type, which here is a range — a
  // `min` typed as a range makes no sense. Matches `WrValidators.minDate`.
  /** Min selectable date, applied to both ends. */
  readonly minDate = input<Date | null>(null);

  /** Max selectable date, applied to both ends. */
  readonly maxDate = input<Date | null>(null);

  /** Predicate to disable specific dates (forwarded to the calendar). */
  readonly dateFilter = input<((date: Date) => boolean) | null>(null);

  /** Time-panel 12 / 24-hour format. Applies in `datetime` mode. @default 'auto' */
  readonly timeFormat = input<'auto' | '12h' | '24h'>('auto');

  /** Render the seconds column. Applies in `datetime` mode. @default false */
  readonly showSeconds = input(false, { transform: coerceBooleanProperty });

  /** Minute / second step for the time panels. @default 1 */
  readonly step = input(1, { transform: (v: unknown): number => Math.max(1, coerceNumberProperty(v, 1)) });

  /**
   * Disable interaction. Bound automatically from the field's disabled state
   * when used with `[formField]`.
   *
   * @default false
   */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /**
   * Read-only — neither the inputs nor the calendar can change the value.
   *
   * Deliberately stricter than `wr-date-picker`, which still opens its popup
   * while read-only: with two fields feeding one calendar there is no reading
   * of "untypeable" that leaves the grid free to rewrite both ends. The doc
   * used to promise the trigger still opened; the code has always refused, and
   * refusing is the behaviour worth keeping.
   *
   * @default false
   */
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
  protected readonly startEl = viewChild.required<ElementRef<HTMLInputElement>>('startInput');
  protected readonly endEl = viewChild.required<ElementRef<HTMLInputElement>>('endInput');
  protected readonly triggerEl = viewChild<ElementRef<HTMLButtonElement>>('trigger');

  /** The picked range. Bound by `[formField]`, or two-way via `[(value)]`. */
  readonly value = model<WrDateRange | null>(null);

  /** Emitted on blur so a bound field can mark itself touched. */
  readonly touch = output<void>();

  /** Text currently in each input (may be partial / invalid mid-type). */
  protected readonly startText = signal<string>('');
  protected readonly endText = signal<string>('');

  /** Whether the popover is currently open. */
  protected readonly overlayOpen = signal(false);

  /**
   * Which element opened the popup — captured as an argument, never read off
   * `document.activeElement`, which by then may already be the pane. With TWO
   * text inputs this is the whole point: "restore focus to the field" is
   * ambiguous here, and the old code resolved it by always picking the START
   * input, so closing from the end input threw the caret across the control.
   */
  private openedFrom: HTMLElement | null = null;

  /** Whether the panel this open cycle should take focus. */
  private autoFocusPanel = false;

  /** Resolved format — falls back to a mode-appropriate default. */
  protected readonly resolvedFormat = computed<string>(() =>
    this.format() ? String(this.format()) : this.mode() === 'datetime' ? 'shortDateTime' : 'shortDate'
  );

  protected readonly isDateTime = computed(() => this.mode() === 'datetime');

  protected readonly triggerLabel = readI18nText('datePicker.openRange', 'Open range calendar');
  protected readonly startLabel = readI18nText('datePicker.rangeStart', 'Range start');
  protected readonly endLabel = readI18nText('datePicker.rangeEnd', 'Range end');

  private readonly panelLabelRange = readI18nText('datePicker.panelRange', 'Choose date range');
  private readonly panelLabelRangeDateTime = readI18nText(
    'datePicker.panelRangeDateTime',
    'Choose date and time range'
  );

  /**
   * Accessible name of the popup. The trigger advertises
   * `aria-haspopup="dialog"`, so the pane is a `role="dialog"` — and an unnamed
   * dialog announces as a bare "dialog". Defaults to the catalog's
   * `datePicker.panelRange*` string for the current `mode`.
   */
  readonly panelAriaLabel = input<string | null>(null);

  /**
   * Extra CSS classes for the calendar panel's overlay pane.
   *
   * The pane is appended to the overlay container, not to this component, so
   * nothing in the consumer's own template encloses it and no descendant rule
   * written around the trigger can reach it. This input is the only per-instance
   * handle on it. A space-separated string works as well as an array.
   */
  readonly panelClass = input<WrClassInput>(null);

  /** Popup id — what the trigger's `aria-controls` points at while open. */
  protected readonly panelId = `wr-date-range-picker-panel-${++rangePanelUid}`;

  protected readonly resolvedPanelLabel = computed(() => {
    const explicit = this.panelAriaLabel();
    if (explicit) return explicit;
    return this.isDateTime() ? this.panelLabelRangeDateTime() : this.panelLabelRange();
  });

  private readonly refusalBuilder = useDateInputRefusals();
  private readonly reportToForm = useFormParseErrors(this.value, () => this.onFormReset());
  private readonly inputField = inject(WrDateInputField);

  /** Why each end's text was not committed. */
  private readonly refusals = signal<EndRefusals>([null, null]);

  /**
   * Every refusal standing, on show or not, each marked with its end — what a bound form
   * hears, from the keystroke.
   */
  private readonly raised = computed<readonly WrDateRangeInputError[]>(() => {
    const [start, end] = this.refusals();
    const out: WrDateRangeInputError[] = [];
    if (start) out.push({ ...start, end: 'start' });
    if (end) out.push({ ...end, end: 'end' });
    return out;
  });

  /**
   * Which ends have their refusal on show — raised on the keystroke, shown on Enter
   * or when focus leaves that end, for the reason `wr-date-picker` gives at the same
   * name: a date is unreadable for most of the time it takes to type one. Leaving
   * includes leaving by way of the open panel, as it does there.
   */
  private readonly revealed = signal<readonly [boolean, boolean]>([false, false]);

  protected readonly shownErrors = computed<EndRefusals>(() => {
    const [start, end] = this.refusals();
    const [showStart, showEnd] = this.revealed();
    return [showStart ? start : null, showEnd ? end : null];
  });

  /**
   * Why the text in either field is not that end of the bound range, for the ends
   * whose refusal the picker is SHOWING — one entry per end, marked with the `end` it
   * came from, and empty while both fields hold their dates or the user is still
   * typing.
   *
   * An end's refusal is raised on the keystroke and goes on show on Enter or when
   * focus leaves that end — the moment its input turns invalid and the reason is
   * announced, so a message rendered from this never disagrees with them. It clears
   * the moment that end's text commits, is emptied, or is replaced by a pick from the
   * panel, a value written from outside, or a form reset.
   *
   * A bound form does NOT wait: it sees every refusal as a parse error from the
   * keystroke, so it is invalid the whole time either field holds text the picker
   * could not use — including while the OTHER end commits — and `<wr-form-field>`
   * shows `message` by its own rule. Read this through a template reference to put
   * the reason on screen for a picker bound with `[(value)]` alone.
   */
  readonly inputErrors: Signal<readonly WrDateRangeInputError[]> = computed(() => {
    const [showStart, showEnd] = this.revealed();
    return this.raised().filter(error => (error.end === 'start' ? showStart : showEnd));
  });

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
   * The live region's text: every refusal on show that a surrounding `<wr-form-field>`
   * is not already rendering a message for, each sentence once.
   */
  protected readonly announcement = computed(() => {
    if (this.silenced()) return '';
    const messages = this.shownErrors()
      .filter((error): error is WrDateInputError => !!error && !this.inputField.saysAlready(error))
      .map(error => error.message);
    return [...new Set(messages)].join(' ');
  });

  /**
   * `aria-invalid` / `aria-describedby` for each input, where the picker binds them.
   *
   * The START input reads a surrounding field through `wrInput`, so inside one the
   * picker feeds its refusal through `WrDateInputField` rather than binding a second
   * writer beside `wrInput`, and binds these only with no field around it. The END
   * input is hidden from the field on purpose (see `wrDateRangeEnd`), so its `wrInput`
   * never writes either attribute and the picker always owns them: an unreadable end
   * date marks the end field, not only the start.
   */
  protected readonly startAriaInvalid = computed<'true' | null>(() =>
    !this.inputField.outer && this.shownErrors()[0] ? 'true' : null
  );
  protected readonly endAriaInvalid = computed<'true' | null>(() => (this.shownErrors()[1] ? 'true' : null));
  protected readonly startDescribedBy = computed(() =>
    !this.inputField.outer && this.shownErrors()[0] && this.announcement() ? this.statusId : null
  );
  protected readonly endDescribedBy = computed(() =>
    this.shownErrors()[1] && this.announcement() ? this.statusId : null
  );

  protected readonly classes = computed(() => {
    const parts = ['wr-date-range-picker', `wr-date-range-picker--${this.mode()}`];
    if (this.disabled()) parts.push('wr-date-range-picker--disabled');
    if (this.shownErrors().some(Boolean)) parts.push('wr-date-range-picker--invalid');
    return parts.join(' ');
  });

  private overlayRef: OverlayRef | null = null;

  /** Live panel ref while the popover is open — lets typed edits move the
   * displayed month in real time (not just on reopen). */
  private readonly panelRef = signal<ComponentRef<WrDateRangePanel> | null>(null);

  /** Last range we pushed into the model ourselves, so the sync effect can skip
   * the echo of our own edits and never reformat text mid-type. */
  private lastValue: WrDateRange | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.dispose();
      clearTimeout(this.silenceTimer);
    });

    // The start input's field (see `WrDateInputField`) marks it invalid for the
    // start end's refusal on show; the end input carries its own.
    this.inputField.describe(computed(() => this.shownErrors()[0]));

    // Mirror external writes to `value` into the two display texts — and drop the
    // refusals, whose text that write has just replaced.
    effect(() => {
      const v = this.value();
      untracked(() => {
        // An equal range in a DIFFERENT tuple came from outside — `commitRange` hands the
        // model the very tuple it remembered. It leaves text being typed alone, but it
        // does replace text the picker refused.
        const outside = v !== this.lastValue;
        const [refusedStart, refusedEnd] = this.refusals();
        if (this.sameRange(v, this.lastValue) && !(outside && (refusedStart || refusedEnd))) return;
        this.lastValue = v;
        this.startText.set(this.display(v?.[0] ?? null));
        this.endText.set(this.display(v?.[1] ?? null));
        this.refuse(0, null);
        this.refuse(1, null);
      });
    });

    // A panel that is up when `readonly` turns on has to go, and `disabled` is
    // the same case. The three entrance guards refuse to OPEN the calendar, and
    // the component's whole position on `readonly` — stricter than the single
    // picker's, which keeps its calendar browsable — is that the calendar is
    // not a second way in. Leaving it standing and only refusing the write
    // trades a wrong value for a dead panel: every click does nothing and
    // nothing says why.
    effect(() => {
      if (!this.readonly() && !this.disabled()) return;
      untracked(() => {
        if (this.overlayRef) this.closeOverlay();
      });
    });

    // Keep the open panel in step with the model.
    effect(() => {
      const ref = this.panelRef();
      if (ref) ref.setInput('value', this.value() ?? [null, null]);
    });

    // …and with every other input. Pushing these only at attach time meant a
    // `[minDate]` (or filter, or time format) that changed while the popover was
    // open silently kept the stale constraint until the next reopen.
    effect(() => {
      const ref = this.panelRef();
      if (!ref) return;
      ref.setInput('min', this.minDate());
      ref.setInput('max', this.maxDate());
      ref.setInput('dateFilter', this.dateFilter());
      ref.setInput('withTime', this.isDateTime());
      ref.setInput('timeFormat', this.timeFormat());
      ref.setInput('showSeconds', this.showSeconds());
      ref.setInput('step', this.step());
    });
  }

  // Template handlers

  protected onStartInput(event: Event): void {
    this.onRangeInput(event, 0);
  }

  protected onEndInput(event: Event): void {
    this.onRangeInput(event, 1);
  }

  protected onBlur(event: FocusEvent): void {
    // Moving between the two ends is still one interaction — only report the
    // control as touched once focus actually leaves it, or tabbing from start to
    // end would mark a bound field touched mid-entry.
    const next = event.relatedTarget as Node | null;
    const leaving = !next || !this.host.nativeElement.contains(next);
    if (leaving) this.touch.emit();

    // Typing leaves the ends in whatever order they were entered; settle it
    // here, once the user has stopped — and moving from one end to the other is
    // NOT stopping. Sorting on that hop took the start date the user had just
    // typed and moved it into the field they were tabbing into, leaving the old
    // end date under their cursor. Same rule the time steppers follow.
    const [start, end] = this.commitRange(this.current(), { normalise: leaving });
    // Reformat to canonical on blur (cleans up `1/5/25` → `1/5/2025`) — except a
    // refused end, whose text is what the user has to correct. Overwriting it with
    // the old date is how a refusal used to vanish without a word.
    const [refusedStart, refusedEnd] = this.refusals();
    if (!refusedStart) this.startText.set(this.display(start));
    if (!refusedEnd) this.endText.set(this.display(end));

    // Show the refusal of the end focus just left — both, once it leaves the pair.
    // Focus moving INTO the open panel is not leaving: a pick there replaces the text.
    if (next && this.overlayRef?.overlayElement.contains(next)) return;
    const left: RangeEnd = event.target === this.endEl().nativeElement ? 1 : 0;
    this.reveal(leaving ? [true, true] : left === 0 ? [true, false] : [false, true]);
  }

  /**
   * Enter in either field is "this is the range". Committed ends are settled — sorted
   * and re-formatted canonical — and the panel closes; a refused end turns invalid on
   * the spot, and `touch` is emitted so a surrounding `<wr-form-field>` shows its
   * message, which the panel would otherwise cover. Never `preventDefault`: Enter in a
   * `<form>` still submits it, and a bound form is invalid while a refusal stands.
   */
  private onEnter(): void {
    // Read before closing: a close can put refusals on show itself.
    const [shownStart, shownEnd] = this.revealed();
    if (this.overlayRef) this.closeOverlay();
    const [start, end] = this.commitRange(this.current(), { normalise: true });
    const [refusedStart, refusedEnd] = this.refusals();
    if (!refusedStart) this.startText.set(this.display(start));
    if (!refusedEnd) this.endText.set(this.display(end));
    if (!refusedStart && !refusedEnd) return;

    this.touch.emit();
    if ((!refusedStart || shownStart) && (!refusedEnd || shownEnd)) {
      // Everything refused is already on show, so the live region already holds this
      // text and would not repeat it. Blank it briefly so Enter is answered.
      this.silenced.set(true);
      clearTimeout(this.silenceTimer);
      this.silenceTimer = setTimeout(() => this.silenced.set(false), SILENCE_MS);
    }
    this.reveal([true, true]);
  }

  /** Put the refusals of the given ends on show; an end with no refusal stays clear. */
  private reveal([start, end]: readonly [boolean, boolean]): void {
    const [refusedStart, refusedEnd] = this.refusals();
    const [shownStart, shownEnd] = this.revealed();
    this.revealed.set([shownStart || (start && !!refusedStart), shownEnd || (end && !!refusedEnd)]);
  }

  /**
   * Record why one end's text was not committed, or that it was. Clearing a refusal
   * takes it off show too, so the next one waits for Enter or blur again.
   */
  private refuse(end: RangeEnd, next: WrDateInputError | null): void {
    const current = this.refusals();
    if (current[end] === next) return;
    this.refusals.set(end === 0 ? [next, current[1]] : [current[0], next]);
    if (!next) {
      const [shownStart, shownEnd] = this.revealed();
      this.revealed.set(end === 0 ? [false, shownEnd] : [shownStart, false]);
    }
    this.reportToForm(this.raised());
  }

  /**
   * Put the refusals on show for wherever focus has gone: back into one field leaves
   * the OTHER end, and anywhere outside the pair leaves both.
   */
  private revealFor(focus: Element | null): void {
    if (focus === this.startEl().nativeElement) this.reveal([false, true]);
    else if (focus === this.endEl().nativeElement) this.reveal([true, false]);
    else this.reveal([true, true]);
  }

  /**
   * The bound form was reset while the model stayed where it was — Angular has thrown
   * the parse errors away, so the text they were about goes too, and both fields show
   * the range again. (A reset that MOVES the model reaches the text through the sync
   * effect, like any other outside write.)
   */
  private onFormReset(): void {
    const [refusedStart, refusedEnd] = this.refusals();
    if (!refusedStart && !refusedEnd) return;
    const [start, end] = this.current();
    this.startText.set(this.display(start));
    this.endText.set(this.display(end));
    this.refuse(0, null);
    this.refuse(1, null);
  }

  /**
   * Focus leaving the open panel. Moving within it is the same visit; anywhere else has
   * left whichever end focus is not going back to — see {@link revealFor}.
   */
  private readonly onPaneFocusOut = (event: FocusEvent): void => {
    const next = event.relatedTarget as Element | null;
    if (next && this.overlayRef?.overlayElement.contains(next)) return;
    this.revealFor(next);
  };

  /** Called by an input's click — opens the overlay if it isn't open already. */
  protected openOnInput(end: RangeEnd): void {
    if (this.disabled() || this.readonly() || this.overlayRef) return;
    // Deliberately WITHOUT focus: this click placed a caret in one of the text
    // fields, and pulling focus into the grid would throw that away.
    // `Alt+ArrowDown` / `ArrowDown` are the keyboard way in — see onFieldKey.
    this.openOverlay(this.fieldEl(end), false);
  }

  protected toggleOverlay(): void {
    // `readonly` blocks the calendar too — otherwise the inputs refuse typing
    // while the popover happily edits the same value.
    if (this.disabled() || this.readonly()) return;
    if (this.overlayRef) {
      // Focus is already on the trigger — nothing to restore.
      this.closeOverlay();
    } else {
      this.openOverlay(this.triggerEl()?.nativeElement ?? null, true);
    }
  }

  /**
   * The keyboard route into the popup, per the APG date-picker pattern, and the
   * only one either field has. `Alt+ArrowDown` opens and takes focus; a bare
   * vertical arrow walks focus in when the popup is ALREADY open, which is how
   * someone who opened it by clicking a field reaches the grid. Every other key
   * belongs to the field, so typing a date keeps working with the popup open.
   */
  protected onFieldKey(event: KeyboardEvent, end: RangeEnd): void {
    if (this.disabled() || this.readonly()) return;

    if (event.key === 'Enter') {
      this.onEnter();
      return;
    }

    const vertical = event.key === 'ArrowDown' || event.key === 'ArrowUp';
    if (!vertical) return;

    if (event.altKey && event.key === 'ArrowDown' && !this.overlayRef) {
      event.preventDefault();
      this.openOverlay(this.fieldEl(end), true);
      return;
    }

    if (this.overlayRef) {
      event.preventDefault();
      this.focusPanel();
    }
  }

  /** The input element for an end — the two are otherwise addressed by index. */
  private fieldEl(end: RangeEnd): HTMLInputElement {
    return end === 0 ? this.startEl().nativeElement : this.endEl().nativeElement;
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

  /** Hand focus back to whatever opened the popup, if it is still on the page. */
  private restoreFocus(): void {
    const opener = this.openedFrom?.isConnected ? this.openedFrom : null;
    opener?.focus();

    // Connected is not the question — whether the focus LANDED is. The calendar
    // trigger goes `disabled` the moment `readonly` turns on, and a disabled
    // button is still in the document and still refuses focus, so a panel
    // closed by that flip used to land on `<body>` and the next Tab restarted
    // at the top of the page. The start field keeps its tab stop while
    // read-only, which is the whole point of read-only, so it is where the
    // caret belongs.
    if (this.host.nativeElement.ownerDocument.activeElement !== opener) {
      this.startEl().nativeElement.focus();
    }
  }

  // Input parsing

  private onRangeInput(event: Event, end: RangeEnd): void {
    const raw = (event.target as HTMLInputElement).value;
    (end === 0 ? this.startText : this.endText).set(raw);

    const [start, finish] = this.current();
    if (!raw) {
      this.commitRange(end === 0 ? [null, finish] : [start, null], { normalise: false });
      this.refuse(end, null);
      return;
    }
    const parsed = this.adapter.parse(raw, this.resolvedFormat());
    if (!parsed || !this.adapter.isValid(parsed)) {
      this.refuse(end, this.refusalBuilder.unreadable(this.resolvedFormat()));
      return;
    }
    const outOfBounds = this.outOfBounds(parsed);
    if (outOfBounds) {
      this.refuse(end, outOfBounds);
      return;
    }
    // Never reorder mid-keystroke: a half-typed date can parse to an
    // out-of-order value, and swapping there would yank the text the user is
    // still typing over to the other input. Ordering is settled on blur.
    this.commitRange(end === 0 ? [parsed, finish] : [start, parsed], { normalise: false });
    this.refuse(end, null);
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
      panelClass: toClassList('wr-date-picker-overlay', this.panelClass()),
    });

    // Same four fallbacks as `wr-date-picker`, two of them anchored on `end`,
    // and the two calendars inside the panel read `Directionality` live — so an
    // open range panel had to follow a flip or render its months against a
    // direction the rest of the page had left behind.
    wrFollowDirection(this.overlayRef, this.dir, this.injector);

    this.overlayOpen.set(true);

    // The trigger promises `aria-haspopup="dialog"`; the pane is the element it
    // points at, so the role, the name and the id all belong here. Non-modal on
    // purpose — the two text fields stay reachable while the calendar is up,
    // which is the whole interaction model.
    const pane = this.overlayRef.overlayElement;
    pane.id = this.panelId;
    pane.setAttribute('role', 'dialog');
    pane.setAttribute('aria-modal', 'false');
    pane.setAttribute('aria-label', this.resolvedPanelLabel());
    pane.addEventListener('focusout', this.onPaneFocusOut);

    const ref = this.overlayRef.attach(new ComponentPortal(WrDateRangePanel));
    ref.setInput('value', this.value() ?? [null, null]);
    ref.setInput('autoFocus', this.autoFocusPanel);
    this.panelRef.set(ref);

    // A stepper edit belongs to the end it was made on. Sorting it here is what
    // made the start stepper stop responding once it passed the end.
    ref.instance.timeChanged.subscribe(next => this.commitRange(next, { normalise: false }));

    ref.instance.changed.subscribe(next => {
      const committed = this.commitRange(next, { normalise: true });
      // A complete date-only range is the end of the interaction; a datetime
      // range still needs its hours, so the panel stays put.
      if (!this.isDateTime() && committed[0] && committed[1]) this.closeOverlay();
    });

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
          this.closeOverlay();
        }
      });
  }

  /**
   * Close the popover, handing focus back to whichever field or button opened
   * it — but ONLY when focus was still inside the pane. Dropped there it would
   * land on `<body>` and the next Tab would restart from the top of the page;
   * moved on by the user, it must be left where they put it.
   *
   * There is deliberately no "always restore" escape hatch. Escape reaches this
   * overlay from anywhere in the document (the CDK dispatches it to the topmost
   * one), so forcing a restore would drag the caret backwards out of the field
   * the user was actually typing in — into the one that happened to open the
   * popup, possibly several Tab stops away.
   */
  private closeOverlay(): void {
    const pane = this.overlayRef?.overlayElement;
    const doc = this.host.nativeElement.ownerDocument;
    const inside = !!pane && pane.contains(doc.activeElement);

    // Taking the pane out of the document moves focus without the user doing anything,
    // so it must not read as focus leaving the panel.
    pane?.removeEventListener('focusout', this.onPaneFocusOut);
    this.dispose();

    // The interaction is over, so settle the ordering an in-progress time edit
    // was allowed to leave inverted. Blur does the same for the text inputs;
    // without this, closing by clicking outside never passes through one.
    this.commitRange(this.current(), { normalise: true });

    if (inside) this.restoreFocus();

    // A panel that closes ends the visit to it: wherever focus is now, the ends it is
    // not in have been left. A pick has already cleared the refusals it replaced.
    this.revealFor(doc.activeElement);
  }

  private dispose(): void {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
    this.panelRef.set(null);
    this.overlayOpen.set(false);
    this.autoFocusPanel = false;
  }

  // Commit

  /**
   * Push to the model and refresh the text of whichever ends changed. Returns
   * what was actually committed.
   *
   * `normalise` swaps out-of-order ends. The calendar and blur ask for it; a
   * keystroke does not, because reordering while the user is still typing would
   * move their in-progress text into the other input.
   */
  private commitRange(next: WrDateRange, options: { normalise: boolean }): WrDateRange {
    const previous = this.current();
    const normalised = options.normalise ? this.normalise(next) : next;
    // Only write when a date actually moved, and never while `readonly`.
    //
    // `normalise()` allocates a fresh tuple on every call and `model()` compares
    // by reference, so an unconditional write would emit on every blur — enough
    // to mark a bound `[formField]` dirty just by tabbing through the two inputs.
    //
    // The `readonly` half is the one the three entrance guards cannot cover:
    // `openOnInput`, `toggleOverlay` and `onFieldKey` all refuse to OPEN the
    // calendar, and none of them is consulted again by a panel that is already
    // up. A `readonly()` schema rule turning on mid-session — a save starting,
    // another field flipping the row — left the popup standing and a day click
    // wrote the range anyway. The single picker guards its write point for
    // exactly this reason and says so at `commitValue`; this is the same guard
    // at the same place.
    if (!this.readonly() && !this.sameRange(normalised, this.value())) {
      this.lastValue = normalised;
      this.value.set(normalised);
    }
    // An end whose DATE moved — a pick in the panel, a swap — has had its text
    // replaced by that date, so a refusal about the old text no longer applies.
    // An end that did not move keeps refused text as it is: committing the OTHER
    // end is no reason to throw away what the user is still correcting here.
    const [movedStart, movedEnd] = [0, 1].map(i => !this.sameDate(this.current()[i], previous[i]));
    if (movedStart) this.refuse(0, null);
    if (movedEnd) this.refuse(1, null);
    const [refusedStart, refusedEnd] = this.refusals();
    // Say the refusals again, whether or not either moved. Angular clears a control's
    // parse errors whenever its model changes, so committing ONE end used to leave the
    // form valid while the other end still held refused text — and able to submit the
    // old end under it.
    this.reportToForm(this.raised());

    // Only rewrite the text of an end whose date moved out from under it —
    // otherwise a half-typed date would be reformatted on every keystroke.
    if (!refusedStart && !this.sameDate(normalised[0], this.parseText(this.startText()))) {
      this.startText.set(this.display(normalised[0]));
    }
    if (!refusedEnd && !this.sameDate(normalised[1], this.parseText(this.endText()))) {
      this.endText.set(this.display(normalised[1]));
    }
    return normalised;
  }

  // Helpers

  private current(): WrDateRange {
    return this.value() ?? [null, null];
  }

  private display(date: Date | null): string {
    return date && this.adapter.isValid(date) ? this.adapter.format(date, this.resolvedFormat()) : '';
  }

  private parseText(raw: string): Date | null {
    if (!raw) return null;
    const parsed = this.adapter.parse(raw, this.resolvedFormat());
    return parsed && this.adapter.isValid(parsed) ? parsed : null;
  }

  /** Keep `[start, end]` in chronological order once both ends exist. */
  private normalise(range: WrDateRange): WrDateRange {
    const [start, end] = range;
    if (start && end && this.compareEnds(start, end) > 0) return [end, start];
    return [start, end];
  }

  /**
   * Chronological comparison at the precision the mode needs. The adapter's
   * `compareDate` is day-precision by contract, which would leave an inverted
   * same-day `datetime` range (18:00 → 09:00) unswapped.
   */
  private compareEnds(a: Date, b: Date): number {
    const byDay = this.adapter.compareDate(a, b);
    if (byDay !== 0 || !this.isDateTime()) return byDay;
    const clock = (d: Date): number =>
      this.adapter.getHours(d) * 3600 + this.adapter.getMinutes(d) * 60 + this.adapter.getSeconds(d);
    return clock(a) - clock(b);
  }

  /**
   * Why a typed date must be rejected, or `null`. Covers `dateFilter` as well as
   * the bounds — the calendar disables filtered days, so accepting them from the
   * keyboard would make the two entry paths disagree.
   */
  private outOfBounds(date: Date): WrDateInputError | null {
    return this.refusalBuilder.outOfBounds(date, {
      min: this.minDate(),
      max: this.maxDate(),
      filter: this.dateFilter(),
    });
  }

  private sameDate(a: Date | null, b: Date | null): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    return a.getTime() === b.getTime();
  }

  /**
   * `null` and `[null, null]` are the same VALUE — an empty range — and treating
   * them as different is what let the FIRST blur on an untouched picker write
   * `[null, null]` over the `null` it was bound to. No date had moved, but
   * `model()` emitted: a bound `[formField]` went dirty from nothing but tabbing
   * through, and a consumer's `@if (period())` flipped from empty to truthy with
   * neither end picked. The write guard in `commitRange` is only as good as this
   * comparison.
   */
  private sameRange(a: WrDateRange | null, b: WrDateRange | null): boolean {
    if (a === b) return true;
    const [aStart, aEnd] = a ?? [null, null];
    const [bStart, bEnd] = b ?? [null, null];
    return this.sameDate(aStart, bStart) && this.sameDate(aEnd, bEnd);
  }
}
