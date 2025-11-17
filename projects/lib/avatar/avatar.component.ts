/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { NgOptimizedImage } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  HostBinding,
  input,
  signal,
  ViewEncapsulation,
} from '@angular/core';

import { resolveCssSize, type ResolvedCssSize } from 'ngwr/cdk/size';
import { WrSpinnerComponent } from 'ngwr/spinner';

import type { WrAvatarSize } from './avatar-size';

/**
 * NGWR avatar component.
 *
 * Displays a square or rounded avatar with an optional loading spinner
 * while the image is being loaded.
 *
 * @example
 * ```html
 * <wr-avatar
 *   url="/assets/user.png"
 *   alt="User avatar"
 *   size="6rem"
 *   [rounded]="true"
 * ></wr-avatar>
 * ```
 *
 * @example
 * ```html
 * <!-- 48x48px avatar -->
 * <wr-avatar url="/assets/user.png" alt="User avatar" size="48"></wr-avatar>
 *
 * <!-- 3rem avatar (based on root font size) -->
 * <wr-avatar url="/assets/user.png" alt="User avatar" size="3rem"></wr-avatar>
 * ```
 *
 * @see WrSpinnerComponent
 * @publicApi
 */
@Component({
  standalone: true,
  selector: 'wr-avatar',
  templateUrl: './avatar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgOptimizedImage, WrSpinnerComponent],
})
export class WrAvatarComponent {
  /**
   * Image URL for the avatar.
   * When not set, only projected content will be shown.
   *
   * @default null
   */
  readonly url = input<string | null>(null);

  /**
   * Accessible alternative text for the avatar image.
   * Should describe the person or object shown in the avatar.
   *
   * @default 'Avatar'
   */
  readonly alt = input<string>('Avatar');

  /**
   * When `true`, renders the avatar as a circle instead of a rounded square.
   *
   * @default false
   */
  readonly rounded = input(false, { transform: booleanAttribute });

  /**
   * Avatar size.
   *
   * Supported formats:
   * - number        → pixels            (e.g. `48`     → 48px)
   * - `"12px"`      → pixels            (e.g. "12px"   → 12px)
   * - `"3rem"`      → rems (via root)   (e.g. "3rem"   → 3 × root font size)
   * - `"15"`        → pixels            (e.g. "15"     → 15px)
   *
   * Percentage values (e.g. `"80%"`, `"100%"`) are not supported.
   *
   * @default '6rem'
   * @see WrAvatarSize
   */
  readonly size = input<WrAvatarSize>('6rem');

  /**
   * Internal signal that tracks whether the image has finished loading.
   *
   * @internal
   */
  protected readonly isImgLoaded = signal(false);

  /**
   * Resolved size for the avatar, containing both CSS and pixel values.
   * Percentage values are not allowed and will fall back to "6rem" with a warning.
   *
   * @internal
   */
  protected readonly resolvedSize = computed<ResolvedCssSize>(() => {
    const result = resolveCssSize(this.size(), { defaultValue: '6rem' });

    if (result.pxValue == null || result.pxValue <= 0) {
      console.warn('[ngwr] WrAvatarComponent: resolved pixel size for `size` is invalid. Falling back to "6rem".');
      return resolveCssSize('6rem', { defaultValue: '6rem' });
    }

    return result;
  });

  /**
   * Host CSS classes:
   *
   * - always includes `'wr-avatar'`
   * - adds `'wr-avatar--rounded'` when {@link rounded} is `true`
   * - adds `'wr-avatar--loaded'` when the image load has completed
   */
  @HostBinding('class')
  get hostClasses(): Record<string, boolean> {
    const baseClass = `wr-avatar`;

    return {
      [baseClass]: true,
      [`${baseClass}--rounded`]: this.rounded(),
      [`${baseClass}--loaded`]: this.isImgLoaded(),
    };
  }

  /**
   * Inline host styles for width and height based on the resolved CSS value.
   */
  @HostBinding('style')
  get hostStyles(): Record<string, string> {
    const { cssValue } = this.resolvedSize();

    return {
      width: cssValue,
      height: cssValue,
    };
  }

  /**
   * Handles the image load event and marks the avatar as loaded.
   */
  protected handleImageLoad(): void {
    this.isImgLoaded.set(true);
  }
}
