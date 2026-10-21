import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * The theme layer against the stylesheets that consume it.
 *
 * Everything here is a SOURCE assertion, and that is a limit rather than a
 * shortcut: jsdom applies no stylesheet cascade, so no rendered-DOM spec in this
 * repo can see a token resolve, a `light-dark()` pick its side, or a focus ring
 * paint. A unit test cannot see Sass, so it must not pretend to. What a file
 * scan CAN hold is the structural half, which is where these defects lived: a
 * stylesheet that references a token layer it never loads, a dark rule keyed on
 * a selector instead of on the scheme, and a documented token nothing includes.
 *
 * The compiled result is covered elsewhere: `sass-entry.spec.ts` compiles the
 * token layer, and `pnpm build:showcase` compiles every entry point, so a mixin
 * that does not parse fails there rather than here.
 */
const LIB = join(process.cwd(), 'projects/lib');
const THEME_STYLES = join(LIB, 'theme/styles');

/** Comments stripped, so a `[data-theme=…]` inside prose is not a violation. */
function code(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/[^\n]*/g, '$1');
}

/** `@use 'x'` / `@forward 'x'` resolved the way Sass resolves a relative load. */
function resolveScss(from: string, spec: string): string | undefined {
  const base = join(dirname(from), spec);
  const name = base.split('/').pop()!;
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

/** Every `.scss` under `dir`, so a check can read the whole library at once. */
function scssFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (at: string): void => {
    for (const name of readdirSync(at)) {
      if (name === 'node_modules') continue;
      const full = join(at, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (full.endsWith('.scss')) out.push(full);
    }
  };
  walk(dir);
  return out;
}

/**
 * Every public Sass entry, read from the `exports` map's `sass` conditions.
 *
 * **Not a directory walk, and that distinction is the whole reason this file's
 * own invariant could sit here stated correctly while four of its subjects were
 * broken.** The walk this replaced looked for `<dir>/styles/_index.scss`, which
 * is the shape 108 of the entries happen to have — and the five utility sheets
 * are `projects/lib/styles/_<name>.scss`, so `ngwr/grid`, `ngwr/reset`,
 * `ngwr/animations`, `ngwr/typography-utilities` and `ngwr/breakpoints` were
 * never enumerated at all. Three of the four that reference a token went on
 * referencing one for several majors, and the fourth was broken on this branch
 * by a spacing conversion, under a green run of this very spec.
 *
 * AGENTS.md already names the source of truth — "read from the `exports` map in
 * `projects/lib/package.json`, not from the directory tree" — and
 * `pnpm gen:exports` is what keeps it honest. `./theme` is skipped because it
 * IS the layer.
 */
function styleEntries(): string[] {
  return Object.entries(styleExports())
    .filter(([key]) => key !== './theme')
    .map(([, target]) => join(LIB, target.replace(/^\.\//, '')));
}

/**
 * The subset of {@link styleEntries} that belongs to a component.
 *
 * A utility sheet lives at `projects/lib/styles/_<name>.scss`, so going up two
 * levels from it lands on the library root rather than on an entry's own
 * folder. The check below keys by exactly that, and with the utility sheets in
 * the list it read the root as one nameless entry and attributed every
 * component in the library to it. A sheet with no component directory renders
 * no component, which is the honest reason to leave it out rather than a
 * special case.
 */
function componentStyleEntries(): string[] {
  return styleEntries().filter(entry => dirname(dirname(entry)) !== LIB);
}

/** The `exports` keys that carry a `sass` condition, to the file each resolves to. */
function styleExports(): Record<string, string> {
  const manifest = JSON.parse(readFileSync(join(LIB, 'package.json'), 'utf8')) as {
    exports: Record<string, { sass?: string } | string>;
  };
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(manifest.exports)) {
    const target = typeof value === 'string' ? undefined : value.sass;
    if (target !== undefined) out[key] = target;
  }
  return out;
}

const DECLARED = /(--wr-[a-z0-9-]+)\s*:/g;
const REFERENCED = /var\(\s*(--wr-[a-z0-9-]+)\s*[,)]/g;

/**
 * Token names the theme layer publishes.
 *
 * The literal declarations, plus every `--wr-color-*`: the intent shades are
 * declared through interpolation (`--wr-color-#{$name}-dark`), so no literal
 * scan reaches them, and the only components that spell that prefix out are
 * declaring their own hook — `--wr-color-picker-width` — which the caller has
 * already subtracted as one of its own.
 */
function themeTokens(): (name: string) => boolean {
  const literal = new Set<string>();
  for (const file of readdirSync(THEME_STYLES)) {
    for (const m of code(join(THEME_STYLES, file)).matchAll(DECLARED)) literal.add(m[1]);
  }
  return name => literal.has(name) || name.startsWith('--wr-color-');
}

describe('a style entry point loads the token layer it paints with', () => {
  /**
   * `@use 'ngwr/event-calendar'` emitted 5.5 kB of rules and no tokens at all —
   * 57 unresolved `var(--wr-*)` references, so the grid lines (drawn with
   * `box-shadow`, which has no per-reference fallback) disappeared and the text
   * fell back to black. It was the ONLY entry of the ~120 in that state, which
   * is why nobody found it by reading: ten others also skip the load, and every
   * one of them is right to, because it references no token.
   *
   * So the invariant is not "every entry loads the theme". It is "an entry that
   * cannot resolve a name by itself must load the layer that declares it".
   */
  const isTheme = themeTokens();

  it('leaves no theme token unresolved in any entry point', () => {
    const offenders: string[] = [];

    for (const entry of styleEntries()) {
      const files = loaded(entry);
      if (files.some(f => f.startsWith(THEME_STYLES))) continue;

      const own = new Set<string>();
      const referenced = new Set<string>();
      for (const file of files) {
        const src = code(file);
        for (const m of src.matchAll(DECLARED)) own.add(m[1]);
        for (const m of src.matchAll(REFERENCED)) referenced.add(m[1]);
      }

      const unresolved = [...referenced].filter(name => !own.has(name) && isTheme(name));
      if (unresolved.length > 0) {
        offenders.push(
          `${relative(LIB, entry)} references ${unresolved.length} token(s) it never loads, e.g. ${unresolved.sort()[0]}`
        );
      }
    }

    expect(offenders).toEqual([]);
  });

  /**
   * Three guards, and each one is a way this spec has already read green while
   * being blind.
   *
   * The count is held against the MANIFEST rather than a floor. The floor it
   * replaces was `>= 105` against a walk that found 109 of the 113 — four
   * missing entries fitted inside the slack, which is exactly what a floor is
   * for and exactly why it was the wrong instrument here.
   */
  it('enumerates every entry point the manifest advertises styles for', () => {
    const exported = Object.keys(styleExports()).filter(key => key !== './theme');
    expect(styleEntries()).toHaveLength(exported.length);
    for (const entry of styleEntries()) {
      expect(existsSync(entry), `${relative(LIB, entry)} is in the exports map and not on disk`).toBe(true);
    }
  });

  /**
   * The five whose shape the directory walk could not reach, BY NAME.
   *
   * A count is satisfiable by any 113 files. Naming these pins the one shape
   * that was missing, and no resolver that matched nothing can satisfy it.
   */
  it('includes the utility sheets that do not live in a <name>/styles folder', () => {
    const keys = Object.keys(styleExports());
    for (const key of ['./grid', './reset', './animations', './typography-utilities', './breakpoints']) {
      expect(keys, `${key} has no sass condition in the exports map`).toContain(key);
    }
    const files = styleEntries().map(f => relative(LIB, f));
    for (const name of ['styles/_grid.scss', 'styles/_reset.scss', 'styles/_animations.scss']) {
      expect(files, `${name} is not enumerated`).toContain(name);
    }
  });

  /**
   * That the DETECTOR is alive, not merely that the roster is complete.
   *
   * "No offenders" and "the rule stopped matching" print identically, and this
   * repo has shipped the second: a `\b` after a hyphen made a spec pass with
   * the rule it tested deleted. So the same predicate that judges the catalog
   * is pointed at a sheet built to fail.
   */
  it('reports a sheet that reads a theme token without loading the layer', () => {
    const canary = join(LIB, 'styles/_breakpoints.scss');
    const files = loaded(canary);
    expect(
      files.some(f => f.startsWith(THEME_STYLES)),
      'the canary must not load the theme'
    ).toBe(false);

    const own = new Set<string>();
    for (const file of files) for (const m of code(file).matchAll(DECLARED)) own.add(m[1]);

    // The shape the real check looks for, against a token the theme does declare.
    const synthetic = '.wr-canary { font-size: var(--wr-text-2xl); }';
    const referenced = [...synthetic.matchAll(REFERENCED)].map(m => m[1]);
    expect(referenced).toEqual(['--wr-text-2xl']);
    expect(referenced.filter(name => !own.has(name) && isTheme(name))).toEqual(['--wr-text-2xl']);
  });
});

describe('the border strengths really ascend', () => {
  /**
   * A strength scale whose middle step is the strongest is a scale that lies,
   * and this one did: `-strong` was `rgba(gray-4, 0.6)` while `-base` was the
   * OPAQUE `gray-4`, so composited on the canvas `strong` read 1.26:1 against
   * `base`'s 1.48:1. Nothing caught it because the two halves lived in
   * different namespaces — `--wr-color-outline` and `--wr-color-border-strong`
   * — so nothing ever put them side by side.
   *
   * Resolved through the ramp rather than read as literals: every one of the
   * three is a `var()` now, and a spec that accepted a string would pass on the
   * inversion it exists to refuse. Each scheme is the matching argument of the
   * `light-dark()` a token is declared with, or the one value where the two
   * schemes agree.
   */
  const CANVAS = { light: '#ffffff', dark: '#0b1120' } as const;

  /** `light-dark(a, b)` read as `a` or `b`; any other value is the same in both schemes. */
  function side(value: string, scheme: 'light' | 'dark'): string {
    const pair = /^light-dark\(\s*((?:var\([^()]*\)|[^,()])+?)\s*,\s*((?:var\([^()]*\)|[^,()])+?)\s*\)$/.exec(value);
    if (!pair) return value;
    return scheme === 'light' ? pair[1] : pair[2];
  }

  function ramp(scheme: 'light' | 'dark'): Map<string, string> {
    const src = code(join(THEME_STYLES, '_colors.scss'));
    const out = new Map<string, string>();
    for (const m of src.matchAll(/(--wr-color-gray-[\w-]+|--wr-border-[a-z]+):\s*([^;]+);/g)) {
      out.set(m[1], side(m[2].trim(), scheme));
    }
    return out;
  }

  /** `var(--x)` chased to a `#rrggbb`, or `null` when it is not a plain hex. */
  function hex(name: string, scale: Map<string, string>, depth = 0): string | null {
    if (depth > 6) return null;
    const raw = scale.get(name);
    if (raw === undefined) return null;
    if (/^#[0-9a-f]{6}$/i.test(raw)) return raw;
    const ref = /^var\(\s*(--[\w-]+)\s*\)$/.exec(raw);
    return ref ? hex(ref[1], scale, depth + 1) : null;
  }

  function contrast(fg: string, bg: string): number {
    const lum = (h: string): number => {
      const ch = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
      const f = (c: number): number => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
      return 0.2126 * f(ch[0]) + 0.7152 * f(ch[1]) + 0.0722 * f(ch[2]);
    };
    const [a, b] = [lum(fg), lum(bg)];
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }

  it.each(['light', 'dark'] as const)('subtle < base < strong in the %s scheme', scheme => {
    const scale = ramp(scheme);
    const seen = (['--wr-border-subtle', '--wr-border-base', '--wr-border-strong'] as const).map(name => {
      const value = hex(name, scale);
      expect(value, `${name} does not resolve to a hex in ${scheme}`).not.toBeNull();
      return { name, ratio: contrast(value!, CANVAS[scheme]) };
    });

    expect(seen.map(s => s.name)).toEqual([...seen].sort((a, b) => a.ratio - b.ratio).map(s => s.name));
  });
});

describe('an entry point loads the styles of the components it renders', () => {
  /**
   * The same invariant as the token one above, one level up — and v15 is what
   * exposed it. Removing the `@use 'ngwr'` umbrella means a consumer writes one
   * `@use` per component they PLACE, and they never learn about the components a
   * component places inside itself. Measured when this was written: 47 pairs.
   * `@use 'ngwr/date-picker'` gave a date field with a raw browser input — grey,
   * square, 2px inset — because the picker renders `[wrInput]` and loaded none of
   * `ngwr/input`; `@use 'ngwr/table'` gave unstyled checkboxes and an unstyled
   * pager; `@use 'ngwr/schema-form'` drew ten controls and styled none of them.
   *
   * Nothing said so. The component renders, the markup is right, every gate is
   * green, and the only symptom is on screen.
   *
   * Read from the `imports: []` of each entry point's own components, because
   * that is the list Angular itself resolves a template against — a class scan
   * would miss `[wrInput]`, which adds `.wr-input` at runtime and appears in no
   * template as text. An entry point that ships no stylesheet is skipped: there
   * is nothing to load.
   */
  /** Every exported `Wr*` symbol to the entry point that exports it. */
  function symbolOwners(): Map<string, string> {
    const out = new Map<string, string>();
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        if (name === 'node_modules' || name === 'testing') continue;
        const full = join(dir, name);
        if (statSync(full).isDirectory()) {
          walk(full);
          continue;
        }
        if (name !== 'public-api.ts') continue;
        const sub = relative(LIB, dirname(full));
        for (const m of readFileSync(full, 'utf8').matchAll(/export \{([^}]*)\} from/g)) {
          for (const raw of m[1].split(',')) {
            const symbol = raw.replace(/\btype\b/, '').trim();
            if (/^Wr[A-Za-z0-9]+$/.test(symbol)) out.set(symbol, sub);
          }
        }
      }
    };
    walk(LIB);
    return out;
  }

  it('leaves no component rendering another entry point it never loads', () => {
    const owners = symbolOwners();
    const entryOfStyle = new Map(componentStyleEntries().map(e => [relative(LIB, dirname(dirname(e))), e]));
    const offenders = new Set<string>();

    for (const [sub, entry] of entryOfStyle) {
      const loadedFiles = new Set(loaded(entry));
      const walk = (dir: string): void => {
        for (const name of readdirSync(dir)) {
          if (name === 'node_modules' || name === 'testing') continue;
          const full = join(dir, name);
          if (statSync(full).isDirectory()) {
            walk(full);
            continue;
          }
          if (!name.endsWith('.ts') || name.endsWith('.spec.ts')) continue;
          const list = /imports:\s*\[([^\]]*)\]/.exec(readFileSync(full, 'utf8'))?.[1];
          if (list === undefined) continue;
          for (const raw of list.split(',')) {
            const from = owners.get(raw.trim());
            if (from === undefined || from === sub) continue;
            const theirs = entryOfStyle.get(from);
            if (theirs === undefined || loadedFiles.has(theirs)) continue;
            offenders.add(`ngwr/${sub} renders ${raw.trim()} and never loads ngwr/${from}`);
          }
        }
      };
      walk(join(LIB, sub));
    }

    expect([...offenders].sort()).toEqual([]);
  });

  it('finds the components an entry point renders', () => {
    // A symbol map that quietly matched nothing would report the invariant held.
    expect(symbolOwners().size).toBeGreaterThanOrEqual(150);
  });
});

