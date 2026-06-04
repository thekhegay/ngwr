/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, input, signal } from '@angular/core';

import { WrSpinner } from 'ngwr/spinner';
import { resolveCssSize, type ResolvedCssSize } from 'ngwr/utils';

import type { WrAvatarSize } from './types';

const DEFAULT_SIZE: WrAvatarSize = '6rem';

/**
 * Image avatar with a fixed square or rounded shape.
 *
 * A spinner is shown while the image loads, then crossfades in.
 *
 * @example
 * ```html
 * <wr-avatar url="/me.png" alt="Roman" size="3rem" rounded />
 * <wr-avatar url="/me.png" alt="Roman" [size]="48" />
 * ```
 *
 * @see https://ngwr.dev/docs/components/avatar
 */
@Component({
  selector: 'wr-avatar',
  templateUrl: './avatar.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
    '[style.width]': 'cssSize()',
    '[style.height]': 'cssSize()',
  },
  imports: [WrSpinner],
})
export class WrAvatar {
  /**
   * Image URL. When unset, only projected content (e.g. initials) renders.
   *
   * @default null
   */
  readonly url = input<string | null>(null);

  /**
   * Alt text for the image.
   *
   * @default 'Avatar'
   */
  readonly alt = input<string>('Avatar');

  /**
   * Render as a circle instead of a rounded square.
   *
   * @default false
   */
  readonly rounded = input(false, { transform: coerceBooleanProperty });

  /**
   * Box size. See {@link WrAvatarSize} for accepted values.
   *
   * @default '6rem'
   */
  readonly size = input<WrAvatarSize>(DEFAULT_SIZE);

  protected readonly loaded = signal(false);

  protected readonly resolved = computed<ResolvedCssSize>(() => {
    const result = resolveCssSize(this.size(), { defaultValue: DEFAULT_SIZE });
    if (result.pxValue == null || result.pxValue <= 0) {
      return resolveCssSize(DEFAULT_SIZE, { defaultValue: DEFAULT_SIZE });
    }
    return result;
  });

  protected readonly cssSize = computed(() => this.resolved().cssValue);
  protected readonly pxSize = computed(() => this.resolved().pxValue);

  protected readonly classes = computed(() => {
    const parts = ['wr-avatar'];
    if (this.rounded()) parts.push('wr-avatar--rounded');
    if (this.loaded()) parts.push('wr-avatar--loaded');
    return parts.join(' ');
  });

  protected onImageLoad(): void {
    this.loaded.set(true);
  }
}
