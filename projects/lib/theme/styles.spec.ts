import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * The theme layer against the stylesheets that consume it.
 *
 * Everything here is a SOURCE assertion, and that is a limit rather than a
 * shortcut: jsdom applies no stylesheet cascade, so no rendered-DOM spec in this
 * repo can see a token resolve, a dark block win, or a focus ring paint. The
 * house rule `palette.spec.ts` states — "a unit test cannot see Sass, so it must
 * not pretend to" — holds here too. What a file scan CAN hold is the structural
 * half, which is where all three of these defects lived: a stylesheet that
 * references a token layer it never loads, a dark block keyed on an attribute
 * name the consumer has renamed, and a documented token nothing includes.
 *
 * The compiled result is covered elsewhere: `pnpm check:theme` reads the BUILT
 * stylesheet, and `pnpm build:showcase` compiles the umbrella, so a mixin that
 * does not parse fails there rather than here.
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

/** Every `<name>/styles/_index.scss` under `projects/lib` — the public Sass entries. */
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

function styleEntries(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name === 'schematics' || name === 'mcp') continue;
      const full = join(dir, name);
      if (!statSync(full).isDirectory()) continue;
      const index = join(full, 'styles/_index.scss');
      if (existsSync(index)) out.push(index);
      walk(full);
    }
  };
  walk(LIB);
  return out;
}

