/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directionality } from '@angular/cdk/bidi';
import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import type { ElementRef } from '@angular/core';
import {
  Component,
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
import type { FormValueControl } from '@angular/forms/signals';

import { WR_FORM_FIELD } from 'ngwr/form';
import { useI18nText } from 'ngwr/i18n';
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
 * Reading direction: the arrows follow the VISUAL track, so under `dir="rtl"`
 * → moves toward the lower end and ← toward the higher one, and a drag reads
 * its ratio from the right edge. ↑ / ↓, PageUp / PageDown and Home / End are
 * unchanged — they name a value, not a side of the screen.
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
  host: { '[class]': 'classes()', '(focusout)': 'onFocusOut($event)' },
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

  /**
   * Refuse value changes while the thumbs stay focusable and the value still
   * submits. Bound automatically from the field's readonly state when used with
   * `[formField]`.
   *
   * The thumbs keep their tab stop and keep announcing their value — arrow keys,
   * Home / End and the pointer simply move nothing — which is the whole
   * difference from `disabled`, where they would leave the tab order entirely.
   * Mirrored as `aria-readonly`, which role `slider` supports.
   *
   * @default false
   */
  readonly readonly = input(false, { transform: coerceBooleanProperty });
  /** Render the current value below the track. @default true */
  readonly showLabel = input(true, { transform: coerceBooleanProperty });

  /**
   * Accessible name of the thumb — the single one, or the LOWER one in range
   * mode. Falls back to `slider.label` / `slider.lower`.
   */
  readonly ariaLabel = input<string | null>(null);

  /** Accessible name of the upper thumb in range mode. Falls back to `slider.upper`. */
  readonly upperLabel = input<string | null>(null);

  /**
   * A thumb projects no text, so these ARE the accessible names — and they were
   * hard-coded English with no key behind them, so every slider on a page
   * announced the same untranslated "Value" whatever it controlled.
   *
   * Range mode reads `ariaLabel` as the LOWER end rather than as the whole
   * control: a name given once must land on something, and naming both thumbs
   * the same thing would read two different values under one name.
   */
  private readonly singleLabel = useI18nText(this.ariaLabel, 'slider.label', 'Value');
  private readonly lowerLabel = useI18nText(this.ariaLabel, 'slider.lower', 'Lower value');
  protected readonly resolvedUpperLabel = useI18nText(this.upperLabel, 'slider.upper', 'Upper value');
  protected readonly resolvedLowLabel = computed(() => (this.range() ? this.lowerLabel() : this.singleLabel()));

  private readonly field = inject(WR_FORM_FIELD, { optional: true });

  /**
   * Id the surrounding `<wr-form-field>`'s `<label for>` points at, put on the
   * single thumb — the LOWER one in range mode, the same end `ariaLabel` names.
   *
   * The field renders its label before it can see what was projected into it, so
   * the id travels the other way and the control adopts it, exactly as
   * `[wrInput]` does. Without this the `for` named an element that was nowhere
   * in the document: clicking the label did nothing, and the field's own text
   * reached the thumb through no path at all.
   *
   * It lands on the THUMB rather than on the host because only a labelable
   * element can be a label's target, and `<wr-slider>` is not one — a `for`
   * pointing at the host would resolve and still name nothing. The thumb is a
   * real `<button>`, so it is.
   *
   * What this does NOT change is the thumb's name: an `aria-label` outranks a
   * `<label>` in the accname order, and the thumb keeps its own because the
   * field cannot promise it has one to give — `<wr-form-field>` renders a label
   * only when `label` is set, and a slider that traded a generic name for no
   * name would be the worse bug. Set `[ariaLabel]` to the field's label where
   * the two should read alike.
   */
  protected readonly thumbId = computed(() => this.field?.controlId() ?? null);

  /**
   * The field's error message, wired to the thumb the same way `wrInput` wires it
   * to its native element.
   *
   * Without this the messages `<wr-form-field>` renders are visible and nothing
   * else: a screen reader on the thumb never learns the field is invalid, nor
   * what the message says. `aria-invalid` is keyed on the message EXISTING rather
   * than on `errorKeys()`, because the field only publishes an id once it is
   * showing something — announcing "invalid" while pointing at nothing is worse
   * than staying quiet.
   */
  protected readonly describedBy = computed(() => this.field?.describedBy() ?? null);
  protected readonly ariaInvalid = computed(() => (this.field?.describedBy() ? 'true' : null));

  /**
   * Current value. Bound by `[formField]`, or two-way via `[(value)]`. Shape
   * follows `range`: a plain `number`, or `[low, high]` in range mode.
   */
  readonly value = model<WrSliderValue>(0);

  /** Emitted on blur so a bound field can mark itself touched. */
  readonly touch = output<void>();

  protected readonly low = signal(0);
  /**
   * The high thumb's cell. Its literal default stands in for `maxValue()`,
   * which cannot be read at field-initialisation time — see `highSeeded` and
   * the constructor effect.
   */
  protected readonly high = signal(100);

  /**
   * Whether `high` has ever been told a real value by the model.
   *
   * `<wr-slider range [min]="200" [max]="300" />` binds no value, so the model
   * holds its own scalar default and the tuple branch below never runs: `high`
   * kept the literal 100, which is not inside every `[min, max]`. The thumb
   * rendered off the track and the first interaction committed `[low, 100]` —
   * a value the slider itself calls out of range.
   */
  private highSeeded = false;

  protected readonly track = viewChild.required<ElementRef<HTMLElement>>('track');

  /**
   * Ambient reading direction. Optional so a bare `TestBed` — or any consumer
   * that never set a direction — needs no provider; `Directionality` is
   * root-provided, so `null` only ever means "nobody asked", which is LTR.
   *
   * Nothing caches a direction-derived value: the thumbs are painted with
   * `inset-inline-start`, so the track mirrors from CSS alone, and `isRtl()` is
   * read inside the event handlers. A runtime flip therefore needs no
   * subscription to `Directionality.change`.
   */
  private readonly dir = inject(Directionality, { optional: true });

  protected readonly classes = computed(() => {
    const parts = ['wr-slider'];
    if (this.range()) parts.push('wr-slider--range');
    if (this.disabled()) parts.push('wr-slider--disabled');
    else if (this.readonly()) parts.push('wr-slider--readonly');
    return parts.join(' ');
  });

  protected readonly lowPercent = computed(() => this.percentOf(this.low()));
  protected readonly highPercent = computed(() => this.percentOf(this.high()));

  /** Offset of the fill from the track's START edge — the left one in LTR, the right one in RTL. */
  protected readonly fillStart = computed(() => (this.range() ? this.lowPercent() : 0));
  protected readonly fillWidth = computed(() =>
    this.range() ? this.highPercent() - this.lowPercent() : this.lowPercent()
  );

  protected readonly label = computed(() => (this.range() ? `${this.low()} – ${this.high()}` : `${this.low()}`));

  constructor() {
    // Keep the internal thumbs in sync with external writes to `value`
    // (the old `writeValue`): split the tuple / clamp into the low & high cells.
    // The cells are clamped and the MODEL IS NOT TOUCHED, and the asymmetry is
    // deliberate. A thumb cannot render outside its own track, so the display
    // has no choice — but writing that clamp back into `value` would erase the
    // error it represents: under `[formField]` the bounds reach this component
    // only through the schema's `min()` / `max()` rules (binding `[min]` beside
    // `[formField]` is an NG8022 compile error), so the write-back deleted the
    // out-of-range value those rules exist to report, and marked a pristine
    // form dirty on first paint besides. The first real interaction emits an
    // in-range number through `emitChange` and the two agree from then on.
    effect(() => {
      const v = this.value();

      if (Array.isArray(v)) {
        const tuple = v as readonly [number, number];
        const lo = this.clampToBounds(tuple[0]);
        const hi = this.clampToBounds(tuple[1]);
        this.low.set(lo);
        this.high.set(hi);
        this.highSeeded = true;
        return;
      }

      if (typeof v !== 'number') return;
      const lo = this.clampToBounds(v);
      this.low.set(lo);

      if (!this.range()) return;

      // Range mode holding a scalar: the high thumb has never been told
      // anything, and its literal default is not inside every `[min, max]`.
      // Seed it at the top of the range — which is what the 100 meant back when
      // the bounds were 0–100. The MODEL is left alone here too; the shape it
      // holds is the consumer's business until they move a thumb.
      this.high.set(this.highSeeded ? this.clampToBounds(untracked(this.high)) : this.maxValue());
      this.highSeeded = true;
    });
  }

  // Interaction

  protected onPointerDown(event: PointerEvent, thumb: 'low' | 'high'): void {
    if (this.disabled() || this.readonly()) return;
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    // `preventDefault` above also suppresses the default focus, so the arrows
    // did nothing after a mouse drag until the thumb was found again with Tab —
    // while a click on the bare TRACK focused it. Synchronously, not through
    // `focusThumb`: `event.currentTarget` is already the thumb, so that
    // helper's `queueMicrotask` would only defer a focus nothing is waiting on.
    target.focus();

    const move = (e: PointerEvent): void => this.updateFromEvent(e, thumb);
    const cleanup = (e: PointerEvent): void => {
      target.releasePointerCapture(e.pointerId);
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', cleanup);
      target.removeEventListener('pointercancel', cleanup);
      this.touch.emit();
    };

    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', cleanup);
    // `pointercancel` is never followed by a `pointerup`, so without this the
    // move listener outlived the drag: the thumb kept following a pointer that
    // was merely hovering over it, with no button held.
    target.addEventListener('pointercancel', cleanup);
    this.updateFromEvent(event, thumb);
  }

  protected onTrackPointerDown(event: PointerEvent): void {
    if (this.disabled() || this.readonly()) return;
    if ((event.target as HTMLElement).closest('.wr-slider__thumb')) return;
    const thumb = this.nearestThumb(event);
    this.updateFromEvent(event, thumb);
    this.focusThumb(thumb);
  }

  protected onKey(event: KeyboardEvent, thumb: 'low' | 'high'): void {
    if (this.disabled() || this.readonly()) return;
    const big = event.shiftKey || event.key === 'PageUp' || event.key === 'PageDown' ? 10 : 1;
    const delta = this.step() * big;
    const current = thumb === 'low' ? this.low() : this.high();
    // The horizontal arrows name a SIDE of the track, so they follow the
    // reading direction; every other key names a value and does not.
    const inline = this.isRtl() ? -delta : delta;
    let next: number | null = null;

    switch (event.key) {
      case 'ArrowRight':
        next = current + inline;
        break;
      case 'ArrowLeft':
        next = current - inline;
        break;
      case 'ArrowUp':
      case 'PageUp':
        next = current + delta;
        break;
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

  /**
   * A bound field learns it may show its validation copy from `touch`, and
   * pointer-up plus a value-changing keypress cannot be the only sources: a
   * slider tabbed into and out of without an arrow press left the field
   * untouched forever — which is exactly the case `touched` exists for, and
   * what this output has always documented itself as doing. `wr-knob` and
   * `wr-rating` bind `(blur)` on the one element they own; this component has
   * two thumbs, so it listens for the bubbling `focusout` on its host instead
   * — and ignores the one that only moves focus from one thumb to the other.
   */
  protected onFocusOut(event: FocusEvent): void {
    if (this.track().nativeElement.contains(event.relatedTarget as Node | null)) return;
    this.touch.emit();
  }

  // Internals

  private isRtl(): boolean {
    return this.dir?.value === 'rtl';
  }

  /**
   * The value under a pointer, measured along the track's INLINE axis.
   *
   * The offset is taken from whichever edge the track starts at — the left one
   * in LTR, the right one in RTL — so the whole component needs the direction
   * in exactly one place. Measuring from `rect.left` regardless would read 0 at
   * the visual maximum of a mirrored track.
   */
  private valueAt(event: PointerEvent): number {
    const rect = this.track().nativeElement.getBoundingClientRect();
    const offset = this.isRtl() ? rect.right - event.clientX : event.clientX - rect.left;
    const ratio = clamp(offset / rect.width, 0, 1);
    return this.minValue() + ratio * (this.maxValue() - this.minValue());
  }

  private updateFromEvent(event: PointerEvent, thumb: 'low' | 'high'): void {
    this.setThumb(thumb, this.valueAt(event));
    this.emitChange();
  }

  /**
   * Which thumb a track click grabs: the one nearest the pointer ON SCREEN.
   *
   * Value distance is the same thing as visual distance once {@link valueAt}
   * has mirrored the ratio — in RTL the low thumb is the RIGHT one, and a click
   * near the right edge lands close to `low` in value space too.
   */
  private nearestThumb(event: PointerEvent): 'low' | 'high' {
    if (!this.range()) return 'low';
    const raw = this.valueAt(event);
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
