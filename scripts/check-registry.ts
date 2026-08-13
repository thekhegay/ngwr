/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Gate for the open registry format: `registry/schema.json` plus every item
 * under `registry/items/`.
 *
 * Three things it checks, and the third is the one worth having.
 *
 * 1. **Every shipped item is valid.** They are the worked examples an author
 *    copies, and an invalid example teaches the wrong format faster than any
 *    documentation teaches the right one.
 * 2. **Every `entryPoints` name is a real ngwr entry point**, read from the same
 *    `ng-package.json` scan `llms-full.txt` uses. The registry does not get its
 *    own copy of the catalog.
 * 3. **The published schema and the validator agree.** `schema.json` is the
 *    contract third-party tooling reads; `scripts/lib/registry/item.ts` is what
 *    this repo enforces. Two descriptions of one format drift the moment
 *    someone edits either, so the item types and the required keys are compared
 *    directly — the same trick `check-color-parity.ts` plays on the SCSS and TS
 *    colour lists.
 *
 * Deliberately NOT a JSON Schema implementation. Validating the schema with a
 * validator would mean adding one, and the interesting rules here are not
 * expressible in it anyway: "is this a real entry point" needs the catalog, and
 * "can a CLI write this path" needs to reject `a/../../etc/x` as well as
 * `../x`.
 *
 * Usage:
 *   pnpm check:registry
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { exit } from 'node:process';

import { err } from './lib/log/err';
import { info } from './lib/log/info';
import { ROOT_PATH } from './lib/paths/root';
import { ITEM_TYPES, REQUIRED_KEYS, validateItem } from './lib/registry/item';

const REGISTRY = resolve(ROOT_PATH, 'registry');
const ITEMS = join(REGISTRY, 'items');
const SCHEMA = join(REGISTRY, 'schema.json');
const LIB_DIR = resolve(ROOT_PATH, 'projects/lib');

/**
 * Every secondary entry point, by `ng-package.json` — the same discovery
 * `gen-ai-assets.ts` uses, and for the same reason: a directory scan misses the
 * nested ones.
 */
function entryPoints(): Set<string> {
  const out = new Set<string>();
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (!statSync(full).isDirectory()) continue;
      if (existsSync(join(full, 'ng-package.json'))) out.add(relative(LIB_DIR, full));
      walk(full);
    }
  };
  walk(LIB_DIR);
  return out;
}

interface Schema {
  readonly required?: readonly string[];
  readonly properties?: { readonly type?: { readonly enum?: readonly string[] } };
}

function schemaParity(schema: Schema): string[] {
  const problems: string[] = [];
  const types = schema.properties?.type?.enum ?? [];
  const required = schema.required ?? [];

  const same = (a: readonly string[], b: readonly string[]): boolean =>
    a.length === b.length && [...a].sort().join() === [...b].sort().join();

  if (!same(types, ITEM_TYPES)) {
    problems.push(`schema.json allows [${types.join(', ')}] but the validator allows [${ITEM_TYPES.join(', ')}]`);
  }
  if (!same(required, REQUIRED_KEYS)) {
    problems.push(`schema.json requires [${required.join(', ')}] but the validator requires [${REQUIRED_KEYS.join(', ')}]`);
  }
  return problems;
}

function main(): void {
  if (!existsSync(SCHEMA)) {
    err(`\n✘ registry: ${SCHEMA} is missing — the published contract is the point of the directory.\n`);
    exit(1);
  }

  const schema = JSON.parse(readFileSync(SCHEMA, 'utf8')) as Schema;
  const problems = schemaParity(schema).map(problem => `schema.json — ${problem}`);

  const catalog = entryPoints();
  const files = existsSync(ITEMS) ? readdirSync(ITEMS).filter(name => name.endsWith('.json')).sort() : [];

  if (files.length === 0) {
    err('\n✘ registry: no items under registry/items — the examples ARE the documentation of the format.\n');
    exit(1);
  }

  const names = new Set<string>();
  for (const file of files) {
    const path = join(ITEMS, file);
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(path, 'utf8'));
    } catch (error) {
      problems.push(`${file} — not valid JSON: ${(error as Error).message}`);
      continue;
    }

    for (const problem of validateItem(raw, catalog)) problems.push(`${file} — ${problem}`);

    const name = (raw as { name?: unknown }).name;
    if (typeof name === 'string') {
      // The file name is how a fetcher addresses the item, so a mismatch means
      // the URL and the identity disagree.
      if (`${name}.json` !== file) problems.push(`${file} — its name is "${name}", so the file should be ${name}.json`);
      if (names.has(name)) problems.push(`${file} — "${name}" is used by another item`);
      names.add(name);
    }
  }

  if (problems.length > 0) {
    for (const problem of problems) err(`  ✘ ${problem}`);
    err(`\n✘ ${problems.length} registry problem(s).\n`);
    exit(1);
  }

  info(`✓ Registry — ${files.length} item(s) valid against schema.json, ${catalog.size} entry points to check names against.`);
}

main();
