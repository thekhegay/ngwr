/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import {
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { clamp } from 'ngwr/utils';

const ARC_START = -135; // 7 o'clock
const ARC_END = 135; // 5 o'clock — 270° sweep total
const ARC_SWEEP = ARC_END - ARC_START;

/**
 * Radial dial input. A signal-forms native control: it implements
 * `FormValueControl<number>`, so `[formField]` binds straight to its `value`
 * model — no `ControlValueAccessor` in between. `[(value)]` works standalone.
 *
 * The value is clamped to `[min, max]`. Drag the indicator around the dial or
 * use ←→ / ↑↓ to step.
 *
 * @example
 * ```html
 * <!-- signal forms -->
 * <wr-knob [formField]="form.volume" [min]="0" [max]="100" />
 *
 * <!-- standalone two-way binding -->
 * <wr-knob [(value)]="vol" suffix="%" valueColor="var(--wr-color-success)" />
 * ```
 *
 * @see https://ngwr.dev/reference/components/knob
 */
@Component({
  selector: 'wr-knob',
  templateUrl: './knob.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
})
export class WrKnob implements FormValueControl<number> {
  /** Minimum allowed value. @default 0 */
  readonly min = input<number | undefined>(0, { transform: (v: unknown): number => coerceNumberProperty(v, 0) });

  /** Maximum allowed value. @default 100 */
  readonly max = input<number | undefined>(100, { transform: (v: unknown): number => coerceNumberProperty(v, 100) });

  private readonly minValue = computed(() => this.min() ?? 0);
  private readonly maxValue = computed(() => this.max() ?? 100);

  /** Step granularity. @default 1 */
  readonly step = input(1, { transform: (v: unknown): number => Math.max(0.0001, coerceNumberProperty(v, 1)) });

  /** Dial diameter in CSS pixels. @default 120 */
  readonly size = input(120, { transform: (v: unknown): number => Math.max(32, coerceNumberProperty(v, 120)) });

  /** Stroke width of the dial arc, in CSS pixels. @default 8 */
  readonly strokeWidth = input(8, {
    transform: (v: unknown): number => Math.max(1, coerceNumberProperty(v, 8)),
  });

  /** Track (unfilled) color. @default rgba(--wr-color-light, 0.6) */
  readonly trackColor = input<string>('rgba(var(--wr-color-light-rgb), 0.6)');

  /** Filled-arc color. @default var(--wr-color-primary) */
  readonly valueColor = input<string>('var(--wr-color-primary)');

  /** Show the value text in the center. @default true */
  readonly showValue = input(true, { transform: coerceBooleanProperty });

  /** Optional suffix appended to the center text (e.g. `'%'`). */
  readonly suffix = input<string>('');

  /** Read-only — disables interaction but keeps the visual. @default false */
  readonly readonly = input(false, { transform: coerceBooleanProperty });

  /** Disable interaction. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Bound by `[formField]`, or two-way via `[(value)]`. */
  readonly value = model<number>(0);

  /** Emitted on blur so a bound field can mark itself touched. */
  readonly touch = output<void>();

  private dragging = false;

  protected readonly interactive = computed(() => !this.disabled() && !this.readonly());

  protected readonly classes = computed(() => {
    const parts = ['wr-knob'];
    if (this.disabled()) parts.push('wr-knob--disabled');
    return parts.join(' ');
  });

  // Geometry — drawn into a 100×100 viewBox, scaled by `size`.
  protected readonly cx = 50;
  protected readonly cy = 50;
  protected readonly radius = computed(() => 50 - this.strokeWidth() / 2 - 0.5);

  /** Ratio of the filled arc — `0` at min, `1` at max. */
  protected readonly ratio = computed(() => {
    const range = this.maxValue() - this.minValue();
    if (range <= 0) return 0;
    return clamp((this.value() - this.minValue()) / range, 0, 1);
  });

  /** SVG path `d` for the background arc. */
  protected readonly trackPath = computed(() => this.arcPath(ARC_START, ARC_END));

  /** SVG path `d` for the filled arc. */
  protected readonly valuePath = computed(() => {
    const end = ARC_START + ARC_SWEEP * this.ratio();
    return this.arcPath(ARC_START, end);
  });

  /** Position of the handle dot — `{ x, y }` in viewBox units. */
  protected readonly handlePos = computed(() => {
    const angle = ARC_START + ARC_SWEEP * this.ratio();
    const rad = (angle * Math.PI) / 180;
    return {
      x: this.cx + this.radius() * Math.sin(rad),
      y: this.cy - this.radius() * Math.cos(rad),
    };
  });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    // Keep the value within `[min, max]` even when written externally (via
    // `[formField]` / `[(value)]`). Interactive changes are already clamped in
    // `commit`, so this only normalizes out-of-range external writes.
    effect(() => {
      const clamped = clamp(this.value(), this.minValue(), this.maxValue());
      if (clamped !== this.value()) this.value.set(clamped);
    });
  }

  // Pointer / keyboard

  protected onPointerDown(event: PointerEvent): void {
    if (!this.interactive()) return;
    event.preventDefault();
    this.dragging = true;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.updateFromPointer(event);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.dragging) return;
    this.updateFromPointer(event);
  }

  protected onPointerUp(event: PointerEvent): void {
    if (!this.dragging) return;
    this.dragging = false;
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    this.touch.emit();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.interactive()) return;
    const step = event.shiftKey ? this.step() * 10 : this.step();
    let next: number | null;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = this.value() + step;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = this.value() - step;
        break;
      case 'Home':
        next = this.minValue();
        break;
      case 'End':
        next = this.maxValue();
        break;
      default:
        return;
    }
    event.preventDefault();
    this.commit(clamp(next, this.minValue(), this.maxValue()));
  }

  // Internals

  private updateFromPointer(event: PointerEvent): void {
    const rect = this.host.nativeElement.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    // Angle measured from 12 o'clock, clockwise.
    let angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
    // Map [-180, 180] into the dial's arc range, clamping outside it.
    if (angle < ARC_START) angle = angle + 360 > ARC_END ? ARC_START : angle + 360;
    angle = clamp(angle, ARC_START, ARC_END);
    const ratio = (angle - ARC_START) / ARC_SWEEP;
    const range = this.maxValue() - this.minValue();
    const raw = this.minValue() + ratio * range;
    const stepped = Math.round(raw / this.step()) * this.step();
    this.commit(clamp(stepped, this.minValue(), this.maxValue()));
  }

  private commit(next: number): void {
    if (next === this.value()) return;
    this.value.set(next);
  }

  // Arc helper

  private arcPath(startDeg: number, endDeg: number): string {
    const r = this.radius();
    const s = (startDeg * Math.PI) / 180;
    const e = (endDeg * Math.PI) / 180;
    const sx = this.cx + r * Math.sin(s);
    const sy = this.cy - r * Math.cos(s);
    const ex = this.cx + r * Math.sin(e);
    const ey = this.cy - r * Math.cos(e);
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey}`;
  }
}
