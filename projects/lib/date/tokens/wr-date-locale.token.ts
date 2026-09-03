/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken, LOCALE_ID, inject } from '@angular/core';

/**
 * BCP 47 locale tag the {@link WrDateAdapter} implementations read. Defaults to
 * Angular's `LOCALE_ID`; override via {@link provideWrDateAdapter}'s `locale`
 * option.
 *
 * **It used to default to `navigator.language`, and that was wrong in the
 * documented case.** The provider's own first example is the no-argument call,
 * so the path a reader copies was the broken one: an app that set
 * `LOCALE_ID: 'ru-RU'` and translated every string still rendered `March 2026`,
 * `SUN MON TUE …` and a week starting on Sunday, because the calendar was
 * asking the browser rather than the application. `navigator.language` is the
 * user's browser preference; `LOCALE_ID` is what the app says it is, and only
 * the app can be right about that. Reading the browser also made a prerendered
 * page and its hydrated self disagree — the server has no `navigator.language`
 * to match. An app that genuinely wants the browser's tag can still say so:
 * `provideWrDateAdapter({ locale: navigator.language })`.
 *
 * The token is a plain string, resolved once. It is therefore the *pinned* date
 * locale, not a live one — `WrI18n.use()` moves catalog text and cannot move
 * this. `WrI18n`'s class docs carry the full precedence and `use()` warns about
 * the gap in dev mode.
 *
 * **How far it reaches depends on the adapter, and the difference matters.**
 * The native and luxon adapters thread it through everything. The date-fns
 * adapter cannot: date-fns resolves its patterns against a `Locale` OBJECT, not
 * a tag, so this token drives only the parts that go through `Intl` (the month
 * and weekday names) and the OBJECT drives `format` / `parse`. Pass it as
 * `provideWrDateFnsAdapter({ dateFnsLocale: ru })` — with only a tag the calendar
 * headings localize and the field does not, which the adapter warns about once
 * in dev mode.
 */
export const WR_DATE_LOCALE = new InjectionToken<string>('WR_DATE_LOCALE', {
  providedIn: 'root',
  factory: () => inject(LOCALE_ID),
});
