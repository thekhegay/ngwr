/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { wrDe } from 'ngwr/i18n/de';
import { describe } from 'vitest';

import { expectCatalogContract } from '../catalog-contract';

/**
 * The values that are correctly identical to English, and why each one is.
 *
 * German is Latin-script, so the contract falls back to "differs from English"
 * and every one of these has to be justified rather than allowed to accumulate:
 *
 * - **Pure templates.** Nothing but placeholders and punctuation — the ranges,
 *   the two calendar headers, the day and chip labels, the file-size template.
 *   German puts month before year and the weekday before the date, so the
 *   English order already is the German one. `statistic.delta` is NOT one of
 *   them: German sets a space between a number and its unit („+12,4 %“), which
 *   is exactly the join that template exists to let a locale own.
 * - **Words German spells the same.** `optional` (an adjective, so lowercase in
 *   German too), `Avatar`, `Popover`, the `esc` key cap, and the four months
 *   April, August, September and November.
 * - **Not language at all.** `OK`, the binary size units (German writes B, KB,
 *   MB, GB, TB), the colour-picker initialisms and single-letter channels, the
 *   bare `%` suffix, and `AM` / `PM`, which is what CLDR gives for German too.
 */
const SHARED_WITH_ENGLISH = new Set([
  'common.ok',
  'pagination.compact',
  'eventCalendar.header',
  'eventCalendar.range',
  'eventCalendar.chipLabel',
  'eventCalendar.slotLabel',
  'eventCalendar.allDayCellLabel',
  'stepper.optional',
  'transfer.count',
  'form.optional',
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
  'popover.label',
  'datePicker.am',
  'datePicker.pm',
  'statistic.deltaSuffix',
  'date.months.apr',
  'date.months.aug',
  'date.months.sep',
  'date.months.nov',
]);

describe('wrDe', () => {
  expectCatalogContract('de', wrDe, { sharedWithEnglish: SHARED_WITH_ENGLISH });
});
