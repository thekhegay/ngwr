/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directionality } from '@angular/cdk/bidi';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  Component,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  computed,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { WR_FORM_FIELD } from 'ngwr/form';
import { WrIcon } from 'ngwr/icon';

import type { WrSegmentedOption } from './interfaces';

/**
 * Single-choice picker rendered as a segmented control. Two-way binds
 * the selected `value`.
 *
 * A signal-forms native control: it implements `FormValueControl<T | null>`, so
 * `[formField]` binds straight to its `value` model — no
 * `ControlValueAccessor` in between. `[(value)]` works standalone, and classic
 * `[(ngModel)]` / reactive forms keep working through Angular's bridge.
 *
 * It stays a `role="group"` of `aria-pressed` toggle buttons rather than
 * becoming a `radiogroup`: being a form control changes what the value is bound
 * to, not what the widget is, and a radiogroup would owe a roving tab stop and
 * arrow-key selection — a different keyboard contract for every consumer who
 * already ships this. The group is what the field describes (`aria-describedby`
 * / `aria-invalid` land on the host), while the `<label for>` has to name a
 * labelable element, so the id goes on the first segment.
 *
 * @example
 * ```html
 * <!-- signal forms -->
 * <wr-segmented [options]="ranges" [formField]="form.range" />
 *
 * <!-- standalone two-way binding -->
 * <wr-segmented
 *   [options]="[
 *     { value: 'day',  label: 'Day' },
 *     { value: 'week', label: 'Week' },
 *     { value: 'month', label: 'Month' },
 *   ]"
 *   [(value)]="range"
 * />
 * ```
 *
 * @see https://ngwr.dev/reference/components/segmented
 */
export type WrSegmentedSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'wr-segmented',
  templateUrl: './segmented.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
    '[style]': 'thumbStyle()',
    role: 'group',
    '[attr.aria-describedby]': 'describedBy()',
    '[attr.aria-invalid]': 'ariaInvalid()',
    '(focusout)': 'onFocusOut($event)',
  },
  imports: [WrIcon],
})
export class WrSegmented<T = unknown> implements FormValueControl<T | null> {
  /** The segments to render. */
  readonly options = input.required<readonly WrSegmentedOption<T>[]>();

  // The model keeps the component's own `T`, and the contract is satisfied as
  // `FormValueControl<T | null>` — legal because `FormField<T>` infers its type from
  // the FIELD it is handed and never from the host component, so the interface's
  // parameter describes this model rather than constraining the binding.
  // `wr-cascader` and `wr-tree` widen theirs to `unknown` because their value SHAPE
  // changes with a mode input (`TId | null` in single mode, a `readonly TId[]` in
  // multi) and no one type is true of both. A segmented control has one shape, so
  // widening here would only throw away what `[options]` already proved: every
  // `(valueChange)="pick($event)"` in a typed app would start receiving `unknown`.
  // With the default type parameter this degenerates to exactly the catalog's
  // `FormValueControl<unknown>`.
  /**
   * The picked segment's `value`, `null` when nothing is selected. Bound by
   * `[formField]`, or two-way via `[(value)]`.
   */
  readonly value = model<T | null>(null);

  /** Emitted when focus leaves the strip, so a bound field can mark itself touched. */
  readonly touch = output<void>();

  /**
   * Disable the whole control. Bound automatically from the field's disabled
   * state when used with `[formField]`.
   *
   * @default false
   */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Control size — shares the `--wr-control-*` contract. @default 'md' */
  readonly size = input<WrSegmentedSize>('md');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly field = inject(WR_FORM_FIELD, { optional: true });

  /**
   * Id the surrounding `<wr-form-field>`'s `<label for>` points at, stamped on the
   * FIRST segment.
   *
   * The field renders its label before it can see what was projected into it, so the
   * id travels the other way and the control adopts it, exactly as `[wrInput]`,
   * `wr-slider` and `wr-select` do. Without this the `for` named an element that was
   * nowhere in the document: clicking the label did nothing.
   *
   * It cannot go on the host — only a labelable element can be a label's target, and
   * `<wr-segmented>` is not one — and there is no single control to put it on, so it
   * goes where clicking the label should land a user: the first segment, which is
   * also the strip's first tab stop. The same choice `wr-slider` makes with its low
   * thumb.
   *
   * What this does NOT change is that segment's NAME: it is named by its own label,
   * and a `<label for>` cannot outrank text content in the accname order anyway.
   *
   * The one shape this reads wrong is a strip NESTED inside another control that is
   * itself the field — `<wr-color-picker>`'s own format tabs are the only case in
   * the library — where the id lands on a tab instead of on the picker. That is the
   * same exposure `[wrInput]`, `wr-slider` and `wr-select` all carry, and the fix
   * belongs to the outer control (shield its subtree by providing `WR_FORM_FIELD`
   * as `null`), not to a strip that cannot tell whose field it is in.
   */
  protected readonly controlId = computed(() => this.field?.controlId() ?? null);

