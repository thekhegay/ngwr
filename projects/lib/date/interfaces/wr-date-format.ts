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
 * `format()` / `parse()` also accept raw format strings — see the adapter's
 * implementation for the supported tokens (`yyyy`, `MM`, `dd`, `HH`, …).
 */
export type WrDateFormat = 'shortDate' | 'mediumDate' | 'longDate' | 'time' | 'shortDateTime' | 'mediumDateTime';
