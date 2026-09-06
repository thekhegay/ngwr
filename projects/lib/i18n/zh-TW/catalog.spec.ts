/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { wrZhTw } from 'ngwr/i18n/zh-TW';
import { describe } from 'vitest';

import { expectCatalogContract } from '../catalog-contract';

/**
 * The values that are correctly identical to English.
 *
 * Three kinds, and nothing else. The pure LAYOUT templates — a `{{from}} – {{to}}`
 * range, `{{current}} / {{total}}`, `{{value}} {{unit}}`, the delta chip and its
 * `%` — carry no word to translate, and a Traditional Chinese page sets them the
 * same way. The `esc` key cap, which is what is printed on a Taiwanese keyboard.
 * And the colour picker's initialisms and single-letter channels (`HEX` `RGB`
 * `HSL`, `R` `G` `B`, `H` `S%` `L%` `A%`) plus the binary size units
 * (`B` `KB` `MB` `GB` `TB`), which a zh-TW interface shows in Latin rather than
 * as 位元組.
 *
 * `common.ok` is deliberately NOT here: a Taiwanese dialog's affirmative button
 * says 確定, distinct from the 確認 of `common.confirm`.
 */
const SHARED_WITH_ENGLISH = new Set([
  'pagination.compact',
  'eventCalendar.range',
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

describe('wrZhTw', () => {
  expectCatalogContract('zh-TW', wrZhTw, { script: ['Han'], sharedWithEnglish: SHARED_WITH_ENGLISH });
});
