/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { isPlatformBrowser } from '@angular/common';
import { InjectionToken, PLATFORM_ID, inject } from '@angular/core';

/**
 * BCP 47 locale tag the {@link WrDateAdapter} implementations read. Defaults to
 * `navigator.language` in the browser and `'en-US'` on the server; override via
 * {@link provideWrDateAdapter}'s `locale` option.
 *
 * **How far it reaches depends on the adapter, and the difference matters.**
 * The luxon adapter threads it through everything — every `DateTime` is
 * constructed with it, and `format` / `parse` call `setLocale`. The date-fns
 * adapter reads it only for locale-DERIVED defaults (first day of week); its
 * `format` and `parse` pass no locale to date-fns, so they stay on that
 * library's module default. Setting this token and expecting French month names
 * out of `WrDateFnsAdapter` gets English ones, and the parse side of that
 * mismatch is silent rather than loud — see the adapter's own class docs for the
 * lever (`setDefaultOptions`).
 */
export const WR_DATE_LOCALE = new InjectionToken<string>('WR_DATE_LOCALE', {
  providedIn: 'root',
  factory: () => {
    // Node 21+ also defines `navigator`, and reports the *build machine's*
    // locale — so a `typeof` probe silently bakes that locale into
    // prerendered output (wrong month names, wrong first day of week).
    // Ask the platform instead.
    if (isPlatformBrowser(inject(PLATFORM_ID)) && navigator.language) {
      return navigator.language;
    }
    return 'en-US';
  },
});
