import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { WR_COLORS } from './colors';

/**
 * What `@use 'ngwr/theme'` GIVES a consumer, compiled rather than read.
 *
 * `styles.spec.ts` next door is source assertions on purpose, and says why. This
 * file is the exception, because what it pins only exists after Sass has run:
 * the declarations a `light-dark()` pair, a `rebrand()` or a `with (…)`
 * configuration actually emit. A source read sees `#{map.get($tokens, base)}`;
 * the browser sees whatever that interpolates to, and the defects worth
 * catching here — a dangling `var()`, a `light-dark()` holding a length, a
 * channel list that came back — are only visible in the second.
 *
 * `sass` is resolved through `@angular/build` rather than declared: the repo has
 * no direct dependency on it, it is present because the builder compiles with
 * it, and a spec is not a reason to add a second copy to the tree.
 */
interface Sass {
  compileString(source: string, options: { loadPaths: string[]; style: 'expanded' }): { css: string };
}

const sass = createRequire(createRequire(import.meta.url).resolve('@angular/build/package.json'))('sass') as Sass;

const LIB = join(process.cwd(), 'projects/lib');
const THEME = join(LIB, 'theme');

/**
 * Compile `source` with `projects/lib` on the load path, so `@use 'theme'` is the
 * public entry. Loud comments are stripped: the theme's `/** … *\/` docblocks
 * survive into expanded output, and prose naming `light-dark($light, $dark)` is
 * not a declaration.
 */
const compile = (source: string): string =>
  sass.compileString(source, { loadPaths: [LIB], style: 'expanded' }).css.replace(/\/\*[\s\S]*?\*\//g, '');

/** The custom properties a stylesheet declares, last declaration winning, by name. */
function declarations(css: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of css.matchAll(/(--wr-[\w-]+)\s*:\s*([^;]+);/g)) out.set(m[1], m[2].trim().replace(/\s+/g, ' '));
  return out;
}

/** The arguments of every `light-dark()` in `css`, split at their own top-level comma. */
function lightDarkPairs(css: string): [string, string][] {
  const pairs: [string, string][] = [];
  for (let at = css.indexOf('light-dark('); at !== -1; at = css.indexOf('light-dark(', at + 1)) {
    let depth = 0;
    let comma = -1;
    let end = -1;
    for (let i = at + 'light-dark'.length; i < css.length && end === -1; i++) {
      if (css[i] === '(') depth++;
      else if (css[i] === ')' && --depth === 0) end = i;
      else if (css[i] === ',' && depth === 1 && comma === -1) comma = i;
    }
    pairs.push([css.slice(at + 'light-dark('.length, comma).trim(), css.slice(comma + 1, end).trim()]);
  }
  return pairs;
}

/**
 * The parameter list of every mixin and function a file declares, by name.
 *
 * `()` normalises to empty: `@mixin focus-ring()` and `@mixin focus-ring` take
 * the same nothing, and a gate that reported those as drift would be noise at
 * exactly the moment someone reads it. One level of nesting is read, because
 * `rebrand($colors, $dark: ())` carries a default that is itself a pair of
 * parentheses, and a list cut at its first `)` would compare a prefix.
 */
function signatures(file: string): Record<string, string> {
  const src = readFileSync(file, 'utf8');
  const out: Record<string, string> = {};

  for (const m of src.matchAll(/^@(mixin|function)\s+([\w-]+)\s*(\((?:[^()]|\([^()]*\))*\))?/gm)) {
    const params = (m[3] ?? '').replace(/\s+/g, '');
    out[m[2]] = params === '()' ? '' : params;
  }

  return out;
}

