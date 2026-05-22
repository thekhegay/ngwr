/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

/**
 * BCP 47 locale tag used by {@link WrDateAdapter} implementations for
 * formatting, parsing, and locale-derived defaults (first day of week,
 * month / day names). Defaults to `navigator.language` in the browser and
 * `'en-US'` on the server.
 *
 * Override via {@link provideWrDateAdapter}'s `locale` option.
 */
export const WR_DATE_LOCALE = new InjectionToken<string>('WR_DATE_LOCALE', {
  providedIn: 'root',
  factory: () => {
    if (typeof navigator !== 'undefined' && navigator.language) {
      return navigator.language;
    }
    return 'en-US';
  },
});
