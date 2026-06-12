/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, input } from '@angular/core';

import type { WrColor } from 'ngwr/theme';

import type { WrBadgeShape, WrBadgeSize } from './interfaces';

/**
 * Lean status chip — color, size, rounded/pill. Use for short labels
 * and counts (e.g. "ONLINE", "3 unread", "v2.1"). Reach for `<wr-tag>`
 * when you need icons, loading state, or outlined / transparent styles.
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

  /**
   * Outlined style — transparent fill, colored border and text.
   *
   * @default false
   */
  readonly outlined = input(false, { transform: coerceBooleanProperty });

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
    if (this.outlined()) {
      parts.push('wr-badge--outlined');
    }
    return parts.join(' ');
  });
}
