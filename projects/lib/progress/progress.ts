/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceNumberProperty } from '@angular/cdk/coercion';
import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input } from '@angular/core';

import type { WrColor } from 'ngwr/theme';

/**
 * Horizontal progress bar.
 *
 * @example
 * ```html
 * <wr-progress [value]="42" />
 * <wr-progress color="success" [value]="80" />
 * ```
 *
 * @see https://ngwr.dev/docs/components/progress
 */
@Component({
  selector: 'wr-progress',
  template: `<div class="wr-progress__bar" [style.width.%]="clamped()"></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    role: 'progressbar',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    '[attr.aria-valuenow]': 'clamped()',
    '[class]': 'classes()',
  },
})
export class WrProgress {
  /**
   * Bar color.
   *
   * @default 'primary'
   */
  readonly color = input<WrColor>('primary');

  /**
   * Progress value, clamped to `[0, 100]`.
   *
   * @default 0
   */
  readonly value = input(0, { transform: (v: unknown): number => coerceNumberProperty(v, 0) });

  protected readonly clamped = computed(() => Math.max(0, Math.min(100, this.value())));

  protected readonly classes = computed(() => `wr-progress wr-progress--${this.color()}`);
}
