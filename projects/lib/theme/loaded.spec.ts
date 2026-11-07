import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * The missing-stylesheet warning, held at both ends.
 *
 * A component whose `@use 'ngwr/<name>'` is missing renders bare and silent:
 * `wr-select` opened no panel and a chart legend stretched over its card, and
 * nothing in the build, the console or a test said why. So every public entry
 * sheet declares `--wr-loaded-<entry>` on `:root` through the theme's
 * `loaded()` mixin, and every component of that entry asks `wrCheckStyles()`
 * for it after its first render, in dev mode. Either half can be forgotten by
 * the next entry point with no symptom at all, which is what this file is for:
 * a sheet with no marker, a component with no check, a check naming another
 * entry's key, or a call outside the `ngDevMode` guard that lets a production
 * build drop it, each fails here.
 *
 * Source assertions, like `styles.spec.ts`, plus one real compile: jsdom
 * applies no stylesheet, so the composite case (a nested component's marker
 * arriving with its parent's sheet) is proved on the compiled CSS.
 */
const LIB = join(process.cwd(), 'projects/lib');
const MIXIN = join(LIB, 'theme/styles/_loaded.scss');
const GUARD = "if (typeof ngDevMode === 'undefined' || ngDevMode) ";

/**
 * Sheets with no marker and components with no check, by name and with the
 * reason: `ngwr/charts/core` is `@internal`, loaded by every chart's own sheet
 * and never by a consumer's `@use` alone, so the line the warning would name
 * is one nobody should write. `styles.spec.ts` holds the same exemption.
 */
const LOADED_BY_ITS_CONSUMERS = ['charts/core'];

interface Sass {
  compileString(source: string, options: { loadPaths: string[]; style: 'expanded' }): { css: string };
}

/** The compiler the builder itself uses, resolved the way `sass-entry.spec.ts` does. */
const sass = createRequire(createRequire(import.meta.url).resolve('@angular/build/package.json'))('sass') as Sass;

/** Comments stripped, so a `@Component` in a JSDoc example is not a declarable. */
function code(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
}

function manifest(): { exports: Record<string, { sass?: string } | string> } {
  return JSON.parse(readFileSync(join(LIB, 'package.json'), 'utf8')) as ReturnType<typeof manifest>;
}

/** Every `exports` key, `./` dropped, so a nested entry point inside another's folder is known. */
function entryKeys(): Set<string> {
  return new Set(Object.keys(manifest().exports).map(key => key.replace(/^\.\//, '')));
}

/**
 * Every entry point that has a component sheet, as key and sheet path. The
 * theme IS the layer, and a utility sheet (`projects/lib/styles/_<name>.scss`)
 * renders no component, so neither has a marker to hold.
 */
function sheetEntries(): [key: string, sheet: string][] {
  const out: [string, string][] = [];
  for (const [key, value] of Object.entries(manifest().exports)) {
    const target = typeof value === 'string' ? undefined : value.sass;
    if (target === undefined || key === './theme') continue;
    const sheet = join(LIB, target.replace(/^\.\//, ''));
    if (dirname(dirname(sheet)) === LIB) continue;
    out.push([key.replace(/^\.\//, ''), sheet]);
  }
  return out;
}

/** `@use 'x'` / `@forward 'x'` resolved the way Sass resolves a relative load. */
function resolveScss(from: string, spec: string): string | undefined {
  const base = join(dirname(from), spec);
  const name = basename(base);
  return [
    `${base}.scss`,
    join(dirname(base), `_${name}.scss`),
    join(base, '_index.scss'),
    join(base, 'index.scss'),
  ].find(existsSync);
}

/** Every SCSS file `entry` pulls in, transitively, including itself. */
function loaded(entry: string): string[] {
  const seen = new Set<string>();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.shift()!;
    if (seen.has(file) || !existsSync(file)) continue;
    seen.add(file);
    for (const m of code(file).matchAll(/@(?:use|forward)\s+'([^']+)'/g)) {
      if (m[1].startsWith('sass:')) continue;
      const next = resolveScss(file, m[1]);
      expect(next, `${relative(LIB, file)} loads '${m[1]}', which resolves to nothing`).toBeDefined();
      queue.push(next!);
    }
  }
  return [...seen];
}

/**
 * The `@include <ns>.loaded('<key>')` lines of a sheet, each with the file its
 * namespace resolves to: a `@use 'x/y' as z` binds `z`, a bare `@use 'x/y'`
 * binds `y`, the way Sass does.
 */
function markers(sheet: string): { key: string; module: string | undefined }[] {
  const src = code(sheet);
  const namespaces = new Map<string, string | undefined>();
  for (const m of src.matchAll(/@use\s+'([^']+)'(?:\s+as\s+([\w-]+))?/g)) {
    const alias = m[2] ?? basename(m[1]).replace(/^_/, '');
    namespaces.set(alias, resolveScss(sheet, m[1]));
  }
  return [...src.matchAll(/@include\s+([\w-]+)\.loaded\('([^']+)'\)/g)].map(m => ({
    key: m[2],
    module: namespaces.get(m[1]),
  }));
}

/**
 * The declarables of one entry point that paint, each with whether the class
 * body carries the guarded check for `key`.
 *
 * A `@Component` or `@Directive` with a `selector`, in the entry's own `.ts`
 * files (specs, harnesses and a nested entry point of its own left out). Three
 * shapes paint nothing of this sheet's and are skipped: a component with a
 * `styleUrl`, whose rules ship with it; a directive that injects `TemplateRef`,
 * which sits on an `<ng-template>` and renders no host; and a decorator with
 * no selector, which is a base class.
 */
function declarables(key: string): { where: string; checked: boolean }[] {
  const dir = join(LIB, key);
  const keys = entryKeys();
  const files: string[] = [];
  const walk = (at: string): void => {
    for (const name of readdirSync(at)) {
      const full = join(at, name);
      if (statSync(full).isDirectory()) {
        if (name === 'testing' || name === 'styles' || name === 'node_modules') continue;
        if (keys.has(relative(LIB, full))) continue;
        walk(full);
      } else if (name.endsWith('.ts') && !name.endsWith('.spec.ts')) {
        files.push(full);
      }
    }
  };
  walk(dir);

  const out: { where: string; checked: boolean }[] = [];
  for (const file of files) {
    const src = code(file);
    const starts = [...src.matchAll(/@(Component|Directive)\(\{/g)];
    starts.forEach((start, i) => {
      const end = i + 1 < starts.length ? starts[i + 1].index : src.length;
      const chunk = src.slice(start.index, end);
      const meta = chunk.slice(0, chunk.indexOf('\n})'));
      const selector = /\bselector:\s*['"`]([^'"`]+)/.exec(meta)?.[1];
      if (selector === undefined || /\bstyleUrl\b/.test(meta)) return;
      if (start[1] === 'Directive' && /inject(?:<[^(]*>)?\(TemplateRef\)/.test(chunk)) return;
      out.push({
        where: `${relative(LIB, file)} (${selector})`,
        checked: chunk.includes(`${GUARD}wrCheckStyles('${key}');`),
      });
    });
  }
  return out;
}

describe('every entry point with a stylesheet declares its marker', () => {
  const entries = sheetEntries().filter(([key]) => !LOADED_BY_ITS_CONSUMERS.includes(key));

  it('includes the theme mixin once, under its own exports key', () => {
    const offenders: string[] = [];

    for (const [key, sheet] of entries) {
      const found = markers(sheet);
      const name = relative(LIB, sheet);
      if (found.length !== 1) offenders.push(`${name} includes loaded() ${found.length} times`);
      for (const { key: declared, module } of found) {
        if (declared !== key) offenders.push(`${name} declares '${declared}', its key is '${key}'`);
        if (module === undefined || !loaded(module).includes(MIXIN)) {
          offenders.push(`${name} calls loaded() through a namespace that is not the theme's mixin`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('exempts only a sheet every consumer reaches through another entry', () => {
    for (const key of LOADED_BY_ITS_CONSUMERS) {
      const sheet = sheetEntries().find(([k]) => k === key)?.[1];
      expect(sheet, `${key} ships no stylesheet`).toBeDefined();
      expect(markers(sheet!), `${key} declares a marker now`).toEqual([]);
      const dependants = sheetEntries().filter(([k, entry]) => k !== key && loaded(entry).includes(sheet!));
      expect(dependants.length, `nothing loads ${key}`).toBeGreaterThan(0);
    }
  });

  it('marks the theme itself with the token layer', () => {
    expect(markers(join(LIB, 'theme/styles/_index.scss'))).toEqual([{ key: 'theme', module: MIXIN }]);
    expect(loaded(join(LIB, 'theme/_index.scss'))).toContain(MIXIN);
  });

  it('spells a nested key with dashes, and brings a rendered entry point along', () => {
    // `ngwr/table` renders checkboxes and a pager and loads both sheets, so a
    // `<wr-checkbox>` inside a table warns nothing when only `@use 'ngwr/table'`
    // was added. `charts/bar-chart` is the nested shape of the key.
    const css = sass.compileString("@use 'table/styles' as t; @use 'charts/bar-chart/styles' as b;", {
      loadPaths: [LIB],
      style: 'expanded',
    }).css;
    const emitted = [...css.matchAll(/--wr-loaded-([a-z-]+): 1/g)].map(m => m[1]);

    expect(emitted).toContain('theme');
    expect(emitted).toContain('table');
    expect(emitted).toContain('checkbox');
    expect(emitted).toContain('pagination');
    expect(emitted).toContain('charts-bar-chart');
    expect(emitted).toContain('charts-chart-legend');
    expect(new Set(emitted).size, 'a marker emitted twice').toBe(emitted.length);
  });

  it('keeps the marker out of every styleUrl bundle', () => {
    // `package.spec.ts` keeps the `:root` token block out of a `styleUrl`'s
    // closure; the mixin declares on `:root` too, and `_rules.scss` is what a
    // `styleUrl` reaches, so the include has to sit in `_index.scss` only.
    for (const rules of entries.map(([, sheet]) => join(dirname(sheet), '_rules.scss')).filter(existsSync)) {
      expect(loaded(rules), `${relative(LIB, rules)} reaches the marker mixin`).not.toContain(MIXIN);
    }
  });

  it('finds every sheet the manifest advertises', () => {
    const exported = Object.entries(manifest().exports).filter(
      ([key, value]) => typeof value !== 'string' && value.sass !== undefined && key !== './theme'
    );
    const utility = exported.filter(([, value]) => (value as { sass: string }).sass.startsWith('./styles/'));
    expect(sheetEntries()).toHaveLength(exported.length - utility.length);
    expect(utility.length).toBeGreaterThanOrEqual(5);
  });
});

describe('every component of such an entry point checks for its sheet', () => {
  const entries = sheetEntries().filter(([key]) => !LOADED_BY_ITS_CONSUMERS.includes(key));

  it('calls wrCheckStyles with its own key, behind the ngDevMode guard', () => {
    const offenders: string[] = [];
    for (const [key] of entries) {
      for (const { where, checked } of declarables(key)) {
        if (!checked) offenders.push(`${where} never calls ${GUARD}wrCheckStyles('${key}')`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it('names no other entry point, and no entry point without a sheet', () => {
    // A key copied from the neighbouring file would send a reader to add the
    // wrong line, and a call from an entry with no sheet would warn forever.
    const sheets = new Set(sheetEntries().map(([key]) => key));
    const offenders: string[] = [];
    const walk = (at: string): void => {
      for (const name of readdirSync(at)) {
        const full = join(at, name);
        if (statSync(full).isDirectory()) {
          if (name !== 'node_modules') walk(full);
          continue;
        }
        if (!name.endsWith('.ts') || name.endsWith('.spec.ts') || name === 'check-styles.ts') continue;
        const sub = relative(LIB, full);
        for (const m of code(full).matchAll(/wrCheckStyles\('([^']+)'\)/g)) {
          if (!sub.startsWith(`${m[1]}/`)) offenders.push(`${sub} checks '${m[1]}'`);
          else if (!sheets.has(m[1])) offenders.push(`${sub} checks '${m[1]}', which ships no sheet`);
        }
      }
    };
    walk(LIB);

    expect(offenders).toEqual([]);
  });

  it('finds the declarables it judges', () => {
    // A scan that quietly matched nothing would report the invariant held.
    const all = entries.flatMap(([key]) => declarables(key));
    expect(all.length).toBeGreaterThanOrEqual(150);
    expect(all.map(d => d.where)).toContain('select/select.ts (wr-select)');
    expect(all.map(d => d.where)).toContain('input/directives/wr-input.ts (input[wrInput], textarea[wrInput])');
    // The three shapes that are skipped, each by one named case.
    expect(all.map(d => d.where)).not.toContain('card/card.ts (wr-card)');
    expect(all.map(d => d.where)).not.toContain('table/table-cell.ts ([wrTableCell])');
    expect(declarables('tabs').map(d => d.where)).not.toContain('tabs/router/tabs-routing.ts ([wrTabsRouting])');
  });
});
