/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type Signal, computed, inject } from '@angular/core';

import { WR_LIVE_LOCALE } from 'ngwr/utils';

import { WR_DATE_LOCALE } from './tokens';
import { WR_DATE_LOCALE_PINNED } from './tokens/wr-date-locale-pinned.token';

function isLocaleTag(tag: string): boolean {
  try {
    return Intl.getCanonicalLocales(tag).length > 0;
  } catch {
    return false;
  }
}

/**
 * The locale dates are written in, as a signal. Highest first:
 *
 * 1. `withDates({ locale })`: a pin, which a language switch does not move.
 * 2. `WrI18n.locale()`, when the app calls `provideWrI18n()`: the interface
 *    language, which `WrI18n.use()` changes at runtime.
 * 3. `LOCALE_ID`.
 *
 * A catalog name that is not a BCP 47 tag (`en_US`) cannot format a date, so
 * the signal holds `LOCALE_ID` while the interface language is one.
 *
 * Must be called in an injection context. The native adapter formats in it; an
 * adapter of your own reads it to follow the same rule.
 *
 * @example
 * ```ts
 * private readonly locale = wrDateLocale();
 * protected readonly weekday = computed(() =>
 *   new Intl.DateTimeFormat(this.locale(), { weekday: 'long' }).format(this.date()),
 * );
 * ```
 */
export function wrDateLocale(): Signal<string> {
  const fixed = inject(WR_DATE_LOCALE);
  const live = inject(WR_DATE_LOCALE_PINNED) ? null : inject(WR_LIVE_LOCALE, { optional: true });
  if (!live) return computed(() => fixed);
  return computed(() => {
    const tag = live();
    return isLocaleTag(tag) ? tag : fixed;
  });
}
