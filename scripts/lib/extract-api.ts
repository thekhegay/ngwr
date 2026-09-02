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
import { join, relative, resolve } from 'node:path';

import { ROOT_PATH } from './paths/root';

const LIB = resolve(ROOT_PATH, 'projects/lib');

/** `readonly foo = input<T>(…)` / `input.required<T>()` / `model<T>(…)` / `output<T>()`. */
const MEMBER_RE =
  /(?<doc>\/\*\*(?:[^*]|\*(?!\/))*\*\/\s*)?readonly\s+(?<name>\w+)\s*=\s*(?<kind>input|model|output)(?<required>\.required)?\s*(?:<(?<generic>[\s\S]*?)>)?\s*\((?<args>[\s\S]*?)\);/g;

/**
 * Any property assigned an `input` / `model` / `output`, however it is written.
 *
 * Every part `MEMBER_RE` insists on is optional here — the JSDoc block, the
 * `readonly`, and the absence of an explicit type annotation — because each of
 * them is a way a real member becomes invisible rather than wrong. The
 * annotation is matched to the `=` rather than to the end of a line, with `=>`
 * stepped over, so `readonly onPick: (v: T) => void = output()` is one
 * declaration and not two halves of nothing.
 */
const WEAK_MEMBER_RE =
  /(?:^|[;{}\s])(?<modifiers>(?:(?:private|protected|public|readonly|static|override|declare|abstract)\s+)*)(?<name>[A-Za-z_$][\w$]*)\s*(?::[^;=]*(?:=>[^;=]*)*)?=\s*(?<kind>input|model|output)\b(?!\w)/g;

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

/**
 * Best-effort type when the member has no explicit generic; `undefined` when
 * nothing in the call site says what the type is.
 *
 * The two least obvious branches are the two that were missing, and both were
 * found by the type check: three members extracted as the literal word `unknown`
 * and shipped it in the Type column — against EIGHT that declare `<unknown>` on
 * purpose (`select.value`, `checkbox.checkboxValue`, `radio.value`, …). Keying a
 * skip on the string would have excused all eleven, `WrSelect.value` included,
 * which is the member whose stale twin is one of the two drifts this gate was
 * written for. So the pair has to be separated here, where they are still
 * distinguishable, and not at comparison time, where they are not.
 *
 * `resolve` reads a same-file `const NAME = <literal>;` — ONE level, because a
 * chain is a judgement, and `pnpm gen:api-docs` does not make judgements. Note
 * that it is deliberately not wired into the `default` slot: `DEFAULT_CHARS`
 * stays one of the expression defaults the check skips and counts. Reading a
 * const for the TYPE is a fact; deciding what the Default column should print
 * for one is the judgement `LITERAL` exists to refuse.
 */
