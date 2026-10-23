/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { wrAr } from 'ngwr/i18n/ar';
import { wrCs } from 'ngwr/i18n/cs';
import { wrDe } from 'ngwr/i18n/de';
import { wrEs } from 'ngwr/i18n/es';
import { wrFr } from 'ngwr/i18n/fr';
import { wrHe } from 'ngwr/i18n/he';
import { wrHi } from 'ngwr/i18n/hi';
import { wrId } from 'ngwr/i18n/id';
import { wrIt } from 'ngwr/i18n/it';
import { wrJa } from 'ngwr/i18n/ja';
import { wrKo } from 'ngwr/i18n/ko';
import { wrNl } from 'ngwr/i18n/nl';
import { wrPl } from 'ngwr/i18n/pl';
import { wrPt } from 'ngwr/i18n/pt';
import { wrSv } from 'ngwr/i18n/sv';
import { wrTr } from 'ngwr/i18n/tr';
import { wrUk } from 'ngwr/i18n/uk';
import { wrVi } from 'ngwr/i18n/vi';
import { wrZh } from 'ngwr/i18n/zh';
import { wrZhTw } from 'ngwr/i18n/zh-TW';
import { describe, expect, it } from 'vitest';

import { expectCatalogContract } from './catalog-contract';
import type { WrI18nCatalog } from './i18n-config';

/**
 * Every shipped catalog but `en` and `ru`, which keep a spec of their own,
 * held to the contract from one table.
 *
 * A row carries what only that locale knows: the script its prose is written
 * in (non-Latin only) and the keys whose value is correctly the same as
 * English. `COMMON` is what every locale shares: key caps, colour-channel
 * letters, format names and bare ratios.
 */
const COMMON = [
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
  'pagination.compact',
  'transfer.count',
  'fileUpload.size',
  'editor.keyAlt',
];

interface Row {
  readonly catalog: WrI18nCatalog;
  readonly script?: readonly string[];
  readonly shared: readonly string[];
}

