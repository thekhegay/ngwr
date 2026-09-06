/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { LOCALE_ID, Pipe, inject } from '@angular/core';
import type { PipeTransform } from '@angular/core';

/**
 * Binary magnitudes, as the `Intl` unit that labels each one. The COUNTING is
 * 1024-based and these names are decimal — which is the same thing the old
 * hand-written `['B', 'KB', 'MB', …]` table did, and what almost every file
 * manager does. Strictly, 1024 bytes is a kibibyte; `Intl` has no unit for it.
 */
const UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte', 'petabyte'] as const;

/**
 * Humanise a byte count using binary (1024-based) units, in the reader's locale.
 *
 * @example
 * ```html
 * {{ 1234 | wrBytes }}            <!-- en: "1.2 kB"   de: "1,2 kB"   ru: "1,2 кБ" -->
 * {{ 1234567 | wrBytes: 0 }}      <!-- en: "1 MB"     fr: "1 Mo"                  -->
 * {{ 0 | wrBytes }}               <!-- en: "0 B"      ru: "0 Б"                   -->
 * ```
 *
 * **Both halves come from `Intl`, and the unit table is not the catalog's.** The
 * number always did need `LOCALE_ID` — it went through `toFixed`, which writes a
 * full stop in every language, so a German page read `1.2 KB` beside its own
 * `1,2` everywhere else — and the three formatting pipes beside this one
 * (`wrDate`, `wrNumber`, `wrPlural`) had injected it since they shipped.
 *
 * The unit could not follow them into `ngwr/i18n`, and the reason is the pipe
 * rather than the strings: a PURE pipe is re-invoked only when its argument
 * changes, so a catalog that lands after the first render — which is every
 * `provideWrI18nHttpLoader` app — would never reach it, and the pipe would be
 * correct under the static loader and silently English under the other one.
 * `LOCALE_ID` is a constant, so `Intl` has no such failure mode, and it knows
 * every locale ICU ships rather than the twenty-two this package translates.
 *
 * One visible change in English and it is the only one: `KB` became `kB`, which
 * is what CLDR calls that unit. `B`, the space before it and every other
 * magnitude read exactly as they did — see `format` for the part of that which
 * is not free.
 *
 * The other consequence, kept here so nobody rediscovers it as a bug:
 * `<wr-file-upload>` prints its own sizes from `fileUpload.unitKb` and friends,
 * which are public catalog keys a consumer may have overridden, so it renders
 * `KB` where this pipe renders `kB`. Retiring those keys would silently break
 * every override that had been translating them, which is a major-version move.
 */
@Pipe({ name: 'wrBytes' })
export class WrBytes implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);

  transform(value: number | string | null | undefined, decimals = 1): string {
    if (value === null || value === undefined || value === '') return '';
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return this.format(0, 0, 0);

    // Floored as well as capped: for `0 < n < 1` the log is negative, so an
    // unclamped index reads `UNITS[-1]` (`undefined`) and divides by `1024 ** -1`,
    // which rendered `0.5` as "512.0 undefined".
    const i = Math.min(Math.max(0, Math.floor(Math.log(n) / Math.log(1024))), UNITS.length - 1);
    // Whole bytes never show a fractional part.
    return this.format(n / 1024 ** i, i, i === 0 ? 0 : Math.max(0, decimals));
  }

  /**
   * `Intl`'s NARROW unit, with one space put back between it and the number.
   *
   * Neither display mode is right on its own. `short` spells the smallest unit
   * as a word — "512 byte", "0 byte" in English, "0 Byte" in German — which is
   * both worse copy than the `B` this pipe has always rendered and a bigger
   * change than the fix is worth. `narrow` gives `B` / `Б` / `o` correctly and
   * then closes the gap: "1.2kB".
   *
   * So the parts are reassembled rather than the string. Going through
   * `formatToParts` is what keeps the ORDER the locale's own — Hebrew puts the
   * unit first, and hand-joining `${n} ${unit}` would silently straighten every
   * such locale into English order.
   */
  private format(value: number, unit: number, fractionDigits: number): string {
    const parts = new Intl.NumberFormat(this.locale, {
      style: 'unit',
      unit: UNITS[unit],
      unitDisplay: 'narrow',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).formatToParts(value);

    const at = parts.findIndex(part => part.type === 'unit');
    if (at === -1) return parts.map(part => part.value).join('');

    const out = parts.map(part => part.value);
    // The slot on the number's side of the unit: already a separator in some
    // locales, absent in others.
    const gap = at === 0 ? 1 : at - 1;
    if (parts[gap]?.type === 'literal') out[gap] = ' ';
    else out.splice(at === 0 ? 1 : at, 0, ' ');
    return out.join('');
  }
}
