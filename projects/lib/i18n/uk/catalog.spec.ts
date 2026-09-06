/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { wrUk } from 'ngwr/i18n/uk';
import { describe } from 'vitest';

import { expectCatalogContract } from '../catalog-contract';

/**
 * The values that are correctly identical to English, and why each one is.
 *
 * The list has to be exhaustive rather than illustrative: the contract asserts
 * every entry here is still identical, so a stale one fails — and an entry left
 * OUT is what the Cyrillic-script check would otherwise catch, since a value
 * with no Cyrillic in it reads as untranslated. Three reasons cover all of it.
 *
 * **Templates that are nothing but placeholders and punctuation.** Ukrainian
 * writes a month header, a year range, a date range and a weekday-then-date
 * label in the same order English does («березень 2026», «понеділок, 15
 * березня»), so there is nothing in them to translate; the same goes for the
 * two bare ratios and the size template, where the space before the unit is
 * what Ukrainian typography asks for anyway. `statistic.delta` stays joined —
 * DSTU spaces a number from its `%`, but a delta chip in a Ukrainian interface
 * reads `+12,4%` and the chip has no room for the space.
 *
 * **Initialisms and single letters.** `HEX` / `RGB` / `HSL` name the notation
 * the picker emits rather than translating anything, and a Ukrainian colour
 * picker labels its channels `R` `G` `B` and `H` `S` `L` beside them — a strip
 * that said RGB and then labelled its fields Ч, З, С would contradict itself.
 * The trailing `%` rides along with the letter, so those move together or not
 * at all.
 *
 * **Not language at all.** `OK`, and the `esc` key cap, which Ukrainian
 * keyboards print exactly that way.
 *
 * The size UNITS are deliberately absent: Ukrainian writes Б, КБ, МБ, ГБ, ТБ in
 * Cyrillic, and so does this catalog.
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
  'statistic.delta',
  'statistic.deltaSuffix',
]);

describe('wrUk', () => {
  expectCatalogContract('uk', wrUk, { script: ['Cyrillic'], sharedWithEnglish: SHARED_WITH_ENGLISH });
});
