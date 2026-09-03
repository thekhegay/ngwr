/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import type { Locale } from 'date-fns';
import { provideWrDateAdapter } from 'ngwr/date';

import { WR_DATE_FNS_LOCALE } from './tokens';
import { WrDateFnsAdapter } from './wr-date-fns-adapter';

/**
 * Register the {@link WrDateFnsAdapter} so date-pickers / calendars in this
 * app use `date-fns` for all math and formatting.
 *
 * Two locale settings, because date-fns needs a `Locale` OBJECT where the rest of the
 * library needs a BCP 47 TAG:
 *
 * - `dateFnsLocale` — the imported object. It reaches `format` and `parse`, which is
 *   where the field's own text comes from, and it also decides the first day of the
 *   week. Leave it out and date-fns stays on its module default, so an existing
 *   `setDefaultOptions({ locale })` keeps working.
 * - `locale` — the tag {@link WR_DATE_LOCALE} carries, read through `Intl` for the month
 *   and weekday NAMES. Omit it and the object's own `code` supplies it, so one import is
 *   enough for a fully localized picker.
 *
 * Passing only `locale` localizes the calendar headings and not the field, which is the
 * shape of a real defect rather than a preference — the adapter warns about it once in
 * dev mode.
 *
 * @example
 * ```ts
 * import { ru } from 'date-fns/locale/ru';
 *
 * bootstrapApplication(AppComponent, {
 *   providers: [provideWrDateFnsAdapter({ dateFnsLocale: ru })],
 * });
 * ```
 */
export function provideWrDateFnsAdapter(
  options: { readonly locale?: string; readonly dateFnsLocale?: Locale } = {}
): EnvironmentProviders {
  // A date-fns `Locale` carries its own tag (`ru`, `en-GB`), so one setting is enough
  // and the two can never silently disagree about which language this picker is in.
  const tag = options.locale ?? options.dateFnsLocale?.code;

  return makeEnvironmentProviders([
    provideWrDateAdapter({ adapter: WrDateFnsAdapter, locale: tag }),
    ...(options.dateFnsLocale ? [{ provide: WR_DATE_FNS_LOCALE, useValue: options.dateFnsLocale }] : []),
  ]);
}
