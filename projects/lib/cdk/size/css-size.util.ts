/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DEFAULT_ROOT_FONT_SIZE } from './css-size.tokens';
import type { ResolvedCssSize, ResolveCssSizeOptions } from './css-size.types';

/**
 * Reads the root font size (in px) using `getComputedStyle(document.documentElement)`.
 * Falls back to {@link DEFAULT_ROOT_FONT_SIZE} when DOM is not available or parsing fails.
 *
 * @internal
 */
export function getRootFontSize(): number {
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return DEFAULT_ROOT_FONT_SIZE;
    }

    const fontSize = window.getComputedStyle(document.documentElement).fontSize.replace('px', '').trim();

    const parsed = Number.parseFloat(fontSize);
    return Number.isFinite(parsed) ? parsed : DEFAULT_ROOT_FONT_SIZE;
  } catch {
    return DEFAULT_ROOT_FONT_SIZE;
  }
}

/**
 * Resolves a raw size value into a CSS value and an optional pixel value.
 *
 * Supported formats:
 * - number        → pixels            (e.g. `48`     → "48px")
 * - `"12px"`      → pixels            (e.g. "12px"   → "12px")
 * - `"3rem"`      → rems (via root)   (e.g. "3rem"   → "3rem", pxValue = 3 × root font size)
 * - `"80%"`       → percentage        (e.g. "80%"    → "80%",  pxValue = null)
 * - `"15"`        → pixels            (e.g. "15"     → "15px")
 * - any other     → passed through as-is for CSS, pxValue = null
 *
 * @example
 * ```ts
 * const size = resolveCssSize('3rem', { defaultValue: '6rem' });
 * // size.cssValue === '3rem'
 * // size.pxValue  === 3 * getRootFontSize()
 * ```
 */
export function resolveCssSize(raw: unknown, options: ResolveCssSizeOptions = {}): ResolvedCssSize {
  const rootFontSize = getRootFontSize();

  const value: unknown = raw ?? options.defaultValue;

  // No value at all → fallback to 0px
  if (value == null) {
    return {
      cssValue: '0px',
      pxValue: 0,
    };
  }

  // number → px
  if (typeof value === 'number' && Number.isFinite(value)) {
    const px = value;
    return {
      cssValue: `${px}px`,
      pxValue: px,
    };
  }

  const stringValue = typeof value === 'string' ? value : String(value);
  const trimmed = stringValue.trim();

  // "3rem"
  const remMatch = trimmed.match(/^([\d.]+)\s*rem$/i);
  if (remMatch) {
    const rem = Number.parseFloat(remMatch[1]);
    const px = rem * rootFontSize;
    return {
      cssValue: `${rem}rem`,
      pxValue: Number.isFinite(px) ? px : null,
    };
  }

  // "12px"
  const pxMatch = trimmed.match(/^([\d.]+)\s*px$/i);
  if (pxMatch) {
    const px = Number.parseFloat(pxMatch[1]);
    return {
      cssValue: `${px}px`,
      pxValue: Number.isFinite(px) ? px : null,
    };
  }

  // "80%"
  const percentMatch = trimmed.match(/^([\d.]+)\s*%$/i);
  if (percentMatch) {
    return {
      cssValue: `${percentMatch[1]}%`,
      pxValue: null,
    };
  }

  // "15" → px
  const numberMatch = trimmed.match(/^([\d.]+)$/);
  if (numberMatch) {
    const px = Number.parseFloat(numberMatch[1]);
    return {
      cssValue: `${px}px`,
      pxValue: Number.isFinite(px) ? px : null,
    };
  }

  // Fallback: pass-through, unknown units
  return {
    cssValue: trimmed,
    pxValue: null,
  };
}
