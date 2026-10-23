/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Named format keys recognised by every {@link WrDateAdapter}. Adapters map
 * each key to their preferred locale-aware implementation (the native adapter
 * uses `Intl.DateTimeFormat`; a `date-fns` adapter would use its own tokens).
 *
 * The time keys come in variants. `time` and `shortDateTime` write the clock the
 * way the locale does; a `12h` or `24h` suffix pins the hour cycle, and a
 * `Seconds` suffix adds seconds: `time24h` is `14:30`, `time12hSeconds` is
 * `02:30:05 PM`, `shortDateTimeSeconds` is `3/15/2026, 02:30:05 PM` in en-US.
 * The date picker picks one of them from `timeFormat` and `showSeconds` when no
 * `[format]` is given. Added in v15, so an adapter written for v14 has to handle
 * them too.
 *
 * `format()` / `parse()` also accept raw format strings — see the adapter's
 * implementation for the supported tokens (`yyyy`, `MM`, `dd`, `HH`, …).
 */
export type WrDateFormat =
  | 'shortDate'
  | 'mediumDate'
  | 'longDate'
  | 'time'
  | 'time12h'
  | 'time24h'
  | 'timeSeconds'
  | 'time12hSeconds'
  | 'time24hSeconds'
  | 'shortDateTime'
  | 'shortDateTime12h'
  | 'shortDateTime24h'
  | 'shortDateTimeSeconds'
  | 'shortDateTime12hSeconds'
  | 'shortDateTime24hSeconds'
  | 'mediumDateTime';