function inferType(
  initial: string | undefined,
  args: string,
  resolve: (name: string) => string | undefined
): string | undefined {
  if (initial === 'false' || initial === 'true') return 'boolean';
  if (initial && /^-?\d+(\.\d+)?$/.test(initial.replace(/_/g, ''))) return 'number';
  if (initial && /^['"`]/.test(initial)) return 'string';
  if (initial === 'null') return 'unknown';
  // `input(1 as 0.5 | 1, …)` — the assertion IS the declaration. Read past every
  // fully-anchored branch above, so a string literal holding the word `as`
  // cannot reach it.
  const asserted =
    initial && /\s+as\s+/.test(initial)
      ? initial
          .split(/\s+as\s+/)
          .pop()
          ?.trim()
      : undefined;
  if (asserted) return asserted;
  const named = initial && /^[A-Z][A-Z0-9_]*$/.test(initial) ? resolve(initial) : undefined;
  if (named) return inferType(named, args, () => undefined);
  if (args.includes('coerceBooleanProperty')) return 'boolean';
  if (/numAttr|coerceNumberProperty/.test(args)) return 'number';
  return undefined;
}

function extractFile(file: string, entry: string): ApiEntry[] {
  const src = readFileSync(file, 'utf8');
  const out: ApiEntry[] = [];

  // Comments blanked index-for-index, so a member's OFFSET can be tested against
  // it. Blanking the source outright is not an option here — `MEMBER_RE` reads
  // the JSDoc block it is looking at — so the mask is consulted per match
  // instead: a declaration whose name sits on a blanked column was commented
  // out, and a commented-out member is not a member. Parking one behind `//`
  // while renaming used to publish it as a real row, which is worse than
  // missing it: the run then reported the docs correct, and on a hand-written
  // page told the author to `Add the missing rows` for an input that no longer
  // exists.
  const masked = blanked(src, false);
  const live = (at: number | undefined): boolean => at !== undefined && masked[at] !== ' ';

  // File-local `const DEFAULT_EASING = 'cubic-bezier(…)';` — the one indirection
  // `inferType` follows, and only for the type.
  const constants = new Map<string, string>();
  for (const c of src.matchAll(/^const\s+([A-Z][A-Z0-9_]*)\s*=\s*([^;\n]+);/gm))
    constants.set(c[1] ?? '', (c[2] ?? '').trim());

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

      // The JSDoc group is a prefix of the match, so the declaration starts
      // right after it — and that is the offset the mask is asked about. A
      // member whose `readonly` sits on a blanked column is inside a comment.
      if (!live(start + (m.index ?? 0) + (g['doc']?.length ?? 0))) continue;

      // `protected` / `private` members never reach a consumer.
      const before = body.slice(Math.max(0, (m.index ?? 0) - 220), m.index);
      if (/(?:protected|private)\s+(?:readonly\s+)?$/.test(before.split('*/').pop() ?? '')) continue;

      const initial = firstArg(g['args'] ?? '');
      const generic = g['generic']?.trim();
      const inferred =
        generic || kind === 'output' ? undefined : inferType(initial, g['args'] ?? '', name => constants.get(name));
      const type = generic ? unbrand(firstGeneric(generic)) : kind === 'output' ? 'void' : (inferred ?? 'unknown');

      // `{ alias: 'wrAffixChange' }` is the name a template writes, and the only
      // one a consumer ever sees — the property name is an implementation detail.
      const alias = /\balias:\s*'([^']+)'/.exec(g['args'] ?? '')?.[1];
      const publicName = alias ?? name;

      const row: ApiRow = {
        name: kind === 'output' ? `(${publicName})` : publicName,
        ...(alias ? { prop: name } : {}),
        description: description || '—',
        type,
        kind,
        ...(inferred === undefined && !generic && kind !== 'output' ? { unreadableType: true as const } : {}),
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

/** The text between a `{` already consumed at `open` and the `}` that closes it. */
function bodyAt(src: string, open: number): string {
  let depth = 1;
  let i = open;
  for (; i < src.length && depth > 0; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') depth--;
  }
  return src.slice(open, i - 1);
}

/** One property of an interface or object-literal type body. */
interface FieldRead {
  readonly name: string;
  readonly optional: boolean;
  readonly type: string;
}

/**
 * The properties of one interface / object-literal body, each read to the end of
 * its own type.
 *
 * **A field's type does not end at the newline, and reading it as one was worse
 * than not reading it at all.** The first version stopped at the first `;`, `,`
 * or NEWLINE at depth zero, and prettier breaks a union that outgrew its line
 * immediately after the `:` — so
 *
 * ```ts
 * readonly position:
 *   | 'left'
 *   | 'right';
 * ```
 *
 * arrived as `"| 'left'"`: not an absent field the check would skip, but a
 * confidently WRONG one arm long, which both excuses a page printing that one
 * arm and reports a page printing all three. No field in the library is wrapped
 * today, which is the only reason it was never seen — one long union added to an
 * exported options interface and prettier does it unprompted.
 *
 * So a newline at depth zero ends the type only when what follows it OPENS a
 * member (`startsMember()`); a line beginning `|`, `&` or `=>` continues the one
 * above. `;` and `,` still end it outright, and everything inside brackets is
 * depth-guarded as before.
 *
 * Matches are taken at brace depth zero only. Without that, a field typed with a
 * multi-line object literal contributes its OWN keys as siblings — `readonly
 * opts: {\n  a: string;\n }` published a field named `a` — which is a name the
 * type check would then let a page answer with.
 */
function readFields(body: string): FieldRead[] {
  const depths = braceDepths(body);
  const out: FieldRead[] = [];

  for (const f of body.matchAll(/^[ \t]*(?:readonly\s+)?([A-Za-z_$][\w$]*)(\??)\s*:\s*/gm)) {
    if (depths[f.index ?? 0] !== 0) continue;
    const start = (f.index ?? 0) + f[0].length;
    let depth = 0;
    let j = start;
    for (; j < body.length; j++) {
      const c = body[j];
      if (c === '>' && body[j - 1] === '=') continue;
      if (c === '<' || c === '(' || c === '[' || c === '{') depth++;
      else if (c === '>' || c === ')' || c === ']' || c === '}') depth--;
      else if (depth === 0 && (c === ';' || c === ',')) break;
      else if (depth === 0 && c === '\n' && startsMember(body, j + 1)) break;
    }
    // A leading `|` is prettier's punctuation for a wrapped union, not an arm —
    // the same reading `splitUnion()` takes.
    const type = unbrand(
      body
        .slice(start, j)
        .replace(/\s+/g, ' ')
        .replace(/^\|\s*/, '')
        .trim()
    );
    if (type) out.push({ name: f[1] ?? '', optional: f[2] === '?', type });
  }

  return out;
}

/** Brace depth at every index of `body`, so a nested object literal's own keys can be told from the body's. */
function braceDepths(body: string): number[] {
  const out = new Array<number>(body.length).fill(0);
  let depth = 0;
  for (let i = 0; i < body.length; i++) {
    if (body[i] === '{') depth++;
    else if (body[i] === '}') depth--;
    out[i] = body[i] === '{' ? depth - 1 : depth;
  }
  return out;
}

/** Whether the text at `at` opens a new member rather than continuing the previous one's type. */
function startsMember(body: string, at: number): boolean {
  const rest = body.slice(at).replace(/^\s+/, '');
  return rest === '' || /^(?:\/\*|\}|(?:readonly\s+)?[A-Za-z_$][\w$]*\??\s*[:(<])/.test(rest);
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
 * **The popconfirm panel joined it the day discovery started opening migrated
 * pages.** `reference/components/popconfirm` consumes `API.WrPopconfirm` and
 * nothing else, so holding it to the entry point as a whole demanded rows for
 * `message` and `messageId` — an input the anchoring directive passes in and an
 * id the directive mints, on a component whose own JSDoc says to use
 * `[wrPopconfirm]` instead. The page was right and the extraction was wrong;
 * seven rows leave `generated/api.ts` with it.
 *
 * **A list, and not a check for the `@internal` tag, because in this repo the
 * tag does not mean "undocumented".** `WrTableFilter` and `WrTableSort` both
 * carry it, are both exported, and the table's page documents both from this
 * generated data — so keying on the tag would silently empty that page. Tagging
 * the mention panel for consistency with its sibling is worth doing on its own
 * merits; it will not delete this set.
 */
const EXPORTED_BUT_INTERNAL: ReadonlySet<string> = new Set(['WrMentionPanel', 'WrPopconfirmPanel']);

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
 * Field name → the type text of every exported, non-`@internal` interface or
 * object-literal alias field in the entry point, keyed by entry.
 *
 * The sibling of `extractPublicNames()`, and it exists because a NAME was only
 * ever enough for the staleness question. The type check compares one page row
 * at a time, and on an overlay page a name is documented twice on purpose:
 * `reference/components/drawer` prints `closeLabel` in its component table
 * (`string | null` — exactly `WrDrawer.closeLabel`) and again in its options
 * table (`string` — exactly `WrDrawerOptions.closeLabel`). Both cells are right
 * under their own heading, and the heading lives in the template where the check
 * cannot see it. Without the interface's side of it, per-row comparison reports
 * the options table as drift on day one.
 *
 * Each field's type is read by `readFields()`, which brace-matches it the way
 * the member scan does. A field this cannot read is absent rather than guessed
 * at — the same rule the member scan follows.
 */
export function extractPublicFields(): Map<string, ReadonlyMap<string, readonly string[]>> {
  const out = new Map<string, ReadonlyMap<string, readonly string[]>>();
  const DOC = String.raw`(?<doc>\/\*\*(?:[^*]|\*(?!\/))*\*\/\s*)?`;

  for (const [entry, files] of filesByEntry()) {
    const fields = new Map<string, string[]>();
    for (const file of files) {
      if (file.includes('/testing/')) continue;
      const src = readFileSync(file, 'utf8');

      for (const m of src.matchAll(new RegExp(`${DOC}export\\s+(?:interface|type)\\s+\\w+[^{;]*\\{`, 'g'))) {
        if (/@internal\b/.test(m.groups?.['doc'] ?? '')) continue;
        for (const f of readFields(bodyAt(src, (m.index ?? 0) + m[0].length))) {
          const known = fields.get(f.name) ?? [];
          if (!known.includes(f.type)) known.push(f.type);
          fields.set(f.name, known);
        }
      }
    }
    out.set(entry, fields);
  }

  return out;
}

/**
 * Every `Wr…` name the library DECLARES — types, interfaces, classes, enums,
 * consts and functions, in one flat set.
 *
 * Read by the type check for one question only: does a `Wr…` name a docs page
 * prints exist at all? `extractPublicNames()` cannot answer it — that map holds
 * interface FIELD names, function names and selector attributes, so
 * `WrDrawerOptions` is not in it and `WrNope` is indistinguishable from
 * `WrColor`. Until this existed, an unresolvable `Wr…` on either side was an
 * unconditional opt-out from the type comparison, so `'number | WrNope'` turned
 * the check off for that row and cost one tick on a counter nobody reads as an
 * indictment.
 *
 * Declared rather than exported, deliberately. The bar this has to clear is
 * "invented versus real", and an `export` scan cannot clear it: a barrel
 * re-exports with `export type { … } from './interfaces'` in some entry points
 * and `export * from './interfaces'` in others, so half the real names never
 * appear beside the word `export` anywhere. A page naming a real-but-internal
 * type is a smaller problem than a gate that cannot tell a typo from a barrel.
 */
export function extractLibraryTypeNames(): ReadonlySet<string> {
  const out = new Set<string>();
  for (const files of filesByEntry().values()) {
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(/\b(?:type|interface|class|enum|function|const|let|var)\s+(Wr[A-Za-z0-9_]*)\b/g))
        out.add(m[1] ?? '');
    }
  }
  return out;
}

/**
 * A type's top-level union members — the same bracket walk `firstGeneric()`
 * does, `=>` guard included, splitting on `|` instead of `,`.
 *
 * A leading `|` is dropped rather than kept as an empty member: prettier writes
 * a union that outgrew its line with one, and `WrPopoverPosition` and
 * `WrTypographyVariant` both have. It is punctuation, not an arm.
 */
export function splitUnion(type: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < type.length; i++) {
    const c = type[i];
    if (c === '>' && type[i - 1] === '=') continue;
    if (c === '<' || c === '(' || c === '[' || c === '{') depth++;
    else if (c === '>' || c === ')' || c === ']' || c === '}') depth--;
    else if (c === '|' && depth === 0) {
      out.push(type.slice(start, i));
      start = i + 1;
    }
  }
  out.push(type.slice(start));

  return out.map(m => m.trim()).filter(Boolean);
}

