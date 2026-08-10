/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, computed, effect, input, signal, untracked } from '@angular/core';

import { useI18nText } from 'ngwr/i18n';
import { WrSpinner } from 'ngwr/spinner';
import { resolveCssSize, type ResolvedCssSize } from 'ngwr/utils';

import type { WrAvatarShape, WrAvatarSize } from './interfaces';

const DEFAULT_SIZE: WrAvatarSize = '6rem';

/**
 * Image avatar with configurable corner treatment.
 *
 * A spinner is shown while the image loads, then crossfades in.
 *
 * @example
 * ```html
 * <wr-avatar url="/me.png" alt="Roman" size="3rem" shape="circle" />
 * <wr-avatar url="/me.png" alt="Roman" [size]="48" />
 * ```
 *
 * @see https://ngwr.dev/reference/components/avatar
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
   * Alt text for the image. Falls back to `avatar.alt`, then `'Avatar'` — pass
   * the person's name where you have it, since that is what a reader wants.
   *
   * @default null
   */
  readonly alt = input<string | null>(null);

  protected readonly resolvedAlt = useI18nText(this.alt, 'avatar.alt', 'Avatar');

  /**
   * Corner treatment. `rounded` (default) is a soft rounded square,
   * `circle` is the classic profile avatar, `squircle` is the iOS look.
   *
   * @default 'rounded'
   */
  readonly shape = input<WrAvatarShape>('rounded');

  /**
   * Box size. See {@link WrAvatarSize} for accepted values.
   *
   * @default '6rem'
   */
  readonly size = input<WrAvatarSize>(DEFAULT_SIZE);

  protected readonly loaded = signal(false);

  /**
   * Whether the image failed. Without this the spinner spun forever on a broken
   * URL — the one state where an avatar is guaranteed to have projected initials
   * worth showing instead.
   */
  protected readonly failed = signal(false);

  constructor() {
    // A new URL is a new attempt: after a failure the fallback would otherwise
    // stay put for an image that loads perfectly well.
    effect(() => {
      this.url();
      untracked(() => {
        this.loaded.set(false);
        this.failed.set(false);
      });
    });
  }

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
    const shape = this.shape();
    if (shape !== 'rounded') parts.push(`wr-avatar--${shape}`);
    if (this.loaded()) parts.push('wr-avatar--loaded');
    return parts.join(' ');
  });

  protected onImageLoad(): void {
    this.loaded.set(true);
  }

  protected onImageError(): void {
    this.failed.set(true);
  }
}
