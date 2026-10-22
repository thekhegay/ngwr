/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Every generator in `collection.json`, held to how `ng generate` reads argv.
 *
 * The CLI turns each `$default: { $source: 'argv', index: N }` into a yargs
 * positional, registered in the order it SORTS the options — and that sort tests
 * `if (a.positional)`, so index 0 reads as no index at all and two positionals
 * land in alphabetical order rather than index order (`parseJsonSchemaToOptions`
 * in `@angular/cli`). `ngwr:page` declared `preset` at 0 and `name` at 1, so the
 * documented `ng g ngwr:page form` bound `form` to `name` and failed validation
 * for a missing `preset`, and `--help` printed `[name] [preset]`. The factory
 * specs hand options straight to the rule and never parse argv, so none of them
 * could see it.
 *
 * One positional per generator leaves the sort nothing to reorder; anything
 * else is a named option, the way `ngwr:use` takes `--path`.
 */

/**
 * The workspace root, walked up from the runner's cwd — not `import.meta.url`,
 * which names a location in the bundle the unit-test builder writes.
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

const SCHEMATICS = resolve(workspaceRoot(), 'projects', 'lib', 'schematics');

interface Collection {
  readonly schematics: Record<string, { readonly schema?: string }>;
}

interface JsonSchema {
  readonly properties?: Record<string, { readonly $default?: { readonly $source?: string; readonly index?: number } }>;
}

const read = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;

const generators = Object.entries(read<Collection>(join(SCHEMATICS, 'collection.json')).schematics).filter(
  (entry): entry is [string, { readonly schema: string }] => entry[1].schema !== undefined
);

describe('collection.json', () => {
  it('reads at least the generators the docs name', () => {
    // A floor, so a path change that empties the table fails here rather than
    // passing every case below vacuously.
    expect(generators.map(([name]) => name)).toEqual(expect.arrayContaining(['ng-add', 'use', 'provider', 'page']));
  });

  it.each(generators)('ng g ngwr:%s takes at most one positional, at index 0', (_name, { schema }) => {
    const properties = read<JsonSchema>(join(SCHEMATICS, schema)).properties ?? {};
    const positionals = Object.entries(properties)
      .filter(([, property]) => property.$default?.$source === 'argv')
      .map(([option, property]) => `${option}@${property.$default?.index ?? 'all'}`);

    expect(positionals.length).toBeLessThanOrEqual(1);
    for (const positional of positionals) expect(positional).toMatch(/@0$/);
  });
});
