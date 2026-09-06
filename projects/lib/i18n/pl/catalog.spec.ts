/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { wrPl } from 'ngwr/i18n/pl';
import { describe } from 'vitest';

import { expectCatalogContract } from '../catalog-contract';

/**
 * The values that are correctly identical to English, and why each one is.
 *
 * Polish is written in the Latin script, so the contract cannot ask "is this
 * Cyrillic yet" the way it can of `wrRu` — it asks the weaker "does this differ
 * from English", and every deliberate match has to be named here rather than
 * allowed to accumulate. Four reasons cover the list.
 *
 * **Templates that are nothing but placeholders and punctuation.** Polish
 * writes a month header, a year range, a date range and a weekday-then-date
 * label in the same order English does, so translating them would mean changing
 * them for no reason; the same goes for the two ratios, the size template and
 * the delta template.
 *
 * **Units and initialisms.** The binary size units are written B, KB, MB, GB
 * and TB in Polish interfaces (Windows and macOS both), and the three colour
 * formats are the model names rather than words.
 *
 * **Single letters and bare symbols.** A Polish colour picker labels its
 * channels R G B and H S L too, and `A` for alpha; the trailing `%` rides along
 * with the letter, so those move together or not at all. `%` alone is the
 * statistic's default unit. `OK` is `OK`.
 *
 * **Key caps and words Polish spells the same.** Polish keyboards label the key
 * `Esc`, and `link` is the word Polish interfaces — and Polish screen readers —
 * use for a hyperlink, so the native `odnośnik` would be the odd one out in the
 * one string that is read aloud beside the browser's own announcement.
 *
 * `datePicker.am` / `pm` are the judgement call. Polish runs on a 24-hour
 * clock, but where a 12-hour field is shown CLDR gives `AM` / `PM` for `pl`
 * verbatim — there is no Polish pair to reach for, and inventing one (`przed
 * południem` / `po południu`) would not fit the meridiem column and would not
 * match what the rest of the system says.
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
  'marquee.link',
  'datePicker.am',
  'datePicker.pm',
  'statistic.delta',
  'statistic.deltaSuffix',
]);

describe('wrPl', () => {
  expectCatalogContract('pl', wrPl, { sharedWithEnglish: SHARED_WITH_ENGLISH });
});
