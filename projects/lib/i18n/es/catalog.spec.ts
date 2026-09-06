/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { wrEs } from 'ngwr/i18n/es';
import { describe } from 'vitest';

import { expectCatalogContract } from '../catalog-contract';

/**
 * The values that are correctly identical to English, and why each one is.
 *
 * Spanish is Latin-script, so the contract holds every other value to "differs
 * from English" and each entry here has to earn its place. Four kinds: format
 * templates whose only non-placeholder content is punctuation Spanish writes the
 * same way (`{{current}} / {{total}}`, the en dash between two years, the em
 * dash before a date, `%` after a number); initialisms and unit symbols Spanish
 * keeps as they are (`HEX` `RGB` `HSL`, `B` `KB` `MB` `GB` `TB`); the
 * single-letter colour channels, which are the initials of `RGB` and `HSL`
 * rather than of the Spanish words behind them; and three plain words — `OK`,
 * the `esc` key cap a Spanish keyboard also carries, and `Avatar`, which is the
 * Spanish word too.
 */
const SHARED_WITH_ENGLISH = new Set([
  'common.ok',
  'pagination.compact',
  'eventCalendar.range',
  'eventCalendar.chipLabel',
  'eventCalendar.slotLabel',
  'eventCalendar.allDayCellLabel',
  'transfer.count',
  'commandPalette.escHint',
  'fileUpload.size',
  'fileUpload.unitByte',
  'fileUpload.unitKb',
  'fileUpload.unitMb',
  'fileUpload.unitGb',
  'fileUpload.unitTb',
  'avatar.alt',
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

describe('wrEs', () => {
  expectCatalogContract('es', wrEs, { sharedWithEnglish: SHARED_WITH_ENGLISH });
});
