/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { type OverlayRef, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  computed,
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
import { WrInput, WrInputGroup, WrInputSuffix } from 'ngwr/input';
import { WR_OVERLAY } from 'ngwr/overlay';
import { noop } from 'ngwr/utils';

/**
 * Single-date picker. `<input>` + calendar icon + popover-anchored
 * `<wr-calendar>` inside an isolated CDK overlay.
 *
 * Implements `ControlValueAccessor` — bind via `[(ngModel)]`, `[formControl]`,
 * or `formControlName`. The value type is `Date | null`.
 *
 * Parses on every keystroke (silently — only emits when valid) and re-formats
 * to the canonical form on blur. Format is driven by {@link WrDateAdapter},
 * which understands both named keys (`'shortDate'`, `'mediumDate'`, …) and
 * raw token strings (`'dd.MM.yyyy'`).
 *
 * @example
 * ```html
 * <wr-date-picker [(ngModel)]="picked" format="shortDate" />
 * <wr-date-picker [(ngModel)]="picked" format="dd.MM.yyyy" [min]="minDate" />
 * ```
 *
 * @see https://ngwr.dev/docs/components/date-picker
 */
@Component({
  selector: 'wr-date-picker',
  templateUrl: './date-picker.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  /** Format used for both display and parsing. @default 'shortDate' */
  readonly format = input<WrDateFormat | (string & {})>('shortDate');

  /** Placeholder shown when the input is empty. */
  readonly placeholder = input<string>('');

  /** Min selectable date (forwarded to the calendar). */
  readonly min = input<Date | null>(null);

  /** Max selectable date (forwarded to the calendar). */
  readonly max = input<Date | null>(null);

  /** Predicate to disable specific dates (forwarded to the calendar). */
  readonly dateFilter = input<((date: Date) => boolean) | null>(null);

  /** Disable interaction. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Read-only — input not typeable, but the icon still opens the calendar. @default false */
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

  /** Whether the calendar overlay is currently open. */
  protected readonly overlayOpen = signal(false);

  protected readonly classes = computed(() => {
    const parts = ['wr-date-picker'];
    if (this.effectiveDisabled()) parts.push('wr-date-picker--disabled');
    return parts.join(' ');
  });

  private overlayRef: OverlayRef | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.dispose());
  }

  // ──────── ControlValueAccessor ────────

  private onChange: (value: Date | null) => void = noop;
  private onTouched: () => void = noop;

  writeValue(value: Date | null): void {
    this.value.set(value);
    this.text.set(value && this.adapter.isValid(value) ? this.adapter.format(value, this.format()) : '');
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

  // ──────── Template handlers ────────

  protected onInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.text.set(raw);
    if (!raw) {
      this.value.set(null);
      this.onChange(null);
      return;
    }
    const parsed = this.adapter.parse(raw, this.format());
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
      this.text.set(this.adapter.format(v, this.format()));
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

  // ──────── Overlay ────────

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

    const portal = new ComponentPortal(WrCalendar);
    const ref = this.overlayRef.attach(portal);
    ref.setInput('date', this.value());
    ref.setInput('min', this.min());
    ref.setInput('max', this.max());
    ref.setInput('dateFilter', this.dateFilter());

    ref.instance.date.subscribe(next => {
      if (!next) return;
      this.value.set(next);
      this.text.set(this.adapter.format(next, this.format()));
      this.onChange(next);
      this.closeOverlay();
    });

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

  private closeOverlay(): void {
    this.dispose();
  }

  private dispose(): void {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
    this.overlayOpen.set(false);
  }

  // ──────── Helpers ────────

  private isOutOfBounds(date: Date): boolean {
    const min = this.min();
    if (min && this.adapter.compareDate(date, min) < 0) return true;
    const max = this.max();
    if (max && this.adapter.compareDate(date, max) > 0) return true;
    return false;
  }
}
