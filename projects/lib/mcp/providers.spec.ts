/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { REQUIRED_PROVIDERS } from './providers.js';

/**
 * Every line in the provider table, checked against the library's real exports.
 *
 * This table is copy-paste code: `get_ngwr_setup` prints it, and
 * `gen-ai-assets.ts` writes the same strings into `skills/ngwr/SKILL.md`. Both
 * of those only ever checked that the string SURVIVES, which cannot tell a
 * snippet that compiles from one that does not — and under that check the date
 * rule shipped `provideWrDateAdapter(wrDateFnsAdapter) // from 'ngwr/date-adapter-fns'`,
 * naming two identifiers that entry point has never exported, with a call shape
 * the real `provideWrDateAdapter` would reject anyway.
 *
 * So the assertion is the one a reader makes when they paste the line: does the
 * entry point named in the comment exist, and does it export what the code
 * calls.
 *
 * What it does NOT check, because a regex over a snippet cannot: argument types,
 * argument counts, and the `{ … }` placeholders. `provideWrIcons(lucideIcons({ … }))`
 * would pass here with the wrong options object inside it.
 */

/**
 * The workspace root, walked up from the runner's cwd.
 *
 * Not `import.meta.url`: the Angular unit-test builder bundles specs, so that
 * URL names a location in the bundle rather than this file — the same trap
 * `server.spec.ts` documents at length.
 */
function workspaceRoot(): string {
  let dir = process.cwd();
  for (;;) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml')) && existsSync(join(dir, 'angular.json'))) return dir;
    const up = dirname(dir);
    if (up === dir) {
      throw new Error(`no workspace root above ${process.cwd()} — looked for pnpm-workspace.yaml beside angular.json`);
    }
    dir = up;
  }
}

const LIB = resolve(workspaceRoot(), 'projects', 'lib');

/** The `'ngwr/…'` paths a rule's trailing comment names. */
function entryPointsOf(provider: string): string[] {
  const comment = provider.slice(provider.indexOf('//'));

  return [...comment.matchAll(/'([^']+)'/g)].map(match => match[1]);
}

/**
 * The identifiers a consumer would have to import to paste the line: everything
 * that is called, plus any bare `wr*` / `Wr*` value that is not an object key.
 * The second half is what reaches `wrEn` in `provideWrI18nStaticLoader({ en: wrEn })`.
 */
function symbolsOf(provider: string): string[] {
  const code = provider.slice(0, provider.indexOf('//'));
  const out = new Set<string>();
  for (const [, name] of code.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) out.add(name);
  for (const [, name] of code.matchAll(/\b([Ww]r[A-Z]\w*)\b(?!\s*[:(])/g)) out.add(name);

  return [...out];
}

/**
 * Value exports of an entry point's `public-api.ts`.
 *
 * `export type { … }` blocks and inline `type` members are dropped: a type in a
 * provider call would not compile, so counting one as satisfying the check would
 * be the same lie the string-survival check told.
 */
function valueExports(entryPoint: string): Set<string> {
  const file = join(LIB, entryPoint.replace(/^ngwr\//, ''), 'public-api.ts');
  const source = readFileSync(file, 'utf8');
  const out = new Set<string>();

  for (const match of source.matchAll(/export\s+(type\s+)?\{([^}]*)\}/g)) {
    if (match[1]) continue;
    for (const member of match[2].split(',')) {
      const trimmed = member.trim();
      if (!trimmed || /^type\s/.test(trimmed)) continue;
      out.add(trimmed.split(/\s+as\s+/).pop() ?? trimmed);
    }
  }
  for (const [, name] of source.matchAll(/export\s+(?:declare\s+)?(?:const|let|function|class)\s+(\w+)/g))
    out.add(name);

  return out;
}

describe('REQUIRED_PROVIDERS', () => {
  it('names an entry point that exists for every rule', () => {
    for (const required of REQUIRED_PROVIDERS) {
      const paths = entryPointsOf(required.provider);

      // A rule with no `// from '…'` comment tells an agent what to write and
      // not where it comes from, which is the half it cannot guess.
      expect(paths, required.provider).not.toHaveLength(0);
      for (const path of paths) {
        expect(path, required.provider).toMatch(/^ngwr\//);
        expect(
          existsSync(join(LIB, path.replace(/^ngwr\//, ''), 'ng-package.json')),
          `${required.provider} — ${path} is not an entry point`
        ).toBe(true);
      }
    }
  });

  it('names only identifiers those entry points actually export', () => {
    for (const required of REQUIRED_PROVIDERS) {
      const exported = new Set<string>();
      for (const path of entryPointsOf(required.provider)) {
        for (const name of valueExports(path)) exported.add(name);
      }

      const symbols = symbolsOf(required.provider);
      expect(symbols, required.provider).not.toHaveLength(0);
      for (const symbol of symbols) {
        expect(
          [...exported],
          `${required.provider} — ${symbol} is not exported by the entry point(s) it names`
        ).toContain(symbol);
      }
    }
  });
});
