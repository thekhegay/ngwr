/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import type { ElementRef } from '@angular/core';
import { Component, ViewEncapsulation, computed, effect, input, model, output, signal, viewChild } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { clamp, round } from 'ngwr/utils';

import type { WrSliderValue } from './interfaces';

/** Trim float drift from step calculations. */

/**
 * Numeric slider with optional dual-thumb range mode.
 *
 * A signal-forms native control: it implements `FormValueControl<WrSliderValue>`,
 * so `[formField]` binds straight to its `value` model — no
 * `ControlValueAccessor` in between. `[(value)]` works standalone. The value
 * shape depends on `range`: `number` (default) or `[number, number]` when
 * `range="true"`.
 *
 * Keyboard: ← / → adjust by `step`; ↑ / ↓ same; Shift+arrow by `step × 10`;
 * Home / End jump to min / max; PageUp / PageDown by `step × 10`.
 *
 * @example
 * ```html
 * <!-- signal forms -->
 * <wr-slider [formField]="form.volume" min="0" max="100" step="5" />
 *
 * <!-- standalone two-way binding -->
 * <wr-slider [(value)]="range" range min="0" max="1000" step="10" />
 * ```
 *
 * @see https://ngwr.dev/reference/components/slider
 */
@Component({
  selector: 'wr-slider',
  templateUrl: './slider.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
})
export class WrSlider implements FormValueControl<WrSliderValue> {
  // Typed `WrSliderValue | undefined` (not `number`) to satisfy the reserved
  // `FormUiControl` min/max slots, which are keyed to the control's value type.
  // The transform still coerces to a plain number, so the bounds stay numeric
  // at runtime; `minValue`/`maxValue` narrow them back for arithmetic.
  /** Lower bound. @default 0 */
  readonly min = input<WrSliderValue | undefined>(0, { transform: (v: unknown): number => coerceNumberProperty(v, 0) });
  /** Upper bound. @default 100 */
  readonly max = input<WrSliderValue | undefined>(100, {
    transform: (v: unknown): number => coerceNumberProperty(v, 100),
  });

  /** Resolved numeric lower bound for internal arithmetic. */
  private readonly minValue = computed(() => {
    const m = this.min();
    return typeof m === 'number' ? m : 0;
  });
  /** Resolved numeric upper bound for internal arithmetic. */
  private readonly maxValue = computed(() => {
    const m = this.max();
    return typeof m === 'number' ? m : 100;
  });

  /** Step size for keyboard and drag. @default 1 */
  readonly step = input(1, { transform: (v: unknown): number => Math.max(0.0001, coerceNumberProperty(v, 1)) });
  /** Render two thumbs and emit `[low, high]`. @default false */
  readonly range = input(false, { transform: coerceBooleanProperty });
  /**
   * Disable interaction. Bound automatically from the field's disabled state
   * when used with `[formField]`.
   *
   * @default false
   */
  readonly disabled = input(false, { transform: coerceBooleanProperty });
  /** Render the current value below the track. @default true */
  readonly showLabel = input(true, { transform: coerceBooleanProperty });

  /**
   * Current value. Bound by `[formField]`, or two-way via `[(value)]`. Shape
   * follows `range`: a plain `number`, or `[low, high]` in range mode.
   */
  readonly value = model<WrSliderValue>(0);

  /** Emitted on blur so a bound field can mark itself touched. */
  readonly touch = output<void>();

  protected readonly low = signal(0);
  protected readonly high = signal(100);

  protected readonly track = viewChild.required<ElementRef<HTMLElement>>('track');

  protected readonly classes = computed(() => {
    const parts = ['wr-slider'];
    if (this.range()) parts.push('wr-slider--range');
    if (this.disabled()) parts.push('wr-slider--disabled');
    return parts.join(' ');
  });

  protected readonly lowPercent = computed(() => this.percentOf(this.low()));
  protected readonly highPercent = computed(() => this.percentOf(this.high()));

  protected readonly fillLeft = computed(() => (this.range() ? this.lowPercent() : 0));
  protected readonly fillWidth = computed(() =>
    this.range() ? this.highPercent() - this.lowPercent() : this.lowPercent()
  );

