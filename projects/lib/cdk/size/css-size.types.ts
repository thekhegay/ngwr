/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Result of resolving a CSS size value.
 */
export interface ResolvedCssSize {
  /**
   * Value used in CSS styles (e.g. "48px", "3rem", "80%").
   */
  cssValue: string;

  /**
   * Value in pixels used for width/height attributes.
   * When `null`, attributes should be omitted.
   */
  pxValue: number | null;
}

/**
 * Options for {@link resolveCssSize}.
 */
export interface ResolveCssSizeOptions {
  /**
   * Fallback value used when the raw size is `null` or `undefined`.
   * Can be any supported format (e.g. `"6rem"`, `"48px"`, `48`, `"80%"`).
   */
  defaultValue?: string | number;
}
