/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Built-in color variants available to NGWR components.
 *
 * Kept in sync manually with the SCSS `$base-colors` map in
 * `theme/styles/_colors.scss`. Both sources must stay aligned —
 * adding a color requires updating both this array and the SCSS map.
 * Nothing enforces that, and it has already drifted once: `info` landed
 * in the map without landing here, so v8.0.0 shipped every
 * `--wr-color-info*` token — plus an `--info` modifier from each of the
 * five stylesheets that iterate the map — while this type refused the
 * value. Order matches the map so the two read as one list.
 *
 * @example
 * ```ts
 * import { WR_COLORS } from 'ngwr/theme';
 *
 * // Iterate all colors for demos or documentation
 * WR_COLORS.forEach(color => console.log(color));
 * ```
 */
export const WR_COLORS = [
  'primary',
  'secondary',
  'success',
  'warning',
  'danger',
  'info',
  'light',
  'medium',
  'dark',
] as const;

/**
 * A color variant name.
 *
 * Use as an input type on components that accept a color:
 *
 * @example
 * ```ts
 * import type { WrColor } from 'ngwr/theme';
 *
 * @Component({...})
 * export class MyComponent {
 *   readonly color = input<WrColor>('primary');
 * }
 * ```
 */
export type WrColor = (typeof WR_COLORS)[number];
