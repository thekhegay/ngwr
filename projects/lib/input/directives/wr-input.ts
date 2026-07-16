/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Directive, computed, input } from '@angular/core';

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
  host: { '[class]': 'classes()' },
})
export class WrInput {
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
