/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * List of supported theme color names used across NGWR components.
 *
 * These names are aligned with SCSS theme maps and CSS variables:
 * e.g. `primary` → `--wr-color-primary`, `$theme-colors-map`.
 */
export const wrThemeColors = [
  'primary',
  'secondary',
  'success',
  'warning',
  'danger',
  'light',
  'medium',
  'dark',
] as const;
