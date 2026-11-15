/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * `value` rounded to `digits` decimals for an inline style or an SVG attribute, with
 * `-0` folded to `0`: a share of an axis, a percentage, a coordinate.
 *
 * Eleven charts each kept a copy of this under another name (`short`, `percent`,
 * `fixed`), at three precisions. A written geometry value wants few digits - every one
 * past the fourth is bytes in the DOM and a different string for the same pixel - and
 * never `-0`, which `Math.round` produces for a small negative and which prints as `-0`.
 *
 * Not `wrRound` from `ngwr/utils`, which nudges by `Number.EPSILON` to round a decimal
 * tie the way a person expects and keeps the sign of a zero.
 *
 * @internal
 */
export function wrChartRound(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor || 0;
}
