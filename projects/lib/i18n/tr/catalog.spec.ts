/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { wrTr } from 'ngwr/i18n/tr';
import { describe } from 'vitest';

import { expectCatalogContract } from '../catalog-contract';

/**
 * The values that are correctly identical to English, and why each one is.
 *
 * Turkish is written in the Latin script, so the contract cannot check it by
 * script and holds every value to "differs from English" instead — which makes
 * this list the place each sameness has to be argued rather than tolerated.
 *
 * - Pure templates with no words in them: a ratio, a delta, a size, a date
 *   header. Every word inside them arrives from `Intl` already localised, and
 *   the punctuation between them (`/`, the en dash, the em dash, the comma) is
 *   punctuation in Turkish too — `1 / 5` and `Mart 2026` are what a Turkish UI
 *   writes.
 * - `statistic.deltaSuffix` is the percent SIGN, not the word: Turkish writes
 *   the sign before a number (`%12`), but this key is appended to a value the
 *   component has already formatted, so the character itself is all it holds.
 * - Binary size units. TDK writes the unit as `bayt`, and every Turkish file
 *   manager still abbreviates B / KB / MB / GB / TB.
 * - `colorPicker` format names and channel letters. HEX / RGB / HSL are
 *   initialisms Turkish keeps, and a Turkish colour picker labels its channels
 *   R / G / B / H / S / L for the same reason — they index the model, not the
 *   Turkish words (kırmızı, yeşil, mavi, ton, doygunluk, parlaklık).
 * - `commandPalette.escHint` is a key cap: Turkish keyboards print `esc`.
 * - `avatar.alt` — `avatar` is the word Turkish uses, borrowed and current.
 */
const SHARED_WITH_ENGLISH = new Set([
  'pagination.compact',
  'transfer.count',
  'eventCalendar.header',
  'eventCalendar.range',
  'eventCalendar.chipLabel',
  'eventCalendar.slotLabel',
  'eventCalendar.allDayCellLabel',
  'commandPalette.escHint',
  'fileUpload.size',
  'fileUpload.unitByte',
  'fileUpload.unitKb',
  'fileUpload.unitMb',
  'fileUpload.unitGb',
  'fileUpload.unitTb',
  'avatar.alt',
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

describe('wrTr', () => {
  expectCatalogContract('tr', wrTr, { sharedWithEnglish: SHARED_WITH_ENGLISH });
});
