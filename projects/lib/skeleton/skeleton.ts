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
 * @see https://ngwr.dev/components/skeleton
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
   * Color tint for the placeholder.
   *
   * Default is `'light'` because it's theme-stable — the `light` token is
   * slate-300 in light mode (subtle gray on white) and slate-800 in dark
   * mode (subtle lift on near-black). The `'dark'` value flips to a near-
   * white wash in dark mode and breaks the placeholder affordance.
   *
   * @default 'light'
   */
  readonly color = input<WrColor>('light');

  /**
   * Whether the shimmer animation runs.
   *
   * @default true
   */
  readonly animated = input(true, { transform: coerceBooleanProperty });

  protected readonly classes = computed(() => {
    const parts = ['wr-skeleton', `wr-skeleton--${this.color()}`];
    if (this.animated()) parts.push('wr-skeleton--animated');
    return parts.join(' ');
  });
}
