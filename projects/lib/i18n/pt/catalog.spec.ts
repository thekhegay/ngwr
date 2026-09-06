/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { wrPt } from 'ngwr/i18n/pt';
import { describe } from 'vitest';

import { expectCatalogContract } from '../catalog-contract';

/**
 * The values that are correctly identical to English, and why each one is.
 *
 * Portuguese is Latin-script, so the contract holds every other value to
 * "differs from English" and each entry here has to earn its place. Four kinds:
 * format templates whose only non-placeholder content is punctuation Portuguese
 * writes the same way (`{{current}} / {{total}}`, the en dash between two years,
 * the em dash before a date, the comma after a weekday, `%` after a number);
 * initialisms and unit symbols Portuguese keeps as they are (`HEX` `RGB` `HSL`,
 * `B` `KB` `MB` `GB` `TB`, `AM` / `PM`); the single-letter colour channels, which
 * are the initials of `RGB` and `HSL` rather than of the Portuguese words behind
 * them — `matiz` would give `M`, and no colour picker anywhere labels the hue
 * field that way; and four plain words Portuguese spells identically — `OK`, the
 * `esc` key cap a Portuguese keyboard also carries, `Avatar`, and `slide`, which
 * is what both variants call a carousel item (`diapositivo` belongs to a
 * presentation deck, not to a banner that rotates).
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
  'carousel.slideRoledescription',
  'datePicker.am',
  'datePicker.pm',
  'statistic.delta',
  'statistic.deltaSuffix',
]);

describe('wrPt', () => {
  expectCatalogContract('pt', wrPt, { sharedWithEnglish: SHARED_WITH_ENGLISH });
});
