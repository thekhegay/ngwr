/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type EnvironmentProviders, type Type, makeEnvironmentProviders } from '@angular/core';

import { WR_DATE_LOCALE } from './tokens';
import { WrDateAdapter } from './wr-date-adapter';
import { WrNativeDateAdapter } from './wr-native-date-adapter';

/**
 * Options for {@link provideWrDateAdapter}.
 */
export type WrDateAdapterOptions = {
  /**
   * Adapter class. Default: {@link WrNativeDateAdapter}.
   *
   * Pass a custom subclass to swap implementations (`WrDateFnsAdapter`,
   * `WrLuxonAdapter`, …).
   */
  readonly adapter?: Type<WrDateAdapter<unknown>>;

  /**
   * BCP 47 locale tag (`'en-US'`, `'ru-RU'`, …). Default: `navigator.language`
   * in the browser, `'en-US'` on the server.
   */
  readonly locale?: string;
};

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
