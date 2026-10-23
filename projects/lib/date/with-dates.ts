/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { Provider } from '@angular/core';

import { type WrFeature, wrFeature } from 'ngwr/utils';

import { WR_DATE_LOCALE } from './tokens';
import type { WrDatesOptions } from './types';
import { WrDateAdapter, WrNativeDateAdapter } from './wr-date-adapter';

/**
 * Replace the date adapter the calendar / date picker / time picker use, or pin
 * the locale it formats in, as a feature of `provideWr()`. Optional: with no
 * call at all they run on {@link WrNativeDateAdapter} in Angular's `LOCALE_ID`.
 *
 * Omit `locale` and dates follow Angular's `LOCALE_ID`, which is what the app
 * already says it is. Pass one only to pin dates to something else — see
 * {@link WR_DATE_LOCALE}, and `WrI18n` for how the three locale inputs rank.
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
    providers.push({ provide: WR_DATE_LOCALE, useValue: options.locale });
  }

  return wrFeature('dates', providers);
}