/**
 * `string & {}` → `string`, `number & {}` → `number`.
 *
 * The intersection is the keep-autocomplete-alive idiom — `WrDateFormat |
 * (string & {}) | null` is there so an editor still offers the six named
 * formats while accepting any string. It is an editor affordance and a value-set
 * identity: it accepts exactly what `string` accepts. Printing it in a docs
 * table is worse than printing nothing, because someone copying the cell into
 * their own annotation gets a type that constrains nothing while looking like it
 * constrains something. Two `format` rows shipped it before this.
 */
export function unbrand(type: string): string {
  return type
    .replace(/\(\s*(string|number)\s*&\s*\{\s*\}\s*\)/g, '$1')
    .replace(/\b(string|number)\s*&\s*\{\s*\}/g, '$1');
}

/**
 * Every non-generic `type Wr… = …` and every non-generic, non-`extends`
 * `interface Wr… { … }` in the library, expanded — the index the type check
 * reads to decide that `WrDrawerPosition` and
 * `'left' | 'right' | 'top' | 'bottom'` are one spelling.
 *
 * **Read only by the check, and never applied to `ApiRow.type`.** That is the
 * load-bearing half: expanding aliases at extraction would rewrite 147 generated
 * rows, print thirteen arms of `WrPopoverPosition` into a column 25% of the
 * table wide, and answer `string` where `WrIconName` is the more informative
 * thing to say. This is a comparison-time normaliser, not a projection.
 *
 * **It indexed only string unions until an adversarial pass priced what the rest
 * cost.** An alias this could not expand was an unconditional opt-out from the
 * type comparison for the row that named it: `typewriter.variableSpeed` — source
 * `WrTypewriterVariableSpeed | undefined`, page `{ min: number; max: number }` —
 * passed as `number`, as `string`, as `'a' | 'b'` and as `boolean | null`, each
 * of them exit 0 with the run's own counter sitting at the same 1 it sits at
 * when the page is right. A counter that reads identically for a correct page
 * and a nonsense one is not a witness. So the index expands what it can and the
 * check REPORTS what is left, rather than the two of them splitting the
 * difference: an alias of a primitive (`WrIconName = string`), of a function
 * type, of a tuple and of a value (`WrColor = (typeof WR_COLORS)[number]`) all
 * enter, and an interface enters as the object literal a docs table would print
 * for it. What still cannot be expanded — a generic, an `extends`, an interface
 * with a call or index signature — is now a REPORTED disagreement unless both
 * sides spell the name the same way, which is a rule a page can always satisfy.
 *
 * Four things about the scan are not obvious and each of them was a wrong
 * answer first.
 *
 * **`export` is optional.** Of the 72 aliases a documented row can reach, 49 are
 * `export type` and 23 are a bare `type X = …` re-exported by a barrel at the
 * foot of `interfaces/index.ts`. A regex keyed on `export\s+type` misses a third
 * of them, including 13 of the rows this tolerance exists for.
 *
 * **Location is not a convention.** 65 of the names live under `interfaces/`,
 * eight sit beside the component (`WrCascaderSize`, `WrSwitchSize`,
 * `WrTextareaResize`, …), so the scan is over every non-spec file rather than a
 * folder.
 *
 * **`testing/` is excluded, and not for tidiness.** `WrCalendarView` is declared
 * twice with DIFFERENT values — `'day' | 'month' | 'year'` in the calendar's
 * harness filters, `'month' | 'week' | 'day'` in the event calendar's interfaces.
 * A harness filter is not the docs surface, and picking the wrong one gives a
 * confidently wrong answer to the one question this index exists to answer. The
 * filter is here rather than in `walk()`, which also feeds `extractPublicNames()`
 * — whose `alsoPublic` set legitimately includes harness interface fields.
 *
 * **Generic declarations never enter.** The alias regex demands `=` immediately
 * after the name and the interface regex demands `{`, so
 * `type WrSelectSearchLoader<T> = …` and `interface WrTableRow<T> extends …` are
 * not seen and cannot emit `{…}<T>` garbage. An interface with no readable
 * property is skipped for the same reason.
 */
