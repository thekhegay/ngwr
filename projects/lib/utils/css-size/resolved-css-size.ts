/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Result of resolving a CSS size value.
 */
export type ResolvedCssSize = {
  /**
   * Value used in CSS styles (e.g. "48px", "3rem", "80%").
   */
  cssValue: string;

  /**
   * Value in pixels used for width/height attributes.
   * When `null`, attributes should be omitted.
   */
  pxValue: number | null;
};
