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

import { WrDateAdapter, type WrDateFormat } from 'ngwr/date-adapter';
import { WrInputDirective, WrInputGroupComponent, WrInputSuffixDirective } from 'ngwr/input';
import { WR_OVERLAY } from 'ngwr/overlay';
import { noop } from 'ngwr/utils';

import { WrDateTimePanelComponent } from './date-time-panel.component';

/**
 * Composite date + time picker. Same input/popover skeleton as
 * `<wr-date-picker>`, but the popover renders a calendar AND a time picker
 * stacked vertically. Emits a single `Date` carrying both portions.
 *
 * Unlike `<wr-date-picker>`, selecting a calendar date does **not** close
 * the overlay — the user typically wants to set the time next. Closes on
 * outside click or Escape.
 *
 * @example
 * ```html
 * <wr-date-time-picker [(ngModel)]="when" />
 * <wr-date-time-picker
 *   [(ngModel)]="when"
 *   format="dd.MM.yyyy HH:mm"
 *   timeFormat="24h"
 *   [step]="5"
 * />
 * ```
 *
 * @see https://ngwr.dev/docs/components/date-time-picker
 */
@Component({
  selector: 'wr-date-time-picker',
  templateUrl: './date-time-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
  imports: [WrInputDirective, WrInputGroupComponent, WrInputSuffixDirective],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrDateTimePickerComponent),
      multi: true,
    },
  ],
})
export class WrDateTimePickerComponent implements ControlValueAccessor {
  /** Format used for both display and parsing. @default 'shortDateTime' */
  readonly format = input<WrDateFormat | (string & {})>('shortDateTime');

  /** Placeholder shown when the input is empty. */
  readonly placeholder = input<string>('');

  /** Min selectable date-time (forwarded to the calendar). */
  readonly min = input<Date | null>(null);

  /** Max selectable date-time (forwarded to the calendar). */
  readonly max = input<Date | null>(null);

  /** Predicate to disable specific dates (forwarded to the calendar). Time is not filtered. */
  readonly dateFilter = input<((date: Date) => boolean) | null>(null);

  /** Forwarded to the inner time picker. @default 'auto' */
  readonly timeFormat = input<'auto' | '12h' | '24h'>('auto');

  /** Render the seconds input. @default false */
  readonly showSeconds = input(false, { transform: coerceBooleanProperty });

  /** Minute / second step for the time picker. @default 1 */
  readonly step = input(1, { transform: (v: unknown): number => Math.max(1, coerceNumberProperty(v, 1)) });

  /** Disable interaction. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Read-only — input not typeable, but the icon still opens the overlay. @default false */
  readonly readonly = input(false, { transform: coerceBooleanProperty });

  private readonly adapter = inject<WrDateAdapter<Date>>(WrDateAdapter);
  private readonly overlay = inject(WR_OVERLAY);
  private readonly scrollStrategies = inject(ScrollStrategyOptions);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly inputEl = viewChild.required<ElementRef<HTMLInputElement>>('input');

  protected readonly value = signal<Date | null>(null);
  protected readonly text = signal<string>('');

  private readonly disabledFromCva = signal(false);

  protected readonly effectiveDisabled = computed(() => this.disabled() || this.disabledFromCva());

  protected readonly classes = computed(() => {
    const parts = ['wr-date-time-picker'];
    if (this.effectiveDisabled()) parts.push('wr-date-time-picker--disabled');
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
      panelClass: 'wr-date-time-picker-overlay',
    });

    const portal = new ComponentPortal(WrDateTimePanelComponent);
    const ref = this.overlayRef.attach(portal);
    ref.setInput('value', this.value());
    ref.setInput('min', this.min());
    ref.setInput('max', this.max());
    ref.setInput('dateFilter', this.dateFilter());
    ref.setInput('timeFormat', this.timeFormat());
    ref.setInput('showSeconds', this.showSeconds());
    ref.setInput('step', this.step());

    ref.instance.changed.subscribe(next => {
      this.value.set(next);
      this.text.set(this.adapter.format(next, this.format()));
      this.onChange(next);
      ref.setInput('value', next);
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
