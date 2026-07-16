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
  forwardRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { WrCalendar } from 'ngwr/calendar';
import { WrDateAdapter, type WrDateFormat } from 'ngwr/date-adapter';
import { readI18nText } from 'ngwr/i18n';
import { WrInput, WrInputGroup, WrInputSuffix } from 'ngwr/input';
import { WR_OVERLAY } from 'ngwr/overlay';
import { noop } from 'ngwr/utils';

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
 * Implements `ControlValueAccessor` — bind via `[(ngModel)]`, `[formControl]`,
 * or `formControlName`. Value type is `Date | null` for every mode.
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
 * <!-- Date only -->
 * <wr-date-picker [(ngModel)]="picked" format="dd.MM.yyyy" [min]="minDate" />
 *
 * <!-- Time only -->
 * <wr-date-picker mode="time" [(ngModel)]="picked" timeFormat="24h" />
 *
 * <!-- Date + time -->
 * <wr-date-picker mode="datetime" [(ngModel)]="when" [showSeconds]="true" [step]="5" />
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
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrDatePicker),
      multi: true,
    },
  ],
})
export class WrDatePicker implements ControlValueAccessor {
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

  /** Min selectable date (forwarded to the calendar). Ignored in `time` mode. */
  readonly min = input<Date | null>(null);

  /** Max selectable date (forwarded to the calendar). Ignored in `time` mode. */
  readonly max = input<Date | null>(null);

  /** Predicate to disable specific dates (forwarded to the calendar). Ignored in `time` mode. */
  readonly dateFilter = input<((date: Date) => boolean) | null>(null);

  /** Time-panel 12 / 24-hour format. Applies in `time` + `datetime` modes. @default 'auto' */
  readonly timeFormat = input<'auto' | '12h' | '24h'>('auto');

  /** Render the seconds column. Applies in `time` + `datetime` modes. @default false */
  readonly showSeconds = input(false, { transform: coerceBooleanProperty });

  /** Minute / second step for the time panel. @default 1 */
  readonly step = input(1, { transform: (v: unknown): number => Math.max(1, coerceNumberProperty(v, 1)) });

  /** Disable interaction. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Read-only — input not typeable, but the trigger icon still opens the overlay. @default false */
  readonly readonly = input(false, { transform: coerceBooleanProperty });

  private readonly adapter = inject<WrDateAdapter<Date>>(WrDateAdapter);
  private readonly overlay = inject(WR_OVERLAY);
  private readonly scrollStrategies = inject(ScrollStrategyOptions);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly inputEl = viewChild.required<ElementRef<HTMLInputElement>>('input');

  /** The picked Date. Mirrored from the CVA. */
  protected readonly value = signal<Date | null>(null);

  /** Text currently in the input (may be partial / invalid mid-type). */
  protected readonly text = signal<string>('');

  private readonly disabledFromCva = signal(false);

  protected readonly effectiveDisabled = computed(() => this.disabled() || this.disabledFromCva());

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
    if (this.effectiveDisabled()) parts.push('wr-date-picker--disabled');
    return parts.join(' ');
  });

  private overlayRef: OverlayRef | null = null;

  /** Live calendar ref while the date popover is open — lets the panel track
   * the typed value in real time (not just on reopen). */
  private readonly dateRef = signal<ComponentRef<WrCalendar> | null>(null);

  constructor() {
    this.destroyRef.onDestroy(() => this.dispose());

    // While the calendar popover is open, push every valid typed value into it
    // so the displayed month follows the input live (the calendar snaps its
    // own viewDate to the bound `date`).
    effect(() => {
      const ref = this.dateRef();
      if (ref) ref.setInput('date', this.value());
    });
  }

  // ControlValueAccessor

  private onChange: (value: Date | null) => void = noop;
  private onTouched: () => void = noop;

  writeValue(value: Date | null): void {
    this.value.set(value);
    this.text.set(value && this.adapter.isValid(value) ? this.adapter.format(value, this.resolvedFormat()) : '');
  }

  registerOnChange(fn: (value: Date | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledFromCva.set(coerceBooleanProperty(isDisabled));
  }

  // Template handlers

  protected onInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.text.set(raw);
    if (!raw) {
      this.value.set(null);
      this.onChange(null);
      return;
    }
    const parsed = this.adapter.parse(raw, this.resolvedFormat());
    if (parsed && this.adapter.isValid(parsed) && !this.isOutOfBounds(parsed)) {
      this.value.set(parsed);
      this.onChange(parsed);
    }
  }

  protected onBlur(): void {
    this.onTouched();
    // Reformat to canonical on blur (cleans up `1/5/25` → `1/5/2025`).
    const v = this.value();
    if (v && this.adapter.isValid(v)) {
      this.text.set(this.adapter.format(v, this.resolvedFormat()));
    } else if (!this.text()) {
      this.value.set(null);
      this.onChange(null);
    }
  }

  /** Called by the input's click — opens the overlay if it isn't open already. */
  protected openOnInput(): void {
    if (this.effectiveDisabled() || this.overlayRef) return;
    this.openOverlay();
  }

  protected toggleOverlay(): void {
    if (this.effectiveDisabled()) return;
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
    this.value.set(next);
    this.text.set(this.adapter.format(next, this.resolvedFormat()));
    this.onChange(next);
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
}
