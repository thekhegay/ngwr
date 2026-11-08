/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * What a keyboard can reach: the element an effect reads hover and focus on is
 * the host's closest match, so a label inside a button behaves the same for a
 * pointer and for Tab.
 *
 * @internal
 */
export const FOCUSABLE = 'a[href], button, input, select, textarea, summary, [tabindex]';

/**
 * An optional CSS selector written as a directive's own value: a bare
 * attribute is the empty string, and means "the host".
 *
 * @internal
 */
export const optionalSelector = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null;

/**
 * `value` rounded to `digits` decimals, for a number written into the DOM every
 * frame: a transform of `12.34px` repaints the same as one of `12.3400000001px`
 * and is a tenth of the string.
 *
 * @internal
 */
export function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
