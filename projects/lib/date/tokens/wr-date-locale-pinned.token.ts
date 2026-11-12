/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

/**
 * Whether `withDates({ locale })` pinned the date locale. `WR_DATE_LOCALE`
 * cannot say: it holds `LOCALE_ID` when nothing was pinned.
 *
 * @internal
 */
export const WR_DATE_LOCALE_PINNED = new InjectionToken<boolean>('WR_DATE_LOCALE_PINNED', {
  providedIn: 'root',
  factory: () => false,
});
