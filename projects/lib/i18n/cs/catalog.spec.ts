/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { wrCs } from 'ngwr/i18n/cs';
import { describe } from 'vitest';

import { expectCatalogContract } from '../catalog-contract';

/**
 * The values that are correctly identical to English, and why each one is.
 *
 * Czech is written in the Latin script, so the contract cannot ask "is this
 * Cyrillic yet" the way it can of `wrRu` — it asks the weaker question, "does
 * this differ from English", and every deliberate match has to be named here.
 * Four reasons cover the whole list. **Templates that are nothing but
 * placeholders and punctuation**: Czech writes a month header and a date range
 * in the same order English does, so translating them would mean changing them
 * for no reason. **Units and initialisms**: the byte units and the three colour
 * formats are written the same way in Czech (`kB` is the one that moves — the
 * SI prefix is lowercase in Czech usage, which is why it is absent here).
 * **Single letters**: a Czech colour picker labels its channels R G B and H S L
 * too, and `A` for the alpha channel; the trailing `%` rides along with the
 * letter, so those three move together or not at all. And **a key cap**: Czech
 * keyboards label the key `Esc`.
 *
 * `avatar.alt` is the one judgement call in the list. "Avatar" is the word
 * Czech interfaces use for the thing, and the component may show initials or an
 * icon rather than a photograph, so the more descriptive "Profilový obrázek"
 * would be wrong about half the cases it is spoken over.
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

describe('wrCs', () => {
  expectCatalogContract('cs', wrCs, { sharedWithEnglish: SHARED_WITH_ENGLISH });
});
