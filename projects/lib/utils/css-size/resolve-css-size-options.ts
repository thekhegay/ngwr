/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Options for {@link resolveCssSize}.
 */
export interface ResolveCssSizeOptions {
  /**
   * Fallback value used when the raw input is `null` or `undefined`.
   *
   * Accepts the same formats as the `raw` parameter:
   * numbers, pixel strings, rem strings, percentages, etc.
   */
  defaultValue?: unknown;
}
