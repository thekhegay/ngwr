/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type BooleanInput, coerceBooleanProperty } from '@angular/cdk/coercion';
import { Directive, ElementRef, computed, inject, input } from '@angular/core';

import { useConfigValue } from 'ngwr/config';
import { WR_FORM_FIELD } from 'ngwr/form';

import type { WrInputSize } from '../interfaces';

/**
 * Applies NGWR input styling to a native `<input>` element.
 *
 * Because this is an attribute directive on the real `<input>` (not a wrapper
 * component), any other directive that targets `input` — `[(ngModel)]`,
 * `[formControl]`, validators, third-party libraries like `ngx-mask` — composes
 * naturally on the same element.
 *
 * @example
 * ```html
 * <input wrInput [(ngModel)]="name" placeholder="Your name" />
 *
 * <!-- Works with ngx-mask, validators, etc. -->
 * <input wrInput [(ngModel)]="phone" mask="(000) 000-0000" />
 * ```
 *
 * For prefix / suffix / password-toggle layouts, wrap the input in
 * `<wr-input-group>`.
 *
 * @see https://ngwr.dev/reference/components/input
 */
@Directive({
  selector: 'input[wrInput], textarea[wrInput]',
  host: {
    '[class]': 'classes()',
    '[attr.id]': 'resolvedId()',
    '[attr.aria-invalid]': 'ariaInvalid()',
    '[attr.aria-describedby]': 'describedBy()',
  },
})
export class WrInput {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly field = inject(WR_FORM_FIELD, { optional: true });

  /**
   * Read once, at construction: a static `id=""` in the template is already on
   * the element by the time a directive is instantiated, and it must win over
   * the field's generated one.
   */
  private readonly ownId = this.host.nativeElement.getAttribute('id');

  /**
   * Adopts the surrounding `<wr-form-field>`'s `controlId`, so the label it
   * already rendered actually points at this element. Without this the `for`
   * referenced an id that existed nowhere and the input had no label at all.
   */
  protected readonly resolvedId = computed(() => this.ownId ?? this.field?.controlId() ?? null);

  constructor() {
    // Tell the field which id actually stuck. Without this its `<label for>` keeps
    // pointing at the generated id while this element answers to the author's own —
    // a label referencing nothing, which is the same as having none.
    if (this.ownId) this.field?.adoptControlId(this.ownId);
  }

  /**
   * Announced state, taken from the surrounding `<wr-form-field>`.
   *
   * The field renders the message but cannot reach the projected control, so
   * the control reads back: without this the error is visible on screen and
   * invisible to a screen reader, which never learns the field is invalid or
   * what the message says.
   */
  protected readonly ariaInvalid = computed(() => (this.field?.describedBy() ? 'true' : null));
  protected readonly describedBy = computed(() => this.field?.describedBy() ?? null);

  /**
   * Control size. Unset, it falls back to
   * `provideWrConfig({ input: { size } })`. @default 'md'
   *
   * Called `wrSize` until v14, to dodge the native `<input size>` attribute —
   * which measures the field in characters and which `.wr-input`'s `width: 100%`
   * has always overridden, so the clash it guarded against was never observable.
   * It made this the one size input in the catalog spelled differently from the
   * other twenty-three. The cost of the change is that a consumer who wanted the
   * NATIVE `size` on an ngwr input can no longer have it — but `width: 100%`
   * meant they never did.
   */
  readonly size = input<WrInputSize | null>(null);

  /**
   * Pill-shaped corners. Unset, it falls back to
   * `provideWrConfig({ input: { rounded } })`; `[rounded]="false"` turns a
   * configured `true` back off. @default false
   */
  readonly rounded = input<boolean | null, BooleanInput>(null, {
    // Null-preserving: the plain `coerceBooleanProperty` folds `null` into `false`,
    // which would make "not set" and "set to false" the same value — and a config
    // default nothing could ever supply. A valueless `rounded` attribute still
    // arrives as `''` and still coerces to `true`.
    transform: (v: BooleanInput): boolean | null => (v == null ? null : coerceBooleanProperty(v)),
  });

  // `null` as each input's own default, not `'md'` / `false`: with a literal sitting
  // there, "the template said nothing" and "the template said md" are the same value,
  // so no app-wide default could ever apply. The effective default is the last
  // argument below, which is where the old inline one moved to.
  protected readonly resolvedSize = useConfigValue(this.size, c => c.input?.size, 'md');
  protected readonly resolvedRounded = useConfigValue(this.rounded, c => c.input?.rounded, false);

  protected readonly classes = computed(() => {
    const parts = ['wr-input'];
    const size = this.resolvedSize();
    if (size !== 'md') parts.push(`wr-input--${size}`);
    if (this.resolvedRounded()) parts.push('wr-input--rounded');
    return parts.join(' ');
  });
}
