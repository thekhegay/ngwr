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
 *    colour lists — and `files[].target`, whose rule is a regex on one side and
 *    a function on the other, is compared by RUNNING both over `TARGET_CASES`.
 *    Shape could not have caught what behaviour did: the schema's scheme
 *    lookahead was lowercase-only, so `FILE:///etc/passwd` validated clean
 *    against the published contract while `targetProblem()` refused it.
 *
 *    One divergence is left standing and is not in the table: a target with an
 *    embedded newline (`src/a\nb.ts`). The schema's trailing `.+$` cannot match
 *    across one, the validator has no rule about it, so the published contract
 *    is the stricter of the two there — it can only reject an item this repo
 *    would have accepted, never accept one it refuses.
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
import { ITEM_TYPES, REQUIRED_KEYS, targetProblem, validateItem } from './lib/registry/item';
import { PRESETS, buildThemePreset } from './lib/registry/theme-presets';

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
  readonly properties?: {
    readonly type?: { readonly enum?: readonly string[] };
    readonly files?: { readonly items?: { readonly properties?: { readonly target?: { readonly pattern?: string } } } };
  };
}

/**
 * Targets the schema's `pattern` and `targetProblem()` have to answer the same
 * way — the adversarial shapes first, then a couple of ordinary paths so a
 * pattern that rejects everything cannot pass.
 *
 * Comparing the two on BEHAVIOUR rather than on shape is the point: the schema
 * used to reject `file:` and accept `FILE:`, because its scheme lookahead was
 * lowercase-only while the validator's carried an `i` flag. Nothing noticed,
 * since the gate only ever read `type.enum` and `required`.
 */
const TARGET_CASES: readonly string[] = [
  'FILE:///etc/passwd',
  'HTTP://evil/x',
  'DATA:text/x,y',
  'file:///etc/passwd',
  'C:/x',
  'c:/x',
  '/etc/passwd',
  '\\\\srv\\x',
  'a/../../etc/x',
  '../x',
  '..',
  ' /etc/passwd',
  'src/x.ts ',
  'src/x\0.ts',
  '',
  'src/app/thing.ts',
  'src/styles/_thing.scss',
];

function schemaParity(schema: Schema): string[] {
  const problems: string[] = [];
  const types = schema.properties?.type?.enum ?? [];
  const required = schema.required ?? [];
  const pattern = schema.properties?.files?.items?.properties?.target?.pattern;

  const same = (a: readonly string[], b: readonly string[]): boolean =>
    a.length === b.length && [...a].sort().join() === [...b].sort().join();

  if (!same(types, ITEM_TYPES)) {
    problems.push(`schema.json allows [${types.join(', ')}] but the validator allows [${ITEM_TYPES.join(', ')}]`);
  }
  if (!same(required, REQUIRED_KEYS)) {
    problems.push(`schema.json requires [${required.join(', ')}] but the validator requires [${REQUIRED_KEYS.join(', ')}]`);
  }

  if (pattern === undefined) {
    problems.push('files[].target has no pattern — third-party tooling would accept any write path');
  } else {
    // A JSON Schema `pattern` is an ECMA-262 regex with no flags, so it is read
    // back exactly as a validator would read it.
    const re = new RegExp(pattern);
    for (const target of TARGET_CASES) {
      const schemaAccepts = re.test(target);
      const validatorAccepts = targetProblem(target) === null;
      if (schemaAccepts !== validatorAccepts) {
        problems.push(
          `files[].target ${JSON.stringify(target)} — schema.json ${schemaAccepts ? 'accepts' : 'rejects'} it, ` +
            `the validator ${validatorAccepts ? 'accepts' : 'rejects'} it`
        );
      }
    }
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

  // The shipped themes are DERIVED, so a hand edit to one is a fork of the
  // palette recipe. Re-derive from the seed table and compare; the same bargain
  // `check:api-docs` strikes with `gen:api-docs`.
  for (const preset of PRESETS) {
    const path = join(ITEMS, `${preset.name}.json`);
    if (!existsSync(path)) {
      problems.push(`${preset.name}.json — in the seed table, not on disk. Run \`pnpm gen:theme-presets\`.`);
      continue;
    }
    const expected = `${JSON.stringify(buildThemePreset(preset), null, 2)}\n`;
    if (readFileSync(path, 'utf8') !== expected) {
      problems.push(`${preset.name}.json — does not match its seeds. Run \`pnpm gen:theme-presets\`.`);
    }
  }

  if (problems.length > 0) {
    for (const problem of problems) err(`  ✘ ${problem}`);
    err(`\n✘ ${problems.length} registry problem(s).\n`);
    exit(1);
  }

  info(
    `✓ Registry — ${files.length} item(s) valid against schema.json, ${PRESETS.length} theme(s) match their seeds, ` +
      `${catalog.size} entry points to check names against.`
  );
}

main();
