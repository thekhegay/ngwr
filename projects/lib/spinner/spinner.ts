/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, computed, input } from '@angular/core';

import { useI18nText } from 'ngwr/i18n';

import type { WrSpinnerSize } from './interfaces';

/**
 * Inline loading indicator.
 *
 * Inherits color from the surrounding text (uses `currentColor`).
 *
 * @example
 * ```html
 * <wr-spinner />
 * <wr-spinner size="lg" />
 * ```
 *
 * @see https://ngwr.dev/reference/components/spinner
 */
@Component({
  selector: 'wr-spinner',
  templateUrl: './spinner.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    role: 'status',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[class]': 'classes()',
  },
})
export class WrSpinner {
  /**
   * Size variant. Em-based — scales with surrounding font-size.
   *
   * @default 'md'
   */
  readonly size = input<WrSpinnerSize>('md');

  /**
   * Accessible name for the live region. Falls back to `spinner.label`, then
   * `'Loading'` — which the host used to carry as a hard-coded attribute, while
   * the catalog had the translated key for it all along.
   */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = useI18nText(this.ariaLabel, 'spinner.label', 'Loading');

  protected readonly classes = computed(() => {
    const size = this.size();
    return size === 'md' ? 'wr-spinner' : `wr-spinner wr-spinner--${size}`;
  });
}
