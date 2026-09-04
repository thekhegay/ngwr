import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * The manifest against the code, because nothing else compares them.
 *
 * ng-packagr only polices `dependencies` — an entry point can import a package
 * nobody declared and the build stays green, so the omission surfaces as
 * `ERR_MODULE_NOT_FOUND` in a consumer's app instead. That is how `@angular/forms`
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
 * builtins; and `*.spec.ts` never ships (`tsconfig.lib.json` excludes it), so its
 * `vitest` import is a devDependency by construction.
 */
const SKIP = ['schematics', 'mcp'];

/** A module specifier — anything with whitespace in it came from a split string literal. */
const SPECIFIER = /^(?:@[\w.~-]+\/)?[\w.~-]+(?:\/[\w./~-]+)?$/;

function sources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP.includes(relative(LIB, full))) sources(full, out);
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
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
      // path mapping resolves it in-tree and ng-packagr rewrites it at build.
      if (specifier === 'ngwr' || specifier.startsWith('ngwr/')) continue;

      const name = specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0];
      found.set(name, [...(found.get(name) ?? []), relative(LIB, file)]);
    }
  }

  return found;
}

describe('the release tooling can still find what it rewrites', () => {
  // `release:prepare` regenerates SECURITY.md's support table from the version
  // being cut, because maintained by hand it went two majors stale. It located
  // the table by an exact string, a later edit ran the file through prettier —
  // which pads every cell to its column width — and the release died on
  // "SECURITY.md no longer contains the support table header".
  //
  // The matcher is shape-based now, and this is the assertion that was missing:
  // the failure belongs in `pnpm test`, where an edit to the document is made,
  // not at the one moment nobody wants a surprise. Markdown formatting is not
  // gated in this repository, so both the padded and the bare spelling are legal
  // and both have to keep working.
  const security = readFileSync(join(process.cwd(), 'SECURITY.md'), 'utf8');

  it('still holds a support table the generator can locate', () => {
    expect(security).toMatch(/^\|\s*Version\s*\|\s*Supported\s*\|\s*$/m);
  });

  it('follows that header with a row per supported major, then a blank line', () => {
    const from = security.search(/^\|\s*Version\s*\|\s*Supported\s*\|\s*$/m);
    const block = security.slice(from, security.indexOf('\n\n', from));

    // Header, separator and three majors — the shape `writeSupportTable` emits.
    expect(block.split('\n')).toHaveLength(5);
    // And the blank line it stops at exists, or the rewrite would swallow the
    // prose underneath.
    expect(security.indexOf('\n\n', from)).toBeGreaterThan(from);
  });
});

describe('the published manifest', () => {
  const manifest = JSON.parse(readFileSync(join(LIB, 'package.json'), 'utf8')) as {
    peerDependencies: Record<string, string>;
    peerDependenciesMeta?: Record<string, { optional?: boolean }>;
    dependencies: Record<string, string>;
  };

  it('declares every package the shipped sources import', () => {
    const declared = new Set([...Object.keys(manifest.peerDependencies), ...Object.keys(manifest.dependencies)]);
    const undeclared = [...importedPackages()]
      .filter(([name]) => !declared.has(name))
      .map(([name, files]) => `${name} (e.g. ${files[0]})`);

    expect(undeclared).toEqual([]);
  });

  it('keeps `tslib` the only runtime dependency', () => {
    // The peer list can grow; `dependencies` is what an install actually pulls in,
    // and the library's promise is that it pulls in nothing but tslib.
    expect(Object.keys(manifest.dependencies)).toEqual(['tslib']);
  });

  it('marks a peer optional only when whole entry points, not the core, need it', () => {
    // `@angular/router` is optional because only tabs, sidebar, breadcrumbs and
    // loading-bar import it — an app with no routing installs nothing extra. The
    // three below are the same shape (pick an icon set, pick a date library).
    // `@angular/forms` is NOT here: `ngwr/form` imports NgControl and every value
    // control has `FormValueControl` in its public `implements` clause.
    const optional = Object.entries(manifest.peerDependenciesMeta ?? {})
      .filter(([, meta]) => meta.optional)
      .map(([name]) => name)
      .sort();

    expect(optional).toEqual(['@angular/router', 'date-fns', 'lucide', 'luxon']);
  });
});

/**
 * A component stylesheet must never reach the EMITTING theme layer.
 *
 * `@use` deduplicates per compilation, and a component's `styleUrl` is its own
 * compilation — so a `styleUrl` whose SCSS pulls in `theme/styles` carries a
 * byte-identical second copy of the `:root` token block, the `[data-theme]` block
 * and the `wr-` box-sizing reset, which ng-packagr embeds in the FESM bundle as a
 * string and the app build ships as JavaScript. Twenty entry points did: 42 KB
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
 * reaches may declare `:root` or the namespace reset. Those two, and not the dark
 * block, which the theme's own `_dark.scss` opens with a top-level `:root` anyway
 * — so it is caught either way. A COMPONENT'S dark block is a separate question
 * and `theme/styles.spec.ts` owns it: seven of them wrote `[data-theme='dark']
 * .wr-star-border` and were described here as a legitimate scoped rule, which
 * they were not. Compiled at library build time, the attribute in one can only
 * ever be the default, so it misses a rename and then outranks the correctly
 * named rule beside it. They are keyed on `dark-selector()` now, and loaded from
 * the public Sass entry rather than from the `styleUrl`.
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
