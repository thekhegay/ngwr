/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { wrNl } from 'ngwr/i18n/nl';
import { describe } from 'vitest';

import { expectCatalogContract } from '../catalog-contract';

/**
 * The values that are correctly identical to English, and why each one is.
 *
 * Dutch is written in the Latin script, so the contract cannot ask "is this
 * Cyrillic yet" and falls back to "does it differ from English" — which makes
 * every entry below a claim that has to hold on its own:
 *
 * - `OK` and the `esc` key cap are spelled exactly that way on a Dutch keyboard
 *   and in Dutch dialogs.
 * - The colour picker's format initialisms and channel letters (`HEX` `RGB`
 *   `HSL`, `R` `G` `B`, `H` `S%` `L%` `A%`) are the same letters in a Dutch
 *   colour picker — Dutch reads "rood, groen, blauw" but writes R, G, B.
 * - The binary size units `B` `KB` `MB` `GB` `TB` are the abbreviations Dutch
 *   uses unchanged; only `byte` itself has a Dutch plural, and no key spells it.
 * - `Avatar` and `Week` are genuinely the same word in Dutch, down to the
 *   spelling.
 * - `{{value}}k` — Dutch charts abbreviate thousands with the same `k`.
 * - The rest are templates made of placeholders and punctuation with no words
 *   in them. They are listed rather than skipped because the choice is real:
 *   Dutch puts the month before the year and the weekday before the date, so
 *   the English order survives translation instead of escaping it.
 */
const SHARED_WITH_ENGLISH = new Set([
  // Spelled the same in a Dutch UI.
  'common.ok',
  'commandPalette.escHint',
  'avatar.alt',
  'eventCalendar.week',
  // Colour-picker initialisms and channel letters.
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
  // Binary size units, and the axis suffix for thousands.
  'fileUpload.unitByte',
  'fileUpload.unitKb',
  'fileUpload.unitMb',
  'fileUpload.unitGb',
  'fileUpload.unitTb',
  'lineChart.thousands',
  // Placeholders and punctuation, in an order Dutch keeps.
  'fileUpload.size',
  'pagination.compact',
  'transfer.count',
  'statistic.delta',
  'statistic.deltaSuffix',
  'calendar.header',
  'calendar.yearRange',
  'calendar.dayLabel',
  'eventCalendar.header',
  'eventCalendar.range',
  'eventCalendar.chipLabel',
  'eventCalendar.slotLabel',
  'eventCalendar.allDayCellLabel',
]);

describe('wrNl', () => {
  expectCatalogContract('nl', wrNl, { sharedWithEnglish: SHARED_WITH_ENGLISH });
});
