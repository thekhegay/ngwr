import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * The manifest against the code, because nothing else compares them.
 *
 * The library build does not hold imports to the manifest — an entry point can
 * import a package nobody declared and the build stays green, so the omission
 * surfaces as `ERR_MODULE_NOT_FOUND` in a consumer's app instead. That is how `@angular/forms`
 * (`NgControl` in `ngwr/form`) and `@angular/router` (`RouterLink` in tabs, sidebar,
 * breadcrumbs and loading-bar) shipped undeclared: every `ng new` app happens to
 * have both, so the hole is invisible until someone installs into an app that does
 * not — a Yarn PnP workspace, or a library that declares its own peers strictly.
 */
const LIB = join(process.cwd(), 'projects/lib');

/**
 * Only what the tarball's ESM actually imports at runtime is checked.
 *
 * `schematics/` runs inside the Angular CLI, which brings `@angular-devkit/schematics`
 * and `@schematics/angular` itself; `mcp/` is a Node CLI importing nothing but node:
 * builtins.
 */
const SKIP = ['schematics', 'mcp'];

/**
 * What the library build itself leaves out, read from its tsconfig rather than
 * restated here.
 *
 * `**\/*.spec.ts` is most of it, and for a long time it was all of it — which is
 * why this file used to hardcode that one pattern. It stopped being all of it
 * when `i18n/catalog-contract.ts` arrived: a test-only module that the locale
 * specs import, so it cannot be named `*.spec.ts` (vitest would try to
 * collect it and find no suite), and it imports `vitest`, so if this check ever
 * reads it the manifest is asked to declare a devDependency. Deriving the list
 * means the exclusion is stated once, in the place the compiler reads.
 */
function excludedFromTheBuild(): (file: string) => boolean {
  const config = readFileSync(join(LIB, 'tsconfig.lib.json'), 'utf8');
  const patterns = (JSON.parse(config) as { exclude?: string[] }).exclude ?? [];
  if (patterns.length === 0)
    throw new Error('tsconfig.lib.json declares no `exclude` — this check would read the specs.');

  const matchers = patterns.map(pattern => {
    // ONE pass, alternation ordered longest-first. Chained `replace` calls read
    // more clearly and are wrong here: `**/` expands to `(?:.*/)?`, which
    // contains a `*` of its own, so a later `*` pass rewrites the replacement
    // and `(?:.*/)?` becomes `(?:.[^/]*/)?` — a matcher for exactly one path
    // segment. It still excluded every top-level spec, so the only visible
    // symptom was harness specs two directories down leaking back in.
    const source = pattern.replace(/\*\*\/|\*\*|\*|[.+?^${}()|[\]\\]/g, token => {
      if (token === '**/') return '(?:.*/)?';
      if (token === '**') return '.*';
      if (token === '*') return '[^/]*';
      return `\\${token}`;
    });
    return new RegExp(`^${source}$`);
  });

  return (file: string) => matchers.some(matcher => matcher.test(file));
}

/** A module specifier — anything with whitespace in it came from a split string literal. */
const SPECIFIER = /^(?:@[\w.~-]+\/)?[\w.~-]+(?:\/[\w./~-]+)?$/;

function sources(dir: string, out: string[] = [], excluded = excludedFromTheBuild()): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP.includes(relative(LIB, full))) sources(full, out, excluded);
    } else if (entry.name.endsWith('.ts') && !excluded(relative(LIB, full))) {
      out.push(full);
    }
  }
  return out;
}

/** Package names imported by the shipped sources, mapped to the files that import them. */
function importedPackages(): Map<string, string[]> {
  const found = new Map<string, string[]>();

  for (const file of sources(LIB)) {
    // Comments first: a JSDoc example or a prose sentence ending in "… from '"
    // otherwise reads as an import and pollutes the set.
    const src = readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|\s)\/\/[^\n]*/g, '$1');

    const specifiers = [
      ...src.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g),
      ...src.matchAll(/(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g),
      ...src.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]/g),
    ].map(m => m[1]);

    for (const specifier of specifiers) {
      if (specifier.startsWith('.') || specifier.startsWith('node:')) continue;
      if (!SPECIFIER.test(specifier)) continue;
      // `ngwr/*` is this package importing its own sibling entry points — the TS
      // path mapping resolves it in-tree, and the build leaves it a bare import
      // the published `exports` map answers.
      if (specifier === 'ngwr' || specifier.startsWith('ngwr/')) continue;

      const name = specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0];
      found.set(name, [...(found.get(name) ?? []), relative(LIB, file)]);
    }
  }

  return found;
}

