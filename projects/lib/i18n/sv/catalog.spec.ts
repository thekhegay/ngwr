/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { wrSv } from 'ngwr/i18n/sv';
import { describe } from 'vitest';

import { expectCatalogContract } from '../catalog-contract';

/**
 * The values that are correctly identical to English, and why each one is.
 *
 * Swedish is Latin-script, so the contract falls back to "differs from English"
 * and every entry below is a claim that has to stand on its own rather than a
 * place to park an untranslated string:
 *
 * - **Not language at all.** `OK`, the `esc` key cap (that is what the key is
 *   labelled on a Swedish keyboard), and the colour picker's initialisms and
 *   channel letters — Swedish reads "röd, grön, blå" and "nyans, mättnad,
 *   ljushet" but a Swedish colour picker still writes R G B and H S L.
 * - **The binary size units**, minus one: Swedish writes `kB` with a lowercase
 *   prefix, so `unitKb` is translated and is deliberately NOT here, while
 *   `B` `MB` `GB` `TB` are the same symbols.
 * - **Words Swedish spells the same.** `Avatar`, and `Popover`, which has no
 *   settled Swedish name — the panel is deliberately generic and meant to be
 *   overridden per instance with `[ariaLabel]`.
 * - **Pure templates**, made of placeholders and punctuation with no words in
 *   them. They are listed rather than skipped because the order in them is a
 *   real choice: Swedish puts the month before the year and the weekday before
 *   the date, so the English order survives translation instead of escaping it.
 */
const SHARED_WITH_ENGLISH = new Set([
  // Spelled the same in a Swedish UI.
  'common.ok',
  'commandPalette.escHint',
  'avatar.alt',
  'popover.label',
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
  // Binary size units. unitKb is kB in Swedish and is absent on purpose.
  'fileUpload.unitByte',
  'fileUpload.unitMb',
  'fileUpload.unitGb',
  'fileUpload.unitTb',
  // Placeholders and punctuation, in an order Swedish keeps.
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

describe('wrSv', () => {
  expectCatalogContract('sv', wrSv, { sharedWithEnglish: SHARED_WITH_ENGLISH });
});
