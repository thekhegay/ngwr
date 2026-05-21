/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Reads the root font size (in pixels) from
 * `getComputedStyle(document.documentElement).fontSize`.
 *
 * Typical use case: converting `rem` values to pixels for layout calculations.
 *
 * Falls back to the provided value when:
 * - DOM is not available (SSR);
 * - `getComputedStyle` fails or returns an unparseable value.
 *
 * @example
 * ```ts
 * const rootFontSize = getRootFontSize();      // e.g. 16
 * const customFallback = getRootFontSize(14);  // uses 14 if DOM is unavailable
 * ```
 *
 * @param fallback - Value in pixels when DOM is unavailable. Defaults to `16`.
 * @returns Root font size in pixels.
 */
export function getRootFontSize(fallback = 16): number {
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return fallback;
    }

    const raw = window.getComputedStyle(document.documentElement).fontSize;
    const parsed = Number.parseFloat(raw);

    return Number.isFinite(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}
