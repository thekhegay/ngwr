/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, computed, input } from '@angular/core';

import type { WrColor } from 'ngwr/theme';

import type { WrBadgeShape, WrBadgeSize } from './types';

/**
 * Small status indicator with color variants.
 *
 * Content is projected:
 *
 * @example
 * ```html
 * <wr-badge color="success">Active</wr-badge>
 * <wr-badge color="danger" size="sm">3</wr-badge>
 * <wr-badge color="primary" shape="pill">New</wr-badge>
 * ```
 *
 * @see https://ngwr.dev/docs/components/badge
 */
@Component({
  selector: 'wr-badge',
  template: '<ng-content />',
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
  },
})
export class WrBadge {
  /**
   * Color variant. Maps to `--wr-color-*` CSS variables from the theme.
   *
   * @default 'primary'
   */
  readonly color = input<WrColor>('primary');

  /**
   * Size variant.
   *
   * @default 'md'
   */
  readonly size = input<WrBadgeSize>('md');

  /**
   * Corner treatment. Mirrors `<wr-btn>` — `rounded` (default) uses the
   * small form-radius; `pill` rounds the ends fully.
   *
   * @default 'rounded'
   */
  readonly shape = input<WrBadgeShape>('rounded');

  protected readonly classes = computed(() => {
    const parts = ['wr-badge', `wr-badge--${this.color()}`];
    const size = this.size();
    if (size !== 'md') {
      parts.push(`wr-badge--${size}`);
    }
    const shape = this.shape();
    if (shape !== 'rounded') {
      parts.push(`wr-badge--${shape}`);
    }
    return parts.join(' ');
  });
}