/** Component file to the stylesheet its `styleUrl` names. */
function styleUrls(): Map<string, string> {
  const found = new Map<string, string>();
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules') continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!name.endsWith('.ts') || name.endsWith('.spec.ts')) continue;
      const url = /styleUrl:\s*'\.\/([\w.-]+\.scss)'/.exec(readFileSync(full, 'utf8'))?.[1];
      if (url === undefined) continue;
      const scss = join(dirname(full), url);
      if (existsSync(scss)) found.set(relative(LIB, full), scss);
    }
  };
  walk(LIB);
  return found;
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

  it('checks a plausible number of entry points', () => {
    // A resolver that quietly matched nothing would report the invariant as held.
    expect(styleEntries().length).toBeGreaterThanOrEqual(105);
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
   * inversion it exists to refuse.
   */
  const CANVAS = { light: '#ffffff', dark: '#0b1120' } as const;

  function ramp(theme: 'light' | 'dark'): Map<string, string> {
    const src = code(join(THEME_STYLES, theme === 'dark' ? '_dark.scss' : '_colors.scss'));
    const out = new Map<string, string>();
    for (const m of src.matchAll(/(--wr-color-gray-[\w-]+|--wr-border-[a-z]+):\s*([^;]+);/g)) {
      out.set(m[1], m[2].trim());
    }
    // The dark file re-declares only part of the ramp; the rest inherits.
    if (theme === 'dark') {
      for (const [k, v] of ramp('light')) if (!out.has(k)) out.set(k, v);
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

  it.each(['light', 'dark'] as const)('subtle < base < strong in the %s theme', theme => {
    const scale = ramp(theme);
    const seen = (['--wr-border-subtle', '--wr-border-base', '--wr-border-strong'] as const).map(name => {
      const value = hex(name, scale);
      expect(value, `${name} does not resolve to a hex in ${theme}`).not.toBeNull();
      return { name, ratio: contrast(value!, CANVAS[theme]) };
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
    const entryOfStyle = new Map(styleEntries().map(e => [relative(LIB, dirname(dirname(e))), e]));
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

describe('the dark block is keyed on the configured attribute', () => {
  /**
   * `provideWrTheme({ attribute: 'data-color-mode' })` has a Sass half — `@use
   * 'ngwr' with ($theme-attribute: 'data-color-mode')` — and only the configured
   * name is emitted, because keeping `data-theme` as a second selector re-couples
   * ngwr to whatever design system already owns it. Seven component stylesheets
   * wrote the literal anyway, so their dark values were the one part of the
   * catalog a rename silently failed to carry.
   */
  it('is written with `dark-selector()` everywhere outside the theme layer', () => {
    const offenders: string[] = [];

    for (const [, scss] of styleUrls()) {
      for (const file of loaded(scss)) {
        if (code(file).includes('[data-theme')) offenders.push(relative(LIB, file));
      }
    }
    for (const entry of styleEntries()) {
      for (const file of loaded(entry)) {
        if (file.startsWith(THEME_STYLES)) continue;
        if (code(file).includes('[data-theme')) offenders.push(relative(LIB, file));
      }
    }

    expect([...new Set(offenders)]).toEqual([]);
  });

  it('is never inlined into a component bundle', () => {
    // The second half, and the one a `dark-selector()` sweep alone would miss. A
    // `styleUrl` is compiled when the LIBRARY is built, where `$theme-attribute`
    // can only be the default — and Angular appends that copy AFTER the app's
    // linked stylesheet, so a bundled dark block does not merely miss the rename,
    // it outranks the correctly-named rule beside it under the very attribute the
    // rename exists to escape.
    const offenders: string[] = [];

    for (const [component, scss] of styleUrls()) {
      for (const file of loaded(scss)) {
        if (/dark-selector\(\)|@include\s+(?:[\w-]+\.)?dark\b/.test(code(file))) {
          offenders.push(`${component} reaches ${relative(LIB, file)}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('reaches every component that has one, from the public Sass entry only', () => {
    const withDark = styleEntries().filter(entry =>
      loaded(entry).some(f => !f.startsWith(THEME_STYLES) && code(f).includes('dark-selector()'))
    );

    // The seven that carried the literal. Named by entry point rather than by
    // first path segment: they live under `bits/` since v15, and a
    // segment read would answer `bits` seven times and still pass.
    expect(withDark.map(f => relative(LIB, f).replace(/\/styles\/.*$/, '')).sort()).toEqual([
      'bits/aurora',
      'bits/border-glow',
      'bits/shiny-text',
      'bits/spotlight-card',
      'bits/star-border',
      'bits/tilt-card',
      'bits/waves',
    ]);
  });
});

describe('a channel-list token is never used in slash form', () => {
  /**
   * `--wr-color-*-rgb` holds `95, 108, 125` — three comma-separated numbers, not a
   * colour. CSS Color 4 allows `rgb(r g b / a)` with SPACES or the legacy
   * `rgba(r, g, b, a)` with commas, and mixing the two is invalid: `rgb(95, 108,
   * 125 / 30%)` parses as nothing and the declaration is dropped.
   *
   * It shipped twice — `.wr-card__spinner`'s ring and `.wr-loading-bar__fill`'s
   * glow — and both painted black for as long as they existed. Nothing caught it:
   * stylelint's `color-function-notation` and `alpha-value-notation` are null on
   * purpose, `check:contrast` measures text and target size, and a dropped
   * declaration leaves no trace in a build log. Measured in Chromium before the
   * fix: `rgb(var(--ch) / 30%)` computes to `rgb(0, 0, 0)`.
   */
  it('has no `rgb(var(--…-rgb) / a)` anywhere in the library', () => {
    const offenders: string[] = [];

    for (const file of scssFiles(LIB)) {
      const src = code(file);

      for (const m of src.matchAll(/rgba?\(\s*var\(--wr-[\w-]+-rgb\)\s*\/[^)]*\)/g)) {
        offenders.push(`${relative(LIB, file)}: ${m[0]}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});

describe('the focus ring', () => {
  const focus = code(join(THEME_STYLES, '_focus.scss'));

  /** Selectors in `_focus.scss` whose whole focus style is the shared mixin. */
  const included = new Set(
    [...focus.matchAll(/([^{}]+)\{\s*@include focus-ring;/g)].flatMap(m =>
      m[1]
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    )
  );

  it('reads nothing but its own tokens', () => {
    // The guide's promise is "retheme the ring once and every control follows —
    // the library's own mixin reads nothing else". A hard-coded colour or width
    // in here makes that sentence false for every selector below it.
    const body = /@mixin focus-ring \{([\s\S]*?)\n\}/.exec(focus)?.[1];
    expect(body).toBeDefined();
    expect([...body!.matchAll(/var\((--wr-[a-z0-9-]+)/g)].map(m => m[1]).sort()).toEqual([
      '--wr-focus-ring-color',
      '--wr-focus-ring-halo',
      '--wr-focus-ring-offset',
      '--wr-focus-ring-offset',
      '--wr-focus-ring-width',
    ]);
  });

  it('covers the button, and with it the pagination cells built out of one', () => {
    // The widest hole the ring could have had: `.wr-btn` is the host class on all
    // three forms of the button (`wr-btn`, `button[wr-btn]`, `a[wr-btn]`) and on
    // every pagination page and arrow, and none of them had a rule — so a
    // retheme of `--wr-focus-ring-*` left the UA outline, which no token reaches.
    expect(included.has('.wr-btn:focus-visible')).toBe(true);
    expect(included.has('.wr-table__sort-btn:focus-visible')).toBe(true);
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
    // half-recoloured subtree this mixin exists to end.
    const root = /@each \$name, \$base in \$base-colors \{([\s\S]*?)\n {2}\}/.exec(colors)?.[1];
    const rebrand = /@mixin rebrand\(\$colors\) \{([\s\S]*?)\n {2}\}/.exec(colors)?.[1];

    expect(root).toBeDefined();
    expect(rebrand).toBeDefined();
    expect(suffixes(rebrand!)).toEqual(suffixes(root!));
    expect(suffixes(root!)).toHaveLength(7);
  });

  it('re-includes the composed tokens on the element it lands on', () => {
    // The half a hand-written subtree override cannot do at all. `-ink`, `-soft`,
    // `-soft-border`, `-soft-contrast` and `-active` are written in terms of
    // `var()`, and a custom property's references are substituted ON THE ELEMENT
    // THAT DECLARES IT — so declared at `:root` they inherit into a recoloured
    // subtree as the page's own literal, and an outlined button drew a pink
    // border around blue text.
    expect(/@mixin rebrand\(\$colors\) \{[\s\S]*?\n {2}@include derived;\n\}/.test(colors)).toBe(true);
  });

  it('refuses an intent the token set has no room for', () => {
    // A typo would otherwise emit a `--wr-color-brnad-*` family that resolves for
    // nothing and paints nowhere — the silent half of a rebrand, again.
    expect(/@mixin rebrand[\s\S]*?@error/.test(colors)).toBe(true);
  });
});