describe('a bare .wr-icon__svg is sized by the entry point that draws it', () => {
  /**
   * The CLASS version of the invariant above, and it shipped broken.
   *
   * Fifteen entry points draw an inline `<svg class="wr-icon__svg">` for a bit
   * of chrome — the alert and toast close ✕, the password-toggle eye, the
   * pagination and select chevrons, the tree and cascader carets, the table's
   * sort and filter glyphs. The rule that gives them a size lived in
   * `ngwr/icon`, which none of those fifteen load and no component's documented
   * installation asks for. An SVG with no intrinsic size is 0×0, so a consumer
   * who followed `<wr-alert>`'s own install recipe got a close button 4px wide
   * that still announced itself as "Close alert" — and nothing in the build,
   * the console or any of the nine gates said a word.
   *
   * It is the only class in the library that one entry point draws and another
   * declares, which is why this is pinned by name rather than swept: every
   * other `.wr-*` class is written as a BEM nest under its own block, so a
   * literal scan cannot see it and a compile-everything sweep is minutes.
   */
  const GLYPH = 'wr-icon__svg';

  /** Entry points whose templates draw a bare `.wr-icon__svg`. */
  function drawers(): string[] {
    const out = new Set<string>();
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        if (name === 'node_modules' || name === 'testing') continue;
        const full = join(dir, name);
        if (statSync(full).isDirectory()) {
          walk(full);
          continue;
        }
        const isTemplate = name.endsWith('.html') || (name.endsWith('.ts') && !name.endsWith('.spec.ts'));
        if (!isTemplate || !readFileSync(full, 'utf8').includes(`class="${GLYPH}"`)) continue;
        // Walk up to the directory holding `styles/_index.scss` — the entry point.
        let at = dirname(full);
        while (at.startsWith(LIB) && !existsSync(join(at, 'styles/_index.scss'))) at = dirname(at);
        if (at.startsWith(LIB)) out.add(join(at, 'styles/_index.scss'));
      }
    };
    walk(LIB);
    return [...out].sort();
  }

  it("is declared somewhere in every drawing entry point's own load closure", () => {
    // `\\b` is NOT enough: a hyphen is a non-word character, so a renamed
    // `.wr-icon__svg-gone` would still match and this spec would pass on the
    // very bug it exists for — which it did, until the rename was tried.
    const rule = new RegExp(`\\.${GLYPH}\\s*[,{]`);
    const offenders = drawers().filter(entry => !loaded(entry).some(f => rule.test(code(f))));

    expect(offenders.map(f => relative(LIB, f))).toEqual([]);
  });

  it('finds the entry points that draw one', () => {
    // A template scanner that matched nothing would report the invariant as held.
    expect(drawers().length).toBeGreaterThanOrEqual(12);
  });
});

