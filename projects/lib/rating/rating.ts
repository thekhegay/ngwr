/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directionality } from '@angular/cdk/bidi';
import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, inject, input, model, output, signal } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { useFormFieldAria } from 'ngwr/form';
import { useI18nText } from 'ngwr/i18n';
import { clamp } from 'ngwr/utils';

/**
 * Star rating input. Click or hover to set a value; supports half-star
 * increments via `step="0.5"`. Value is `number | null`.
 *
 * `[0, count]` bounds what this control's OWN edits produce — a click, an arrow
 * key, `End`. A value written from outside is displayed and announced clamped
 * (a slider cannot report an `aria-valuenow` past its own `aria-valuemax`) and
 * left in the model as it stands, the same rule `wr-slider` and
 * `wr-input-number` follow.
 *
 * A signal-forms native control: it implements `FormValueControl<number | null>`,
 * so `[formField]` binds straight to its `value` model — no
 * `ControlValueAccessor` in between. `[(value)]` works standalone.
 *
 * Keyboard: `←` / `→` bump by `step`, `Home` / `End` jump to 0 / max.
 * Clicking the current value clears it (toggle off).
 *
 * The stars sit on the inline axis, so under `dir="rtl"` the row is mirrored and
 * both halves of the input mirror with it: `→` walks toward the low end, and a
 * click is measured from the star's inline-start (right) edge.
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

  /** Accessible label. Falls back to `rating.label`, then `'Rating'`. */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = useI18nText(this.ariaLabel, 'rating.label', 'Rating');

  /** The rating. Bound by `[formField]`, or two-way via `[(value)]`. */
  readonly value = model<number | null>(null);

  /** Emitted on blur so a bound field can mark itself touched. */
  readonly touch = output<void>();

  /** Transient hover preview — overrides `value` for display when set. */
  protected readonly hoverValue = signal<number | null>(null);

  protected readonly interactive = computed(() => !this.disabled() && !this.readonly());

  /**
   * Whether the control keeps its tab stop — `disabled` only, never `readonly`.
   *
   * The two states differ precisely here: a disabled control leaves the tab
   * order, a read-only one stays in it and keeps announcing `aria-valuenow`,
   * because a keyboard user still has to be able to READ a value they cannot
   * change. Driving `tabindex` off `interactive()` collapsed that distinction
   * and made `readonly()` unreachable — with an `aria-describedby` pointing at
   * an error message on an element nobody could focus.
   */
  protected readonly focusable = computed(() => !this.disabled());

  /**
   * What we actually render — hover wins while hovering.
   *
   * Clamped, because there is no such thing as drawing six stars in a row of
   * five, and the same number is what `aria-valuenow` reports: a `role="slider"`
   * whose value sits outside its own min / max is an invalid slider whatever the
   * model holds. The MODEL is left alone — see the note above `fillFor` for why
   * the clamp is not written back.
   */
  protected readonly displayValue = computed(() => clamp(this.hoverValue() ?? this.value() ?? 0, 0, this.count()));

  /**
   * What the slider REPORTS, and where the arrows start from.
   *
   * Deliberately not `displayValue`: a hover preview is a pointer affordance and
   * must not be announced as the current value, and an arrow press after a hover
   * has to step from the committed number rather than from wherever the mouse
   * happened to rest.
   */
  protected readonly announcedValue = computed(() => clamp(this.value() ?? 0, 0, this.count()));

  protected readonly slots = computed(() => Array.from({ length: this.count() }, (_, i) => i));

  /**
   * Reading direction, for the two places it changes the answer: the arrows and
   * the pointer ratio inside a star.
   *
   * `optional` because a consumer who never set a direction should not have to
   * provide anything — `Directionality` is root-provided, so this only resolves
   * to `null` in a bare `TestBed`, where LTR is the right assumption. Read per
   * interaction rather than cached, so a runtime flip needs no subscription.
   */
  private readonly directionality = inject(Directionality, { optional: true });

  /** The surrounding `<wr-form-field>`'s error state. @internal */
  protected readonly fieldAria = useFormFieldAria();

  protected readonly classes = computed(() => {
    const parts = ['wr-rating'];
    const size = this.size();
    if (size !== 'md') parts.push(`wr-rating--${size}`);
    if (this.readonly()) parts.push('wr-rating--readonly');
    if (this.disabled()) parts.push('wr-rating--disabled');
    return parts.join(' ');
  });

  /*
   * There is deliberately no effect re-clamping `value` into `[0, count]`.
   *
   * There was one — it wrote the clamp back into the model, which the old CVA
   * `writeValue` also did — and under `[formField]` that write is
   * indistinguishable from the user moving the stars: a `FormControl(9)` on a
   * five-star rating became `5`, `dirty`, and emitted through `valueChanges`
   * before anything had been touched. So an unsaved-changes guard fired on a
   * form nobody had edited, and the out-of-range value that a `max()` rule
   * exists to REPORT was deleted by the control it was reported on (binding
   * `[count]` beside `[formField]` cannot help — the schema's rules are the only
   * bounds that reach here).
   *
   * `wr-slider` and `wr-input-number` had both already settled this the other
   * way, for the same two reasons, and this one was the odd control out.
   * `displayValue` clamps what is drawn and announced; `computeValue` and
   * `onKeydown` clamp what this control itself produces; the model is the
   * consumer's until they touch a star.
   */
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
    // The clamped reading, so an arrow after an out-of-range external write
    // steps from the star the user can see rather than from a number off the row.
    const current = this.announcedValue();
    // Arrows follow VISUAL order (WAI-ARIA APG). The row lays its stars along the
    // inline axis, so under `dir="rtl"` the first star is the RIGHTMOST one and
    // `→` walks down the scale. Up / Down are the block axis and never flip;
    // Home / End mean first / last, a semantic position rather than a physical
    // one, so they don't either.
    const inline = this.isRtl() ? -step : step;
    let next: number | null;
    switch (event.key) {
      case 'ArrowRight':
        next = clamp(current + inline, 0, max);
        break;
      case 'ArrowUp':
        next = clamp(current + step, 0, max);
        break;
      case 'ArrowLeft':
        next = clamp(current - inline, 0, max);
        break;
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

  /** Whether the row reads right-to-left. */
  private isRtl(): boolean {
    return this.directionality?.value === 'rtl';
  }

  /**
   * How far into the star the pointer sits, `0` to `1`, measured from its
   * INLINE-start edge — the left one in LTR, the right one in RTL, where the row
   * is mirrored. Taken from `rect.left` alone it reads 1 exactly where an RTL
   * user sees the start of the star, which inverts every half step.
   */
  private inlineRatio(clientX: number, rect: DOMRect): number {
    const offset = this.isRtl() ? rect.right - clientX : clientX - rect.left;
    return clamp(offset / rect.width, 0, 1);
  }

  /** Convert a mouse position over slot `index` to a snapped value. */
  private computeValue(event: MouseEvent, index: number): number {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const ratio = this.inlineRatio(event.clientX, rect);
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
