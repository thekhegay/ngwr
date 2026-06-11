/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import type { ElementRef } from '@angular/core';
import { Component, ViewEncapsulation, computed, forwardRef, input, signal, viewChild } from '@angular/core';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { noop } from 'ngwr/utils';

import type { WrSliderValue } from './types';

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** Trim float drift from step calculations. */
function round(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}

/**
 * Numeric slider with optional dual-thumb range mode.
 *
 * Implements `ControlValueAccessor` — works with `[(ngModel)]`,
 * `formControl`, `formControlName`. The value shape depends on `range`:
 * `number` (default) or `[number, number]` when `range="true"`.
 *
 * Keyboard: ← / → adjust by `step`; ↑ / ↓ same; Shift+arrow by `step × 10`;
 * Home / End jump to min / max; PageUp / PageDown by `step × 10`.
 *
 * @example
 * ```html
 * <wr-slider [(ngModel)]="volume" min="0" max="100" step="5" />
 * <wr-slider [(ngModel)]="range" range min="0" max="1000" step="10" />
 * ```
 *
 * @see https://ngwr.dev/docs/components/slider
 */
@Component({
  selector: 'wr-slider',
  templateUrl: './slider.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrSlider),
      multi: true,
    },
  ],
})
export class WrSlider implements ControlValueAccessor {
  /** Lower bound. @default 0 */
  readonly min = input(0, { transform: (v: unknown): number => coerceNumberProperty(v, 0) });
  /** Upper bound. @default 100 */
  readonly max = input(100, { transform: (v: unknown): number => coerceNumberProperty(v, 100) });
  /** Step size for keyboard and drag. @default 1 */
  readonly step = input(1, { transform: (v: unknown): number => Math.max(0.0001, coerceNumberProperty(v, 1)) });
  /** Render two thumbs and emit `[low, high]`. @default false */
  readonly range = input(false, { transform: coerceBooleanProperty });
  /** Disable interaction. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });
  /** Render the current value below the track. @default true */
  readonly showLabel = input(true, { transform: coerceBooleanProperty });

  protected readonly low = signal(0);
  protected readonly high = signal(100);
  private readonly disabledFromCva = signal(false);

  protected readonly effectiveDisabled = computed(() => this.disabled() || this.disabledFromCva());

  protected readonly track = viewChild.required<ElementRef<HTMLElement>>('track');

  protected readonly classes = computed(() => {
    const parts = ['wr-slider'];
    if (this.range()) parts.push('wr-slider--range');
    if (this.effectiveDisabled()) parts.push('wr-slider--disabled');
    return parts.join(' ');
  });

  protected readonly lowPercent = computed(() => this.percentOf(this.low()));
  protected readonly highPercent = computed(() => this.percentOf(this.high()));

  protected readonly fillLeft = computed(() => (this.range() ? this.lowPercent() : 0));
  protected readonly fillWidth = computed(() =>
    this.range() ? this.highPercent() - this.lowPercent() : this.lowPercent()
  );

  protected readonly label = computed(() => (this.range() ? `${this.low()} – ${this.high()}` : `${this.low()}`));

  private onChange: (v: WrSliderValue) => void = noop;
  private onTouched: () => void = noop;

  // ControlValueAccessor

  writeValue(v: WrSliderValue | null): void {
    if (Array.isArray(v)) {
      const tuple = v as readonly [number, number];
      this.low.set(this.clampToBounds(tuple[0]));
      this.high.set(this.clampToBounds(tuple[1]));
    } else if (typeof v === 'number') {
      this.low.set(this.clampToBounds(v));
    } else {
      this.low.set(this.min());
    }
  }

  registerOnChange(fn: (v: WrSliderValue) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledFromCva.set(coerceBooleanProperty(isDisabled));
  }

  // Interaction

  protected onPointerDown(event: PointerEvent, thumb: 'low' | 'high'): void {
    if (this.effectiveDisabled()) return;
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);

    const move = (e: PointerEvent): void => this.updateFromEvent(e, thumb);
    const up = (e: PointerEvent): void => {
      target.releasePointerCapture(e.pointerId);
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      this.onTouched();
    };

    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
    this.updateFromEvent(event, thumb);
  }

  protected onTrackPointerDown(event: PointerEvent): void {
    if (this.effectiveDisabled()) return;
    if ((event.target as HTMLElement).closest('.wr-slider__thumb')) return;
    const thumb = this.nearestThumb(event);
    this.updateFromEvent(event, thumb);
    this.focusThumb(thumb);
  }

  protected onKey(event: KeyboardEvent, thumb: 'low' | 'high'): void {
    if (this.effectiveDisabled()) return;
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
        next = this.min();
        break;
      case 'End':
        next = this.max();
        break;
    }

    if (next === null) return;
    event.preventDefault();
    this.setThumb(thumb, next);
    this.emitChange();
    this.onTouched();
  }

  // Internals

  private updateFromEvent(event: PointerEvent, thumb: 'low' | 'high'): void {
    const rect = this.track().nativeElement.getBoundingClientRect();
    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const raw = this.min() + ratio * (this.max() - this.min());
    this.setThumb(thumb, raw);
    this.emitChange();
  }

  private nearestThumb(event: PointerEvent): 'low' | 'high' {
    if (!this.range()) return 'low';
    const rect = this.track().nativeElement.getBoundingClientRect();
    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const raw = this.min() + ratio * (this.max() - this.min());
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
    const stepped = Math.round((value - this.min()) / this.step()) * this.step() + this.min();
    return this.clampToBounds(round(stepped));
  }

  private clampToBounds(v: number): number {
    return clamp(v, this.min(), this.max());
  }

  private percentOf(v: number): number {
    const span = this.max() - this.min();
    if (span <= 0) return 0;
    return ((v - this.min()) / span) * 100;
  }

  private emitChange(): void {
    const value: WrSliderValue = this.range() ? [this.low(), this.high()] : this.low();
    this.onChange(value);
  }
}
