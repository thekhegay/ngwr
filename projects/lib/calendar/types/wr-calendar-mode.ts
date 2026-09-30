/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Selection mode for `<wr-calendar>`:
 *
 * - `single` — one date at a time, bound via `[(date)]`
 * - `range` — start + end dates, bound via `[(range)]`
 */
export type WrCalendarMode = 'single' | 'range';