  /**
   * The field's error message, wired to the GROUP rather than to a segment.
   *
   * A segmented control is one field made of several buttons, so the description
   * belongs to the thing the field describes — repeated on every segment it would be
   * announced once per Tab. `role="group"` supports neither state as a role-specific
   * attribute, but both are ARIA globals, so this is valid where an `aria-checked`
   * would not be.
   *
   * `aria-invalid` is keyed on the message EXISTING rather than on `errorKeys()`,
   * because the field only publishes an id once it is showing something — announcing
   * "invalid" while pointing at nothing is worse than staying quiet.
   */
  protected readonly describedBy = computed(() => this.field?.describedBy() ?? null);
  protected readonly ariaInvalid = computed(() => (this.field?.describedBy() ? 'true' : null));

  /** Index of the selected option, or `-1` when nothing is selected. */
  protected readonly selectedIndex = computed(() => {
    const v = this.value();
    return this.options().findIndex(o => o.value === v);
  });

  /** Flips true after the first paint so the thumb only animates user-driven changes, not the initial snap. */
  private readonly mounted = signal(false);

  constructor() {
    afterNextRender(() => this.mounted.set(true));
  }

  protected readonly classes = computed(() => {
    const parts = ['wr-segmented'];
    const size = this.size();
    if (size !== 'md') parts.push(`wr-segmented--${size}`);
    if (this.disabled()) parts.push('wr-segmented--disabled');
    if (this.selectedIndex() < 0) parts.push('wr-segmented--unselected');
    if (this.mounted()) parts.push('wr-segmented--mounted');
    return parts.join(' ');
  });

  private readonly dir = inject(Directionality, { optional: true });

  /**
   * Reading direction of the strip. `Directionality` is root-provided, so this
   * always resolves — `optional` only guards a consumer who has deliberately
   * torn the provider out. A subtree that overrides the direction does it with
   * the CDK's `Dir` directive, which writes `valueSignal`, so `thumbStyle`
   * re-renders instead of leaving the thumb parked on the old segment.
   */
  private readonly isRtl = computed(() => this.dir?.valueSignal() === 'rtl');

  /**
   * Inline CSS vars driving the sliding thumb position.
   *
   * `--wr-segmented-thumb-index` is the SLOT the thumb parks in, counted from the
   * physical left, which is the selected index only in LTR. The stylesheet anchors
   * the thumb with a physical `left` and slides it with `translateX` — neither has
   * a logical form — while the options are a grid that mirrors, so under `dir="rtl"`
   * the segment at logical index `i` occupies slot `count - 1 - i`. Left unsigned,
   * the pill sat under a different label than the one it marks (the whole strip's
   * worth of offset at the far end), which is the carousel's `trackStyle` problem
   * one component over.
   */
  protected readonly thumbStyle = computed<Record<string, string>>(() => {
    const i = Math.max(0, this.selectedIndex());
    const count = Math.max(1, this.options().length);
    const slot = this.isRtl() ? count - 1 - i : i;
    return {
      '--wr-segmented-thumb-index': `${slot}`,
      '--wr-segmented-thumb-count': `${count}`,
    };
  });

  protected isSelected(option: WrSegmentedOption<T>): boolean {
    return this.value() === option.value;
  }

  protected select(option: WrSegmentedOption<T>): void {
    if (this.disabled() || option.disabled || this.isSelected(option)) return;
    this.value.set(option.value);
  }

  protected trackByValue(_: number, option: WrSegmentedOption<T>): unknown {
    return option.value;
  }

  /**
   * A bound field learns it may show its validation copy from `touch`, and a click
   * cannot be the source: a strip tabbed into and out of without a pick left the
   * field untouched forever — which is exactly the case `touched` exists for.
   *
   * `wr-knob` and `wr-rating` bind `(blur)` on the one element they own; this
   * component owns one button per option, so it listens for the bubbling `focusout`
   * on its host instead — and ignores the one that only moves focus from one segment
   * to the next, the way `wr-slider` ignores the hop between its two thumbs.
   */
  protected onFocusOut(event: FocusEvent): void {
    if (this.host.nativeElement.contains(event.relatedTarget as Node | null)) return;
    this.touch.emit();
  }
}
