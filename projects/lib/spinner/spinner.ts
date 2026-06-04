/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, computed, input } from '@angular/core';

import type { WrSpinnerSize } from './types';

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
 * @see https://ngwr.dev/docs/components/spinner
 */
@Component({
  selector: 'wr-spinner',
  templateUrl: './spinner.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    role: 'status',
    'aria-label': 'Loading',
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

  protected readonly classes = computed(() => {
    const size = this.size();
    return size === 'md' ? 'wr-spinner' : `wr-spinner wr-spinner--${size}`;
  });
}
