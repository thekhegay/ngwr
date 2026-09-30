import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * What `@use 'ngwr/theme'` GIVES a consumer, compiled rather than read.
 *
 * `styles.spec.ts` next door is source assertions on purpose, and says why. This
 * file is the exception, because the defect it pins is invisible to both halves
 * of that arrangement: the mixin parsed, the build was green, `check:theme` read
 * a stylesheet the mixin is not used in — and every rule it wrote inside an
 * Angular component stylesheet matched nothing for as long as it shipped.
 * Emulated encapsulation appends `_ngcontent-…` to every compound of a selector,
 * the ancestor included, so `[data-theme='dark'] .card` reaches the browser as
 * `[data-theme=dark][_ngcontent-x] .card[_ngcontent-x]` and `<html>` carries no
 * such attribute. `:host-context()` is the one form Angular leaves the ancestor
 * untagged in, and the mixin now emits both.
 *
 * So the assertions are on selector TEXT, which is the whole of what went wrong.
 * What this still cannot see is the shim itself — Angular runs it after Sass,
 * and only a real build shows the result. Those shapes were measured against
 * `dist/showcase` when the fix landed and are recorded beside each case.
 *
 * `sass` is resolved through `@angular/build` rather than declared: the repo has
 * no direct dependency on it, it is present because the builder compiles with
 * it, and a spec is not a reason to add a second copy to the tree.
 */
interface Sass {
  compileString(source: string, options: { loadPaths: string[]; style: 'expanded' }): { css: string };
}

const sass = createRequire(createRequire(import.meta.url).resolve('@angular/build/package.json'))('sass') as Sass;

const LOAD_PATHS = [join(process.cwd(), 'projects/lib/theme/styles')];

/**
 * The selectors `$scss` emits, in order.
 *
 * Taken as the TAIL past a baseline compile of the module on its own, rather
 * than filtered out of the whole output: `@use 'dark'` emits the token layer
 * first and byte-identically either way, so the remainder is exactly what the
 * snippet wrote — no pattern to keep in step with the theme's own `:root`
 * blocks, keyframes and comments.
 */
function selectors(scss: string, config = ''): string[] {
  const use = `@use 'dark'${config};\n`;
  const compile = (source: string): string =>
    sass.compileString(source, { loadPaths: LOAD_PATHS, style: 'expanded' }).css;

  const own = compile(use + scss).slice(compile(use).length);

  return [...own.matchAll(/(?:^|\})\s*([^{}]+?)\s*\{/g)].map(m => m[1].trim().replace(/\s+/g, ' '));
}

describe('theme.dark', () => {
  it('pairs the plain ancestor with a `:host-context()` twin', () => {
    // Shimmed: `[data-theme=dark][_nghost-x] .card[_ngcontent-x],
    // [data-theme=dark] [_nghost-x] .card[_ngcontent-x]` — the arm that works.
    expect(selectors('.card { @include dark.dark { color: red; } }')).toEqual([
      '[data-theme=dark] .card',
      ':host-context([data-theme=dark]) .card',
    ]);
  });

  it('keeps the two arms in separate rules', () => {
    // Load-bearing, and the reason this is not one comma-separated selector.
    // `:host-context()` is Chromium-only — Firefox and Safari have never shipped
    // it and the CSS WG dropped it — and an unknown pseudo-class invalidates the
    // whole list it sits in. Sharing a list would have taken the working arm
    // down with it in two engines, everywhere the pseudo-class reaches a browser
    // instead of being compiled away.
    const emitted = selectors('.card { @include dark.dark { color: red; } }');

    expect(emitted).toHaveLength(2);
    expect(emitted.some(s => s.includes(',') && s.includes(':host-context'))).toBe(false);
  });

  it('binds the ancestor to every arm of a selector list', () => {
    // `#{dark-selector()} #{&}` interpolates a list as `.a, .b`, which reads back
    // as `[data-theme=dark] .a` and a bare `.b` — one arm conditioned, the other
    // painted in both themes.
    expect(selectors('.a, .b { @include dark.dark { color: red; } }')).toEqual([
      '[data-theme=dark] .a, [data-theme=dark] .b',
      ':host-context([data-theme=dark]) .a, :host-context([data-theme=dark]) .b',
    ]);
  });

  it('puts the context IN PLACE of a `:host`, never inside one', () => {
    // Shimmed: `[data-theme=dark][_nghost-x], [data-theme=dark] [_nghost-x]`.
    // `:host-context(…) :host` would be a host inside a host and match nothing,
    // which is where a component's own custom properties usually live.
    expect(selectors(':host { @include dark.dark { color: red; } }')).toEqual([
      '[data-theme=dark] :host',
      ':host-context([data-theme=dark])',
    ]);
  });

  it('decides that arm by arm, so a mixed list keeps every arm conditioned', () => {
    // One `selector.replace` over the whole list leaves `.z` with no dark
    // condition at all — painted in BOTH themes, which is worse than the bug.
    expect(selectors(':host, .z { @include dark.dark { color: red; } }')[1]).toBe(
      ':host-context([data-theme=dark]), :host-context([data-theme=dark]) .z'
    );
  });

  it('emits both arms at the root too', () => {
    expect(selectors('@include dark.dark { .c { color: red; } }')).toEqual([
      '[data-theme=dark] .c',
      ':host-context([data-theme=dark]) .c',
    ]);
  });

  it('follows a renamed `$theme-attribute` in both arms', () => {
    // The half a hand-written literal never had. Both arms are built from
    // `dark-selector()`, so `@use 'ngwr' with ($theme-attribute: …)` carries.
    expect(
      selectors('.card { @include dark.dark { color: red; } }', " with ($theme-attribute: 'data-color-mode')")
    ).toEqual(['[data-color-mode=dark] .card', ':host-context([data-color-mode=dark]) .card']);
  });
});

