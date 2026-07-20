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

import { WrCalendar } from 'ngwr/calendar';
import { WrDateAdapter, type WrDateFormat } from 'ngwr/date-adapter';
import { readI18nText } from 'ngwr/i18n';
import { WrInput, WrInputGroup, WrInputSuffix } from 'ngwr/input';
import { WR_OVERLAY } from 'ngwr/overlay';

import { WrDateTimePanel } from './internal/date-time-panel';
import { WrTimePanel } from './internal/time-panel';

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
 * Parses the input on every keystroke (silently — only emits when valid) and
 * re-formats canonical on blur. Format is driven by {@link WrDateAdapter}: it
 * accepts both named keys (`'shortDate'`, `'mediumDateTime'`, …) and raw
 * token strings (`'dd.MM.yyyy'`, `'HH:mm'`). When `format` is left at the
 * default (`null`), the picker derives the right named key from `mode`:
 * `'date'` → `'shortDate'`, `'time'` → `'shortTime'`, `'datetime'` →
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
})
export class WrDatePicker implements FormValueControl<Date | null> {
  /** Picker behavior — see class doc. @default 'date' */
  readonly mode = input<'date' | 'time' | 'datetime'>('date');

  /**
   * Format used for both display and parsing. When `null` (default), the
   * format is derived from `mode` (`shortDate` / `shortTime` /
   * `shortDateTime`). Pass a named key or raw token string to override.
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
  private readonly scrollStrategies = inject(ScrollStrategyOptions);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly inputEl = viewChild.required<ElementRef<HTMLInputElement>>('input');

  /** The picked Date. Bound by `[formField]`, or two-way via `[(value)]`. */
  readonly value = model<Date | null>(null);

  /** Emitted on blur so a bound field can mark itself touched. */
  readonly touch = output<void>();

  /** Text currently in the input (may be partial / invalid mid-type). */
  protected readonly text = signal<string>('');

  /** Whether the popover is currently open. */
  protected readonly overlayOpen = signal(false);

  /** Resolved format — falls back to a mode-appropriate default. */
  protected readonly resolvedFormat = computed<string>(() => {
    const explicit = this.format();
    if (explicit) return explicit;
    const m = this.mode();
    if (m === 'datetime') return 'shortDateTime';
    if (m === 'time') return 'shortTime';
    return 'shortDate';
  });

  protected readonly isTime = computed(() => this.mode() === 'time');
  protected readonly isDateTime = computed(() => this.mode() === 'datetime');

  // Resolved at injection time — i18n catalog reads pick up live locale
  // changes via re-render of the host attribute binding.
  private readonly labelDate = readI18nText('datePicker.open', 'Open calendar');
  private readonly labelTime = readI18nText('datePicker.openTime', 'Open time picker');
  private readonly labelDateTime = readI18nText('datePicker.openDateTime', 'Open date and time picker');

  protected readonly triggerLabel = computed(() => {
    const m = this.mode();
    if (m === 'time') return this.labelTime;
    if (m === 'datetime') return this.labelDateTime;
    return this.labelDate;
  });

  protected readonly classes = computed(() => {
    const parts = ['wr-date-picker', `wr-date-picker--${this.mode()}`];
    if (this.disabled()) parts.push('wr-date-picker--disabled');
    return parts.join(' ');
  });

  private overlayRef: OverlayRef | null = null;

  /** Live calendar ref while the date popover is open — lets the panel track
   * the typed value in real time (not just on reopen). */
  private readonly dateRef = signal<ComponentRef<WrCalendar> | null>(null);

  /** Last value we pushed into the model ourselves — lets the sync effect
   * skip the echo of our own edits (so a live keystroke's raw text is never
   * reformatted mid-type). */
  private lastValue: Date | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.dispose());

    // Mirror external writes to `value` (from `[formField]`, `[(value)]`, or a
    // classic-forms bridge) into the display text — this is the old
    // `writeValue` body. Wrapped so it reacts only to `value()`; the echo of
    // our own edits is skipped, and a null/undefined write is tolerated (it
    // clears the text, exactly as the old `writeValue(Date | null)` did).
    effect(() => {
      const v = this.value();
      untracked(() => {
        if (this.sameDate(v, this.lastValue)) return;
        this.lastValue = v;
        this.text.set(v && this.adapter.isValid(v) ? this.adapter.format(v, this.resolvedFormat()) : '');
      });
    });

    // While the calendar popover is open, push every valid typed value into it
    // so the displayed month follows the input live (the calendar snaps its
    // own viewDate to the bound `date`).
    effect(() => {
      const ref = this.dateRef();
      if (ref) ref.setInput('date', this.value());
    });
  }

  // Template handlers

  protected onInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.text.set(raw);
    if (!raw) {
      this.commitValue(null);
      return;
    }
    const parsed = this.adapter.parse(raw, this.resolvedFormat());
    if (parsed && this.adapter.isValid(parsed) && !this.isOutOfBounds(parsed)) {
      this.commitValue(parsed);
    }
  }

  protected onBlur(): void {
    this.touch.emit();
    // Reformat to canonical on blur (cleans up `1/5/25` → `1/5/2025`).
    const v = this.value();
    if (v && this.adapter.isValid(v)) {
      this.text.set(this.adapter.format(v, this.resolvedFormat()));
    } else if (!this.text()) {
      this.commitValue(null);
    }
  }

  /** Called by the input's click — opens the overlay if it isn't open already. */
  protected openOnInput(): void {
    if (this.disabled() || this.overlayRef) return;
    this.openOverlay();
  }

  protected toggleOverlay(): void {
    if (this.disabled()) return;
    if (this.overlayRef) {
      this.closeOverlay();
    } else {
      this.openOverlay();
    }
  }

  // Overlay

  private openOverlay(): void {
    if (this.overlayRef) return;

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

    // Dispatch by mode — pick the panel + wire its emissions.
    const m = this.mode();
    if (m === 'time') this.attachTime();
    else if (m === 'datetime') this.attachDateTime();
    else this.attachDate();

    this.overlayRef
      .outsidePointerEvents()
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
          this.inputEl().nativeElement.focus();
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
    ref.instance.writeValue(this.value() ?? this.adapter.today());
    ref.instance.registerOnChange((next: Date | null) => {
      if (!next) return;
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
    ref.instance.changed.subscribe(next => {
      this.commit(next);
      ref.setInput('value', next);
    });
  }

  private commit(next: Date): void {
    this.text.set(this.adapter.format(next, this.resolvedFormat()));
    this.commitValue(next);
  }

  /** Push a value to the model while remembering it, so the sync effect treats
   * the resulting change as an echo and leaves the display text alone. */
  private commitValue(next: Date | null): void {
    this.lastValue = next;
    this.value.set(next);
  }

  private closeOverlay(): void {
    this.dispose();
  }

  private dispose(): void {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
    this.dateRef.set(null);
    this.overlayOpen.set(false);
  }

  // Helpers

  private isOutOfBounds(date: Date): boolean {
    if (this.mode() === 'time') return false;
    const min = this.min();
    if (min && this.adapter.compareDate(date, min) < 0) return true;
    const max = this.max();
    if (max && this.adapter.compareDate(date, max) > 0) return true;
    return false;
  }

  private sameDate(a: Date | null, b: Date | null): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    return a.getTime() === b.getTime();
  }
}
