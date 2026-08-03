/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * The `<wr-date-range-picker>` value — `[start, end]`.
 *
 * Either end can be `null` while the range is half-picked, so a partially
 * filled range is still representable. Structurally identical to
 * `WrCalendarRange`, which the picker forwards it to.
 */
export type WrDateRange = readonly [Date | null, Date | null];