  protected readonly label = computed(() => (this.range() ? `${this.low()} – ${this.high()}` : `${this.low()}`));

  constructor() {
    // Keep the internal thumbs in sync with external writes to `value`
    // (the old `writeValue`): split the tuple / clamp into the low & high cells.
    effect(() => {
      const v = this.value();
      if (Array.isArray(v)) {
        const tuple = v as readonly [number, number];
        this.low.set(this.clampToBounds(tuple[0]));
        this.high.set(this.clampToBounds(tuple[1]));
      } else if (typeof v === 'number') {
        this.low.set(this.clampToBounds(v));
      }
    });
  }

  // Interaction

  protected onPointerDown(event: PointerEvent, thumb: 'low' | 'high'): void {
    if (this.disabled()) return;
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);

    const move = (e: PointerEvent): void => this.updateFromEvent(e, thumb);
    const up = (e: PointerEvent): void => {
      target.releasePointerCapture(e.pointerId);
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      this.touch.emit();
    };

    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
    this.updateFromEvent(event, thumb);
  }

  protected onTrackPointerDown(event: PointerEvent): void {
    if (this.disabled()) return;
    if ((event.target as HTMLElement).closest('.wr-slider__thumb')) return;
    const thumb = this.nearestThumb(event);
    this.updateFromEvent(event, thumb);
    this.focusThumb(thumb);
  }

  protected onKey(event: KeyboardEvent, thumb: 'low' | 'high'): void {
    if (this.disabled()) return;
    const big = event.shiftKey || event.key === 'PageUp' || event.key === 'PageDown' ? 10 : 1;
    const delta = this.step() * big;
    const current = thumb === 'low' ? this.low() : this.high();
    let next: number | null = null;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
      case 'PageUp':
        next = current + delta;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
      case 'PageDown':
        next = current - delta;
        break;
      case 'Home':
        next = this.minValue();
        break;
      case 'End':
        next = this.maxValue();
        break;
    }

    if (next === null) return;
    event.preventDefault();
    this.setThumb(thumb, next);
    this.emitChange();
    this.touch.emit();
  }

  // Internals

  private updateFromEvent(event: PointerEvent, thumb: 'low' | 'high'): void {
    const rect = this.track().nativeElement.getBoundingClientRect();
    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const raw = this.minValue() + ratio * (this.maxValue() - this.minValue());
    this.setThumb(thumb, raw);
    this.emitChange();
  }

  private nearestThumb(event: PointerEvent): 'low' | 'high' {
    if (!this.range()) return 'low';
    const rect = this.track().nativeElement.getBoundingClientRect();
    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const raw = this.minValue() + ratio * (this.maxValue() - this.minValue());
    return Math.abs(raw - this.low()) <= Math.abs(raw - this.high()) ? 'low' : 'high';
  }

  private focusThumb(thumb: 'low' | 'high'): void {
    queueMicrotask(() => {
      const root = this.track().nativeElement;
      const el = root.querySelector<HTMLElement>(`.wr-slider__thumb--${thumb}`);
      el?.focus();
    });
  }

  private setThumb(thumb: 'low' | 'high', raw: number): void {
    const stepped = this.snap(raw);
    if (thumb === 'low') {
      const next = this.range() ? Math.min(stepped, this.high()) : stepped;
      this.low.set(next);
    } else {
      this.high.set(Math.max(stepped, this.low()));
    }
  }

  private snap(value: number): number {
    const stepped = Math.round((value - this.minValue()) / this.step()) * this.step() + this.minValue();
    return this.clampToBounds(round(stepped, 6));
  }

  private clampToBounds(v: number): number {
    return clamp(v, this.minValue(), this.maxValue());
  }

  private percentOf(v: number): number {
    const span = this.maxValue() - this.minValue();
    if (span <= 0) return 0;
    return ((v - this.minValue()) / span) * 100;
  }

  private emitChange(): void {
    const value: WrSliderValue = this.range() ? [this.low(), this.high()] : this.low();
    this.value.set(value);
  }
}
