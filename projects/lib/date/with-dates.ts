/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Injector, type Provider, inject, runInInjectionContext } from '@angular/core';

import { type WrFeature, wrFeature } from 'ngwr/utils';

import { WR_DATE_INPUT, WR_DATE_LOCALE, WR_DATE_STAMP_DEFAULTS, WR_DATE_TIME_ZONE } from './tokens';
import { WR_DATE_LOCALE_PINNED } from './tokens/wr-date-locale-pinned.token';
import type { WrDatesOptions } from './types';
import { WrDateAdapter, WrNativeDateAdapter } from './wr-date-adapter';

/**
 * Replace the date adapter the calendar / date picker / time picker use, pin
 * the locale it formats in, set the time zone dates are shown in, say how a
 * backend's numbers and zoneless strings are read (`epochUnit`, `zonelessIn`),
 * or set the defaults of `wr-date-stamp`, as a feature of `provideWr()`. Optional: with no call at all they run on
 * {@link WrNativeDateAdapter} in Angular's `LOCALE_ID` and the browser's zone.
 *
 * Omit `locale` and dates follow the interface language of `provideWrI18n()`,
 * `WrI18n.use()` included, and Angular's `LOCALE_ID` in an app without it.
 * Pass one only to pin dates to something else, see {@link wrDateLocale}.
 *
 * The one feature that works in a route's `providers` as well: that subtree
 * gets an adapter of its own.
 *
 * @example
 * ```ts
 * import { provideWr } from 'ngwr';
 * import { withDates } from 'ngwr/date';
 *
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     provideWr(withDates({ locale: 'ru-RU' })),                       // pin the dates
 *     // provideWr(withDates({ adapter: MyDateAdapter, locale: 'fr' })), // your own subclass
 *     // provideWr(withDates({ timeZone: () => inject(AppConfig).timeZone() })), // a runtime config
 *   ],
 * });
 * ```
 */
export function withDates(options: WrDatesOptions = {}): WrFeature<'dates'> {
  // The native class is registered here even when only `locale` is passed: the
  // root default lives in the root injector and reads the root's locale, so a
  // call in a route's providers has to build an adapter of its own.
  const providers: Provider[] = [{ provide: WrDateAdapter, useClass: options.adapter ?? WrNativeDateAdapter }];

  if (options.locale) {
    providers.push(
      { provide: WR_DATE_LOCALE, useValue: options.locale },
      { provide: WR_DATE_LOCALE_PINNED, useValue: true }
    );
  }

  const { timeZone } = options;
  if (timeZone) {
    providers.push({
      provide: WR_DATE_TIME_ZONE,
      useFactory: (): (() => string | null | undefined) => {
        if (typeof timeZone !== 'function') return () => timeZone;
        const injector = inject(Injector);
        return () => runInInjectionContext(injector, timeZone);
      },
    });
  }

  // Each of the two merges over what an injector above set, so a route's call
  // that names one key keeps the app's other ones.
  const { epochUnit, zonelessIn, stamp } = options;
  if (epochUnit || zonelessIn) {
    providers.push({
      provide: WR_DATE_INPUT,
      useFactory: () => {
        const above = inject(WR_DATE_INPUT, { skipSelf: true, optional: true });
        return {
          epochUnit: epochUnit ?? above?.epochUnit ?? 'ms',
          zonelessIn: zonelessIn ?? above?.zonelessIn ?? 'browser',
        };
      },
    });
  }
  if (stamp) {
    providers.push({
      provide: WR_DATE_STAMP_DEFAULTS,
      useFactory: () => ({ ...inject(WR_DATE_STAMP_DEFAULTS, { skipSelf: true, optional: true }), ...stamp }),
    });
  }

  return wrFeature('dates', providers);
}
