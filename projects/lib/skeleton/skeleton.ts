/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, input } from '@angular/core';

import type { WrColor } from 'ngwr/theme';

/**
 * Placeholder block shown while content is loading.
 *
 * Default sizing fills the parent width and matches the surrounding
 * text height (`1lh`). Override `--wr-skeleton-height` / `width` on the
 * host for custom shapes.
 *
 * @example
 * ```html
 * <wr-skeleton />
 * <wr-skeleton color="primary" [animated]="false" />
 * ```
 *
 * @see https://ngwr.dev/reference/components/skeleton
 */
@Component({
  selector: 'wr-skeleton',
  template: '',
  encapsulation: ViewEncapsulation.None,
  host: {
    'aria-busy': 'true',
    'aria-live': 'polite',
    '[class]': 'classes()',
  },
})
export class WrSkeleton {
  /**
   * Intent tint for the placeholder. `null`, the default, paints the neutral
   * gray a placeholder almost always wants.
   *
   * It used to default to the `light` intent, chosen because that one token was
   * theme-stable — slate-300 on white, slate-800 on near-black. The neutral ramp
   * does that job now and does it by construction, so the default is the absence
   * of an intent rather than a particular one. An intent here tints a thing that
   * is not yet content, so reach for it only when the placeholder stands in for
   * something the colour already identifies.
   *
   * @default null
   */
  readonly color = input<WrColor | null>(null);

  /**
   * Whether the shimmer animation runs.
   *
   * @default true
   */
  readonly animated = input(true, { transform: coerceBooleanProperty });

  protected readonly classes = computed(() => {
    const parts = ['wr-skeleton'];

    const color = this.color();
    if (color) parts.push(`wr-skeleton--${color}`);

    if (this.animated()) parts.push('wr-skeleton--animated');
    return parts.join(' ');
  });
}
