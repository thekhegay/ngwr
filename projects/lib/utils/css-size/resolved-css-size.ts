/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Result of resolving a CSS size value via {@link resolveCssSize}.
 */
export type ResolvedCssSize = {
  /**
   * Value suitable for use in CSS styles (e.g. `"48px"`, `"3rem"`, `"80%"`).
   */
  cssValue: string;

  /**
   * Equivalent value in pixels, when computable.
   *
   * `null` for percentage-based or unknown units where a pixel
   * equivalent cannot be determined.
   */
  pxValue: number | null;
};
