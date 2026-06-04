/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceNumberProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, input } from '@angular/core';

import type { WrColor } from 'ngwr/theme';

import type { WrDividerType } from './types';

/**
 * Horizontal separator line.
 *
 * @example
 * ```html
 * <wr-divider />
 * <wr-divider type="dashed" color="primary" [width]="2" />
 * ```
 *
 * @see https://ngwr.dev/docs/components/divider
 */
@Component({
  selector: 'wr-divider',
  template: '',
  encapsulation: ViewEncapsulation.None,
  host: {
    role: 'separator',
    '[class]': 'classes()',
    '[style.--wr-divider-width.px]': 'width()',
  },
})
export class WrDivider {
  /**
   * Color of the divider line. Omit for the neutral default.
   *
   * @default null
   */
  readonly color = input<WrColor | null>(null);

  /**
   * Line style.
   *
   * @default 'solid'
   */
  readonly type = input<WrDividerType>('solid');

  /**
   * Line width in pixels.
   *
   * @default 1
   */
  readonly width = input(1, { transform: (v: unknown): number => coerceNumberProperty(v, 1) });

  protected readonly classes = computed(() => {
    const parts = ['wr-divider', `wr-divider--${this.type()}`];
    const color = this.color();
    if (color) parts.push(`wr-divider--${color}`);
    return parts.join(' ');
  });
}
