/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { wrJa } from 'ngwr/i18n/ja';
import { describe } from 'vitest';

import { expectCatalogContract } from '../catalog-contract';

/**
 * The values that are correctly identical to English: `OK` and the `esc` key
 * cap, which a Japanese keyboard and a Japanese dialog both spell that way; the
 * colour initialisms and single-letter channels (`R` `G` `B`, `H` `S` `L`,
 * `HEX`), which a Japanese colour picker shows unchanged; the binary size units
 * (`B` `KB` `MB` `GB` `TB`), which Japanese writes in Latin rather than
 * transliterating; the `%` a Japanese delta chip also spells `%`; and the four
 * templates that are punctuation around two numbers with no word between them —
 * a ratio, a size and its unit, a value and its suffix. Japanese keeps the space
 * before a unit abbreviation, so `fileUpload.size` is unchanged on purpose
 * rather than untranslated.
 */
const SHARED_WITH_ENGLISH = new Set([
  'common.ok',
  'pagination.compact',
  'transfer.count',
  'commandPalette.escHint',
  'fileUpload.size',
  'fileUpload.unitByte',
  'fileUpload.unitKb',
  'fileUpload.unitMb',
  'fileUpload.unitGb',
  'fileUpload.unitTb',
  'statistic.delta',
  'statistic.deltaSuffix',
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
]);

describe('wrJa', () => {
  expectCatalogContract('ja', wrJa, {
    script: ['Hiragana', 'Katakana', 'Han'],
    sharedWithEnglish: SHARED_WITH_ENGLISH,
  });
});
