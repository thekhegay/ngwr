/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { wrZh } from 'ngwr/i18n/zh';
import { describe } from 'vitest';

import { expectCatalogContract } from '../catalog-contract';

/**
 * The values that are correctly identical to English: the `esc` key cap a
 * Chinese keyboard also carries in Latin; the colour initialisms and
 * single-letter channels (`R` `G` `B`, `H` `S` `L`, `HEX`), which a Chinese
 * colour picker shows unchanged; the binary size units (`B` `KB` `MB` `GB`
 * `TB`), which Chinese writes in Latin rather than as 字节; and the templates
 * that are placeholders and punctuation with nothing between them to translate
 * — the two ratios, the two en-dashed ranges, the size pair, and the delta chip
 * with its `%`, which Chinese also writes tight against the number.
 * `fileUpload.size` keeps the space before the unit because Chinese typography
 * sets one between a number and a Latin abbreviation, so it is unchanged on
 * purpose rather than untranslated.
 *
 * `common.ok` is deliberately NOT here: Simplified Chinese Windows, macOS and
 * Android all label that button 确定, so leaving it as `OK` would be the
 * untranslated case rather than the shared one — and 确定 stays distinct from
 * `common.confirm` 确认, which is the pair a Chinese dialog draws on.
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

describe('wrZh', () => {
  expectCatalogContract('zh', wrZh, { script: ['Han'], sharedWithEnglish: SHARED_WITH_ENGLISH });
});
