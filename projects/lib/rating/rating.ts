/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, effect, input, model, output, signal } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { clamp } from 'ngwr/utils';

/**
 * Star rating input. Click or hover to set a value; supports half-star
 * increments via `step="0.5"`. Value is `number | null` (clamped to
 * `[0, count]`).
 *
 * A signal-forms native control: it implements `FormValueControl<number | null>`,
 * so `[formField]` binds straight to its `value` model — no
 * `ControlValueAccessor` in between. `[(value)]` works standalone.
 *
 * Keyboard: `←` / `→` bump by `step`, `Home` / `End` jump to 0 / max.
 * Clicking the current value clears it (toggle off).
 *
 * @example
 * ```html
 * <!-- signal forms -->
 * <wr-rating [formField]="form.score" />
 *
 * <!-- standalone two-way binding -->
 * <wr-rating [(value)]="score" [count]="10" step="0.5" />
 * <wr-rating [value]="4.5" [readonly]="true" />
 * ```
 *
 * @see https://ngwr.dev/reference/components/rating
 */
export type WrRatingSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'wr-rating',
  templateUrl: './rating.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
})
export class WrRating implements FormValueControl<number | null> {
  /** Total number of slots. @default 5 */
  readonly count = input(5, { transform: (v: unknown): number => Math.max(1, coerceNumberProperty(v, 5)) });

  /** Step granularity — `1` for whole stars, `0.5` for halves. @default 1 */
  readonly step = input(1 as 0.5 | 1, {
    transform: (v: unknown): 0.5 | 1 => (Number(v) === 0.5 ? 0.5 : 1),
  });

  /** Read-only — value is displayed but not interactive. @default false */
  readonly readonly = input(false, { transform: coerceBooleanProperty });

  /**
   * Disable interaction. Bound automatically from the field's disabled state
   * when used with `[formField]`.
   *
   * @default false
   */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Control size — scales the icons + gaps. @default 'md' */
  readonly size = input<WrRatingSize>('md');

  /** Accessible label. @default 'Rating' */
  readonly ariaLabel = input<string>('Rating');

  /** The rating. Bound by `[formField]`, or two-way via `[(value)]`. */
  readonly value = model<number | null>(null);

  /** Emitted on blur so a bound field can mark itself touched. */
  readonly touch = output<void>();

  /** Transient hover preview — overrides `value` for display when set. */
  protected readonly hoverValue = signal<number | null>(null);

  protected readonly interactive = computed(() => !this.disabled() && !this.readonly());

  /** What we actually render — hover wins while hovering. */
  protected readonly displayValue = computed(() => this.hoverValue() ?? this.value() ?? 0);

  protected readonly slots = computed(() => Array.from({ length: this.count() }, (_, i) => i));

  protected readonly classes = computed(() => {
    const parts = ['wr-rating'];
    const size = this.size();
    if (size !== 'md') parts.push(`wr-rating--${size}`);
    if (this.readonly()) parts.push('wr-rating--readonly');
    if (this.disabled()) parts.push('wr-rating--disabled');
    return parts.join(' ');
  });

  constructor() {
    // A model can be written to anything (`[formField]` / `[(value)]`); keep the
    // rating in range by re-clamping out-of-bounds external writes to `[0, count]`.
    // (This is the clamp the old CVA `writeValue` used to apply.)
    effect(() => {
      const v = this.value();
      if (v === null || v === undefined) return;
      const clamped = clamp(Number(v), 0, this.count());
      if (clamped !== v) this.value.set(clamped);
    });
  }

  /** Fill ratio for slot `i` in `[0, 1]` — drives the CSS clip width. */
  protected fillFor(i: number): number {
    return clamp(this.displayValue() - i, 0, 1);
  }

  // Template handlers

  protected onSlotMove(event: MouseEvent, index: number): void {
    if (!this.interactive()) return;
    this.hoverValue.set(this.computeValue(event, index));
  }

  protected onLeave(): void {
    this.hoverValue.set(null);
  }

  protected onSlotClick(event: MouseEvent, index: number): void {
    if (!this.interactive()) return;
    const next = this.computeValue(event, index);
    // Click the current value → clear it.
    const final = next === this.value() ? null : next;
    this.commit(final);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.interactive()) return;
    const max = this.count();
    const step = this.step();
    const current = this.value() ?? 0;
    let next: number | null;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = clamp(current + step, 0, max);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = clamp(current - step, 0, max);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = max;
        break;
      case 'Delete':
      case 'Backspace':
        next = null;
        break;
      default:
        return;
    }
    event.preventDefault();
    this.commit(next);
  }

  protected onBlur(): void {
    this.touch.emit();
  }

  // Internals

  /** Convert a mouse position over slot `index` to a snapped value. */
  private computeValue(event: MouseEvent, index: number): number {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const raw = index + ratio;
    const step = this.step();
    const snapped = Math.ceil(raw / step) * step;
    return clamp(snapped, step, this.count());
  }

  private commit(value: number | null): void {
    this.value.set(value);
    this.hoverValue.set(null);
  }
}
