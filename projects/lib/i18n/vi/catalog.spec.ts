/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { wrVi } from 'ngwr/i18n/vi';
import { describe } from 'vitest';

import { expectCatalogContract } from '../catalog-contract';

/**
 * The values that are correctly identical to English, and why each one is.
 *
 * Vietnamese is Latin-script, so the contract cannot check it by script and
 * instead asks every value to differ from English — which puts four kinds of
 * non-prose in this list.
 *
 * - Templates that are punctuation and placeholders only, where there is
 *   nothing to translate: the two `x / y` ratios, the size and delta
 *   templates, the two date ranges and the calendar's accessible names.
 *   Vietnamese reads a day as "Thứ Hai, 3 tháng 3, 2026", so
 *   `{{weekday}}, {{date}}` is already its order. The two month headers are
 *   NOT here, and that is the whole reason they are templates: Vietnamese
 *   writes "tháng 3 năm 2026", so both carry a word between the placeholders.
 * - Initialisms a Vietnamese interface keeps in Latin: `OK`, `HEX`, `RGB`,
 *   `HSL` and the binary size units. `B`, `KB`, `MB`, `GB`, `TB` are what a
 *   Vietnamese file manager prints — "byte" is a loanword with no local
 *   abbreviation.
 * - The colour channel caps. `R` `G` `B` and `H` `S` `L` name the picker's
 *   inputs positionally, not in words: Đỏ / Lục / Lam would collide on the
 *   HSL strip and match no other colour tool a Vietnamese designer uses.
 * - The `esc` key cap, which is what is printed on the keyboard itself.
 *
 * Nothing outside those four is shared: `AM` / `PM` are NOT here, because
 * Vietnamese has its own day-period abbreviations (SA / CH, per CLDR) and a
 * clock that says AM in a Vietnamese app is untranslated rather than idiomatic.
 */
const SHARED_WITH_ENGLISH = new Set([
  'common.ok',
  'pagination.compact',
  'eventCalendar.range',
  'eventCalendar.chipLabel',
  'eventCalendar.slotLabel',
  'eventCalendar.allDayCellLabel',
  'transfer.count',
  'commandPalette.escHint',
  'fileUpload.size',
  'fileUpload.unitByte',
  'fileUpload.unitKb',
  'fileUpload.unitMb',
  'fileUpload.unitGb',
  'fileUpload.unitTb',
  'calendar.yearRange',
  'calendar.dayLabel',
  'colorPicker.formatHex',
  'colorPicker.formatRgb',
  'colorPicker.formatHsl',
  'colorPicker.channelHex',
  'colorPicker.channelRed',
  'colorPicker.channelGreen',
  'colorPicker.channelBlue',
  'colorPicker.channelHue',
  'colorPicker.channelSaturation',
  'colorPicker.channelLightness',
  'colorPicker.channelAlpha',
  'statistic.delta',
  'statistic.deltaSuffix',
]);

describe('wrVi', () => {
  expectCatalogContract('vi', wrVi, { sharedWithEnglish: SHARED_WITH_ENGLISH });
});
