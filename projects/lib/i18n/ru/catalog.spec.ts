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
 * `S` `L` — the same letters in a Russian colour picker), the scatter chart's axis
 * letters (`X` `Y`, as in «ось X»), the box plot's quartiles (`Q1` `Q3`), and a bare
 * numeric ratio with no words in it.
 *
 * The editor's modifier key caps (`Ctrl` `Shift` `Alt`) and the `kbd` key names
 * are what a Russian keyboard prints; only the space bar has a word.
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
  'editor.keyCtrl',
  'editor.keyShift',
  'editor.keyAlt',
  'kbd.ctrl',
  'kbd.shift',
  'kbd.alt',
  'kbd.enter',
  'kbd.esc',
  'kbd.tab',
  'kbd.backspace',
  'kbd.delete',
  'kbd.home',
  'kbd.end',
  'kbd.pageUp',
  'kbd.pageDown',
  'scatterChart.x',
  'scatterChart.y',
  'boxplotChart.q1',
  'boxplotChart.q3',
]);

describe('wrRu', () => {
  expectCatalogContract('ru', wrRu, { script: ['Cyrillic'], sharedWithEnglish: SHARED_WITH_ENGLISH });
});
