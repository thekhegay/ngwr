/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * `[start, end]` tuple used by `<wr-calendar>` in `range` mode. Either side
 * may be `null` while the user is mid-selection (start picked, end pending).
 */
export type WrCalendarRange = readonly [Date | null, Date | null];
