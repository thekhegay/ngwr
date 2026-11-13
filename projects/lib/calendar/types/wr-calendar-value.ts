/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrCalendarRange } from './wr-calendar-range';

/**
 * What `<wr-calendar>` holds in its `value` model, the one `[formField]` binds:
 *
 * - a `Date` in `single` mode
 * - a `[start, end]` tuple in `range` mode
 * - `null` while nothing is picked, in either mode
 */
export type WrCalendarValue = Date | WrCalendarRange | null;
