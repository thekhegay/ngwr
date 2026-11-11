/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { HostTree, type SchematicContext, type Tree } from '@angular-devkit/schematics';
import semver from 'semver';
import { describe, expect, it } from 'vitest';

import ngUpdateV16 from './index';

/**
 * `ng update ngwr` to v16, which renames the unprefixed exports, the inputs
 * and the toast option that changed name, and reports an import of the entry
 * point that went internal and a write to a popover's or a dropdown's `isOpen`.
 *
 * The rename fails in two directions and each needs its own case. Missing a
 * use leaves a name that no longer exists, which the build reports. Touching a
 * same-named identifier that was never ngwr's (`debounce` from rxjs, a local
 * `clamp`) rewrites code that was correct into code that fails, or worse into
 * code that builds and calls something else. So the cases come in pairs: the
 * import that must move, and the neighbour of the same spelling that must not.
 *
 * Two properties are held for the whole rule: a tree already on v16 comes
 * through byte for byte, and a second run changes nothing, since the migration
 * re-runs on every update between release candidates.
 */

interface Run {
  readonly logs: readonly string[];
  readonly read: (path: string) => string;
}

function run(files: Readonly<Record<string, string>>): Run {
  const tree = new HostTree();
  for (const [path, content] of Object.entries(files)) tree.create(path, content);

  const logs: string[] = [];
  const context = {
    logger: { info: (message: string) => logs.push(message), warn: (message: string) => logs.push(message) },
  } as unknown as SchematicContext;
  const rule = ngUpdateV16() as (target: Tree, ctx: SchematicContext) => Tree;
  const next = rule(tree, context);

  return { logs, read: (path: string) => next.readText(path) };
}

function rewrite(content: string, path = '/src/app/page.ts'): string {
  return run({ [path]: content }).read(path);
}

const said = (logs: readonly string[], fragment: string): boolean => logs.some(line => line.includes(fragment));

/** Every rename, as `[entry point, old, new]`. Written out, so a typo in the rule's table fails here. */
const RENAMES: readonly (readonly [string, string, string])[] = [
  ['ngwr/utils', 'badgeLog', 'wrBadgeLog'],
  ['ngwr/utils', 'badgeWarn', 'wrBadgeWarn'],
  ['ngwr/utils', 'badgeError', 'wrBadgeError'],
  ['ngwr/utils', 'clamp', 'wrClamp'],
  ['ngwr/utils', 'round', 'wrRound'],
  ['ngwr/utils', 'noop', 'wrNoop'],
  ['ngwr/utils', 'debounce', 'wrDebounce'],
  ['ngwr/utils', 'throttle', 'wrThrottle'],
  ['ngwr/utils', 'randomId', 'wrRandomId'],
  ['ngwr/utils', 'numAttr', 'wrNumAttr'],
  ['ngwr/utils', 'isDefined', 'wrIsDefined'],
  ['ngwr/utils', 'isNonEmptyArray', 'wrIsNonEmptyArray'],
  ['ngwr/utils', 'isObservable', 'wrIsObservable'],
  ['ngwr/utils', 'isSafeCssValue', 'wrIsSafeCssValue'],
  ['ngwr/utils', 'toClassList', 'wrToClassList'],
  ['ngwr/utils', 'resolveCssColor', 'wrResolveCssColor'],
  ['ngwr/utils', 'resolveCssColorChannels', 'wrResolveCssColorChannels'],
  ['ngwr/utils', 'resolveCssSize', 'wrResolveCssSize'],
  ['ngwr/utils', 'getRootFontSize', 'wrGetRootFontSize'],
  ['ngwr/utils', 'getFocusableElements', 'wrGetFocusableElements'],
  ['ngwr/utils', 'trapFocus', 'wrTrapFocus'],
  ['ngwr/utils', 'watchColorScheme', 'wrWatchColorScheme'],
  ['ngwr/utils', 'hasModifier', 'wrHasModifier'],
  ['ngwr/utils', 'isComposing', 'wrIsComposing'],
  ['ngwr/utils', 'isPrintableKey', 'wrIsPrintableKey'],
  ['ngwr/utils', 'KEYS', 'WR_KEYS'],
  ['ngwr/utils', 'KEY_LABELS', 'WR_KEY_LABELS'],
  ['ngwr/utils', 'Maybe', 'WrMaybe'],
  ['ngwr/utils', 'SafeAny', 'WrSafeAny'],
  ['ngwr/utils', 'ResolveCssSizeOptions', 'WrResolveCssSizeOptions'],
  ['ngwr/utils', 'ResolvedCssSize', 'WrResolvedCssSize'],
  ['ngwr/utils', 'WatchColorSchemeOptions', 'WrWatchColorSchemeOptions'],
  ['ngwr/color-picker', 'hslToRgb', 'wrHslToRgb'],
  ['ngwr/color-picker', 'hsvToRgb', 'wrHsvToRgb'],
  ['ngwr/color-picker', 'rgbToHsl', 'wrRgbToHsl'],
  ['ngwr/color-picker', 'rgbToHsv', 'wrRgbToHsv'],
  ['ngwr/color-picker', 'parseHex', 'wrParseHex'],
  ['ngwr/color-picker', 'toHex', 'wrToHex'],
  ['ngwr/icon', 'lucide', 'wrLucide'],
  ['ngwr/icon', 'lucideIcons', 'wrLucideIcons'],
  ['ngwr/icon', 'svgIcon', 'wrSvgIcon'],
  ['ngwr/icon', 'LucideIconNode', 'WrLucideIconNode'],
  ['ngwr/date', 'toLocalDate', 'wrToLocalDate'],
  ['ngwr/date', 'isNamedFormat', 'wrIsNamedFormat'],
  ['ngwr/hotkey', 'matchesHotkey', 'wrMatchesHotkey'],
  ['ngwr/hotkey', 'parseHotkeySpec', 'wrParseHotkeySpec'],
  ['ngwr/i18n', 'readI18nText', 'wrReadI18nText'],
  ['ngwr/storage', 'createMemoryStorage', 'wrCreateMemoryStorage'],
  ['ngwr/toast', 'DEFAULT_TOAST_CONFIG', 'DEFAULT_WR_TOAST_CONFIG'],
  ['ngwr/charts/core', 'chartAxis', 'wrChartAxis'],
  ['ngwr/charts/core', 'chartColor', 'wrChartColor'],
  ['ngwr/charts/core', 'chartDash', 'wrChartDash'],
  ['ngwr/charts/core', 'chartMarker', 'wrChartMarker'],
  ['ngwr/charts/core', 'chartMarkerExtent', 'wrChartMarkerExtent'],
  ['ngwr/charts/core', 'chartMarkerPath', 'wrChartMarkerPath'],
  ['ngwr/charts/core', 'CHART_PALETTE', 'WR_CHART_PALETTE'],
  ['ngwr/charts/core', 'CHART_DASHES', 'WR_CHART_DASHES'],
  ['ngwr/charts/core', 'CHART_MARKERS', 'WR_CHART_MARKERS'],
];

