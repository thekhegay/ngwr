/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input } from '@angular/core';

import type { WrColor } from 'ngwr/theme';

import type { WrBadgeSize } from './types';

/**
 * Small status indicator with color variants.
 *
 * Content is projected:
 *
 * @example
 * ```html
 * <wr-badge color="success">Active</wr-badge>
 * <wr-badge color="danger" size="sm">3</wr-badge>
 * <wr-badge color="primary" rounded>New</wr-badge>
 * ```
 *
 * @see https://ngwr.dev/docs/components/badge
 */
@Component({
  selector: 'wr-badge',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
   * Render with pill-shaped corners.
   *
   * @default false
   */
  readonly rounded = input(false, { transform: coerceBooleanProperty });

  protected readonly classes = computed(() => {
    const parts = ['wr-badge', `wr-badge--${this.color()}`];
    const size = this.size();
    if (size !== 'md') {
      parts.push(`wr-badge--${size}`);
    }
    if (this.rounded()) {
      parts.push('wr-badge--rounded');
    }
    return parts.join(' ');
  });
}
