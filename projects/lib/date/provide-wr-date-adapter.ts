/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import type { WrDateAdapterOptions } from './interfaces';
import { WR_DATE_LOCALE } from './tokens';
import { WrDateAdapter } from './wr-date-adapter';
import { WrNativeDateAdapter } from './wr-native-date-adapter';

/**
 * Register the date adapter and locale used by the calendar / date picker /
 * time picker. Call once at bootstrap.
 *
 * @example
 * ```ts
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     provideWrDateAdapter(),                 // native, browser locale
 *     // provideWrDateAdapter({ locale: 'ru-RU' }),
 *     // provideWrDateAdapter({ adapter: MyDateFnsAdapter, locale: 'fr' }),
 *   ],
 * });
 * ```
 */
export function provideWrDateAdapter(options: WrDateAdapterOptions = {}): EnvironmentProviders {
  const providers: Parameters<typeof makeEnvironmentProviders>[0] = [
    { provide: WrDateAdapter, useClass: options.adapter ?? WrNativeDateAdapter },
  ];

  if (options.locale) {
    providers.push({ provide: WR_DATE_LOCALE, useValue: options.locale });
  }

  return makeEnvironmentProviders(providers);
}

export type { WrDateAdapterOptions } from './interfaces';
