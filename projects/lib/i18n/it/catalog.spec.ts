/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { wrIt } from 'ngwr/i18n/it';
import { describe } from 'vitest';

import { expectCatalogContract } from '../catalog-contract';

/**
 * The values that are correctly identical to English, and why each one is.
 *
 * Italian is Latin-script, so the contract cannot check it by script and asks
 * instead that every value differ from English — which makes this list the
 * whole argument for the ones that do not.
 *
 * - `common.ok` — the button is `OK` in Italian too; `Va bene` is prose.
 * - Templates whose only Italian content is punctuation: the pagination and
 *   transfer ratios, the four `eventCalendar` / `calendar` composites, the
 *   file-size template, and the statistic delta with its `%` unit. Italian puts
 *   month before year and weekday before date exactly as English does, so there
 *   is nothing here to reorder.
 * - `commandPalette.escHint` — the key cap. Italian keyboards print `esc`.
 * - Binary size units — `B`, `KB`, `MB`, `GB`, `TB` are what Italian systems
 *   show; `byte` is a loanword and the abbreviations are not translated.
 * - `avatar.alt` — `avatar` is the Italian word for it, loaned and in the
 *   dictionaries; there is no native alternative a reader would expect here.
 * - The colour picker's formats and channel letters — `HEX` / `RGB` / `HSL` are
 *   initialisms of the notation itself, and `R` `G` `B` / `H` `S` `L` are that
 *   notation's letters, unchanged in an Italian colour picker even though the
 *   words behind them are rosso, verde, blu.
 * - `lineChart.thousands` — `k` is the Latin-script convention Italian charts
 *   use. `mila` is the word, but it cannot be suffixed to a formatted number:
 *   1000 would read `1mila`, and Italian says `mille`.
 * - `datePicker.am` / `.pm` — Italy is a 24-hour-clock country, so there is no
 *   Italian meridiem abbreviation to spell; where the component shows the
 *   column at all, `AM` / `PM` is what it shows.
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
  'lineChart.thousands',
  'datePicker.am',
  'datePicker.pm',
  'statistic.delta',
  'statistic.deltaSuffix',
]);

describe('wrIt', () => {
  expectCatalogContract('it', wrIt, { sharedWithEnglish: SHARED_WITH_ENGLISH });
});
