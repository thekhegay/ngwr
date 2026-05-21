/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input } from '@angular/core';

import { WrIconComponent, type WrIconName } from 'ngwr/icon';
import { WrSpinnerComponent } from 'ngwr/spinner';
import type { WrColor } from 'ngwr/theme';

import type { WrTagIconPosition } from './types';

/**
 * Small inline label. Supports icons, loading state, and three visual
 * styles (solid / outlined / transparent).
 *
 * @example
 * ```html
 * <wr-tag>Default</wr-tag>
 * <wr-tag color="success" icon="checkmark">Done</wr-tag>
 * <wr-tag color="primary" outlined rounded>Beta</wr-tag>
 * <wr-tag color="warning" loading>Saving</wr-tag>
 * ```
 *
 * @see https://ngwr.dev/docs/components/tag
 */
@Component({
  selector: 'wr-tag',
  templateUrl: './tag.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
  imports: [WrIconComponent, WrSpinnerComponent],
})
export class WrTagComponent {
  /**
   * Color variant.
   *
   * @default 'primary'
   */
  readonly color = input<WrColor>('primary');

  /**
   * Icon name shown alongside the content. The icon is replaced by a
   * spinner when `loading` is true.
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
