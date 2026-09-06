/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { wrHi } from 'ngwr/i18n/hi';
import { describe } from 'vitest';

import { expectCatalogContract } from '../catalog-contract';

/**
 * Every value that is still byte-identical to English, and why each one is.
 *
 * - **Pure templates.** Nothing but placeholders and punctuation: the two
 *   compact ratios, the calendar and event-calendar headers and ranges, the
 *   chip / slot / day labels, and the file-size join. Hindi writes the month
 *   before the year, the weekday before the date, and a space between a number
 *   and its unit, so the English order already is the Hindi one.
 *   `statistic.delta` belongs here too — Hindi sets no space before `%`.
 * - **Not language at all.** The `esc` key cap, the three colour-format
 *   initialisms and the single-letter channels (`R` `G` `B`, `H` `S` `L`), which
 *   a Hindi colour picker labels with exactly those letters, and the bare `%`
 *   suffix.
 *
 * `common.ok` is deliberately NOT here, and this is the one entry that came off
 * the list rather than onto it: Android, Chrome and Gmail all label that button
 * «ठीक है» in Hindi and Windows labels it «ठीक», so a Latin `OK` would be the
 * untranslated string rather than the correct one. Same reading as `wrAr`.
 *
 * Neither are the file-size units: Hindi writes them in Devanagari (बाइट, केबी,
 * एमबी, जीबी, टीबी), the way `wrRu` and `wrHe` do, rather than keeping the Latin
 * abbreviations `wrJa` and `wrZh` correctly leave alone.
 */
const SHARED_WITH_ENGLISH = new Set([
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

describe('wrHi', () => {
  expectCatalogContract('hi', wrHi, { script: ['Devanagari'], sharedWithEnglish: SHARED_WITH_ENGLISH });
});