describe('the published manifest', () => {
  const manifest = JSON.parse(readFileSync(join(LIB, 'package.json'), 'utf8')) as {
    peerDependencies: Record<string, string>;
    peerDependenciesMeta?: Record<string, { optional?: boolean }>;
    dependencies?: Record<string, string>;
  };

  it('declares every package the shipped sources import', () => {
    const declared = new Set([...Object.keys(manifest.peerDependencies), ...Object.keys(manifest.dependencies ?? {})]);
    const undeclared = [...importedPackages()]
      .filter(([name]) => !declared.has(name))
      .map(([name, files]) => `${name} (e.g. ${files[0]})`);

    expect(undeclared).toEqual([]);
  });

  it('pulls in no runtime dependency', () => {
    // The peer list can grow; `dependencies` is what an install actually pulls in,
    // and the library pulls in nothing. tslib went in v15: the ES2022 output
    // imports none of its helpers, and the builds inline any they would need.
    expect(manifest.dependencies).toBeUndefined();
  });

  it('marks a peer optional only when whole entry points, not the core, need it', () => {
    // `@angular/router` is optional because only tabs, sidebar, breadcrumbs and
    // loading-bar import it — an app with no routing installs nothing extra. The
    // eight ProseMirror packages are imported by `ngwr/editor` and nothing else,
    // so an app without a rich-text field installs none of them — which is also
    // why no other entry point may import `ngwr/editor`. Only the packages the editor
    // imports BY NAME are listed: `prosemirror-transform` arrives as their own
    // dependency, and declaring it would fail the "imported" check below.
    // `@angular/forms` is NOT here: `ngwr/form` imports NgControl and every value
    // control has `FormValueControl` in its public `implements` clause.
    const optional = Object.entries(manifest.peerDependenciesMeta ?? {})
      .filter(([, meta]) => meta.optional)
      .map(([name]) => name)
      .sort();

    expect(optional).toEqual([
      '@angular/router',
      'prosemirror-commands',
      'prosemirror-history',
      'prosemirror-inputrules',
      'prosemirror-keymap',
      'prosemirror-model',
      'prosemirror-schema-list',
      'prosemirror-state',
      'prosemirror-view',
    ]);
  });

  it('declares a peer only for a package the shipped source imports', () => {
    // The other direction of the check above, and the one `lucide` failed for as
    // long as it was listed. An ICON set is not a peer dependency: `lucideIcons()`
    // takes the icon data as an ARGUMENT — `lucideIcons({ Plus })` — so
    // `icon/lucide.ts` imports nothing but its own types, and the only
    // `from 'lucide'` in the tree is inside a template literal that
    // `ng g ngwr:icon-set` writes into the CONSUMER's project. Compare
    // `ngwr/editor`, which really does `import { … } from 'prosemirror-state'`
    // and is therefore really a peer.
    //
    // A range on a package the library never loads is not a hint, it is a
    // resolvable constraint: npm 7+ installs optional peers when present and
    // errors on a conflict, so `>=1.0.0` could fail an install over a package
    // ngwr does not touch. Every icon set is optional in the same way — the ones
    // that ship plain SVG (tabler, phosphor, heroicons, …) go through
    // `svgIcon()` and were never declared either, which is the consistent
    // treatment this restores.
    const imported = importedPackages();
    const undeclared = Object.keys(manifest.peerDependencies).filter(name => !imported.has(name));

    expect(undeclared).toEqual([]);
  });

  it('promises no Angular older than the one it builds against', () => {
    // An app on an older minor than the build's can be missing an export the
    // library imports: 15.0.0 said `^22.0.0` while `ngwr/sidebar` imported
    // `containsTree` (22.2) and `ngwr/schema-form` `isFieldTree` (22.1), so an
    // app on 22.1 failed its build. Each `@angular/*` floor is therefore the
    // major and minor the repository installs, and a bump to a new minor moves
    // the peers with it.
    const root = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const installed = { ...root.dependencies, ...root.devDependencies };
    const minor = (range: string): string => /(\d+\.\d+)/.exec(range)?.[1] ?? range;
    const drift = Object.entries(manifest.peerDependencies)
      .filter(([name]) => name.startsWith('@angular/'))
      .filter(([name, range]) => minor(range) !== minor(installed[name] ?? ''))
      .map(([name, range]) => `${name}: peer ${range}, built against ${installed[name]}`);

    expect(drift).toEqual([]);
  });
});

