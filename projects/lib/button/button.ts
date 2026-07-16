/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, inject, input } from '@angular/core';

import { WrIcon, type WrIconName } from 'ngwr/icon';
import { WrSpinner } from 'ngwr/spinner';
import type { WrColor } from 'ngwr/theme';

import type { WrButtonIconPosition, WrButtonShape, WrButtonSize } from './interfaces';
import { WR_BUTTON_GROUP } from './tokens';

/**
 * Trigger an action. Renders as a `<wr-btn>` element, or attach to a
 * native `<button>` / `<a>` via the `wr-btn` attribute selector.
 *
 * @example
 * ```html
 * <button wr-btn color="primary">Save</button>
 * <a wr-btn color="primary" outlined>Cancel</a>
 * <wr-btn color="danger" icon="trash">Delete</wr-btn>
 * <wr-btn color="primary" shape="pill">Pill</wr-btn>
 * ```
 *
 * **Squircle?** Wrap with `[wrSquircle]` — the directive is the only
 * way ngwr ships smooth-corner clip-paths:
 *
 * ```html
 * <wr-btn wrSquircle [radius]="14">Squircle</wr-btn>
 * ```
 *
 * Inside a `<wr-btn-group shape="…">`, the group's shape is enforced on
 * every child — child `[shape]` inputs are ignored so the group reads as
 * one coherent control.
 *
 * @see https://ngwr.dev/reference/components/button
 */
@Component({
  selector: 'wr-btn, button[wr-btn], a[wr-btn]',
  templateUrl: './button.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
    '[attr.disabled]': 'nativeDisabled()',
    '[attr.aria-busy]': 'loading() ? "true" : null',
  },
  imports: [WrIcon, WrSpinner],
})
export class WrButton {
  /** Color variant. Omit for the neutral default style. @default null */
  readonly color = input<WrColor | null>(null);

  /** Size variant. @default 'md' */
  readonly size = input<WrButtonSize>('md');

  /**
   * Corner treatment — `rounded` or `pill`. `null` (default) falls back
   * to `rounded`. Inside a `<wr-btn-group shape="…">`, the group's shape
   * ALWAYS wins over this input — the group enforces a consistent corner
   * treatment across its members.
   *
   * @default null
   */
  readonly shape = input<WrButtonShape | null>(null);

  /**
   * Icon name to render alongside the label. The icon is hidden while
   * `loading` is `true` so the spinner can take its place.
   *
   * @default null
   */
  readonly icon = input<WrIconName | null>(null);

  /** Position of the icon relative to the label. @default 'start' */
  readonly iconPosition = input<WrButtonIconPosition>('start');

  /** Disable the button. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Outlined variant — colored text and border on a transparent background. @default false */
  readonly outlined = input(false, { transform: coerceBooleanProperty });

  /** Stretch the button to fill its parent's width. @default false */
  readonly block = input(false, { transform: coerceBooleanProperty });

  /** Show a spinner overlaying the label. Layout is preserved. @default false */
  readonly loading = input(false, { transform: coerceBooleanProperty });

  /**
   * When `loading` is `true` and this is also `true`, pointer events are
   * suppressed and the button reports as disabled to assistive tech.
   *
   * @default true
   */
  readonly isDisabledWhenLoading = input(true, { transform: coerceBooleanProperty });

  private readonly group = inject(WR_BUTTON_GROUP, { optional: true });

  /**
   * Resolved shape. Inside a `<wr-btn-group>`, the group ALWAYS wins —
   * child `[shape]` is ignored entirely so the group reads as one
   * coherent control. Outside a group, the button's own `[shape]` is
   * used, falling back to `rounded`.
   */
  protected readonly effectiveShape = computed<WrButtonShape>(() =>
    this.group ? (this.group.shape() ?? 'rounded') : (this.shape() ?? 'rounded')
  );

  protected readonly nativeDisabled = computed<'' | null>(() => {
    const off = this.disabled() || (this.loading() && this.isDisabledWhenLoading());
    return off ? '' : null;
  });

  protected readonly classes = computed(() => {
    const parts = ['wr-btn'];

    const color = this.color();
    if (color) parts.push(`wr-btn--${color}`);

    const size = this.size();
    if (size !== 'md') parts.push(`wr-btn--${size}`);

    const shape = this.effectiveShape();
    if (shape !== 'rounded') parts.push(`wr-btn--${shape}`);

    if (this.outlined()) parts.push('wr-btn--outlined');
    if (this.block()) parts.push('wr-btn--block');
    if (this.loading()) parts.push('wr-btn--loading');

    const hasAdornment = !!this.icon() || this.loading();
    if (hasAdornment) parts.push(`wr-btn--icon-${this.iconPosition()}`);

    return parts.join(' ');
  });
}
