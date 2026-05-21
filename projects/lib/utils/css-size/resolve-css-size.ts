/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { getRootFontSize } from '../dom';

import type { ResolveCssSizeOptions } from './resolve-css-size-options';
import type { ResolvedCssSize } from './resolved-css-size';

/**
 * Resolves a raw size value into a CSS string and an optional pixel equivalent.
 *
 * Supported formats:
 * - `number`   → pixels        (`48`    → `"48px"`)
 * - `"12px"`   → pixels        (`"12px"` → `"12px"`)
 * - `"3rem"`   → rems via root (`"3rem"` → `"3rem"`, pxValue = 3 × root font size)
 * - `"80%"`    → percentage    (`"80%"`  → `"80%"`,  pxValue = null)
 * - `"15"`     → pixels        (`"15"`   → `"15px"`)
 * - anything else → passed through as-is, pxValue = null
 *
 * @example
 * ```ts
 * const size = resolveCssSize('3rem', { defaultValue: '6rem' });
 * // size.cssValue === '3rem'
 * // size.pxValue  === 3 * getRootFontSize()
 * ```
 *
 * @param raw - Value to resolve. Accepts numbers, pixel/rem/percent strings, or `null`/`undefined`.
 * @param options - Optional configuration.
 * @returns Resolved CSS value and its pixel equivalent when computable.
 *
 * @see {@link ResolvedCssSize}
 * @see {@link ResolveCssSizeOptions}
 */
export function resolveCssSize(raw: unknown, options: ResolveCssSizeOptions = {}): ResolvedCssSize {
  const rootFontSize = getRootFontSize();
  const value: unknown = raw ?? options.defaultValue;

  if (value == null) {
    return { cssValue: '0px', pxValue: 0 };
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return { cssValue: `${value}px`, pxValue: value };
  }

  if (typeof value !== 'string') {
    return { cssValue: '0px', pxValue: 0 };
  }

  const trimmed = value.trim();

  const remMatch = /^([\d.]+)\s*rem$/i.exec(trimmed);
  if (remMatch) {
    const rem = Number.parseFloat(remMatch[1]);
    const px = rem * rootFontSize;
    return { cssValue: `${rem}rem`, pxValue: Number.isFinite(px) ? px : null };
  }

  const pxMatch = /^([\d.]+)\s*px$/i.exec(trimmed);
  if (pxMatch) {
    const px = Number.parseFloat(pxMatch[1]);
    return { cssValue: `${px}px`, pxValue: Number.isFinite(px) ? px : null };
  }

  const percentMatch = /^([\d.]+)\s*%$/.exec(trimmed);
  if (percentMatch) {
    return { cssValue: `${percentMatch[1]}%`, pxValue: null };
  }

  const numberMatch = /^([\d.]+)$/.exec(trimmed);
  if (numberMatch) {
    const px = Number.parseFloat(numberMatch[1]);
    return { cssValue: `${px}px`, pxValue: Number.isFinite(px) ? px : null };
  }

  return { cssValue: trimmed, pxValue: null };
}
