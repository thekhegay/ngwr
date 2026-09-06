/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { wrHe } from 'ngwr/i18n/he';
import { describe } from 'vitest';

import { expectCatalogContract } from '../catalog-contract';

/**
 * Every value that is still byte-identical to English, and why each one is
 * correctly so. The list is exhaustive rather than minimal: the contract only
 * MAKES you name a value whose prose carries Latin letters, so the templates
 * below — whose entire content is placeholders and punctuation — would pass
 * unlisted, and an untranslated one would pass with them.
 *
 * Three kinds:
 *
 * 1. Words that are not words. The `esc` key cap, which a Hebrew keyboard also
 *    prints in Latin, and the colour picker's format initialisms and
 *    single-letter channels — `HEX` `RGB` `HSL`, `R` `G` `B`, `H` `S` `L` `A` —
 *    which a Hebrew colour picker spells exactly the same way. `%` likewise.
 * 2. The binary size units. CLDR he gives `kB` / `MB` / `GB` / `TB` for these
 *    and Hebrew Windows, macOS and Android all print them in Latin, so `KB` is
 *    the translated form and `ק״ב` would be the over-localised one. `unitByte`
 *    is NOT here: CLDR he writes that one `בייט`, and so does the catalog.
 * 3. Templates that are placeholders and punctuation only — the ratios, the
 *    composed number, and the ones whose only Hebrew decision was the ORDER of
 *    their parts, where the English order was already right: a month before its
 *    year, a start before its end, a weekday before its date. Hebrew reads right
 *    to left, but the LOGICAL order stays as it is — the browser's bidi pass
 *    does the rest, and reversing the operands here would render them backwards.
 *    `chipLabel` and `dayLabel` stay listed because Hebrew punctuates with the
 *    same comma English does, unlike Arabic.
 *
 * `common.ok` is deliberately NOT here: Hebrew Windows, macOS, iOS and Android
 * all label that button «אישור», so leaving it as `OK` would be the
 * untranslated string rather than the correct one. `validation.iban` and
 * `qr.label` look English at a glance and are not here either — each carries an
 * initialism Hebrew keeps in Latin, and the prose around it IS translated.
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
  // 2 — the binary size units Hebrew writes in Latin.
  'fileUpload.unitKb',
  'fileUpload.unitMb',
  'fileUpload.unitGb',
  'fileUpload.unitTb',
  // 3 — ratios, composed numbers and order-only templates, with no prose at all.
  'pagination.compact',
  'transfer.count',
  'statistic.delta',
  'fileUpload.size',
  'calendar.header',
  'calendar.yearRange',
  'calendar.dayLabel',
  'eventCalendar.header',
  'eventCalendar.range',
  'eventCalendar.chipLabel',
  'eventCalendar.slotLabel',
  'eventCalendar.allDayCellLabel',
]);

describe('wrHe', () => {
  expectCatalogContract('he', wrHe, { script: ['Hebrew'], sharedWithEnglish: SHARED_WITH_ENGLISH });
});