describe('the colour scheme is one switch', () => {
  /**
   * v15 moved dark mode from a `[data-theme='dark']` selector to the CSS
   * standard: `color-scheme: light dark` on `:root`, and every value that differs
   * between the schemes written as a `light-dark()`. The two cannot be mixed. A
   * rule keyed on the attribute matches nothing once `WrTheme` stops writing it;
   * a `@media (prefers-color-scheme: …)` answers the OS while `WrTheme` has
   * forced the other scheme inline; and either one ignores a subtree that sets
   * its own `color-scheme`. None of the three fails a build or a test — the
   * page simply paints the wrong scheme in one place.
   */
  const files = scssFiles(LIB);

  it('keys no rule on a theme attribute or a dark helper', () => {
    const offenders: string[] = [];

    for (const file of files) {
      const src = code(file);
      if (/\[data-theme|dark-selector\(|@include\s+(?:[\w-]+\.)?dark(?![\w-])|\$theme-attribute/.test(src)) {
        offenders.push(relative(LIB, file));
      }
    }

    expect(offenders).toEqual([]);
  });

  it('never answers prefers-color-scheme from a stylesheet', () => {
    const offenders = files.filter(file => /prefers-color-scheme/.test(code(file))).map(file => relative(LIB, file));

    expect(offenders).toEqual([]);
  });

  /**
   * A custom property registered as `<color>` resolves its `light-dark()` where
   * it is DECLARED, so one that inherits from `:root` carries the root's scheme
   * into a subtree that set its own — measured in every engine. A
   * non-inheriting one declared on a component host resolves per host, which is
   * the safe form, and the one a canvas component reaches for when it needs a
   * resolved colour.
   */
  it('registers no inheriting colour property', () => {
    const offenders: string[] = [];

    for (const file of files) {
      for (const m of code(file).matchAll(/@property\s+(--[\w-]+)\s*\{([^}]*)\}/g)) {
        if (/syntax\s*:\s*['"]<color>['"]/.test(m[2]) && !/inherits\s*:\s*false/.test(m[2])) {
          offenders.push(`${relative(LIB, file)}: ${m[1]}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('finds the stylesheets it judges', () => {
    // A walk that quietly matched nothing would report every rule as clean.
    expect(files.length).toBeGreaterThanOrEqual(120);
  });
});

describe('every placeholder reads the placeholder role', () => {
  /**
   * `--wr-color-placeholder` is the one place a placeholder's colour is decided,
   * and AGENTS.md, the colours guide and the token's own comment all say every
   * field in the catalog reads it. A placeholder rule that reaches past it — to
   * the muted role it equals today, to a literal, or through a component hook
   * whose default is either — breaks that promise with nothing painted to show
   * for it: an app that sets the token restyles every field but that one, and a
   * later retune of the role skips it. No contrast sweep can see the drift while
   * the two values agree, and a placeholder drawn as generated content
   * (`&__placeholder::before`) is outside the contrast probe altogether. So the
   * rule is held here, at the source: every `color` a placeholder rule declares
   * is the role itself, or a `--wr-<name>-placeholder` hook whose every
   * declaration is the role.
   */
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap(name => {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) return name === 'node_modules' || full === THEME_STYLES ? [] : walk(full);
      return name.endsWith('.scss') ? [full] : [];
    });

  /** Comments stripped, and `#{…}` masked so its braces open no block. */
  const sources = walk(LIB).map(file => ({ file, src: code(file).replace(/#\{[^}]*\}/g, m => '_'.repeat(m.length)) }));

  /** Every value each `--wr-<name>-placeholder` hook is declared with. */
  const hooks = new Map<string, Set<string>>();
  for (const { src } of sources) {
    for (const m of src.matchAll(/(--wr-[a-z0-9-]+-placeholder)\s*:\s*([^;]+);/g)) {
      hooks.set(m[1], (hooks.get(m[1]) ?? new Set()).add(m[2].trim()));
    }
  }

  const ROLE = 'var(--wr-color-placeholder)';

  /** Each `color` a `::placeholder` or `__placeholder` rule declares at its own level. */
  const painted: { where: string; value: string }[] = [];
  for (const { file, src } of sources) {
    for (const opener of src.matchAll(/([^{};]*)\{/g)) {
      const selector = opener[1].trim().replace(/\s+/g, ' ');
      if (!/::placeholder|__placeholder\b/.test(selector)) continue;
      // Walked by depth, so a nested rule's `color` is its own and a
      // declaration AFTER a nested rule is still this one's.
      let depth = 0;
      let segment = '';
      for (let i = (opener.index ?? 0) + opener[0].length; i < src.length; i++) {
        const ch = src[i];
        if (ch === '{' || ch === '}') {
          if (ch === '}' && depth === 0) break;
          depth += ch === '{' ? 1 : -1;
          segment = '';
          continue;
        }
        if (depth > 0) continue;
        if (ch !== ';') {
          segment += ch;
          continue;
        }
        const value = /^\s*color\s*:\s*([\s\S]+)$/.exec(segment)?.[1];
        if (value) painted.push({ where: `${relative(LIB, file)}: \`${selector}\``, value: value.trim() });
        segment = '';
      }
    }
  }

  it('paints with the role, directly or through a hook that defaults to it', () => {
    const offenders = painted.flatMap(({ where, value }) => {
      if (value === ROLE) return [];
      const hook = /^var\((--wr-[a-z0-9-]+-placeholder)\)$/.exec(value)?.[1];
      const defaults = hook ? [...(hooks.get(hook) ?? [])] : [];
      if (defaults.length > 0 && defaults.every(d => d === ROLE)) return [];
      return [
        `${where} paints ${value}${defaults.length > 0 ? `, which is declared as ${defaults.join(' and ')}` : ''}`,
      ];
    });
    expect(offenders).toEqual([]);
  });

  it('finds a plausible number of placeholders', () => {
    // A selector pattern that quietly matched nothing would report every
    // placeholder as reading the role. Ten when this was written: input,
    // textarea, input-otp, the select trigger and its two search fields,
    // cascader, tree, the command palette and the table filter.
    expect(painted.length).toBeGreaterThanOrEqual(10);
  });
});

describe('rebrand()', () => {
  const colors = code(join(THEME_STYLES, '_colors.scss'));

  /** The `--wr-color-<name>-…` suffixes a block emits, in source order. */
  const suffixes = (block: string): string[] =>
    [...block.matchAll(/--wr-color-#\{\$name\}(-[a-z]+)?\s*:/g)].map(m => m[1] ?? '');

  it('emits the same per-intent set the `:root` loop does', () => {
    // The two are separate loops on purpose — the `:root` one has to stay
    // literally in `:root` for `check:tokens`, which resolves an `@each` against
    // the list it iterates and cannot follow a mixin parameter. Separate means
    // they can drift, and a shade added to one and not the other is exactly the
    // half-recoloured subtree this mixin exists to end. Six: the base, its
    // `-contrast` and four shades — the `-rgb` that made it seven left in v15.
    const root = /@each \$name, \$base in \$base-colors \{([\s\S]*?)\n {2}\}/.exec(colors)?.[1];
    const rebrand = /@mixin rebrand\(.*?\) \{[\s\S]*?@each \$name, \$base in \$colors \{([\s\S]*?)\n {2}\}/.exec(
      colors
    )?.[1];

    expect(root).toBeDefined();
    expect(rebrand).toBeDefined();
    expect(suffixes(rebrand!)).toEqual(suffixes(root!));
    expect(suffixes(root!)).toHaveLength(6);
  });

  it('re-includes the composed tokens on the element it lands on', () => {
    // The half a hand-written subtree override cannot do at all. `-ink`, `-soft`,
    // `-soft-border`, `-soft-contrast` and `-active` are written in terms of
    // `var()`, and a custom property's references are substituted ON THE ELEMENT
    // THAT DECLARES IT — so declared at `:root` they inherit into a recoloured
    // subtree as the page's own literal, and an outlined button drew a pink
    // border around blue text.
    //
    // Read inside the mixin's own body — up to the brace that closes it at
    // column 0 — because `:root` includes `derived` too, and a lazy match from
    // the mixin's head would find that one if this one went missing.
    const body = /@mixin rebrand\(.*?\) \{([\s\S]*?)\n\}/.exec(colors)?.[1];

    expect(body).toBeDefined();
    expect(body).toContain('\n  @include derived;');
  });

  it('refuses an intent the token set has no room for', () => {
    // A typo would otherwise emit a `--wr-color-brnad-*` family that resolves for
    // nothing and paints nowhere — the silent half of a rebrand, again.
    expect(/@mixin rebrand[\s\S]*?@error/.test(colors)).toBe(true);
  });
});