/**
 * The root entry point is `provideWr()`, and every feature it takes comes from
 * the entry point that feature configures — `withDensity()` from `ngwr/density`,
 * typed by `WrFeature` in `ngwr/utils`. So the dependency runs one way only:
 * the root may import a secondary entry point, never the reverse. A secondary
 * entry point importing `ngwr` closes a cycle through the root, which the
 * library build has no reason to notice and a consumer's bundler then has to
 * untangle.
 */
describe('the root entry point', () => {
  it('is imported by no shipped source', () => {
    const offenders = sources(LIB)
      .filter(file => {
        const src = readFileSync(file, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/(^|\s)\/\/[^\n]*/g, '$1');
        return /\bfrom\s*['"]ngwr['"]|\bimport\s*\(\s*['"]ngwr['"]/.test(src);
      })
      .map(file => relative(LIB, file));

    expect(offenders).toEqual([]);
  });
});

/**
 * A component stylesheet must never reach the EMITTING theme layer.
 *
 * `@use` deduplicates per compilation, and a component's `styleUrl` is its own
 * compilation — so a `styleUrl` whose SCSS pulls in `theme/styles` carries a
 * byte-identical second copy of the `:root` token block, its high-contrast twin
 * and the `wr-` box-sizing reset, which the library build embeds in the FESM
 * bundle as a string and the app build ships as JavaScript. Twenty entry points did: 42 KB
 * apiece, 328 token declarations and two `:root` blocks inside the main chunk of an
 * app whose only ngwr component was `<wr-virtual-scroll>`.
 *
 * Payload was the smaller half. Angular appends component styles AFTER the linked
 * stylesheet, and those inlined tokens are compiled at LIBRARY build time — so they
 * carry the shipped defaults and win the cascade over the consumer's own. A
 * documented `@use 'ngwr/theme' with ($base-colors: (primary: #ff00ff))` measured
 * `#3969e2` on `:root` for as long as one of the twenty was on the page.
 *
 * So the invariant is about content, not about a file name: nothing a `styleUrl`
 * reaches may declare `:root` or the namespace reset. Dark mode adds no third
 * pattern: both schemes live in those same `:root` declarations as `light-dark()`,
 * switched by `color-scheme`, so there is no separate dark block to inline. A
 * component's own dark values are written the same way, inside its own
 * declarations, so they may sit in a `styleUrl` like any other rule — with no
 * selector naming a theme, there is nothing compiled at library build time that a
 * consumer could have configured differently.
 * `theme/styles/_focus.scss` passes and is deliberately still reachable — it emits
 * `.wr-*:focus-visible` rules rather than the global layer, and it is the only place
 * the shared ring mixin lives, so the five components that draw one take it from
 * there rather than hand-rolling declarations that would drift.
 */
describe('component stylesheets', () => {
  /** `@use 'x'` / `@forward 'x'` resolved the way Sass resolves a relative load. */
  const resolveScss = (from: string, spec: string): string | undefined => {
    const base = join(dirname(from), spec);
    const name = base.split('/').pop()!;
    const candidates = [
      `${base}.scss`,
      join(dirname(base), `_${name}.scss`),
      join(base, '_index.scss'),
      join(base, 'index.scss'),
    ];
    return candidates.find(existsSync);
  };

  /** Every SCSS file a component's `styleUrl` pulls in, transitively. */
  const loaded = (entry: string): string[] => {
    const seen = new Set<string>();
    const queue = [entry];
    while (queue.length > 0) {
      const file = queue.shift()!;
      if (seen.has(file)) continue;
      seen.add(file);
      const src = readFileSync(file, 'utf8').replace(/(^|\s)\/\/[^\n]*/g, '$1');
      for (const m of src.matchAll(/@(?:use|forward)\s+'([^']+)'/g)) {
        if (m[1].startsWith('sass:')) continue;
        const next = resolveScss(file, m[1]);
        expect(next, `${relative(LIB, file)} loads '${m[1]}', which resolves to nothing`).toBeDefined();
        queue.push(next!);
      }
    }
    return [...seen];
  };

  /** Component file to the stylesheet its `styleUrl` names. */
  const styleUrls = (): Map<string, string> => {
    const found = new Map<string, string>();
    for (const file of sources(LIB)) {
      const url = /styleUrl:\s*'\.\/([\w.-]+\.scss)'/.exec(readFileSync(file, 'utf8'))?.[1];
      if (url === undefined) continue;
      const scss = join(dirname(file), url);
      if (existsSync(scss)) found.set(relative(LIB, file), scss);
    }
    return found;
  };

  const GLOBAL_LAYER = [
    { what: 'the `:root` token block', re: /(^|\})\s*:root\s*\{/ },
    { what: 'the `wr-` box-sizing reset', re: /:where\(\[class\^=/ },
  ];

  it('never inlines the global theme layer into a bundle', () => {
    const offenders: string[] = [];

    for (const [component, scss] of styleUrls()) {
      for (const file of loaded(scss)) {
        const src = readFileSync(file, 'utf8').replace(/(^|\s)\/\/[^\n]*/g, '$1');
        for (const { what, re } of GLOBAL_LAYER) {
          if (re.test(src)) offenders.push(`${component} reaches ${relative(LIB, file)}, which declares ${what}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('checks every component that has a `styleUrl`', () => {
    // A resolver that quietly matched nothing would report the invariant as held.
    // `schematics/page` writes a `styleUrl` into a TEMPLATE STRING, so it is counted
    // by neither this nor the test above — there is no stylesheet on disk to follow.
    expect(styleUrls().size).toBeGreaterThanOrEqual(27);
  });
});

describe('README.md', () => {
  it('keeps release-bound data out of README.md', () => {
    // The README is also the npm page, and nothing regenerates it. Every
    // version, count, size and date it used to restate went stale, so it links
    // to the pages that are generated instead. Counts are matched as words too,
    // because the house style spells them out ("twenty value controls"); a bare
    // "one" is left alone, since "the one component" is prose.
    const text = readFileSync(join(process.cwd(), 'README.md'), 'utf8');
    const unit =
      '(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen)';
    const tens = '(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)';
    const number = `(?:\\d+\\+?|${tens}(?:-${unit})?|(?!one\\b)${unit}|hundreds?)`;
    const noun =
      '(?:entry points?|components?|value controls?|controls?|harness(?:es)?|declarations?|packages?|routes?|specs?|tests?|icons?|animations?|locales?|languages?|catalogs?)';
    const banned: readonly (readonly [RegExp, string])[] = [
      [/ngwr@\d/, 'a pinned ngwr version'],
      [/\bv\d+(?:\.\d+)*\b/, 'a version or major line'],
      [/\bAngular \d{2}\b/, 'an Angular major'],
      [/\d+(?:\.\d+)?\s?[kK]B\b/, 'a bundle size'],
      [new RegExp(`\\b${number}\\s+(?:[\\w\`*/-]+\\s+){0,2}${noun}\\b`, 'i'), 'a count'],
      [/\b20\d\d-\d\d-\d\d\b/, 'a date'],
      [/<!--/, 'a hidden comment'],
    ];

    const offenders = banned.filter(([re]) => re.test(text)).map(([re, why]) => `${why}: ${text.match(re)![0]}`);

    expect(offenders).toEqual([]);
  });
});
