/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrDateAdapter } from 'ngwr/date';

/** What a preset's range function is called with. */
export interface WrDateRangePresetContext {
  /**
   * The picker's adapter. In `datetime` mode it reads the display time zone of
   * `withDates({ timeZone })`, so day maths done through it lands on that
   * zone's days.
   */
  readonly adapter: WrDateAdapter<Date>;

  /**
   * The start of today, read when the panel opens. With a display time zone it
   * is the zone's today: a browser-local day in `date` mode, the zone's
   * midnight in `datetime` mode.
   */
  readonly today: Date;
}

/** A range worked out when the panel opens, such as one relative to today. */
export type WrDateRangePresetFn = (context: WrDateRangePresetContext) => readonly [Date, Date];

/**
 * A one-click range in the panel of `<wr-date-range-picker>`.
 *
 * `label` is the app's own text. `range` is a fixed pair, or a function for a
 * range that depends on today: `wrLastDays`, `wrThisWeek`, `wrThisMonth` and
 * `wrLastMonth` return one.
 *
 * In `date` mode both ends are cut to whole days. In `datetime` mode the pair
 * is committed as given; the helpers run from 00:00:00 on the first day to
 * 23:59:59 on the last.
 */
export interface WrDateRangePreset {
  readonly label: string;
  readonly range: readonly [Date, Date] | WrDateRangePresetFn;
}
