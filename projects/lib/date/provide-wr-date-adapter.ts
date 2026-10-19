/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { WR_DATE_LOCALE } from './tokens';
import type { WrDateAdapterOptions } from './types';
import { WrDateAdapter, WrNativeDateAdapter } from './wr-date-adapter';

/**
 * Replace the date adapter the calendar / date picker / time picker use, or pin
 * the locale it formats in. Optional: with no call at all they run on
 * {@link WrNativeDateAdapter} in Angular's `LOCALE_ID`.
 *
 * Omit `locale` and dates follow Angular's `LOCALE_ID`, which is what the app
 * already says it is. Pass one only to pin dates to something else — see
 * {@link WR_DATE_LOCALE}, and `WrI18n` for how the three locale inputs rank.
 *
 * @example
 * ```ts
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     provideWrDateAdapter({ locale: 'ru-RU' }),                     // pin the dates
 *     // provideWrDateAdapter({ adapter: MyDateAdapter, locale: 'fr' }), // your own subclass
 *   ],
 * });
 * ```
 */
export function provideWrDateAdapter(options: WrDateAdapterOptions = {}): EnvironmentProviders {
  // The native class is registered here even when only `locale` is passed: the
  // root default lives in the root injector and reads the root's locale, so a
  // call in a route's providers has to build an adapter of its own.
  const providers: Parameters<typeof makeEnvironmentProviders>[0] = [
    { provide: WrDateAdapter, useClass: options.adapter ?? WrNativeDateAdapter },
  ];

  if (options.locale) {
    providers.push({ provide: WR_DATE_LOCALE, useValue: options.locale });
  }

  return makeEnvironmentProviders(providers);
}

export type { WrDateAdapterOptions } from './types';
