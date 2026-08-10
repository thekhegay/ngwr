/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Directive, ElementRef, computed, inject, input } from '@angular/core';

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
   * Control size. Named `wrSize` (not `size`) so it never clashes with the
   * native `<input size>` attribute. @default 'md'
   */
  readonly wrSize = input<WrInputSize>('md');

  /** Pill-shaped corners. @default false */
  readonly rounded = input(false, { transform: coerceBooleanProperty });

  protected readonly classes = computed(() => {
    const parts = ['wr-input'];
    const size = this.wrSize();
    if (size !== 'md') parts.push(`wr-input--${size}`);
    if (this.rounded()) parts.push('wr-input--rounded');
    return parts.join(' ');
  });
}
