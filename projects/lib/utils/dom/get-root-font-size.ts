/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Reads the root font size (in px) using
 * `getComputedStyle(document.documentElement).fontSize`.
 *
 * Typical use case: converting `rem` values to pixels for layout calculations.
 *
 * Fallback strategy:
 * - if DOM is not available (e.g. SSR);
 * - if `getComputedStyle` fails or returns an invalid value;
 * then the provided `fallback` is used.
 *
 * @example
 * ```ts
 * const rootFontSize = getRootFontSize();      // e.g. 16
 * const customFallback = getRootFontSize(14);  // uses 14 if DOM is unavailable
 * ```
 *
 * @param fallback Fallback value in pixels to use when DOM is not available
 * or the computed font size cannot be parsed. Defaults to `16`.
 * @returns Root font size in pixels.
 */
export function getRootFontSize(fallback = 16): number {
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return fallback;
    }

    const fontSize = window.getComputedStyle(document.documentElement).fontSize.replace('px', '').trim();

    const parsed = Number.parseFloat(fontSize);
    return Number.isFinite(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}