const THEME = join(process.cwd(), 'projects/lib/theme');

/**
 * The parameter list of every mixin and function a file declares, by name.
 *
 * `()` normalises to empty: `@mixin dark()` and `@mixin dark` take the same
 * nothing, and a gate that reported those as drift would be noise at exactly
 * the moment someone reads it.
 */
function signatures(file: string): Record<string, string> {
  const src = readFileSync(file, 'utf8');
  const out: Record<string, string> = {};

  for (const m of src.matchAll(/^@(mixin|function)\s+([\w-]+)\s*(\([^)]*\))?/gm)) {
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
   */
  const WRAPPED = ['dark', 'smooth-br', 'touch-target', 'focus-ring', 'dark-selector'] as const;

  it('is the file the `exports` map names', () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'projects/lib/package.json'), 'utf8')) as {
      exports: Record<string, { sass?: string }>;
    };

    // Pointing this back at `theme/styles/_index.scss` would compile exactly the
    // same and silently take the editor resolution away again.
    expect(pkg.exports['./theme'].sass).toBe('./theme/_index.scss');
  });

  it('declares what it offers instead of forwarding it', () => {
    const declared = signatures(join(THEME, '_index.scss'));

    for (const name of WRAPPED) expect(Object.keys(declared)).toContain(name);
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
    // `@use` above `@forward` makes `@use 'ngwr' with ($theme-attribute: …)` a
    // build error: "This module was already loaded, so it can't be configured".
    const src = readFileSync(join(THEME, '_index.scss'), 'utf8');

    expect(src.indexOf("@forward 'styles'")).toBeLessThan(src.indexOf("@use 'styles'"));
  });

  it('keeps every wrapper signature equal to the one it wraps', () => {
    const outer = signatures(join(THEME, '_index.scss'));
    const inner = {
      ...signatures(join(THEME, 'styles/_dark.scss')),
      ...signatures(join(THEME, 'styles/_mixins.scss')),
      ...signatures(join(THEME, 'styles/_focus.scss')),
    };

    for (const name of WRAPPED) expect([name, outer[name]]).toEqual([name, inner[name]]);
  });

  it('compiles to exactly what the inner entry compiles to', () => {
    const body = '.x { @include t.dark { color: red } } .y { @include t.smooth-br(4px); }';
    const css = (spec: string): string =>
      sass.compileString(`@use '${spec}' as t; ${body}`, {
        loadPaths: [join(process.cwd(), 'projects/lib')],
        style: 'expanded',
      }).css;

    expect(css('theme')).toBe(css('theme/styles'));
  });

  it('still carries a renamed `$theme-attribute` through', () => {
    // The variable is the one member that CANNOT be wrapped, so it stays
    // forwarded — and the forward has to keep accepting configuration.
    const css = sass.compileString(
      `@use 'theme' as t with ($theme-attribute: 'data-color-mode');
       .card { @include t.dark { color: red } }`,
      { loadPaths: [join(process.cwd(), 'projects/lib')], style: 'expanded' }
    ).css;

    expect(css).toContain('[data-color-mode=dark] .card');
    expect(css).not.toContain('[data-theme=dark] .card');
  });
});
