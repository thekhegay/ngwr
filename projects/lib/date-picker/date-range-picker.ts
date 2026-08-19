/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { type OverlayRef, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import {
  Component,
  type ComponentRef,
  DestroyRef,
  ElementRef,
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

import { WrDateAdapter, type WrDateFormat } from 'ngwr/date-adapter';
import { readI18nText } from 'ngwr/i18n';
import { WrInput, WrInputGroup, WrInputSuffix } from 'ngwr/input';
import { WR_OVERLAY, WrOutsideClick } from 'ngwr/overlay';

import type { WrDateRange } from './interfaces';
import { WrDateRangePanel } from './internal/date-range-panel';
import { WrDateRangeEndInput } from './internal/range-end-input';

/** Which end of the range an edit applies to. */
type RangeEnd = 0 | 1;

/** Per-instance popup ids, so `aria-controls` can point at one panel. */
let rangePanelUid = 0;

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

  /** Popup id — what the trigger's `aria-controls` points at while open. */
  protected readonly panelId = `wr-date-range-picker-panel-${++rangePanelUid}`;

  protected readonly resolvedPanelLabel = computed(() => {
    const explicit = this.panelAriaLabel();
    if (explicit) return explicit;
    return this.isDateTime() ? this.panelLabelRangeDateTime() : this.panelLabelRange();
  });

  protected readonly classes = computed(() => {
    const parts = ['wr-date-range-picker', `wr-date-range-picker--${this.mode()}`];
    if (this.disabled()) parts.push('wr-date-range-picker--disabled');
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
    this.destroyRef.onDestroy(() => this.dispose());

    // Mirror external writes to `value` into the two display texts.
    effect(() => {
      const v = this.value();
      untracked(() => {
        if (this.sameRange(v, this.lastValue)) return;
        this.lastValue = v;
        this.startText.set(this.display(v?.[0] ?? null));
        this.endText.set(this.display(v?.[1] ?? null));
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
    // Reformat to canonical on blur (cleans up `1/5/25` → `1/5/2025`).
    this.startText.set(this.display(start));
    this.endText.set(this.display(end));
  }

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
    const target = this.openedFrom?.isConnected ? this.openedFrom : this.startEl().nativeElement;
    target.focus();
  }

  // Input parsing

  private onRangeInput(event: Event, end: RangeEnd): void {
    const raw = (event.target as HTMLInputElement).value;
    (end === 0 ? this.startText : this.endText).set(raw);

    const [start, finish] = this.current();
    if (!raw) {
      this.commitRange(end === 0 ? [null, finish] : [start, null], { normalise: false });
      return;
    }
    const parsed = this.adapter.parse(raw, this.resolvedFormat());
    if (!parsed || !this.adapter.isValid(parsed) || this.isOutOfBounds(parsed)) return;
    // Never reorder mid-keystroke: a half-typed date can parse to an
    // out-of-order value, and swapping there would yank the text the user is
    // still typing over to the other input. Ordering is settled on blur.
    this.commitRange(end === 0 ? [parsed, finish] : [start, parsed], { normalise: false });
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
    const inside = !!pane && pane.contains(this.host.nativeElement.ownerDocument.activeElement);

    this.dispose();

    // The interaction is over, so settle the ordering an in-progress time edit
    // was allowed to leave inverted. Blur does the same for the text inputs;
    // without this, closing by clicking outside never passes through one.
    this.commitRange(this.current(), { normalise: true });

    if (inside) this.restoreFocus();
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
    const normalised = options.normalise ? this.normalise(next) : next;
    // Only write when a date actually moved. `normalise()` allocates a fresh
    // tuple on every call and `model()` compares by reference, so an
    // unconditional write would emit on every blur — enough to mark a bound
    // `[formField]` dirty just by tabbing through the two inputs.
    if (!this.sameRange(normalised, this.value())) {
      this.lastValue = normalised;
      this.value.set(normalised);
    }
    // Only rewrite the text of an end whose date moved out from under it —
    // otherwise a half-typed date would be reformatted on every keystroke.
    if (!this.sameDate(normalised[0], this.parseText(this.startText()))) {
      this.startText.set(this.display(normalised[0]));
    }
    if (!this.sameDate(normalised[1], this.parseText(this.endText()))) {
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
   * Whether a typed date must be rejected. Covers `dateFilter` as well as the
   * bounds — the calendar disables filtered days, so accepting them from the
   * keyboard would make the two entry paths disagree.
   */
  private isOutOfBounds(date: Date): boolean {
    const min = this.minDate();
    if (min && this.adapter.compareDate(date, min) < 0) return true;
    const max = this.maxDate();
    if (max && this.adapter.compareDate(date, max) > 0) return true;
    const filter = this.dateFilter();
    if (filter && !filter(date)) return true;
    return false;
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
