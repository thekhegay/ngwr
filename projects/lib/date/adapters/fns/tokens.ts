/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

import type { Locale } from 'date-fns';

/**
 * The date-fns `Locale` OBJECT {@link WrDateFnsAdapter} formats and parses with.
 *
 * `WR_DATE_LOCALE` is a BCP 47 TAG, and date-fns cannot resolve a tag: its locales are
 * separate modules, so mapping `'ru-RU'` onto one would mean importing all of them and
 * defeating the tree-shaking that makes this an opt-in entry point. The consumer imports
 * the one they need and hands it over — which is what
 * {@link provideWrDateFnsAdapter}'s `dateFnsLocale` option sets.
 *
 * `null` (the default) passes nothing to date-fns, which leaves that library's own
 * module-level default in charge — so `setDefaultOptions({ locale })` keeps working for
 * apps that already use it.
 *
 * @example
 * ```ts
 * import { ru } from 'date-fns/locale/ru';
 *
 * provideWrDateFnsAdapter({ locale: 'ru-RU', dateFnsLocale: ru });
 * ```
 */
export const WR_DATE_FNS_LOCALE = new InjectionToken<Locale | null>('WR_DATE_FNS_LOCALE', {
  providedIn: 'root',
  factory: () => null,
});
