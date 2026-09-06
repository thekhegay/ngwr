/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { wrAr } from 'ngwr/i18n/ar';
import { describe } from 'vitest';

import { expectCatalogContract } from '../catalog-contract';

/**
 * Every value that is still byte-identical to English, and why each one is
 * correctly so. The list is exhaustive rather than minimal: the contract only
 * MAKES you name a value whose prose carries Latin letters, so the templates
 * below — whose entire content is placeholders and punctuation — would pass
 * unlisted, and an untranslated one would pass with them. Naming all of them
 * means a translation landing for any is a red test rather than a silent
 * duplicate.
 *
 * Three kinds:
 *
 * 1. Words that are not words. The `esc` key cap, which an Arabic keyboard also
 *    prints in Latin, and the colour picker's format initialisms and
 *    single-letter channels — `HEX` `RGB` `HSL`, `R` `G` `B`, `H` `S` `L` `A` —
 *    which an Arabic colour picker spells exactly the same way. `%` likewise.
 * 2. Bare ratios and composed numbers: `{{a}} / {{b}}`, `{{value}}{{suffix}}`,
 *    `{{value}} {{unit}}`. No words to translate, and the digits inside them go
 *    through `Intl` against `LOCALE_ID`, not through this catalog.
 * 3. Templates whose only Arabic decision was the ORDER of their parts, and the
 *    English order was already right: a month before its year, a start before
 *    its end, a time before its date. Arabic reads right to left, but the
 *    LOGICAL order stays as it is — the browser's bidi pass does the rest, and
 *    reversing the operands here would render them backwards.
 *
 * `common.ok` is deliberately NOT here: Arabic Windows, macOS, iOS and Android
 * all label that button «موافق», so leaving it as `OK` would be the untranslated
 * string rather than the correct one.
 */
const SHARED_WITH_ENGLISH = new Set([
  // 1 — key caps, initialisms, single letters, a percent sign.
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
  'statistic.deltaSuffix',
  // 2 — ratios and composed numbers, with no prose in them at all.
  'pagination.compact',
  'transfer.count',
  'statistic.delta',
  'fileUpload.size',
  // 3 — order-only templates whose English order is also the Arabic one.
  'calendar.header',
  'calendar.yearRange',
  'eventCalendar.header',
  'eventCalendar.range',
  'eventCalendar.slotLabel',
  'eventCalendar.allDayCellLabel',
]);

describe('wrAr', () => {
  expectCatalogContract('ar', wrAr, { script: ['Arabic'], sharedWithEnglish: SHARED_WITH_ENGLISH });
});
