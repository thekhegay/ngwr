/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Reads the public signal API of every component and directive in the library
 * straight out of the source, so the docs tables stop being a second copy of it.
 *
 * The source of truth already exists — 591 `@default` tags and a description on
 * essentially every input — it was simply never projected anywhere. The
 * 2026-08-07 audit is what this is a reaction to: four pages carried no input
 * table at all, `skeleton` and `fuzzy-text` documented defaults the code did not
 * have, `switch` omitted its primary two-way model, and `select` still listed a
 * `multi` input removed a major earlier. Every one of those is a divergence
 * between two hand-maintained copies of the same fact.
 *
 * Regex, not the TypeScript compiler, and deliberately: the library writes its
 * members in one shape (`readonly x = input<T>(…)` under a JSDoc block), the
 * house style enforces it, and pulling `typescript` into a build script to parse
 * a form this regular buys nothing. Anything that does not match the shape is
 * skipped rather than guessed at, so a member the regex cannot read is absent
 * rather than wrong.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { ROOT_PATH } from './paths/root';

const LIB = resolve(ROOT_PATH, 'projects/lib');

/** `readonly foo = input<T>(…)` / `input.required<T>()` / `model<T>(…)` / `output<T>()`. */
const MEMBER_RE =
  /(?<doc>\/\*\*(?:[^*]|\*(?!\/))*\*\/\s*)?readonly\s+(?<name>\w+)\s*=\s*(?<kind>input|model|output)(?<required>\.required)?\s*(?:<(?<generic>[\s\S]*?)>)?\s*\((?<args>[\s\S]*?)\);/g;

const CLASS_RE = /@(?<decorator>Component|Directive)\(\{(?<meta>[\s\S]*?)\}\)\s*export\s+class\s+(?<klass>\w+)/g;

/** Everything a JSDoc block says, minus the tags. */
function parseDoc(raw: string | undefined): { description: string; def?: string } {
  if (!raw) return { description: '' };

  const body = raw
    .replace(/^\s*\/\*\*/, '')
    .replace(/\*\/\s*$/, '')
    .split('\n')
    .map(l => l.replace(/^\s*\*ы?\s?/, '').replace(/^\s*\*\s?/, ''))
    .join('\n');

  const def = /@default\s+(.+?)(?:\n|$)/.exec(body)?.[1]?.trim();

  const description = body
    .split(/\n\s*@/)[0]
    .replace(/\s+/g, ' ')
    .trim()
    // A trailing "@default x" on the same line as the prose.
    .replace(/\s*@default\s+.*$/, '')
    .trim();

  return { description, def };
}

/** First argument of the call — the initial value — when it is a simple literal. */
function firstArg(args: string): string | undefined {
  const trimmed = args.trim();
  if (!trimmed) return undefined;
  let depth = 0;
  for (let i = 0; i < trimmed.length; i++) {
    const c = trimmed[i];
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === ',' && depth === 0) return trimmed.slice(0, i).trim();
  }
  return trimmed;
}

/** Best-effort type when the member has no explicit generic. */
function inferType(initial: string | undefined, args: string): string {
  if (initial === 'false' || initial === 'true') return 'boolean';
  if (initial && /^-?\d+(\.\d+)?$/.test(initial.replace(/_/g, ''))) return 'number';
  if (initial && /^['"`]/.test(initial)) return 'string';
  if (initial === 'null') return 'unknown';
  if (args.includes('coerceBooleanProperty')) return 'boolean';
  if (/numAttr|coerceNumberProperty/.test(args)) return 'number';
  return 'unknown';
}

function extractFile(file: string, entry: string): ApiEntry[] {
  const src = readFileSync(file, 'utf8');
  const out: ApiEntry[] = [];

  for (const cls of src.matchAll(CLASS_RE)) {
    const klass = cls.groups?.['klass'] ?? '';
    const selector = /selector:\s*'([^']+)'/.exec(cls.groups?.['meta'] ?? '')?.[1] ?? '';

    // Members between this class's opening brace and the next class (or EOF).
    const start = cls.index + cls[0].length;
    const rest = src.slice(start);
    const nextClass = /@(?:Component|Directive)\(\{/.exec(rest)?.index;
    const body = nextClass === undefined ? rest : rest.slice(0, nextClass);

    const rows: ApiRow[] = [];
    for (const m of body.matchAll(MEMBER_RE)) {
      const g = m.groups ?? {};
      const name = g['name'] ?? '';
      const kind = g['kind'] ?? '';
      const required = Boolean(g['required']);
      const { description, def } = parseDoc(g['doc']);

      // `protected` / `private` members never reach a consumer.
      const before = body.slice(Math.max(0, (m.index ?? 0) - 220), m.index);
      if (/(?:protected|private)\s+(?:readonly\s+)?$/.test(before.split('*/').pop() ?? '')) continue;

      const initial = firstArg(g['args'] ?? '');
      const generic = g['generic']?.trim();
      const type = generic ?? (kind === 'output' ? 'void' : inferType(initial, g['args'] ?? ''));

      // `{ alias: 'wrAffixChange' }` is the name a template writes, and the only
      // one a consumer ever sees — the property name is an implementation detail.
      const alias = /\balias:\s*'([^']+)'/.exec(g['args'] ?? '')?.[1];
      const publicName = alias ?? name;

      const row: ApiRow = {
        name: kind === 'output' ? `(${publicName})` : publicName,
        description: description || '—',
        type,
        ...(required ? { required: true } : {}),
        ...(!required && kind !== 'output' ? { default: def ?? initial ?? undefined } : {}),
      };
      rows.push(row);
    }

    if (rows.length > 0) out.push({ klass, selector, entry, rows });
  }

  return out;
}

function walk(dir: string, entry: string, acc: string[]): void {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      // `internal/` is the library's own marker for code no consumer imports —
      // the popover's text panel, the date-picker's clock. Documenting their
      // inputs would invent public API that does not exist.
      if (name === 'internal') continue;
      walk(full, entry, acc);
    } else if (name.endsWith('.ts') && !name.endsWith('.spec.ts')) {
      acc.push(full);
    }
  }
}

/** Every documented component / directive in the library, keyed by class name. */
export function extractApi(): Map<string, ApiEntry> {
  const result = new Map<string, ApiEntry>();

  for (const entry of readdirSync(LIB).sort()) {
    if (entry === 'schematics' || entry === 'styles') continue;
    const dir = join(LIB, entry);
    if (!statSync(dir).isDirectory()) continue;

    const files: string[] = [];
    walk(dir, entry, files);
    for (const file of files) {
      for (const found of extractFile(file, entry)) {
        result.set(found.klass, found);
      }
    }
  }

  return result;
}

/** One documented member, shaped for the showcase's `DocApiRow`. */
export interface ApiRow {
  readonly name: string;
  readonly description: string;
  readonly type: string;
  readonly default?: string;
  readonly required?: boolean;
}

export interface ApiEntry {
  /** Class name, e.g. `WrButton`. */
  readonly klass: string;
  /** Selector as written in the decorator. */
  readonly selector: string;
  /** Entry point folder, e.g. `button`. */
  readonly entry: string;
  readonly rows: readonly ApiRow[];
}
