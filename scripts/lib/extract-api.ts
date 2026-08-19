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
 *
 * `extractApi()` is the half that becomes docs. `extractPublicNames()` at the
 * bottom is the half that only the check reads: an entry point publishes option
 * interfaces, helper functions and directive attributes as well as components,
 * and a docs table that mentions one of those is documenting the library, not
 * inventing an input.
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

/**
 * The READ type out of an explicit generic list.
 *
 * `input<T>()` is one argument, but a transform input is two —
 * `input<boolean | null, BooleanInput | null>(…)` — and the whole list rendered
 * into the type column as `boolean | null, BooleanInput | null`, which is not a
 * type anyone can write. The first argument is what the component exposes and
 * what every non-generic transform input already infers to (`coerceBooleanProperty`
 * reports `boolean`, not `BooleanInput`), so taking it keeps the column
 * consistent.
 *
 * Split at DEPTH ZERO only: `input<Record<string, number>>()` has a comma in it
 * and is one argument.
 */
function firstGeneric(generic: string): string {
  let depth = 0;
  for (let i = 0; i < generic.length; i++) {
    const c = generic[i];
    // `=>` is not a closer. `input<((d: Date) => boolean) | null, unknown>()`
    // would otherwise drive the depth negative and never split.
    if (c === '>' && generic[i - 1] === '=') continue;
    if (c === '<' || c === '(' || c === '[' || c === '{') depth++;
    else if (c === '>' || c === ')' || c === ']' || c === '}') depth--;
    else if (c === ',' && depth === 0) return generic.slice(0, i).trim();
  }
  return generic.trim();
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
      const kind = (g['kind'] ?? '') as NonNullable<ApiRow['kind']>;
      const required = Boolean(g['required']);
      const { description, def } = parseDoc(g['doc']);

      // `protected` / `private` members never reach a consumer.
      const before = body.slice(Math.max(0, (m.index ?? 0) - 220), m.index);
      if (/(?:protected|private)\s+(?:readonly\s+)?$/.test(before.split('*/').pop() ?? '')) continue;

      const initial = firstArg(g['args'] ?? '');
      const generic = g['generic']?.trim();
      const type = generic
        ? firstGeneric(generic)
        : kind === 'output'
          ? 'void'
          : inferType(initial, g['args'] ?? '');

      // `{ alias: 'wrAffixChange' }` is the name a template writes, and the only
      // one a consumer ever sees — the property name is an implementation detail.
      const alias = /\balias:\s*'([^']+)'/.exec(g['args'] ?? '')?.[1];
      const publicName = alias ?? name;

      const row: ApiRow = {
        name: kind === 'output' ? `(${publicName})` : publicName,
        description: description || '—',
        type,
        kind,
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

/** Every entry point folder's `.ts` files, keyed by the folder name. */
function filesByEntry(): Map<string, string[]> {
  const out = new Map<string, string[]>();

  for (const entry of readdirSync(LIB).sort()) {
    if (entry === 'schematics' || entry === 'styles') continue;
    const dir = join(LIB, entry);
    if (!statSync(dir).isDirectory()) continue;

    const files: string[] = [];
    walk(dir, entry, files);
    out.set(entry, files);
  }

  return out;
}

/**
 * Class names some `public-api.ts` re-exports — the library's actual surface.
 *
 * A component nothing exports is not something a consumer can write, whatever
 * its selector suggests: `<wr-toast-host>` and `<wr-toast>` are created by
 * `WrToast.show()` and reachable from nowhere else, so holding the toast page to
 * their inputs asks it to document a template no one can type.
 *
 * `@internal` says the same thing and both of those carry it — but the tag alone
 * cannot be the rule, because `WrTableFilter` and `WrTableSort` carry it too,
 * `public-api.ts` exports both, and the table page documents them from the
 * generated data. The export list is the half that is never wrong.
 */
function exportedClasses(files: Iterable<string>): Set<string> {
  const out = new Set<string>();
  for (const file of files) {
    if (!file.endsWith('/public-api.ts')) continue;
    for (const m of readFileSync(file, 'utf8').matchAll(/\b(Wr[A-Za-z0-9_]*)\b/g)) out.add(m[1] ?? '');
  }
  return out;
}

/**
 * Exported, portal-rendered, and still not a template API.
 *
 * `WrMentionPanel` and `WrPopconfirmPanel` are the same component twice: an
 * overlay panel its sibling directive builds with a `ComponentPortal`, opening
 * with "not intended for direct use", exported beside the directive. Only the
 * popconfirm one carries an `@internal` tag saying so. Documenting the mention
 * panel's seven members would publish a component whose own first line tells you
 * not to use it, and `listboxId` in particular is minted by the directive and
 * meaningless from outside.
 *
 * **A list, and not a check for the `@internal` tag, because in this repo the
 * tag does not mean "undocumented".** `WrTableFilter` and `WrTableSort` both
 * carry it, are both exported, and the table's page documents both from this
 * generated data — so keying on the tag would silently empty that page. Tagging
 * the mention panel for consistency with its sibling is worth doing on its own
 * merits; it will not delete this set.
 */
const EXPORTED_BUT_INTERNAL: ReadonlySet<string> = new Set(['WrMentionPanel']);

/** Every documented component / directive in the library, keyed by class name. */
export function extractApi(): Map<string, ApiEntry> {
  const result = new Map<string, ApiEntry>();
  const byEntry = filesByEntry();
  const exported = exportedClasses([...byEntry.values()].flat());

  for (const [entry, files] of byEntry) {
    for (const file of files) {
      for (const found of extractFile(file, entry)) {
        if (!exported.has(found.klass) || EXPORTED_BUT_INTERNAL.has(found.klass)) continue;
        result.set(found.klass, found);
      }
    }
  }

  return result;
}

/**
 * The rest of what an entry point publishes, keyed by entry — every name a docs
 * table can carry that is not a signal member.
 *
 * Three shapes, each of which read as invented API before this existed. Fields
 * of an exported interface: the drawer's `data` / `panelClass` and the toast's
 * `maxStack` live on `WrDrawerOptions` / `WrToastConfig`, which a page documents
 * under its own heading — one the check never sees, because the heading is in
 * the template and the rows are in the class. Exported functions: the colour
 * picker documents `rgbToHsv` and its three siblings, which are `export
 * function`s in `ngwr/color-picker`, not inputs on anything. And the attribute
 * of a selector: `[wrInput]` matches `input[wrInput]`, so the page writes the
 * name bare — the same way a consumer types it — where the bracketed form would
 * already have been let through.
 *
 * `@internal` declarations are left out, and that one is load-bearing rather
 * than tidy. `WrSelectContext` is the contract an option uses to talk to its
 * select; it is exported, it is tagged, and it has a `multi` field — the exact
 * name of the input `select` had removed a major earlier and went on documenting,
 * which is one of the two drifts this whole gate was written for. Counting a
 * tagged interface's fields would have re-opened it.
 */
export function extractPublicNames(): Map<string, ReadonlySet<string>> {
  const out = new Map<string, ReadonlySet<string>>();
  const DOC = String.raw`(?<doc>\/\*\*(?:[^*]|\*(?!\/))*\*\/\s*)?`;
  const internal = (doc: string | undefined): boolean => /@internal\b/.test(doc ?? '');

  for (const [entry, files] of filesByEntry()) {
    const names = new Set<string>();
    for (const file of files) {
      const src = readFileSync(file, 'utf8');

      for (const m of src.matchAll(new RegExp(`${DOC}export\\s+function\\s+(\\w+)`, 'g'))) {
        if (!internal(m.groups?.['doc'])) names.add(m[2] ?? '');
      }
      for (const m of src.matchAll(/selector:\s*'([^']+)'/g)) {
        for (const attr of (m[1] ?? '').matchAll(/\[([A-Za-z][\w-]*)\]/g)) names.add(attr[1] ?? '');
      }

      // Fields of every exported interface / object-literal type alias. Brace
      // matched rather than lazily regexed to the first `}`, which stops inside
      // the first nested literal and drops every field after it.
      for (const m of src.matchAll(new RegExp(`${DOC}export\\s+(?:interface|type)\\s+\\w+[^{;]*\\{`, 'g'))) {
        if (internal(m.groups?.['doc'])) continue;
        const open = (m.index ?? 0) + m[0].length;
        let depth = 1;
        let i = open;
        for (; i < src.length && depth > 0; i++) {
          if (src[i] === '{') depth++;
          else if (src[i] === '}') depth--;
        }
        for (const f of src.slice(open, i).matchAll(/^\s*(?:readonly\s+)?(\w+)\??\s*:/gm)) names.add(f[1] ?? '');
      }
    }
    out.set(entry, names);
  }

  return out;
}

/**
 * One documented member, shaped for the showcase's `DocApiRow` — plus `kind`,
 * which the serializer does not write.
 *
 * A docs table has no column for it, but the check needs it: a `model()`
 * publishes TWO members, the model itself and the `<name>Change` output Angular
 * synthesises for it, and `(valueChange)` is how a page documents the second
 * half. Without the kind that row reads as an input the component does not have.
 */
export interface ApiRow {
  readonly name: string;
  readonly description: string;
  readonly type: string;
  readonly kind?: 'input' | 'model' | 'output';
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
