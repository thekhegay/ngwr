/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
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

export type WrThemeColor = (typeof wrThemeColors)[number];
