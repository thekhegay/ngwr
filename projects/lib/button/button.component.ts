/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  input,
  ViewEncapsulation,
} from '@angular/core';

import { WrThemeColor } from 'ngwr/cdk/types';
import { WrIconComponent, type wrIconName } from 'ngwr/icon';
import { WrSpinnerComponent } from 'ngwr/spinner';

import type { WrButtonSize } from './button-size';

/**
 * NGWR button component.
 *
 * Triggers an operation or performs an action. Can be rendered as:
 * - native `<button wr-btn>`
 * - anchor `<a wr-btn>`
 * - custom `<wr-btn>`
 *
 * @example
 * ```html
 * <button wr-btn color="primary">Save</button>
 * <button wr-btn color="danger" [outlined]="true">Delete</button>
 * <button wr-btn color="primary" [loading]="true">Loading...</button>
 * ```
 *
 * @example
 * ```html
 * <button wr-btn color="primary" icon="check">Save</button>
 * <button wr-btn color="secondary" icon="arrow-right" iconPosition="end">
 *   Next
 * </button>
 * ```
 *
 * @see WrButtonGroupComponent
 * @see http://ngwr.dev/docs/components/button
 *
 * @publicApi
 */
@Component({
  standalone: true,
  selector: 'wr-btn, button[wr-btn], a[wr-btn]',
  templateUrl: './button.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [WrIconComponent, WrSpinnerComponent],
})
export class WrButtonComponent {
  /**
   * Theme color for the button.
   * When not set, the default neutral style is used.
   */
  readonly color = input<WrThemeColor | null>(null);

  /**
   * Size of the button.
   *
   * - `'default'` – base size
   * - `'small'`   – compact version
   *
   * @default 'default'
   */
  readonly size = input<WrButtonSize>('default');

  /**
   * Optional icon name from the NGWR icon set.
   * When provided, the icon is rendered before or after the text.
   */
  readonly icon = input<wrIconName | null>(null);

  /**
   * Icon position relative to the button text.
   *
   * - `'start'` – icon before text
   * - `'end'`   – icon after text
   *
   * @default 'start'
   */
  readonly iconPosition = input<'start' | 'end'>('start');

  /**
   * Disables the button.
   * Sets the native `disabled` attribute when possible and applies disabled styles.
   *
   * @default false
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Outlined variant:
   * renders a bordered button with transparent background.
   *
   * @default false
   */
  readonly outlined = input(false, { transform: booleanAttribute });

  /**
   * Fully rounded button: pill-shaped style.
   *
   * @default false
   */
  readonly rounded = input(false, { transform: booleanAttribute });

  /**
   * Makes the button take the full width of its container.
   *
   * @default false
   */
  readonly block = input(false, { transform: booleanAttribute });

  /**
   * Shows loading spinner and applies loading styles.
   *
   * @default false
   */
  readonly loading = input(false, { transform: booleanAttribute });

  /**
   * When `true` and the button is loading, pointer events are disabled
   * and the button is visually treated as disabled.
   *
   * @default true
   */
  readonly isDisabledWhenLoading = input(true, { transform: booleanAttribute });

  /**
   * Native `disabled` attribute for `<button>`.
   *
   * Note: On `<a>` elements this attribute has no semantic effect, but it's
   * harmless and allows consistent styling via `[disabled]` selectors.
   */
  @HostBinding('attr.disabled')
  get nativeDisabled(): '' | null {
    const disabled = this.disabled() || (this.loading() && this.isDisabledWhenLoading());
    return disabled ? '' : null;
  }

  /**
   * Host CSS classes:
   */
  @HostBinding('class')
  get hostClasses(): Record<string, boolean> {
    const baseClass = 'wr-btn';
    const color = this.color();
    const size = this.size();
    const icon = this.icon();
    const iconPosition = this.iconPosition();
    const block = this.block();
    const rounded = this.rounded();
    const outlined = this.outlined();
    const loading = this.loading();
    const isDisabledWhenLoading = this.isDisabledWhenLoading();

    return {
      [baseClass]: true,

      // Colors
      [`${baseClass}--color-primary`]: color === 'primary',
      [`${baseClass}--color-secondary`]: color === 'secondary',
      [`${baseClass}--color-success`]: color === 'success',
      [`${baseClass}--color-warning`]: color === 'warning',
      [`${baseClass}--color-danger`]: color === 'danger',
      [`${baseClass}--color-light`]: color === 'light',
      [`${baseClass}--color-medium`]: color === 'medium',
      [`${baseClass}--color-dark`]: color === 'dark',

      // Size / layout
      [`${baseClass}--small`]: size === 'small',
      [`${baseClass}--block`]: block,
      [`${baseClass}--rounded`]: rounded,

      // Icon modifiers
      [`${baseClass}--icon`]: !!icon,
      [`${baseClass}--icon-start`]: !!icon && iconPosition === 'start',
      [`${baseClass}--icon-end`]: !!icon && iconPosition === 'end',

      // Variants
      [`${baseClass}--outlined`]: outlined,
      [`${baseClass}--loading`]: loading,
      [`${baseClass}--loading--disabled`]: loading && isDisabledWhenLoading,
    };
  }
}
