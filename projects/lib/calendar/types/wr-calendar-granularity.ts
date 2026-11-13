/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrDatePeriod } from 'ngwr/date';

/**
 * What one pick in `<wr-calendar>` names:
 *
 * - `day`: a day, on the day grid
 * - `week`: a whole week, on the day grid
 * - `month`, `quarter`, `year`: a period, on a view of its own
 *
 * A period is held as its first day, and in `range` mode the end is the last
 * day of the end period.
 */
export type WrCalendarGranularity = 'day' | WrDatePeriod;