describe("the public entry `@use 'ngwr/theme'`", () => {
  /**
   * The wrappers in `theme/_index.scss` exist because no Sass language server
   * follows `@forward` into `node_modules` — the file a consumer's editor
   * resolves has to DECLARE what it offers. Its own docblock carries the
   * measurements. What the docblock cannot prevent is the cost it names: a
   * wrapper is a second copy of a signature, and two copies drift.
   *
   * `dark` and `dark-selector` were two of them until v15, when dark mode
   * became the second argument of a `light-dark()` and stopped needing a helper.
   * `rebrand` and `contrast` joined in the same release, because a compile-time
   * rebrand is now how a brand colour reaches the dark scheme at all.
   */
  const WRAPPED = ['smooth-br', 'touch-target', 'focus-ring', 'rebrand', 'contrast'] as const;

  it('is the file the `exports` map names', () => {
    const pkg = JSON.parse(readFileSync(join(LIB, 'package.json'), 'utf8')) as {
      exports: Record<string, { sass?: string }>;
    };

    // Pointing this back at `theme/styles/_index.scss` would compile exactly the
    // same and silently take the editor resolution away again.
    expect(pkg.exports['./theme'].sass).toBe('./theme/_index.scss');
  });

  it('declares what it offers instead of forwarding it', () => {
    const declared = signatures(join(THEME, '_index.scss'));

    expect(Object.keys(declared).sort()).toEqual([...WRAPPED].sort());
  });

  it('hides every wrapped name from the forward, or the two collide', () => {
    const src = readFileSync(join(THEME, '_index.scss'), 'utf8');
    const hidden = /@forward 'styles' hide ([^;]+);/.exec(src)?.[1];

    expect(hidden).toBeDefined();
    expect(
      hidden!
        .split(',')
        .map(s => s.trim())
        .sort()
    ).toEqual([...WRAPPED].sort());
  });

  it('forwards BEFORE it uses, or `with (…)` stops configuring', () => {
    // `@use` above `@forward` makes `@use 'ngwr/theme' with ($base-colors: …)` a
    // build error: "This module was already loaded, so it can't be configured".
    const src = readFileSync(join(THEME, '_index.scss'), 'utf8');

    expect(src.indexOf("@forward 'styles'")).toBeLessThan(src.indexOf("@use 'styles'"));
  });

  it('keeps every wrapper signature equal to the one it wraps', () => {
    const outer = signatures(join(THEME, '_index.scss'));
    const inner = {
      ...signatures(join(THEME, 'styles/_mixins.scss')),
      ...signatures(join(THEME, 'styles/_focus.scss')),
      ...signatures(join(THEME, 'styles/_colors.scss')),
    };

    for (const name of WRAPPED) {
      // Defined first, so a wrapper of a name the inner files lost cannot pass
      // as `undefined` equal to `undefined`.
      expect(inner[name], name).toBeDefined();
      expect([name, outer[name]]).toEqual([name, inner[name]]);
    }
  });

  it('compiles to exactly what the inner entry compiles to', () => {
    const body =
      '.y { @include t.smooth-br(4px); } ' +
      '.z { @include t.rebrand((primary: #be123c), (primary: #fb7185)); } ' +
      '.v { color: t.contrast(#3969e2); } ' +
      '.w:focus-visible { @include t.focus-ring; }';
    const css = (spec: string): string => compile(`@use '${spec}' as t; ${body}`);

    expect(css('theme')).toBe(css('theme/styles'));
  });

  it('still accepts configuration through the forward, and it reaches the light side only', () => {
    // A variable is the one kind of member that CANNOT be wrapped, so
    // `$base-colors` stays forwarded — and the forward has to keep accepting
    // configuration. What it configures is the first argument of each intent's
    // `light-dark()`: the dark side is hand-tuned, and carrying a rebrand into it
    // is `rebrand()`'s second argument, by design.
    const tokens = declarations(
      compile(
        `@use 'theme' with ($base-colors: (primary: #4f46e5, success: #008800, warning: #ffba00, danger: #dc3137, info: #3472d9));`
      )
    );

    expect(tokens.get('--wr-color-primary')).toBe('light-dark(#4f46e5, #3567ff)');
  });
});