const LOCALES: Record<string, Row> = {
  ar: {
    catalog: wrAr,
    script: ['Arabic'],
    shared: [
      'statistic.delta',
      'calendar.header',
      'calendar.yearRange',
      'eventCalendar.header',
      'eventCalendar.range',
      'eventCalendar.slotLabel',
      'eventCalendar.allDayCellLabel',
      'editor.keyCtrl',
      'editor.keyShift',
    ],
  },
  cs: {
    catalog: wrCs,
    shared: [
      'common.ok',
      'eventCalendar.header',
      'eventCalendar.range',
      'eventCalendar.chipLabel',
      'eventCalendar.slotLabel',
      'eventCalendar.allDayCellLabel',
      'fileUpload.unitByte',
      'fileUpload.unitMb',
      'fileUpload.unitGb',
      'fileUpload.unitTb',
      'avatar.alt',
      'calendar.header',
      'calendar.yearRange',
      'calendar.dayLabel',
      'statistic.delta',
      'editor.keyCtrl',
      'editor.keyShift',
    ],
  },
  de: {
    catalog: wrDe,
    shared: [
      'common.ok',
      'eventCalendar.header',
      'eventCalendar.range',
      'eventCalendar.chipLabel',
      'eventCalendar.slotLabel',
      'eventCalendar.allDayCellLabel',
      'stepper.optional',
      'form.optional',
      'fileUpload.unitByte',
      'fileUpload.unitKb',
      'fileUpload.unitMb',
      'fileUpload.unitGb',
      'fileUpload.unitTb',
      'avatar.alt',
      'calendar.header',
      'calendar.yearRange',
      'calendar.dayLabel',
      'popover.label',
      'graph.label',
      'datePicker.am',
      'datePicker.pm',
      'date.months.apr',
      'date.months.aug',
      'date.months.sep',
      'date.months.nov',
    ],
  },
  es: {
    catalog: wrEs,
    shared: [
      'common.ok',
      'eventCalendar.range',
      'eventCalendar.chipLabel',
      'eventCalendar.slotLabel',
      'eventCalendar.allDayCellLabel',
      'fileUpload.unitByte',
      'fileUpload.unitKb',
      'fileUpload.unitMb',
      'fileUpload.unitGb',
      'fileUpload.unitTb',
      'avatar.alt',
      'calendar.yearRange',
      'calendar.dayLabel',
      'statistic.delta',
      'editor.keyCtrl',
    ],
  },
  fr: {
    catalog: wrFr,
    shared: [
      'common.ok',
      'pagination.perPage',
      'pagination.label',
      'eventCalendar.header',
      'eventCalendar.range',
      'eventCalendar.chipLabel',
      'eventCalendar.slotLabel',
      'eventCalendar.allDayCellLabel',
      'toast.region',
      'avatar.alt',
      'calendar.header',
      'calendar.yearRange',
      'calendar.dayLabel',
      'mention.listbox',
      'datePicker.minutes',
      'datePicker.am',
      'datePicker.pm',
      'speedDial.label',
      'statistic.delta',
      'editor.keyCtrl',
    ],
  },
  he: {
    catalog: wrHe,
    script: ['Hebrew'],
    shared: [
      'fileUpload.unitKb',
      'fileUpload.unitMb',
      'fileUpload.unitGb',
      'fileUpload.unitTb',
      'statistic.delta',
      'calendar.header',
      'calendar.yearRange',
      'calendar.dayLabel',
      'eventCalendar.header',
      'eventCalendar.range',
      'eventCalendar.chipLabel',
      'eventCalendar.slotLabel',
      'eventCalendar.allDayCellLabel',
      'editor.keyCtrl',
      'editor.keyShift',
    ],
  },
  hi: {
    catalog: wrHi,
    script: ['Devanagari'],
    shared: [
      'eventCalendar.header',
      'eventCalendar.range',
      'eventCalendar.chipLabel',
      'eventCalendar.slotLabel',
      'eventCalendar.allDayCellLabel',
      'calendar.header',
      'calendar.yearRange',
      'calendar.dayLabel',
      'statistic.delta',
      'editor.keyCtrl',
      'editor.keyShift',
    ],
  },
  id: {
    catalog: wrId,
    shared: [
      'common.ok',
      'eventCalendar.header',
      'eventCalendar.range',
      'eventCalendar.chipLabel',
      'eventCalendar.slotLabel',
      'eventCalendar.allDayCellLabel',
      'fileUpload.unitByte',
      'fileUpload.unitKb',
      'fileUpload.unitMb',
      'fileUpload.unitGb',
      'fileUpload.unitTb',
      'avatar.alt',
      'calendar.header',
      'calendar.yearRange',
      'calendar.dayLabel',
      'carousel.slideRoledescription',
      'datePicker.am',
      'datePicker.pm',
      'statistic.delta',
      'date.months.apr',
      'date.months.sep',
      'date.months.nov',
      'editor.keyCtrl',
      'editor.keyShift',
    ],
  },
  it: {
    catalog: wrIt,
    shared: [
      'common.ok',
      'eventCalendar.header',
      'eventCalendar.range',
      'eventCalendar.chipLabel',
      'eventCalendar.slotLabel',
      'eventCalendar.allDayCellLabel',
      'fileUpload.unitByte',
      'fileUpload.unitKb',
      'fileUpload.unitMb',
      'fileUpload.unitGb',
      'fileUpload.unitTb',
      'avatar.alt',
      'calendar.header',
      'calendar.yearRange',
      'calendar.dayLabel',
      'datePicker.am',
      'datePicker.pm',
      'statistic.delta',
      'editor.keyCtrl',
    ],
  },
  ja: {
    catalog: wrJa,
    script: ['Hiragana', 'Katakana', 'Han'],
    shared: [
      'common.ok',
      'fileUpload.unitByte',
      'fileUpload.unitKb',
      'fileUpload.unitMb',
      'fileUpload.unitGb',
      'fileUpload.unitTb',
      'statistic.delta',
      'editor.keyCtrl',
      'editor.keyShift',
    ],
  },
  ko: {
    catalog: wrKo,
    script: ['Hangul'],
    shared: [
      'eventCalendar.range',
      'eventCalendar.chipLabel',
      'fileUpload.unitByte',
      'fileUpload.unitKb',
      'fileUpload.unitMb',
      'fileUpload.unitGb',
      'fileUpload.unitTb',
      'calendar.yearRange',
      'statistic.delta',
      'editor.keyCtrl',
      'editor.keyShift',
    ],
  },
  nl: {
    catalog: wrNl,
    shared: [
      'common.ok',
      'avatar.alt',
      'eventCalendar.week',
      'fileUpload.unitByte',
      'fileUpload.unitKb',
      'fileUpload.unitMb',
      'fileUpload.unitGb',
      'fileUpload.unitTb',
      'statistic.delta',
      'calendar.header',
      'calendar.yearRange',
      'calendar.dayLabel',
      'eventCalendar.header',
      'eventCalendar.range',
      'eventCalendar.chipLabel',
      'eventCalendar.slotLabel',
      'eventCalendar.allDayCellLabel',
      'editor.keyCtrl',
      'editor.keyShift',
    ],
  },
  pl: {
    catalog: wrPl,
    shared: [
      'common.ok',
      'eventCalendar.header',
      'eventCalendar.range',
      'eventCalendar.chipLabel',
      'eventCalendar.slotLabel',
      'eventCalendar.allDayCellLabel',
      'fileUpload.unitByte',
      'fileUpload.unitKb',
      'fileUpload.unitMb',
      'fileUpload.unitGb',
      'fileUpload.unitTb',
      'calendar.header',
      'calendar.yearRange',
      'calendar.dayLabel',
      'marquee.link',
      'datePicker.am',
      'datePicker.pm',
      'statistic.delta',
      'editor.keyCtrl',
      'editor.keyShift',
    ],
  },
  pt: {
    catalog: wrPt,
    shared: [
      'common.ok',
      'eventCalendar.range',
      'eventCalendar.chipLabel',
      'eventCalendar.slotLabel',
      'eventCalendar.allDayCellLabel',
      'fileUpload.unitByte',
      'fileUpload.unitKb',
      'fileUpload.unitMb',
      'fileUpload.unitGb',
      'fileUpload.unitTb',
      'avatar.alt',
      'calendar.yearRange',
      'calendar.dayLabel',
      'carousel.slideRoledescription',
      'datePicker.am',
      'datePicker.pm',
      'statistic.delta',
      'editor.keyCtrl',
      'editor.keyShift',
    ],
  },
  sv: {
    catalog: wrSv,
    shared: [
      'common.ok',
      'avatar.alt',
      'popover.label',
      'fileUpload.unitByte',
      'fileUpload.unitMb',
      'fileUpload.unitGb',
      'fileUpload.unitTb',
      'statistic.delta',
      'calendar.header',
      'calendar.yearRange',
      'calendar.dayLabel',
      'eventCalendar.header',
      'eventCalendar.range',
      'eventCalendar.chipLabel',
      'eventCalendar.slotLabel',
      'eventCalendar.allDayCellLabel',
      'editor.keyCtrl',
    ],
  },
  tr: {
    catalog: wrTr,
    shared: [
      'eventCalendar.header',
      'eventCalendar.range',
      'eventCalendar.chipLabel',
      'eventCalendar.slotLabel',
      'eventCalendar.allDayCellLabel',
      'fileUpload.unitByte',
      'fileUpload.unitKb',
      'fileUpload.unitMb',
      'fileUpload.unitGb',
      'fileUpload.unitTb',
      'avatar.alt',
      'calendar.header',
      'calendar.yearRange',
      'calendar.dayLabel',
      'statistic.delta',
      'editor.keyCtrl',
      'editor.keyShift',
    ],
  },
  uk: {
    catalog: wrUk,
    script: ['Cyrillic'],
    shared: [
      'common.ok',
      'eventCalendar.header',
      'eventCalendar.range',
      'eventCalendar.chipLabel',
      'eventCalendar.slotLabel',
      'eventCalendar.allDayCellLabel',
      'calendar.header',
      'calendar.yearRange',
      'calendar.dayLabel',
      'statistic.delta',
      'editor.keyCtrl',
      'editor.keyShift',
    ],
  },
  vi: {
    catalog: wrVi,
    shared: [
      'common.ok',
      'eventCalendar.range',
      'eventCalendar.chipLabel',
      'eventCalendar.slotLabel',
      'eventCalendar.allDayCellLabel',
      'fileUpload.unitByte',
      'fileUpload.unitKb',
      'fileUpload.unitMb',
      'fileUpload.unitGb',
      'fileUpload.unitTb',
      'calendar.yearRange',
      'calendar.dayLabel',
      'statistic.delta',
      'editor.keyCtrl',
      'editor.keyShift',
    ],
  },
  zh: {
    catalog: wrZh,
    script: ['Han'],
    shared: [
      'eventCalendar.range',
      'fileUpload.unitByte',
      'fileUpload.unitKb',
      'fileUpload.unitMb',
      'fileUpload.unitGb',
      'fileUpload.unitTb',
      'calendar.yearRange',
      'statistic.delta',
      'editor.keyCtrl',
      'editor.keyShift',
    ],
  },
  'zh-TW': {
    catalog: wrZhTw,
    script: ['Han'],
    shared: [
      'eventCalendar.range',
      'fileUpload.unitByte',
      'fileUpload.unitKb',
      'fileUpload.unitMb',
      'fileUpload.unitGb',
      'fileUpload.unitTb',
      'calendar.yearRange',
      'statistic.delta',
      'editor.keyCtrl',
      'editor.keyShift',
    ],
  },
};

for (const [locale, { catalog, script, shared }] of Object.entries(LOCALES)) {
  describe(`ngwr/i18n/${locale}`, () => {
    expectCatalogContract(locale, catalog, { script, sharedWithEnglish: new Set([...COMMON, ...shared]) });
  });
}

describe('the locale table', () => {
  // A locale folder missing here is checked by nothing, and nothing else would
  // say so. Walked up from `process.cwd()`: the builder bundles specs, so
  // `import.meta.url` points inside the bundle.
  it('names every shipped locale', () => {
    let dir = process.cwd();
    while (!existsSync(join(dir, 'pnpm-workspace.yaml'))) {
      const up = dirname(dir);
      if (up === dir) throw new Error(`no workspace root above ${process.cwd()}`);
      dir = up;
    }

    const root = join(dir, 'projects/lib/i18n');
    const shipped = readdirSync(root, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && existsSync(join(root, entry.name, 'public-api.ts')))
      .map(entry => entry.name)
      .filter(locale => locale !== 'en' && locale !== 'ru')
      .sort();

    expect(Object.keys(LOCALES).sort()).toEqual(shipped);
  });
});
