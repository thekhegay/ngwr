import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

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
