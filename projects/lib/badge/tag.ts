/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, input } from '@angular/core';

import { WrIcon, type WrIconName } from 'ngwr/icon';
import { WrSpinner } from 'ngwr/spinner';
import type { WrColor } from 'ngwr/theme';

import type { WrTagIconPosition } from './interfaces';

/**
 * Rich inline label — icons, loading state, three visual styles
 * (solid / outlined / transparent). Reach for `<wr-badge>` when all
 * you need is a colored text chip.
 *
 * @example
 * ```html
 * <wr-tag>Default</wr-tag>
 * <wr-tag color="success" icon="checkmark">Done</wr-tag>
 * <wr-tag color="primary" outlined rounded>Beta</wr-tag>
 * <wr-tag color="warning" loading>Saving</wr-tag>
 * ```
 *
 * @see https://ngwr.dev/reference/components/badge
 */
@Component({
  selector: 'wr-tag',
  templateUrl: './tag.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
  imports: [WrIcon, WrSpinner],
})
export class WrTag {
  /**
   * Color variant — decoration or category, never the state on its own. The
   * label carries the state (`Failed`, not a red `Build`): six of the nine
   * intents share one lightness and `success` against `danger` is 1.004:1, so a
   * reader who cannot separate red from green cannot tell those two tags
   * apart, and `primary` and `info` are the same blue to everyone. When a tag has to stand
   * for a status by itself, give it an `icon` as well — register one with
   * `provideWrIcons(lucideIcons({ 'octagon-alert': OctagonAlert }))`, then write
   * `<wr-tag color="danger" icon="octagon-alert">Failed</wr-tag>`.
   *
   * @default 'primary'
   */
  readonly color = input<WrColor>('primary');

  /**
   * Icon name shown alongside the content — the one channel besides the label
   * that a tag has, so the one to reach for when colour is carrying a status.
   * Nothing ships built in: register the name through `provideWrIcons` first.
   * The icon is replaced by a spinner when `loading` is true.
   *
   * @default null
   */
  readonly icon = input<WrIconName | null>(null);

  /**
   * Where the icon/spinner is rendered.
   *
   * @default 'start'
   */
  readonly iconPosition = input<WrTagIconPosition>('start');

  /**
   * Outlined style — colored text and border on a tinted background.
   *
   * @default false
   */
  readonly outlined = input(false, { transform: coerceBooleanProperty });

  /**
   * Transparent style — colored text on a low-opacity tint, no border.
   *
   * @default false
   */
  readonly transparent = input(false, { transform: coerceBooleanProperty });

  /**
   * Pill-shaped corners.
   *
   * @default false
   */
  readonly rounded = input(false, { transform: coerceBooleanProperty });

  /**
   * Adds a hover state — use when the tag is interactive (button/link).
   *
   * @default false
   */
  readonly hoverable = input(false, { transform: coerceBooleanProperty });

  /**
   * Show a spinner in place of the icon.
   *
   * @default false
   */
  readonly loading = input(false, { transform: coerceBooleanProperty });

  protected readonly classes = computed(() => {
    const parts = ['wr-tag', `wr-tag--${this.color()}`];
    if (this.outlined()) parts.push('wr-tag--outlined');
    if (this.transparent()) parts.push('wr-tag--transparent');
    if (this.rounded()) parts.push('wr-tag--rounded');
    if (this.hoverable()) parts.push('wr-tag--hoverable');
    if (this.loading()) parts.push('wr-tag--loading');

    const hasAdornment = !!this.icon() || this.loading();
    if (hasAdornment) parts.push(`wr-tag--icon-${this.iconPosition()}`);

    return parts.join(' ');
  });
}