describe('ng update ngwr to v16', () => {
  it('says nothing to do on a project that uses none of it', () => {
    const { logs } = run({
      '/src/app/app.ts': "import { WrButton } from 'ngwr/button';\nexport const imports = [WrButton];\n",
    });

    expect(said(logs, 'nothing to do')).toBe(true);
  });

  describe('the names it renames', () => {
    it.each(RENAMES)('from %s: %s becomes %s', (entry, from, to) => {
      const after = rewrite(`import { ${from} } from '${entry}';\n\nexport const used = [${from}];\n`);

      expect(after).toBe(`import { ${to} } from '${entry}';\n\nexport const used = [${to}];\n`);
    });

    it('renames every use of the binding, as a value and as a type', () => {
      const after = rewrite(`import { type Maybe, KEYS, clamp, isDefined } from 'ngwr/utils';

export function width(value: Maybe<number>): number {
  return isDefined(value) ? clamp(value, 0, 100) : 0;
}

export class Page {
  protected readonly KEYS = KEYS;
  protected readonly limit = (n: number): number => clamp(n, 1, 9);
  protected onKey(event: KeyboardEvent): boolean {
    return event.key === KEYS.ESCAPE;
  }
}
export type Width = ReturnType<typeof clamp>;
`);

      expect(after).toBe(`import { type WrMaybe, WR_KEYS, wrClamp, wrIsDefined } from 'ngwr/utils';

export function width(value: WrMaybe<number>): number {
  return wrIsDefined(value) ? wrClamp(value, 0, 100) : 0;
}

export class Page {
  protected readonly KEYS = WR_KEYS;
  protected readonly limit = (n: number): number => wrClamp(n, 1, 9);
  protected onKey(event: KeyboardEvent): boolean {
    return event.key === WR_KEYS.ESCAPE;
  }
}
export type Width = ReturnType<typeof wrClamp>;
`);
    });

    it('renames a type-only import', () => {
      expect(rewrite("import type { SafeAny } from 'ngwr/utils';\nexport let bag: SafeAny;\n")).toBe(
        "import type { WrSafeAny } from 'ngwr/utils';\nexport let bag: WrSafeAny;\n"
      );
    });

    it('leaves the names an entry point kept beside the ones it renamed', () => {
      const after = rewrite(
        "import { WrIcon, lucideIcons, provideWrIcons } from 'ngwr/icon';\n" +
          'export const providers = [provideWrIcons(lucideIcons({}))];\nexport const imports = [WrIcon];\n'
      );

      expect(after).toBe(
        "import { WrIcon, wrLucideIcons, provideWrIcons } from 'ngwr/icon';\n" +
          'export const providers = [provideWrIcons(wrLucideIcons({}))];\nexport const imports = [WrIcon];\n'
      );
    });

    it('keeps the key of a shorthand property and moves its value', () => {
      expect(rewrite("import { clamp } from 'ngwr/utils';\nexport const math = { clamp };\n")).toBe(
        "import { wrClamp } from 'ngwr/utils';\nexport const math = { clamp: wrClamp };\n"
      );
    });
  });

  describe('an aliased import', () => {
    it('keeps the local alias and changes the imported name alone', () => {
      expect(rewrite("import { clamp as c } from 'ngwr/utils';\nexport const n = c(5, 0, 1);\n")).toBe(
        "import { wrClamp as c } from 'ngwr/utils';\nexport const n = c(5, 0, 1);\n"
      );
    });

    it('drops an alias that already is the new name', () => {
      expect(rewrite("import { clamp as wrClamp } from 'ngwr/utils';\nexport const n = wrClamp(5, 0, 1);\n")).toBe(
        "import { wrClamp } from 'ngwr/utils';\nexport const n = wrClamp(5, 0, 1);\n"
      );
    });

    it('keeps the old local name where the new one is taken, and lists the file', () => {
      const { read, logs } = run({
        '/src/app/taken.ts':
          "import { clamp } from 'ngwr/utils';\nconst wrClamp = 1;\nexport const n = clamp(wrClamp, 0, 1);\n",
      });

      expect(read('/src/app/taken.ts')).toBe(
        "import { wrClamp as clamp } from 'ngwr/utils';\nconst wrClamp = 1;\nexport const n = clamp(wrClamp, 0, 1);\n"
      );
      expect(said(logs, 'an import renamed under its old local name in 1 file(s)')).toBe(true);
      expect(logs).toContain('  /src/app/taken.ts:1');
    });
  });

  describe('a namespace import', () => {
    it('renames the members it reads, as values and as types', () => {
      const after = rewrite(`import * as utils from 'ngwr/utils';

export const n = utils.clamp(5, 0, 1);
export const key = utils.KEYS.ENTER;
export const quoted = utils['round'](1.5);
export let value: utils.Maybe<string>;
export const kept = utils.wrInitials('Ada Lovelace');
`);

      expect(after).toBe(`import * as utils from 'ngwr/utils';

export const n = utils.wrClamp(5, 0, 1);
export const key = utils.WR_KEYS.ENTER;
export const quoted = utils['wrRound'](1.5);
export let value: utils.WrMaybe<string>;
export const kept = utils.wrInitials('Ada Lovelace');
`);
    });

    it('leaves the same member on an object that is not the namespace', () => {
      const before = `import * as utils from 'ngwr/utils';
import * as _ from 'lodash';

export const a = _.clamp(5, 0, 1);
export function b(utils: { clamp(n: number): number }): number {
  return utils.clamp(1);
}
`;

      expect(rewrite(before)).toBe(before);
    });
  });

  describe('a re-export', () => {
    it('keeps the name the app exports', () => {
      expect(rewrite("export { clamp, round as roundTo, wrInitials } from 'ngwr/utils';\n")).toBe(
        "export { wrClamp as clamp, wrRound as roundTo, wrInitials } from 'ngwr/utils';\n"
      );
    });

    it('keeps the name of a local export too', () => {
      expect(rewrite("import { clamp } from 'ngwr/utils';\nexport { clamp };\n")).toBe(
        "import { wrClamp } from 'ngwr/utils';\nexport { wrClamp as clamp };\n"
      );
    });
  });

  describe('the same name from somewhere else', () => {
    it.each([
      [
        "import { debounce, isObservable, throttle } from 'rxjs';\nexport const ops = [debounce, isObservable, throttle];\n",
      ],
      ["import { clamp, debounce, noop, round } from 'lodash';\nexport const fns = [clamp, debounce, noop, round];\n"],
      ["import { clamp } from './math';\nexport const n = clamp(5, 0, 1);\n"],
      ['function clamp(n: number): number {\n  return n;\n}\nexport const n = clamp(5);\n'],
      ["import { clamp } from 'ngwr/utilities';\nexport const n = clamp(5);\n"],
      ["import { clamp } from '@scope/ngwr/utils';\nexport const n = clamp(5);\n"],
      // The right entry point, the wrong name: `ngwr/icon` never exported a `clamp`.
      ["import { clamp } from 'ngwr/icon';\nexport const n = clamp(5);\n"],
    ])('leaves %j alone', before => {
      expect(rewrite(before)).toBe(before);
    });

    it('renames the ngwr import in a file that holds both', () => {
      const after = rewrite(`import { debounce } from 'rxjs';
import { clamp, debounce as wait, throttle } from 'ngwr/utils';
import { round } from './round';

export const piped = debounce(() => 0);
export const later = wait(() => undefined, 100);
export const limited = throttle(() => undefined, 100);
export const n = round(clamp(5, 0, 1));
`);

      expect(after).toBe(`import { debounce } from 'rxjs';
import { wrClamp, wrDebounce as wait, wrThrottle } from 'ngwr/utils';
import { round } from './round';

export const piped = debounce(() => 0);
export const later = wait(() => undefined, 100);
export const limited = wrThrottle(() => undefined, 100);
export const n = round(wrClamp(5, 0, 1));
`);
    });

    it('leaves a local that shadows the import, a property and a string', () => {
      const after = rewrite(`import { clamp, round } from 'ngwr/utils';

export function a(clamp: (n: number) => number): number {
  return clamp(1);
}
export function b(value: number): number {
  const round = Math.round;
  return round(clamp(value, 0, 1));
}
export const c = { clamp: 1, round: 'round' };
export const d = c.clamp + Math.round(1.5);
export const e = round(1.5);
// clamp and round stay in a comment
`);

      expect(after).toBe(`import { wrClamp, wrRound } from 'ngwr/utils';

export function a(clamp: (n: number) => number): number {
  return clamp(1);
}
export function b(value: number): number {
  const round = Math.round;
  return round(wrClamp(value, 0, 1));
}
export const c = { clamp: 1, round: 'round' };
export const d = c.clamp + Math.round(1.5);
export const e = wrRound(1.5);
// clamp and round stay in a comment
`);
    });
  });

  describe('where it looks', () => {
    it('reads .ts files and leaves a template, a stylesheet and a declaration file', () => {
      const html = '<p>{{ KEYS.ENTER }}</p>\n';
      const scss = '.box { width: clamp(1rem, 2vw, 3rem); }\n';
      const dts = "import { clamp } from 'ngwr/utils';\nexport declare const n: ReturnType<typeof clamp>;\n";
      const { read } = run({ '/src/app/a.html': html, '/src/app/a.scss': scss, '/src/app/a.d.ts': dts });

      expect(read('/src/app/a.html')).toBe(html);
      expect(read('/src/app/a.scss')).toBe(scss);
      expect(read('/src/app/a.d.ts')).toBe(dts);
    });

    it('leaves an inline template, where the name is the component’s own field', () => {
      const after = rewrite(`import { Component } from '@angular/core';
import { KEYS } from 'ngwr/utils';

@Component({ selector: 'app-keys', template: '<kbd>{{ KEYS.ENTER }}</kbd>' })
export class Keys {
  protected readonly KEYS = KEYS;
}
`);

      expect(after).toContain("template: '<kbd>{{ KEYS.ENTER }}</kbd>'");
      expect(after).toContain('protected readonly KEYS = WR_KEYS;');
    });

    it('skips node_modules and dist', () => {
      const before = "import { clamp } from 'ngwr/utils';\nexport const n = clamp(5, 0, 1);\n";
      const { read } = run({ '/node_modules/pkg/index.ts': before, '/dist/app/index.ts': before });

      expect(read('/node_modules/pkg/index.ts')).toBe(before);
      expect(read('/dist/app/index.ts')).toBe(before);
    });

    it('renames an inline import() type and a member read off a dynamic import', () => {
      const after = rewrite(`export let value: import('ngwr/utils').Maybe<string>;
export async function load(): Promise<number> {
  return (await import('ngwr/utils')).clamp(5, 0, 1);
}
`);

      expect(after).toBe(`export let value: import('ngwr/utils').WrMaybe<string>;
export async function load(): Promise<number> {
  return (await import('ngwr/utils')).wrClamp(5, 0, 1);
}
`);
    });
  });

  describe('what it reports', () => {
    it('lists every import of ngwr/animations/core by file and line, and rewrites none', () => {
      const before = `import { WrReveal } from 'ngwr/animations/reveal';
import { graphemes } from 'ngwr/animations/core';
export { staggerGap } from 'ngwr/animations/core';

export const letters = graphemes('ngwr');
export const lazy = (): Promise<unknown> => import('ngwr/animations/core');
export const imports = [WrReveal];
`;
      const { read, logs } = run({ '/src/app/effects.ts': before, '/src/app/other.ts': 'export const x = 1;\n' });

      expect(read('/src/app/effects.ts')).toBe(before);
      expect(said(logs, 'ngwr v16: ngwr/animations/core in 1 file(s). The entry point is gone')).toBe(true);
      expect(logs).toContain('  /src/app/effects.ts:2, 3, 6');
      expect(said(logs, 'nothing to do')).toBe(false);
    });

    it('gives the line a report names as it is after the rewrite', () => {
      const { logs } = run({
        '/src/app/both.ts':
          "import { clamp } from 'ngwr/utils';\nimport { roundTo } from 'ngwr/animations/core';\n" +
          'export const n = roundTo(clamp(5, 0, 1));\n',
      });

      expect(logs).toContain('  /src/app/both.ts:2');
    });

    it('lists a mock and a dynamic import whose names it cannot follow', () => {
      const before = `import { vi } from 'vitest';

vi.mock('ngwr/utils', () => ({ clamp: (n: number) => n }));
export const load = (): Promise<unknown> => import('ngwr/utils').then(m => m);
`;
      const { read, logs } = run({ '/src/app/page.spec.ts': before });

      expect(read('/src/app/page.spec.ts')).toBe(before);
      expect(said(logs, 'a mock or a dynamic import of an entry point with renamed exports in 1 file(s)')).toBe(true);
      expect(logs).toContain('  /src/app/page.spec.ts:3, 4');
    });

    it('says what it rewrote', () => {
      const { logs } = run({
        '/src/app/a.ts': "import { clamp } from 'ngwr/utils';\nexport const n = clamp(1, 0, 1);\n",
      });

      expect(said(logs, 'ngwr v16 migration: rewrote 1 file(s)')).toBe(true);
    });
  });

  describe('the inputs v16 renamed', () => {
    it.each([
      ['<wr-slider showLabel />', '<wr-slider showValue />'],
      ['<wr-slider showLabel="false" />', '<wr-slider showValue="false" />'],
      ['<wr-slider [showLabel]="labelled()" />', '<wr-slider [showValue]="labelled()" />'],
      [
        '<wr-slider [disabled]="n > 0" [title]="\'a "b"\'"\n  [showLabel]="false"></wr-slider>',
        '<wr-slider [disabled]="n > 0" [title]="\'a "b"\'"\n  [showValue]="false"></wr-slider>',
      ],
      [
        '<wr-password-toggle [for]="pw" showLabel="Reveal" hideLabel="Mask" />',
        '<wr-password-toggle [for]="pw" showPasswordLabel="Reveal" hidePasswordLabel="Mask" />',
      ],
      [
        '<wr-password-toggle [hideLabel]="mask" [showLabel]="reveal" [for]="pw" />',
        '<wr-password-toggle [hidePasswordLabel]="mask" [showPasswordLabel]="reveal" [for]="pw" />',
      ],
    ])('in a template: %s', (before, after) => {
      expect(rewrite(`${before}\n`, '/src/app/page.html')).toBe(`${after}\n`);
    });

    it('leaves the same attribute on any other element, and a value that only reads the name', () => {
      const before = `<wr-calendar-heatmap [showLabels]="true" />
<app-field showLabel [hideLabel]="false" />
<wr-slider-group showLabel />
<wr-slider [value]="showLabel ? 1 : 2" [showValue]="showLabel" />
<wr-knob showValue /> <wr-slider /> <app-chip showLabel />
`;

      expect(rewrite(before, '/src/app/page.html')).toBe(before);
    });

    it('rewrites an inline template', () => {
      const after = rewrite(`import { Component } from '@angular/core';
import { WrSlider } from 'ngwr/slider';

@Component({
  selector: 'app-volume',
  imports: [WrSlider],
  template: \`
    <wr-slider [(value)]="volume" [showLabel]="false" />
    <wr-password-toggle [for]="pw" showLabel="Reveal" />
  \`,
})
export class Volume {
  protected showLabel = false;
}
`);

      expect(after).toContain('<wr-slider [(value)]="volume" [showValue]="false" />');
      expect(after).toContain('<wr-password-toggle [for]="pw" showPasswordLabel="Reveal" />');
      expect(after).toContain('protected showLabel = false;');
    });

    it('stays quick on a tag crowded with quotes', () => {
      const crowded = `<wr-slider ${'[a]="\'x\'" '.repeat(400)}>\n`.repeat(20);
      const started = performance.now();

      expect(rewrite(crowded, '/src/app/page.html')).toBe(crowded);
      expect(performance.now() - started).toBeLessThan(2000);
    });
  });

  describe('the toast option dismissible', () => {
    it('becomes closable in the argument of show() on an injected WrToast', () => {
      const after = rewrite(`import { inject } from '@angular/core';
import { WrToast } from 'ngwr/toast';

export class Page {
  private readonly toast = inject(WrToast);

  save(dismissible: boolean): void {
    this.toast.show({ message: 'Saved', dismissible: false });
    this.toast.show({ message: 'Saved', 'dismissible': true });
    this.toast.show({ message: 'Saved', dismissible });
    inject(WrToast).show({ message: 'Saved', dismissible: false });
  }
}
`);

      expect(after).toContain("this.toast.show({ message: 'Saved', closable: false });");
      expect(after).toContain("this.toast.show({ message: 'Saved', 'closable': true });");
      expect(after).toContain("this.toast.show({ message: 'Saved', closable: dismissible });");
      expect(after).toContain("inject(WrToast).show({ message: 'Saved', closable: false });");
      expect(after).toContain('save(dismissible: boolean): void {');
    });

    it('follows a constructor parameter, a typed field and an aliased import', () => {
      const after = rewrite(`import { WrToast as Toasts } from 'ngwr/toast';

export class Page {
  private readonly other: Toasts;
  constructor(private readonly toast: Toasts) {
    this.other = toast;
    toast.show({ message: 'a', dismissible: false });
    this.toast.show({ message: 'b', dismissible: false });
    this.other.show({ message: 'c', dismissible: false });
  }
}
`);

      expect(after).not.toContain('dismissible');
      expect(after.match(/closable: false/g)).toHaveLength(3);
    });

    it('becomes closable in an object typed, asserted or checked as WrToastOptions, and where one is read', () => {
      const after = rewrite(`import type { WrToastOptions } from 'ngwr/toast';

export const sticky: WrToastOptions = { message: 'Working', dismissible: false, duration: 0 };
export const partial: Partial<WrToastOptions> = { dismissible: false };
export const list: readonly WrToastOptions[] = [{ message: 'a', dismissible: false }];
export const checked = { message: 'b', dismissible: true } satisfies WrToastOptions;
export const cast = { message: 'c', dismissible: true } as WrToastOptions;

export function hasClose(options: WrToastOptions): boolean {
  return options.dismissible ?? true;
}
`);

      expect(after).not.toContain('dismissible');
      expect(after).toContain("sticky: WrToastOptions = { message: 'Working', closable: false, duration: 0 }");
      expect(after).toContain('partial: Partial<WrToastOptions> = { closable: false }');
      expect(after).toContain("[{ message: 'a', closable: false }]");
      expect(after).toContain("{ message: 'b', closable: true } satisfies WrToastOptions");
      expect(after).toContain("{ message: 'c', closable: true } as WrToastOptions");
      expect(after).toContain('return options.closable ?? true;');
    });

    it('leaves a dismissible that is not a toast’s, and says nothing in a file with no toast', () => {
      const before = `import { WrAlert } from 'ngwr/alert';

export const banner = { text: 'Hi', dismissible: true };
export const imports = [WrAlert];
export const show = (panel: { show(o: object): void }): void => panel.show({ dismissible: true });
`;
      const { read, logs } = run({ '/src/app/banner.ts': before });

      expect(read('/src/app/banner.ts')).toBe(before);
      expect(said(logs, 'nothing to do')).toBe(true);
    });

    it('leaves and lists the ones it cannot place in a file that uses the toast', () => {
      const before = `import { inject } from '@angular/core';
import { WrToast, type WrToastOptions } from 'ngwr/toast';

const base = { message: 'Saved', dismissible: false };
const banner = { text: 'Hi', nested: { dismissible: true } };
const panel = { show: (o: object): object => o };

export function notify(extra: object): void {
  inject(WrToast).show(base);
  panel.show({ dismissible: true });
  const typed: WrToastOptions = { message: 'x', action: { label: 'Undo', run: () => undefined, dismissible: 1 } as never };
  const { dismissible } = base;
  console.log(banner, typed, dismissible, extra);
}
`;
      const { read, logs } = run({ '/src/app/notify.ts': before });

      expect(read('/src/app/notify.ts')).toBe(before);
      expect(said(logs, 'ngwr v16: `dismissible` that may be a toast option in 1 file(s)')).toBe(true);
      expect(logs).toContain('  /src/app/notify.ts:4, 5, 10, 11, 12');
    });
  });

  describe('the read-only isOpen', () => {
    it('lists a write on a popover or a dropdown, by file and line, and rewrites none', () => {
      const before = `import { Component, inject, viewChild, ViewChild } from '@angular/core';
import { WrDropdown } from 'ngwr/dropdown';
import { WrPopover } from 'ngwr/popover';

@Component({ selector: 'app-page', template: '' })
export class Page {
  private readonly details = viewChild.required(WrPopover);
  private readonly menu = viewChild<WrDropdown>('menu');
  @ViewChild(WrPopover) legacy!: WrPopover;
  private readonly host = inject(WrDropdown);

  toggle(): void {
    this.details().isOpen.set(true);
    this.menu()?.isOpen.update(open => !open);
    this.legacy.isOpen.set(false);
    this.host.isOpen.set(false);
    if (this.details().isOpen()) this.details().close();
  }
}
`;
      const { read, logs } = run({ '/src/app/page.ts': before });

      expect(read('/src/app/page.ts')).toBe(before);
      expect(said(logs, 'ngwr v16: `isOpen.set()` / `isOpen.update()` on a popover or a dropdown in 1 file(s)')).toBe(
        true
      );
      expect(said(logs, 'Call `open()` or `close()` instead')).toBe(true);
      expect(logs).toContain('  /src/app/page.ts:13, 14, 15, 16');
    });

    it('lists a write through a template reference, in a template and inline', () => {
      const html = `<button wrPopover [content]="tip" #details="wrPopover">Details</button>
<button (click)="details.isOpen.set(true)">Open</button>
<button (click)="details.isOpen() ? details.close() : details.open()">Toggle</button>
<button [wrDropdown]="items" #menu="wrDropdown" (blur)="menu.isOpen.update(flip)">Menu</button>
<button (click)="mine.isOpen.set(true)">Mine</button>
`;
      const inline = `import { Component } from '@angular/core';

@Component({
  selector: 'app-inline',
  template: \`
    <button wrPopover #tip="wrPopover" (click)="tip.isOpen.set(false)">Tip</button>
  \`,
})
export class Inline {}
`;
      const { read, logs } = run({ '/src/app/page.html': html, '/src/app/inline.ts': inline });

      expect(read('/src/app/page.html')).toBe(html);
      expect(read('/src/app/inline.ts')).toBe(inline);
      expect(said(logs, 'on a popover or a dropdown in 2 file(s)')).toBe(true);
      expect(logs).toContain('  /src/app/page.html:2, 4');
      expect(logs).toContain('  /src/app/inline.ts:6');
    });

    it('leaves an isOpen of the app’s own, and one on another ngwr component', () => {
      const before = `import { signal, viewChild } from '@angular/core';
import { WrPopover } from 'ngwr/popover';
import { WrSelect } from 'ngwr/select';

export class Page {
  readonly isOpen = signal(false);
  private readonly panel = { isOpen: signal(false) };
  private readonly select = viewChild(WrSelect);
  private readonly details = viewChild(WrPopover);

  open(): void {
    this.isOpen.set(true);
    this.panel.isOpen.set(true);
    this.details()?.open();
  }
}
`;
      const { read, logs } = run({ '/src/app/page.ts': before });

      expect(read('/src/app/page.ts')).toBe(before);
      expect(said(logs, 'nothing to do')).toBe(true);
    });
  });

  describe('running it twice', () => {
    const files = {
      '/src/app/a.ts': `import { type Maybe, KEYS, clamp as c, debounce } from 'ngwr/utils';
import * as utils from 'ngwr/utils';
import { lucideIcons, provideWrIcons } from 'ngwr/icon';
export { round } from 'ngwr/utils';

export const providers = [provideWrIcons(lucideIcons({}))];
export const n = c(utils.round(1.5), 0, 1);
export const key: Maybe<string> = KEYS.ENTER;
export const wait = debounce(() => undefined, 10);
export const math = { debounce };
`,
      '/src/app/b.ts': "import { graphemes } from 'ngwr/animations/core';\nexport const g = graphemes('a');\n",
    };

    it('changes nothing the second time and repeats the report', () => {
      const first = run(files);
      const once = Object.fromEntries(Object.keys(files).map(path => [path, first.read(path)]));
      const second = run(once);

      expect(once['/src/app/a.ts']).not.toBe(files['/src/app/a.ts']);
      for (const path of Object.keys(files)) expect(second.read(path)).toBe(once[path]);
      expect(said(second.logs, 'rewrote')).toBe(false);
      expect(said(second.logs, 'ngwr/animations/core in 1 file(s)')).toBe(true);
    });

    it('changes nothing the second time for the renamed inputs and options, and repeats the reports', () => {
      const sources = {
        '/src/app/page.html':
          '<wr-slider showLabel />\n<wr-password-toggle [for]="pw" showLabel="Reveal" hideLabel="Mask" />\n' +
          '<button wrPopover #tip="wrPopover" (click)="tip.isOpen.set(true)">Tip</button>\n',
        '/src/app/page.ts': `import { inject } from '@angular/core';
import { WrToast } from 'ngwr/toast';

const base = { message: 'Saved', dismissible: false };
export const notify = (): unknown => inject(WrToast).show({ message: 'Saved', dismissible: false });
export const again = (): unknown => inject(WrToast).show(base);
`,
      };
      const first = run(sources);
      const once = Object.fromEntries(Object.keys(sources).map(path => [path, first.read(path)]));
      const second = run(once);

      for (const path of Object.keys(sources)) {
        expect(once[path]).not.toBe(sources[path as keyof typeof sources]);
        expect(second.read(path)).toBe(once[path]);
      }
      expect(once['/src/app/page.html']).toContain('<wr-slider showValue />');
      expect(once['/src/app/page.html']).toContain('showPasswordLabel="Reveal" hidePasswordLabel="Mask"');
      expect(said(second.logs, 'rewrote')).toBe(false);
      expect(second.logs).toContain('  /src/app/page.ts:4');
      expect(second.logs).toContain('  /src/app/page.html:3');
    });

    it('leaves a tree already on v16 byte for byte', () => {
      const before = `import { type WrMaybe, WR_KEYS, wrClamp } from 'ngwr/utils';
import { wrLucideIcons } from 'ngwr/icon';

export const key: WrMaybe<string> = WR_KEYS.ENTER;
export const n = wrClamp(1, 0, 1);
export const icons = wrLucideIcons({});
`;
      const { read, logs } = run({ '/src/app/done.ts': before });

      expect(read('/src/app/done.ts')).toBe(before);
      expect(said(logs, 'nothing to do')).toBe(true);
    });
  });

  describe('where it sits in ng update', () => {
    const manifest = JSON.parse(
      readFileSync(join(process.cwd(), 'projects/lib/schematics/migrations.json'), 'utf8')
    ) as {
      schematics: Record<string, { version: string; description: string; factory: string }>;
    };
    const entry = manifest.schematics['migration-v16'];

    /** The range `ng update` builds: see the same helper in `migration-v15`'s spec. */
    const runs = (version: string, from: string, to: string): boolean =>
      semver.satisfies(
        version,
        new semver.Range(`>${semver.prerelease(from) ? `${from.split('-')[0]}-0` : from} <=${to.split('-')[0]}`),
        { includePrerelease: true }
      );

    it('is registered with the factory it ships', () => {
      expect(entry.factory).toBe('./migrations/v16/index#default');
      expect(entry.version).toBe('16.0.0');
    });

    it.each([
      ['15.9.0', '16.0.0', true],
      ['15.9.0', '16.0.0-rc.0', true],
      ['14.11.0', '16.2.0', true],
      ['16.0.0-rc.0', '16.0.0-rc.1', true],
      ['16.0.0-rc.1', '16.0.0', true],
      ['16.0.0', '16.1.0', false],
      ['15.8.0', '15.9.0', false],
    ])('runs from %s to %s: %s', (from, to, expected) => {
      expect(runs(entry.version, from, to)).toBe(expected);
    });

    it('says in ng update what it rewrites and what it reports', () => {
      for (const named of [
        ...new Set(RENAMES.map(([module]) => module)),
        'wrClamp',
        'WR_KEYS',
        'WrMaybe',
        'ngwr/animations/core',
        'closable',
        'showValue',
        'showPasswordLabel',
        'hidePasswordLabel',
        'isOpen.set()',
        '.html',
      ]) {
        expect(entry.description, named).toContain(named);
      }
    });
  });
});
