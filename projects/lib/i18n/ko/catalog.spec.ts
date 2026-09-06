/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { wrKo } from 'ngwr/i18n/ko';
import { describe } from 'vitest';

import { expectCatalogContract } from '../catalog-contract';

/**
 * The values that are correctly identical to English: the `esc` key cap a
 * Korean keyboard also carries in Latin, the colour-picker initialisms and
 * single-letter channels (`HEX` `RGB` `HSL`, `R` `G` `B`, `H` `S` `L` — the
 * same letters in a Korean colour picker), the binary size units Korean writes
 * unlocalised (`KB`, `MB`, …; `바이트` exists as a word but no Korean file
 * manager abbreviates it), and the templates that are placeholders and
 * punctuation with no words between them to translate — the two ratios, the two
 * en-dashed ranges, the size pair and the event chip's comma, all of which
 * Korean punctuates exactly as English does.
 *
 * `common.ok` is deliberately NOT here: Korean Windows, macOS and Android all
 * label that button 확인, so leaving it as `OK` would be the untranslated case
 * rather than the shared one.
 */
const SHARED_WITH_ENGLISH = new Set([
  'pagination.compact',
  'eventCalendar.range',
  'eventCalendar.chipLabel',
  'transfer.count',
  'commandPalette.escHint',
  'fileUpload.size',
  'fileUpload.unitByte',
  'fileUpload.unitKb',
  'fileUpload.unitMb',
  'fileUpload.unitGb',
  'fileUpload.unitTb',
  'calendar.yearRange',
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

describe('wrKo', () => {
  expectCatalogContract('ko', wrKo, { script: ['Hangul'], sharedWithEnglish: SHARED_WITH_ENGLISH });
});
