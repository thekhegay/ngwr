/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { wrFr } from 'ngwr/i18n/fr';
import { describe } from 'vitest';

import { expectCatalogContract } from '../catalog-contract';

/**
 * The values that are correctly identical to English, and why each one is.
 *
 * French is written in the Latin script, so the contract cannot ask "is this in
 * another script" and falls back to "does this differ from English" — which
 * every word French spells the same way trips. Six groups here, and no others:
 *
 * - **The same word in French.** `OK`, `Pagination`, `Notifications`, `Avatar`,
 *   `Actions` (twice) and `Mentions` are the words a French interface uses;
 *   `Minutes` is the plural of `minute`, beside `Heures` and `Secondes` which
 *   are not. Forcing a synonym onto any of them would make the UI read as a
 *   translation.
 * - **CSS notation names and channel captions.** `HEX` / `RGB` / `HSL` name the
 *   notation the picker emits — `rgb(…)`, `hsl(…)` — so they stay as written,
 *   and the single letters beside them (`R` `G` `B` `H`, `S%` `L%` `A%`) stay
 *   with them: a strip that says RGB and then labels its fields R, V, B would
 *   contradict itself.
 * - **`esc`.** A key cap rather than prose. French PC keyboards do print
 *   `Échap`, but Apple's French layout prints `esc`, and the chip stands for the
 *   physical key both of them carry.
 * - **`AM` / `PM`.** French runs on a 24-hour clock and has no abbreviation of
 *   its own for the meridiem — fr-CA writes `a.m.` / `p.m.`, fr-FR writes
 *   neither. The surrounding label is translated; these two are not.
 * - **Templates with no words in them.** `{{checked}} / {{total}}`,
 *   `{{current}} / {{total}}`, `{{value}} {{unit}}`, `{{value}}{{suffix}}` and
 *   the bare `%` beside it are punctuation around a number. `{{size}} / page`
 *   is here too: French pagers use the same compact form, and `page` is the
 *   French word.
 * - **Templates whose only content is an ORDER, which French keeps.** Both
 *   `{{month}} {{year}}` headers (« mars 2026 »), both `{{from}} – {{to}}`
 *   ranges, `{{weekday}}, {{date}}` (« lundi 16 mars ») and the event
 *   calendar's three accessible names put the same part first in French as in
 *   English. They are listed rather than skipped because keeping that order is
 *   a decision — ja-JP could not.
 */
const SHARED_WITH_ENGLISH = new Set([
  'common.ok',
  'pagination.perPage',
  'pagination.label',
  'pagination.compact',
  'eventCalendar.header',
  'eventCalendar.range',
  'eventCalendar.chipLabel',
  'eventCalendar.slotLabel',
  'eventCalendar.allDayCellLabel',
  'transfer.count',
  'commandPalette.escHint',
  'fileUpload.size',
  'toast.region',
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
  'actionSheet.label',
  'mention.listbox',
  'datePicker.minutes',
  'datePicker.am',
  'datePicker.pm',
  'speedDial.label',
  'statistic.delta',
  'statistic.deltaSuffix',
]);

describe('wrFr', () => {
  expectCatalogContract('fr', wrFr, { sharedWithEnglish: SHARED_WITH_ENGLISH });
});