export function extractTypeAliases(): Map<string, readonly string[]> {
  const declared = new Map<string, Set<string>>();
  const record = (name: string, rhs: string): void => {
    (declared.get(name) ?? declared.set(name, new Set()).get(name) ?? new Set()).add(rhs);
  };

  for (const files of filesByEntry().values()) {
    for (const file of files) {
      if (file.includes('/testing/')) continue;
      const src = readFileSync(file, 'utf8');

      for (const m of src.matchAll(/(?:export\s+)?type\s+(Wr[A-Za-z0-9_]*)\s*=\s*/g)) {
        // To the `;` at depth zero, so a union prettier spread over six lines is
        // one declaration rather than a first arm and five orphans.
        const start = (m.index ?? 0) + m[0].length;
        let depth = 0;
        let i = start;
        for (; i < src.length; i++) {
          const c = src[i];
          if (c === '>' && src[i - 1] === '=') continue;
          if (c === '<' || c === '(' || c === '[' || c === '{') depth++;
          else if (c === '>' || c === ')' || c === ']' || c === '}') depth--;
          else if (c === ';' && depth === 0) break;
        }
        record(m[1] ?? '', src.slice(start, i).replace(/\s+/g, ' ').trim());
      }

      // The object literal a docs table would print for the interface — which is
      // exactly what `animations/typewriter` prints for the one live case.
      for (const m of src.matchAll(/(?:export\s+)?interface\s+(Wr[A-Za-z0-9_]*)\s*\{/g)) {
        const fields = readFields(bodyAt(src, (m.index ?? 0) + m[0].length));
        if (fields.length === 0) continue;
        record(m[1] ?? '', `{ ${fields.map(f => `${f.name}${f.optional ? '?' : ''}: ${f.type}`).join('; ')} }`);
      }
    }
  }

  const out = new Map<string, readonly string[]>();
  for (const [name, spellings] of declared) {
    // Two declarations of one name that disagree: the index cannot say which the
    // docs mean, so it says nothing and the row falls to the reported case.
    if (spellings.size > 1) {
      console.warn(`  note: ${name} is declared ${spellings.size} ways; not indexed`);
      continue;
    }
    const members = splitUnion(unbrand([...spellings][0] ?? ''));
    if (members.length > 0) out.set(name, members);
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
  /**
   * The PROPERTY name, where an `alias:` made it differ from `name`. Never
   * serialised — `serialize()` names the fields it emits — and read by exactly
   * one caller: the census, which sees declarations and therefore knows members
   * by the name the class gives them. Keying that comparison on `name` reports
   * all nine aliased members as unread, since `wrAffixOffsetTop` is the only
   * spelling a consumer ever writes and `offsetTop` the only one in the file.
   */
  readonly prop?: string;
  /**
   * `inferType()` fell through — the member has no explicit generic and nothing
   * in the call site says what the type is, so `type` carries the placeholder
   * `unknown` rather than a read fact.
   *
   * NOT the same thing as a generic that SAYS `unknown`: eight members declare
   * `input<unknown>()` on purpose, and a skip keyed on the string would excuse
   * `WrSelect.value` — the member whose stale twin is one of the two drifts this
   * whole gate was written for. The flag is the only thing that keeps the two
   * apart, and the serializer does not write it, the same treatment `kind` gets.
   */
  readonly unreadableType?: true;
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

/**
 * Index one past the closing quote of the string starting at `start`; `-1` if it
 * never closes.
 */
export function endOfString(text: string, start: number): number {
  const quote = text[start];
  for (let i = start + 1; i < text.length; i++) {
    if (text[i] === '\\') i++;
    else if (text[i] === quote) return i + 1;
  }
  return -1;
}

/**
 * `src` with every comment — and optionally every string BODY — replaced by
 * spaces, index for index, newlines kept.
 *
 * **A commented-out row was still a documented row, and it was still graded.**
 * `documentedRows()` split the raw file on `name:` before anything looked at a
 * `//`, so prefixing one row with `//` removed it from the rendered table and
 * left it in the gate: the page reported as fully documented, no counter moved,
 * and the commented row's own type and default were compared — a wrong value
 * parked behind a comment could FAIL a run about a table that no longer showed
 * it. Parking a row while renaming something is the most ordinary edit a
 * contributor makes, which is what put this first among the holes.
 *
 * The library side needs it just as much: a JSDoc `@example` block is prose that
 * looks exactly like source, and `unreadMembers()` reads declarations for a
 * living. An `@example` showing `size = input('md')` would otherwise be counted
 * as a member the extractor failed to read, on a component that has none.
 *
 * Blanking rather than deleting keeps every index valid, so the walks that read
 * a row's extent can be written against one string. `//` and `/*` are
 * unambiguous starts — an empty regex is spelled `/(?:)/` and a regex may not
 * begin with `*` — but a regex BODY may hold a quote (`/['"]/`), and one taken
 * as an opening quote used to swallow the rest of the file. An unterminated
 * quote is therefore stepped over as an ordinary character: the cost is one
 * mis-read character, where bailing out is a gate going quiet.
 *
 * `strings: true` additionally blanks string bodies — wanted wherever a scan
 * reads CODE and a string could spell the thing it is looking for.
 */
export function blanked(src: string, strings: boolean): string {
  const out = src.split('');
  let i = 0;

  while (i < src.length) {
    const c = src[i];

    if (c === '/' && src[i + 1] === '/') {
      const nl = src.indexOf('\n', i);
      const stop = nl < 0 ? src.length : nl;
      for (let k = i; k < stop; k++) out[k] = ' ';
      i = stop;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const close = src.indexOf('*/', i + 2);
      const stop = close < 0 ? src.length : close + 2;
      for (let k = i; k < stop; k++) if (out[k] !== '\n') out[k] = ' ';
      i = stop;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      const end = endOfString(src, i);
      if (end < 0) {
        i++;
        continue;
      }
      if (strings) for (let k = i + 1; k < end - 1; k++) if (out[k] !== '\n') out[k] = ' ';
      i = end;
      continue;
    }

    i++;
  }

  return out.join('');
}

/** A member the library declares in a documented class that `MEMBER_RE` did not read. */
export interface UnreadMember {
  /** `WrSpinner.size` — the class and the PROPERTY name, before any `alias`. */
  readonly key: string;
  /** Repo-relative file it is declared in. */
  readonly file: string;
  /** `input` / `model` / `output` — what the declaration says it is. */
  readonly kind: string;
}

/**
 * A second, deliberately dumber reading of the same declarations, and the only
 * thing in this gate that can see a member NOBODY ever saw.
 *
 * `MEMBER_RE` is one shape: a JSDoc block, `readonly`, the name, `=`, the
 * factory. Everything the house style writes, and nothing else. What that buys
 * is a clean extraction; what it costs is that a member written any other way is
 * not wrong in the output, it is ABSENT from it — and absent is the one state no
 * comparison over the extractor's own output can report. Drop `readonly` from
 * `WrSpinner.size` and every downstream check agrees the docs are complete;
 * write `label = input<string>('x')` that way from birth and it ships public,
 * undocumented, under a green run, forever. A count of emitted rows does not
 * help either: it answers "did this run see less than last time", never "did it
 * ever see this at all", and any addition in the same commit cancels the loss.
 *
 * So the witness has to come from OUTSIDE the extractor, and the cheapest honest
 * one is the source read a second time under a rule wide enough to be hard to
 * fall out of: any assignment of `input` / `model` / `output` to a property of a
 * class the library exports, whatever modifiers, annotation or documentation it
 * carries. Anything this finds and `MEMBER_RE` did not is named — by class and
 * member — and the run fails.
 *
 * Four things it deliberately does NOT do, because each would trade a certain
 * finding for a guess:
 *
 *   - **It reads names, never types.** The point is existence. A member it can
 *     see and the extractor cannot is a bug report, not a row to emit.
 *   - **`private` / `protected` / `static` are skipped**, the same rule
 *     `extractFile()` follows: those never reach a consumer.
 *   - **`const` / `let` / `var` are skipped.** A factory call assigned to a local
 *     inside a method is not a member; the declaration keyword is the only thing
 *     that distinguishes them at this resolution.
 *   - **Only classes `public-api.ts` exports**, minus `EXPORTED_BUT_INTERNAL` —
 *     the same filter `extractApi()` applies, or the toast host's inputs become
 *     a permanent finding about a component no consumer can write.
 *
 * The class scan is looser than `CLASS_RE` on purpose, for the same reason: that
 * one demands `})` immediately before `export class`, so a decorator followed by
 * a comment, or one whose argument is not a plain object literal, takes the
 * whole class out of the extraction. Here a decorator is followed to the next
 * `export class`, whatever sits between them.
 */
export function unreadMembers(read: ReadonlySet<string>): UnreadMember[] {
  const byEntry = filesByEntry();
  const exported = exportedClasses([...byEntry.values()].flat());
  const out: UnreadMember[] = [];

  for (const files of byEntry.values()) {
    for (const file of files) {
      // Comments AND string bodies: a JSDoc `@example` and a template literal
      // holding a snippet both spell a declaration the class does not have.
      const src = blanked(readFileSync(file, 'utf8'), true);

      const heads = [...src.matchAll(/@(?:Component|Directive)\s*\(/g)];
      for (const [n, head] of heads.entries()) {
        const from = (head.index ?? 0) + head[0].length;
        const to = heads[n + 1]?.index ?? src.length;
        const region = src.slice(from, to);

        const named = /\bexport\s+class\s+(\w+)/.exec(region);
        if (!named) continue;
        const klass = named[1] ?? '';
        if (!exported.has(klass) || EXPORTED_BUT_INTERNAL.has(klass)) continue;

        const body = region.slice((named.index ?? 0) + named[0].length);

        for (const m of body.matchAll(WEAK_MEMBER_RE)) {
          const name = m.groups?.['name'] ?? '';
          if (read.has(`${klass}.${name}`)) continue;
          if (/\b(?:private|protected|static)\b/.test(m.groups?.['modifiers'] ?? '')) continue;
          // `const rows = input(…)` inside a method body is a local, not a member.
          const before = body.slice(Math.max(0, (m.index ?? 0) - 8), (m.index ?? 0) + 1);
          if (/(?:^|[^\w$])(?:const|let|var)\s*$/.test(before)) continue;
          out.push({ key: `${klass}.${name}`, file: relative(ROOT_PATH, file), kind: m.groups?.['kind'] ?? '' });
        }
      }
    }
  }

  return out;
}
