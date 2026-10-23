/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrDateFormat } from 'ngwr/date';

type WrClockBase = 'time' | 'shortDateTime';
type WrClockCycle = 'auto' | '12h' | '24h';

/** `[without seconds, with seconds]` per hour cycle — a table, so every entry is a checked key. */
const CLOCK_FORMATS: Readonly<
  Record<WrClockBase, Readonly<Record<WrClockCycle, readonly [WrDateFormat, WrDateFormat]>>>
> = {
  time: {
    auto: ['time', 'timeSeconds'],
    '12h': ['time12h', 'time12hSeconds'],
    '24h': ['time24h', 'time24hSeconds'],
  },
  shortDateTime: {
    auto: ['shortDateTime', 'shortDateTimeSeconds'],
    '12h': ['shortDateTime12h', 'shortDateTime12hSeconds'],
    '24h': ['shortDateTime24h', 'shortDateTime24hSeconds'],
  },
};

/**
 * The named format a picker's field uses when no `[format]` is given: the one that
 * writes the clock the way its time panel draws it. Without it the field printed
 * `time` whatever the panel showed — seconds a user set were dropped on the next
 * retype, and `timeFormat="24h"` printed `02:30 PM` in en-US beside a 24-hour panel.
 * `'auto'` leaves the cycle to the locale, as the panel does.
 *
 * @internal
 */
export function clockFormat(base: WrClockBase, cycle: WrClockCycle, seconds: boolean): WrDateFormat {
  return CLOCK_FORMATS[base][cycle][seconds ? 1 : 0];
}