describe('the compiled token layer', () => {
  const layer = (): string => compile("@use 'theme';");

  /** The plain `:root` blocks — the token layer proper, outside every at-rule. */
  const root = (): string => [...layer().matchAll(/(^|\n):root \{([^}]*)\}/g)].map(m => m[2]).join('\n');

  /**
   * A `var()` at a name the layer never declares resolves to nothing, and the
   * declaration holding it is dropped at computed-value time — silently, with no
   * build error and no trace in a log.
   *
   * v15 shipped the whole class at once. Cutting `light`, `medium`, `dark` and
   * `secondary` from the palette left thirty-two references behind, and the two
   * that mattered were not the obvious ones: every intent's `-soft-contrast`
   * mixed toward `var(--wr-color-dark)`, and the surface's channel token — read
   * by eleven components for a translucent fill — pointed at one for the deleted
   * `dark`. `check:tokens` asks the same question of the whole tree; this asks it
   * of what the layer actually compiles to.
   */
  it('references no token it does not declare', () => {
    const css = layer();
    const declared = new Set([...css.matchAll(/(--wr-[\w-]+)\s*:/g)].map(m => m[1]));
    const dangling = [...new Set([...css.matchAll(/var\((--wr-[\w-]+)/g)].map(m => m[1]))].filter(
      name => !declared.has(name)
    );

    expect(dangling).toEqual([]);
  });

  it('declares the scheme switch on :root, and only there', () => {
    // `light dark` is what makes a page follow the OS with no script, and what
    // `WrTheme` outranks with an inline style. A second `color-scheme` anywhere
    // in the layer would be a second switch.
    const schemes = [...layer().matchAll(/color-scheme\s*:\s*([^;]+);/g)].map(m => m[1].trim());

    expect(schemes).toEqual(['light dark']);
    expect(root()).toContain('color-scheme: light dark;');
  });

  it('keys nothing on a theme attribute', () => {
    // The `[data-theme='dark']` block and the `--wr-theme-attribute` marker were
    // the v14 switch. A selector left behind would match a consumer's old
    // attribute and fight the `light-dark()` it sits beside.
    const css = layer();

    expect(css).not.toMatch(/\[data-theme/);
    expect(css).not.toContain('--wr-theme-attribute');
    expect(css).not.toContain(':host-context');
  });

  /**
   * `light-dark()` takes colours and nothing else — `light-dark(1px, 2px)` is
   * invalid, and an invalid value in a custom property is not an error anywhere:
   * the declaration that reads it falls back to its initial value. So a shadow
   * that differs between the schemes in GEOMETRY cannot be one `light-dark()`
   * around the whole value, which is exactly the mistake the obvious rewrite of
   * `--wr-shadow-modal` makes.
   */
  it('gives every light-dark() two colours and nothing else', () => {
    const colour = /^(#[0-9a-f]{3,8}|rgba?\([^()]*\)|var\(--wr-color-[\w-]+\)|transparent)$/i;
    const pairs = lightDarkPairs(layer());

    expect(pairs.length).toBeGreaterThan(0);
    expect(pairs.flat().filter(arg => !colour.test(arg))).toEqual([]);
  });

  /**
   * Every token that differs between the schemes is ONE declaration on `:root`.
   * A second block re-declaring tokens for dark is the shape v15 removed, and
   * the one that freezes `var()` compositions on a subtree.
   */
  it('declares each token once, outside the high-contrast block', () => {
    const names = [...root().matchAll(/(--wr-[\w-]+)\s*:/g)].map(m => m[1]);

    expect(names.filter((name, i) => names.indexOf(name) !== i)).toEqual([]);
  });

  it('keeps both geometries of the modal shadow', () => {
    // Light draws `0 20px 48px` at 25%, dark `0 24px 56px` at 60%. Two layers,
    // each transparent in the other scheme, reproduce both exactly.
    expect(declarations(root()).get('--wr-shadow-modal')).toBe(
      '0 20px 48px light-dark(rgb(0 0 0 / 25%), transparent), 0 24px 56px light-dark(transparent, rgb(0 0 0 / 60%))'
    );
  });

  it('lists the same intents as `WR_COLORS`, in the same order', () => {
    // `$base-colors` generates every `--wr-color-<intent>*` token and every
    // `--<intent>` modifier; `WR_COLORS` is what `WrColor` accepts. v8.0.0
    // shipped `info` in the map and not in the array: CSS in the bundle that
    // `color="info"` could not reach, because each half compiles on its own.
    const css = compile("@use 'sass:map'; @use 'theme' as t; .probe { --keys: #{map.keys(t.$base-colors)}; }");
    const keys = /--keys:\s*([^;]+);/
      .exec(css)?.[1]
      .split(',')
      .map(key => key.trim());

    expect(keys).toEqual([...WR_COLORS]);
  });

  /**
   * A channel list is three bare numbers, and `light-dark()` holds colours — so
   * a `-rgb` token can never follow the scheme, and every reader of one got the
   * light channels inside a dark subtree. v15 removed the whole family; a
   * translucent fill is `color-mix(in srgb, var(--wr-color-x) N%, transparent)`.
   */
  it('publishes no channel-list token and reads none', () => {
    const css = layer();

    expect([...css.matchAll(/(--wr-[\w-]+-rgb)\s*:/g)].map(m => m[1])).toEqual([]);
    expect([...css.matchAll(/var\((--wr-[\w-]+-rgb)\)/g)].map(m => m[1])).toEqual([]);
  });

  it('answers prefers-contrast in one block whose overrides follow the scheme', () => {
    const more = [...layer().matchAll(/@media \(prefers-contrast: more\) \{\s*([^{]+)\{([^}]*)\}/g)];

    expect(more.map(m => m[1].trim())).toEqual([':root']);
    expect(declarations(more[0][2]).get('--wr-color-gray-5')).toMatch(/^light-dark\(/);
  });
});

describe('rebrand()', () => {
  const tokens = (call: string): Map<string, string> =>
    declarations(compile(`@use 'theme' as t; .x { @include t.rebrand(${call}); }`).split('.x {')[1]);

  it('takes one seed in both schemes when no dark seed is given', () => {
    // What a recoloured subtree has always done, and the honest default: the
    // shipped dark intents are hand-tuned, so nothing derives a dark side for an
    // arbitrary seed.
    const set = tokens('(primary: #be123c)');
    // The intent's own family only. The block also re-includes `derived()`,
    // and a composed token that differs between the schemes on its own —
    // `--wr-border-strong` names a different fixed step in each — is a
    // `light-dark()` whatever the call passed.
    const own = [...set].filter(([name]) => name.startsWith('--wr-color-primary'));

    expect(set.get('--wr-color-primary')).toBe('#be123c');
    expect(own.length).toBeGreaterThan(0);
    expect(own.filter(([, value]) => value.includes('light-dark('))).toEqual([]);
  });

  it('pairs a dark seed into every token of the intent, the label included', () => {
    const set = tokens('(primary: #4f46e5), (primary: #818cf8)');

    expect(set.get('--wr-color-primary')).toBe('light-dark(#4f46e5, #818cf8)');
    for (const suffix of ['-dark', '-darker', '-light', '-lighter']) {
      expect(set.get(`--wr-color-primary${suffix}`), suffix).toMatch(/^light-dark\(/);
    }
    // Picked per scheme, off each scheme's own base: the indigo takes white, the
    // light periwinkle black.
    expect(set.get('--wr-color-primary-contrast')).toBe('light-dark(#ffffff, #000000)');
  });

  it('re-includes the composed tokens on the element it lands on', () => {
    expect(tokens('(primary: #be123c)').get('--wr-color-primary-ink')).toBe(
      'color-mix(in srgb, var(--wr-color-primary) 78%, var(--wr-color-gray-6))'
    );
  });

  /**
   * `derived()` re-declares every `-ink` at its default share, and on `:root`
   * it lands after the theme's `@media (prefers-contrast: more)` block at the
   * same specificity — so a page-wide rebrand used to switch the AAA ink off
   * for all five intents, the four it never touched included. Read as the
   * cascade reads it: every `:root` block in source order, the high-contrast
   * ones only when the preference holds, last declaration winning.
   */
  it('keeps the high-contrast ink when it rebrands :root', () => {
    const BLOCK = /@media \(prefers-contrast: more\) \{\s*:root \{([^}]*)\}\s*\}|(?:^|\n):root \{([^}]*)\}/g;
    const onRoot = (css: string, more: boolean): Map<string, string> => {
      const out = new Map<string, string>();
      for (const m of css.matchAll(BLOCK)) {
        if (m[1] !== undefined && !more) continue;
        for (const [name, value] of declarations(m[1] ?? m[2])) out.set(name, value);
      }
      return out;
    };
    const ink = (set: Map<string, string>): [string, string | undefined][] =>
      ['primary', 'success', 'warning', 'danger', 'info'].map(name => [name, set.get(`--wr-color-${name}-ink`)]);

    const page = compile("@use 'theme';");
    const rebranded = compile("@use 'theme' as t; :root { @include t.rebrand((primary: #4f46e5)); }");

    // Not vacuous: the theme's own high-contrast ink differs from its default.
    expect(ink(onRoot(page, true))).not.toEqual(ink(onRoot(page, false)));
    expect(ink(onRoot(rebranded, true))).toEqual(ink(onRoot(page, true)));
    // And without the preference the default shares still hold.
    expect(ink(onRoot(rebranded, false))).toEqual(ink(onRoot(page, false)));
  });

  it('refuses a dark seed for an intent the same call does not recolour', () => {
    // Half a rebrand — a dark side whose light side is the page's — is a choice
    // nobody makes on purpose, and the silent version is a typo in one map.
    expect(() => tokens('(primary: #be123c), (danger: #f87171)')).toThrow(/`\$dark` names `danger`/);
  });

  it('refuses an intent the token set has no room for', () => {
    expect(() => tokens('(brnad: #be123c)')).toThrow(/unknown intent `brnad`/);
  });
});
