/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { wrRu } from 'ngwr/i18n/ru';
import { describe } from 'vitest';

import { expectCatalogContract } from '../catalog-contract';

/**
 * The values that are correctly identical to English: initialisms and key caps
 * Russian spells the same way, single-letter colour channels (`R` `G` `B`, `H`
 * `S` `L` — the same letters in a Russian colour picker), and a bare numeric
 * ratio with no words in it.
 */
const SHARED_WITH_ENGLISH = new Set([
  'common.ok',
  'transfer.count',
  'commandPalette.escHint',
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

describe('wrRu', () => {
  expectCatalogContract('ru', wrRu, { script: ['Cyrillic'], sharedWithEnglish: SHARED_WITH_ENGLISH });
});
