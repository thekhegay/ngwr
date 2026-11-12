/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

/**
 * The display time zone the {@link WrDateAdapter} implementations read, as a
 * function: an IANA name (`'Asia/Almaty'`) or an offset (`'+05:00'`), and
 * `null` or `undefined` for the browser's own zone. `null` when
 * `withDates({ timeZone })` was not called, which is the browser's zone too.
 *
 * A function rather than a string because the zone often arrives after
 * bootstrap, from a runtime config. The native adapter calls it on every read,
 * so what it formats follows the signals the function reads.
 *
 * Set it with the `timeZone` option of `provideWr(withDates(...))`. An adapter
 * of your own injects it to honour the same option.
 */
export const WR_DATE_TIME_ZONE = new InjectionToken<(() => string | null | undefined) | null>('WR_DATE_TIME_ZONE', {
  providedIn: 'root',
  factory: () => null,
});
