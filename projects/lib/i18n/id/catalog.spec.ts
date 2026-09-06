/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { wrId } from 'ngwr/i18n/id';
import { describe } from 'vitest';

import { expectCatalogContract } from '../catalog-contract';

/**
 * The values that are correctly identical to English, and why each one is.
 *
 * Indonesian is Latin-script, so the contract cannot check it by script and
 * instead asks every value to differ from English — which puts five separate
 * kinds of non-prose in this list.
 *
 * - Pure punctuation and placeholders, where there is nothing to translate:
 *   the two `x / y` ratios, the size and delta templates, and the calendar
 *   headers and accessible names. Indonesian writes a date "Maret 2026", so
 *   `{{month}} {{year}}` is already the Indonesian order.
 * - Initialisms an Indonesian interface spells the same way: `OK`, `HEX`,
 *   `RGB`, `HSL`, the binary size units, and `AM` / `PM` — Indonesian keeps
 *   the Latin abbreviations on the rare clock that is not 24-hour.
 * - The colour channel letters. `R` `G` `B` and `H` `S` `L` are the picker's
 *   universal caps, not words, and Indonesian would keep the shapes while
 *   SWAPPING the meanings: Hijau puts green on `H`, where the same picker
 *   already spends `H` on hue, and Rona puts hue on `R`, which is red. A cap
 *   that means something else in the row beside it is worse than an
 *   untranslated one, and it matches no other tool either.
 * - The `esc` key cap, which is what is printed on an Indonesian keyboard.
 * - Five ordinary Indonesian words that happen to be spelled as in English:
 *   `Avatar` (KBBI), the `slide` a carousel announces, and the months April,
 *   September and November — Indonesian differs on the other nine (Mei, Juni,
 *   Juli, Agustus, Oktober, Desember, Januari, Februari, Maret).
 */
const SHARED_WITH_ENGLISH = new Set([
  'common.ok',
  'pagination.compact',
  'eventCalendar.header',
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
  'avatar.alt',
  'calendar.header',
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
  'carousel.slideRoledescription',
  'datePicker.am',
  'datePicker.pm',
  'statistic.delta',
  'statistic.deltaSuffix',
  'date.months.apr',
  'date.months.sep',
  'date.months.nov',
]);

describe('wrId', () => {
  expectCatalogContract('id', wrId, { sharedWithEnglish: SHARED_WITH_ENGLISH });
});
