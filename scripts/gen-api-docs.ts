/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Projects the library's signal API into the showcase as generated data, and
 * reports where a hand-written docs table still disagrees with the source.
 *
 * Two modes:
 *
 *   pnpm gen:api-docs          write projects/showcase/app/_core/generated/api.ts
 *   pnpm check:api-docs        compare hand-written tables against the source
 *
 * The check is the half that pays immediately: it turns "the docs drifted" from
 * something a human notices months later into a failing build. The 2026-08-07
 * audit found `skeleton` and `fuzzy-text` documenting defaults the code did not
 * have, `switch` missing its primary two-way model, `select` still listing an
 * input removed a major earlier, and four pages with no input table at all — all
 * of it invisible to every existing gate.
 *
 * Pages opt in to the generated data by replacing their hand-written array with
 * `API.WrFoo`. A page that keeps its own array is still checked, so the two
 * cannot drift apart silently — the check exits non-zero on any disagreement.
 *
 * "Still checked" was aspirational until discovery stopped requiring the array
 * be named `api`: a page calling its rows `typeRows` was skipped outright, and a
 * gate that reports green on a table it never opened is worse than no gate.
 * Eleven pages disagreed the first time they were opened, and they are all
 * settled now: seven were genuinely short of rows — `speed-dial` had no API
 * table at all — and seven were this comparison's own blind spots, three pages
 * being both. The second half is the thing to remember before recording an
 * exception here instead of fixing one, because none of it was docs drift and
 * none of it was fixed on a page. A `model()` publishes a `<name>Change` output
 * as well as itself; an entry point publishes option interfaces and helper
 * functions beside its components, and a page documents those under their own
 * heading; and some of the components it declares are overlay panels nothing
 * outside the library can write, so demanding docs for their inputs asks for a
 * template no consumer can type. All three now live in `extract-api.ts`.
 *
 * For a long time the comparison read NAMES only, and a name is the half a
 * reader does not copy. `animations/circular-text` could document
 * `spinDuration` as `999` — the source says `20` — and the gate exited 0, on a
 * page in `COMPARED_CLUSTERS` that it had opened and read. Twenty-one of the
 * twenty-four animation pages hand-write their rows, so that hole covered nearly
 * the whole cluster. `wrongDefaults()` closes it, and it flagged 19 rows across
 * 17 pages the first time it ran — not one of them a false positive.
 *
 * Three normalisations stand between the source and the page, and every one of
 * them is a hole, so each is drawn as narrowly as it can be:
 *
 *   - **`—`, `null` and `undefined` are one value.** The Default column renders
 *     an em dash for an absent default, so a page spelling it out renders
 *     identically to one that omits it; `undefined` is what
 *     `input<T | undefined>(undefined)` leaves in the source's own slot, and
 *     `null` is the same statement carrying a value. `''` is deliberately NOT on
 *     that list — an empty string is a default, and `marquee`'s `fadeOutColor`
 *     was documented as `—` when the component ships `''`.
 *   - **A `@default` tag's trailing parenthetical is an aside**, not part of the
 *     value: `@default 'linear' (matches reactbits' identity easing)` is
 *     satisfied by a page printing `'linear'`. The aside is written for a reader
 *     of the source; a Default column is one chip wide.
 *   - **A default the extractor could only read as an EXPRESSION is not
 *     compared** — `randomId('wr-tab')`, `DEFAULT_CHARS`, `(_, item) => item`.
 *     There is no value there to compare against, and what the docs should print
 *     instead is a judgement (`'auto'`, `'identity'`). Those rows are counted in
 *     the run's summary so the hole is visible rather than silent; six today.
 *
 * And for longer still it read names and defaults but never the TYPE, which is
 * the other column a reader copies. Proven the same way: changing a documented
 * type from `number` to `string` exited 0. `wrongTypes()` closes it, and the
 * shape of what it found is not what the default pass found — 64 rows
 * disagreed, and more than half were two sides spelling one type differently
 * rather than anyone being wrong. So the tolerances there are wider and every
 * one of them is written out below its own function: an alias and its expansion
 * are one spelling, members are a set and not a sequence, `undefined` on an
 * input is the em dash the Default column already renders, `(string & {})` is
 * `string`. What survived is real: nineteen output rows printing the emitter
 * wrapper instead of the payload, six inputs dropping a `| null` a consumer
 * binds, three array inputs dropping `readonly` — one of them on a page whose
 * own demo binds a `readonly` array to the input it documents as mutable.
 *
 * A page that prints NO default is still not held to one the source has — the
 * same line `documentedMembers(src, true)` already drew for staleness. And one
 * rule that is not a tolerance at all: a row the source marks REQUIRED must
 * print no default. `<ngwr-doc-api>` renders a required badge and an em dash
 * already, so `default: '— (required)'` — which ten pages carried — says both a
 * second time and lands as a two-line chip in a column sized for `'md'`.
 *
 * All of which was still the SMALLER half. Everything above compares a page's
 * hand-written array; 39 pages and 940 rows consume `API.WrFoo` instead, and for
 * as long as this file only ever called `extractApi()` and read showcase pages,
 * that generated artifact was checked by nothing at all — not by `build:showcase`,
 * which regenerates the selector map and the AI assets but not this, and not by
 * CI, which runs `check:api-docs` alone. Hand-editing a type in the generated
 * file exited 0; so did retyping `wr-spinner` in `projects/lib`, whose page reads
 * `API.WrSpinner`. `staleGenerated()` closes it by re-deriving the file in memory
 * and diffing, which makes `pnpm check:api-docs` answer for every documented row
 * rather than the third of them somebody typed by hand.
 *
 * Four holes on the hand-written side went with it, and each was silent in its
 * own way. A name documented TWICE was one claim, not two, so breaking one of a
 * pair exited 0 and adding a correct twin silenced an arbitrarily wrong row —
 * fixed by claiming per row and requiring distinct declarations (`wrongTypes()`).
 * Pooled source members collapsed by name and the last class walked won, so
 * documenting `WrDatePicker.mode` correctly was reported against
 * `WrDateRangePicker.mode` — fixed by keeping every candidate. Any unresolvable
 * `Wr…` was an unconditional opt-out, so a row typed `'number | WrNope'` turned
 * its own comparison off — fixed by holding a page-printed name to existing and
 * by earning the skip from what is LEFT OVER (`typeVerdict()`). And the type cell
 * was read by first match over everything up to the first `'},'`, so a
 * description saying ``type: `X`` was taken as the row's type and the real cell
 * was never compared — fixed by walking the row's own extent (`rowKeys()`).
 *
 * **Then a second pass went looking for a different class of hole, and found
 * nine.** Not "the comparison is too lenient" — every one of those had been
 * closed — but "the row, the page, or the whole comparison quietly leaves the
 * gate, and every printed number stays the same". A row parked behind a `//` was
 * still documented AND still graded (`blanked()`). Five idiomatic ways to
 * annotate a row array removed a page from discovery forever, each of them
 * lint-clean and rendering the identical table (`pages()`). `name:` anywhere in
 * a file minted a row, with no word boundary and no scope — live today on
 * `reference/components/table` (`rowArrays()`). A bare mention of `API.WrFoo` in
 * a TODO comment credited every row of that class, and the failure message this
 * file prints tells contributors to write exactly that comment. An unexpandable
 * alias, on either side, was a total opt-out for its row (`typeVerdict()`,
 * `extractTypeAliases()`). An exported interface field could answer for a member
 * it disagreed with (`wrongTypes()`). And the extractor could quietly stop
 * SEEING a member, whereupon `staleGenerated()` sent the contributor to
 * `pnpm gen:api-docs` to bake the loss in and go green.
 *
 * They are one defect wearing nine faces, and the rule underneath all nine is
 * that **a comparison that did not happen must not read as a comparison that
 * passed** — the same rule `check:state-a11y` learned about a state that never
 * painted and `check:llms` about an entry point nobody documented.
 *
 * The first answer to it was a block of floors over what the run had SEEN, and a
 * third pass showed the instrument was wrong rather than the rule: a net sum
 * cannot tell a loss from a loss plus a gain, and it goes red on ordinary growth
 * — including, worst of all, on the very migration this file's own failure
 * message recommends. Every one of those gates is a NAMED KEY now, and the
 * reasoning is written out where they are declared. The one thing no comparison
 * over extracted output could ever reach — a member the extractor never saw at
 * all — is answered by reading the library a SECOND time, in
 * `unreadMembers()`.
 */

import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import {
  type ApiEntry,
  type ApiRow,
  blanked,
  endOfString,
  extractApi,
  extractLibraryTypeNames,
  extractPublicFields,
  extractPublicNames,
  extractTypeAliases,
  splitUnion,
  unbrand,
  unreadMembers,
} from './lib/extract-api';
import { ROOT_PATH } from './lib/paths/root';

const OUT_DIR = resolve(ROOT_PATH, 'projects/showcase/app/_core/generated');
const OUT_FILE = join(OUT_DIR, 'api.ts');
const PAGES_ROOT = resolve(ROOT_PATH, 'projects/showcase/app');

function serialize(api: Map<string, ApiEntry>): string {
  const entries = [...api.entries()].sort(([a], [b]) => a.localeCompare(b));

  const body = entries
    .map(([klass, e]) => {
      const rows = e.rows
        .map(r => {
          const parts = [
            `name: ${JSON.stringify(r.name)}`,
            `description: ${JSON.stringify(r.description)}`,
            `type: ${JSON.stringify(r.type)}`,
            ...(r.required ? ['required: true'] : []),
            ...(r.default !== undefined ? [`default: ${JSON.stringify(r.default)}`] : []),
          ];
          return `    { ${parts.join(', ')} },`;
        })
        .join('\n');
      return `  // <${e.selector}>\n  ${klass}: [\n${rows}\n  ],`;
    })
    .join('\n');

  return `/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/* eslint-disable */
/**
 * GENERATED by \`pnpm gen:api-docs\` from the library's JSDoc — do not edit.
 *
 * Fix a description, a type or a default in \`projects/lib\` and re-run; the docs
 * follow. A page consumes this as \`API.WrFoo\` instead of keeping a second copy.
 */

import type { DocApiRow } from '#core/components';

/**
 * \`satisfies\` rather than a \`Record<string, …>\` annotation, deliberately: the
 * keys stay literal, so \`API.WrButton\` type-checks and \`API.WrButtno\` is a
 * compile error instead of \`undefined\` at runtime.
 */
export const API = {
${body}
} satisfies Record<string, readonly DocApiRow[]>;
`;
}

/**
 * Every showcase page that documents an API, keyed by file — the value is its
 * source with COMMENTS blanked (see `blanked()`).
 *
 * The identifier is not the literal `api`, and that was the whole difference
 * between a gate and a gesture once already: pages name their tables `typeRows`,
 * `configApi`, `serviceApi`, `apiRows`… and for as long as discovery insisted on
 * `api` those pages were never opened, so `check()` printed a green
 * "0 page(s) disagree" over tables it had not read. Twelve of them disagreed.
 *
 * **Nor is it an annotation shape, which is the same defect one layer in.**
 * Discovery keyed on the literal
 * `readonly \w+: readonly DocApiRow[] = [`, and five idiomatic spellings of the
 * same field — `: DocApiRow[]`, `: ReadonlyArray<DocApiRow>`,
 * `: readonly DocApiRow[] | undefined`, `= [ … ] satisfies readonly DocApiRow[]`,
 * and the rows hoisted to a module-level `const` — are lint-clean, render the
 * identical table and removed the page from the gate FOREVER. Each one was tried
 * with a genuinely wrong type left on the page and each exited 0 with every
 * printed number unchanged, because a page that is never opened is not a page
 * that disagrees.
 *
 * So the question asked here is the weakest one that still means something: does
 * this file document an API at all? Everything narrower is a guess about how
 * somebody will write a type annotation. `_core` is skipped whole — it DECLARES
 * `DocApiRow` and renders it, and is the only place in the showcase that does —
 * and a discovered page from which no row array can be read is reported by name.
 *
 * **`API.WrFoo` counts as documenting an API, and leaving it out was the reason
 * the migration this check RECOMMENDS could not be made.** A page that has
 * finished migrating holds no `DocApiRow` at all — 38 of them today — so
 * discovery lost the page at exactly the moment it became the best-documented
 * kind, and every count over pages fell. Replacing one page's hand-written array
 * with `api = API.WrMarquee` used to break five numbers at once and the only
 * resolution was to edit them, which is the reflex this gate exists to
 * interrupt. A migrated page is still opened, still mapped to its entry point,
 * and still held to documenting every member of it — through the generated file
 * rather than by hand, which is the same claim.
 */
function pages(): Map<string, string> {
  const found = new Map<string, string>();
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, name.name);
      if (name.isDirectory()) {
        if (name.name !== '_core') walk(full);
      } else if (name.name.endsWith('.ts')) {
        const raw = readFileSync(full, 'utf8');
        const code = blanked(raw, false);
        // The `API.WrFoo` half is read off strings-blanked code for the reason
        // the credit below is: a snippet showing a reader how to consume the
        // generated data is documentation of the idea, not a use of it.
        if (/\bDocApiRow\b/.test(code) || /\bAPI\.Wr\w+/.test(blanked(raw, true))) found.set(full, code);
      }
    }
  };
  walk(PAGES_ROOT);
  return found;
}

/**
 * The clusters where a page's folder name IS an entry point, by construction —
 * "one public API per page" for `reference`, one component per page for
 * `animations`.
 *
 * Everywhere else the match is a coincidence of naming, and taking it produces
 * confident nonsense: `guides/keyboard` is the hotkey walkthrough and would be
 * compared against `ngwr/keyboard` (the `<wr-kbd>` chip), `guides/tokens/density`
 * against the density DIRECTIVE, `guides/tokens/typography` against
 * `wrTypography` — whose real reference page is `reference/directives/typography`.
 */
const COMPARED_CLUSTERS = ['reference/', 'animations/'];

/** `…/reference/components/button/button.ts` → `button`; `''` outside the clusters above. */
function entryOf(file: string): string {
  const rel = relative(PAGES_ROOT, file);
  if (!COMPARED_CLUSTERS.some(prefix => rel.startsWith(prefix))) return '';
  const parts = rel.split('/');
  return parts[parts.length - 2] ?? '';
}

/**
 * `[wrSpotlight].resetX` / `<wr-step>.label` / `(touch)` / `[wrTilt]` /
 * `.resetY` → `resetX` / `label` / `touch` / `wrTilt` / `resetY`. Pages write a
 * member several ways; the comparison happens on the bare identifier.
 */
function bare(name: string): string {
  return (
    name
      // A row can carry the binding's VALUE beside its name — the drawer page
      // documents `[wrDrawerClose]="value?"` to show the payload is optional.
      // Without this the row reads as unparseable and its member as undocumented.
      .replace(/=.*$/, '')
      .replace(/^(?:\[[A-Za-z]+\]|<wr-[a-z-]+>)\./, '')
      // Repeated, not once: `[(position)]` is a banana-in-a-box, two layers deep.
      .replace(/^[[(]+/, '')
      .replace(/[\])]+$/, '')
      .replace(/^\./, '')
  );
}

function isMember(name: string): boolean {
  return /^(?:(?:\[[A-Za-z]+\]|<wr-[a-z-]+>)\.)?[[(.]{0,2}[a-z][A-Za-z0-9]*[\])]{0,2}(?:="[^"]*")?$/.test(name);
}

/**
 * Member names a page documents, from every table on it.
 *
 * Two shapes have to be handled or the report fills with noise.
 *
 * `sub: true` marks a row indented under the one above it, and what that means
 * depends entirely on the parent: under `<wr-list>` the sub-rows are the
 * component's inputs, under `WrMarqueeImage` they are fields of an interface,
 * and under `variant` they are the allowed values of that one input. Only the
 * first kind is a member, so the parent row decides.
 *
 * And one row often covers two members (`text / texts`,
 * `[wrSpotlight].resetX / .resetY`), which reads as both of them undocumented
 * unless the slash is split.
 */
interface PageRow {
  /** As the page writes it — `[(value)]`, `<wr-step>.label`, `(touch)`. */
  readonly name: string;
  /** The `default:` string the page prints, or `undefined` when it prints none. */
  readonly def?: string;
  /** Whether the page carries `default:` at all — `''` is a default, absence is not. */
  readonly claimsDefault: boolean;
  /**
   * The `type:` string the page prints, or `undefined` when the row carries no
   * top-level `type:` key. `DocApiRow.type` is not optional, so the second case
   * is a PARSE failure rather than an omission, and it is counted rather than
   * passed — against the PAGE's counter, since the library was read fine.
   */
  readonly type?: string;
}

/**
 * The keys of ONE row object, read from its body.
 *
 * The read used to be a first-match regex over everything up to the first
 * `'},'`, and both halves of that are holes. A description is a string like any
 * other and may contain a `}`, a quote or a comma; and the words `type:`
 * followed by a backticked name are idiomatic prose on these pages, since
 * `wrDocRich` renders backticks as code. A description that mentioned a type was
 * therefore taken AS the row's type, and the real cell was then never compared:
 * no counter moved, no line printed, the row simply left the gate. Zero rows do
 * it today, which is the only reason it was never seen.
 *
 * So the scan is a walk instead: quotes, escapes and comments are skipped, depth
 * is tracked, and only a `key:` at depth zero outside a string is a key of this
 * row. Comments are blanked long before this now (`blanked()`, called at
 * discovery), so the two branches for them are a backstop rather than the
 * defence they used to be — four docs pages carry a `//` line inside a row
 * array, and one of them holds a `//` and a backtick inside a description
 * string, which is both traps at once.
 *
 * Values come back unquoted and unescaped when they were quoted (`type: 'number'`
 * and `type: "'sm' | 'md'"` both yield the type text) and as the literal token
 * otherwise (`sub: true`). A key whose value the walk could NOT read is present
 * with an `undefined` value rather than absent — `has()` still answers the
 * "does this row claim a default at all" question, and the check counts an
 * unreadable cell against the page instead of comparing half of one.
 */
function rowKeys(tail: string): Map<string, string | undefined> {
  const out = new Map<string, string | undefined>();
  let depth = 0;
  let i = 0;

  while (i < tail.length) {
    const c = tail[i];

    if (c === '/' && tail[i + 1] === '/') {
      i = tail.indexOf('\n', i);
      if (i < 0) break;
      continue;
    }
    if (c === '/' && tail[i + 1] === '*') {
      const end = tail.indexOf('*/', i + 2);
      if (end < 0) break;
      i = end + 2;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      const end = endOfString(tail, i);
      // Unterminated: the row was cut mid-string by the split above, so nothing
      // after this point belongs to it.
      if (end < 0) break;
      i = end;
      continue;
    }
    if (c === '{' || c === '[' || c === '(') {
      depth++;
      i++;
      continue;
    }
    if (c === '}' || c === ']' || c === ')') {
      // The `}` that closes this row — everything after it belongs to the next.
      if (depth === 0) break;
      depth--;
      i++;
      continue;
    }

    const key = depth === 0 ? /^([A-Za-z_$][\w$]*)\s*:\s*/.exec(tail.slice(i)) : null;
    if (!key) {
      i++;
      continue;
    }

    const at = i + key[0].length;
    const quote = tail[at];
    if (quote === "'" || quote === '"' || quote === '`') {
      const end = endOfString(tail, at);
      if (end < 0) {
        // `type: "(name: 'read' | …` — the split cut this row inside its own
        // type cell, so the key is present and its value is unreadable. Recorded
        // as exactly that: the check counts an unreadable cell against the page
        // rather than comparing half of one.
        out.set(key[1] ?? '', undefined);
        break;
      }
      out.set(key[1] ?? '', unescape(tail.slice(at + 1, end - 1)));
      i = end;
      continue;
    }

    // An unquoted value is `true`, `false`, `null` or a number — `sub: true` and
    // `required: true` are the only ones a row carries. Anything else is an
    // EXPRESSION (`WR_COLORS.map(…)`, a template literal), and half of one read
    // to the next comma is worse than admitting the value cannot be read.
    const literal = /^(?:true|false|null|-?\d+(?:\.\d+)?)(?![\w$])/.exec(tail.slice(at));
    out.set(key[1] ?? '', literal?.[0]);
    i = at;
  }

  return out;
}

/**
 * A TypeScript string literal's body as the page renders it.
 *
 * A `\uXXXX` escape is the reason this is not a one-line
 * `replace(/\\(.)/g, '$1')`. `guides/testing` spells 53 of its em dashes and
 * ellipses as escapes rather than typing the character, and the naive form
 * leaves the letter `u` and four digits behind: neither the escape nor the
 * character, so `NOTHING` sees neither an em dash nor a value. Decoding is the
 * only reading under which a page that spells a character out and a page that
 * types it say the same thing.
 */
const NAMED_ESCAPES: Readonly<Record<string, string>> = {
  n: '\n',
  t: '\t',
  r: '\r',
  b: '\b',
  f: '\f',
  v: '\v',
  '0': '\0',
};

function unescape(text: string): string {
  return text.replace(
    /\\(u\{([0-9a-fA-F]+)\}|u([0-9a-fA-F]{4})|x([0-9a-fA-F]{2})|.)/g,
    (_: string, whole: string, brace?: string, four?: string, hex?: string): string => {
      const code = brace ?? four ?? hex;
      if (code !== undefined) return String.fromCodePoint(parseInt(code, 16));
      return NAMED_ESCAPES[whole] ?? whole;
    }
  );
}

/**
 * The `DocApiRow` array literals on one page, as the text between their
 * brackets.
 *
 * **`name:` anywhere in the file used to mint a row.** The scan was a split over
 * the whole source with no word boundary and no notion of where a table starts,
 * so a member DELETED from a table was laundered by any snippet, prose line or
 * comment elsewhere in the file that happened to name it — and the phantom was
 * then graded as correct while the real table sat short. It is live today:
 * `reference/components/table` prints `table.exportCsv({ filename: 'users.csv' })`
 * in a demo snippet, which minted a row called `users.csv`, inert only because
 * `isMember()` rejects the dot. `fileName:`, `className:` and `displayName:` all
 * minted one too.
 *
 * So a row has to be found INSIDE a table. **What makes an array a table is its
 * CONTENTS, and keying on the declaration instead left a second table on an
 * already-discovered page outside the gate four ways over.** `pages()` had
 * already learned this lesson one layer out and been widened to "does this file
 * mention `DocApiRow` at all"; this function had not, and still demanded an `=`
 * immediately before the `[` with a `DocApiRow` in the annotation, or a trailing
 * `satisfies` / `as`. Four spellings a page can add a table in —
 * `protected readonly extraApi = [ … ]` with no annotation at all,
 * `[ … ] as const`, `signal<readonly DocApiRow[]>([ … ])` and
 * `computed<readonly DocApiRow[]>(() => [ … ])` — type-check, render through
 * `<ngwr-doc-api [rows]="extraApi">`, and carried a wrong type AND a wrong
 * default with not one counter moving. Two of them name `DocApiRow` in the
 * annotation, so a contributor had every reason to believe they were inside the
 * gate. Adding a second table to an existing page is routine: `drawer` carries
 * five.
 *
 * A declaration-shaped rule cannot be finished, because there is always another
 * lint-clean way to write one. So the question asked is the one that has an
 * answer: **is this array literal made of `DocApiRow`s?** Every top-level
 * element is an object carrying `name`, `description` and `type` — the three
 * fields the interface makes required, so a table always has them and an
 * incidental array of `{ name, value }` demo data does not. The annotated and
 * asserted forms are still accepted directly, because an EMPTY table declared as
 * one is a table with nothing in it rather than something else.
 *
 * Strings are skipped while scanning, so a bracket inside a code snippet cannot
 * open a table, and an accepted array is skipped past so a nested one cannot be
 * counted twice.
 */
function rowArrays(code: string): string[] {
  const out: string[] = [];

  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    if (c === "'" || c === '"' || c === '`') {
      const end = endOfString(code, i);
      if (end > 0) i = end - 1;
      continue;
    }
    if (c !== '[') continue;

    const close = closerOf(code, i);
    if (close < 0) continue;

    // Back to the previous statement boundary, which is as much as an annotation
    // can span. The `[]` of `DocApiRow[]` itself lands here too and is refused by
    // the trailing `=`: it is part of the type, not the value.
    const from = Math.max(0, i - 400);
    const window = code.slice(from, i);
    const head = window.slice(Math.max(window.lastIndexOf(';'), window.lastIndexOf('{'), window.lastIndexOf('}')) + 1);
    const tail = code.slice(close + 1, close + 200);
    const body = code.slice(i + 1, close);

    const annotated = /\bDocApiRow\b/.test(head) && /=\s*$/.test(head);
    const asserted = /^\s*(?:satisfies|as)\s+[^;]*\bDocApiRow\b/.test(tail);
    if (annotated || asserted || holdsRows(body)) {
      out.push(body);
      i = close;
    }
  }

  return out;
}

/**
 * Whether an array literal is a table by its contents — every top-level element
 * an object carrying the three keys `DocApiRow` makes required.
 *
 * `every`, so one `{ label, value }` in the array disqualifies it; and at least
 * one element, because `every` over none is vacuously true and would make every
 * empty array on the page a table. The elements are the brace-matched ones
 * `rowObjects()` reads, so a spread (`...API.WrFoo`) contributes nothing either
 * way — an array of nothing but spreads is not claimed here and does not need to
 * be, since a spread of the generated data is already credited by name.
 */
function holdsRows(body: string): boolean {
  const objects = rowObjects(body);
  if (objects.length === 0) return false;
  return objects.every(o => {
    const keys = rowKeys(o);
    return keys.has('name') && keys.has('description') && keys.has('type');
  });
}

/** Index of the `]` / `}` closing the bracket at `open`, skipping strings; `-1` if it never closes. */
function closerOf(code: string, open: number): number {
  const opener = code[open];
  const closer = opener === '[' ? ']' : '}';
  let depth = 0;

  for (let i = open; i < code.length; i++) {
    const c = code[i];
    if (c === "'" || c === '"' || c === '`') {
      const end = endOfString(code, i);
      if (end > 0) i = end - 1;
      continue;
    }
    if (c === opener) depth++;
    else if (c === closer && --depth === 0) return i;
  }

  return -1;
}

/** The bodies of the top-level `{…}` elements of one row array — a spread (`...API.WrFoo`) is not one. */
function rowObjects(body: string): string[] {
  const out: string[] = [];

  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === "'" || c === '"' || c === '`') {
      const end = endOfString(body, i);
      if (end > 0) i = end - 1;
      continue;
    }
    if (c !== '{') continue;
    const close = closerOf(body, i);
    if (close < 0) break;
    out.push(body.slice(i + 1, close));
    i = close;
  }

  return out;
}

/** What one page's tables turned out to hold — see `documentedRows()`. */
interface PageTables {
  readonly rows: PageRow[];
  /** Tables found on the page. Zero on a page that mentions `DocApiRow` is a failure, not a quiet pass. */
  readonly tables: number;
  /** Row objects whose own `name:` could not be read, as the opening of each — reported, never passed. */
  readonly unparsed: readonly string[];
}

/**
 * Every member row a page documents, from every table on it.
 *
 * The elements of a table are brace-matched and each one's keys are read by
 * `rowKeys()` — including its `name`. The old split on `name:` was there because
 * "a description can contain braces, and a row regex that assumes it cannot
 * silently drops the row", and that reason still holds against a REGEX; it does
 * not hold against a walk that skips strings, which is what both of these now
 * are. What the split cost instead was every hole above: no word boundary, no
 * scope, and a comment handled after the fact rather than before it.
 *
 * Two shapes have to be handled or the report fills with noise.
 *
 * `sub: true` marks a row indented under the one above it, and what that means
 * depends entirely on the parent: under `<wr-list>` the sub-rows are the
 * component's inputs, under `WrMarqueeImage` they are fields of an interface,
 * and under `variant` they are the allowed values of that one input. Only the
 * first kind is a member, so the parent row decides — per table, since a page's
 * next table starts a new parent.
 *
 * And one row often covers two members (`text / texts`,
 * `[wrSpotlight].resetX / .resetY`), which reads as both of them undocumented
 * unless the slash is split. Both halves inherit the row's one `default:`,
 * which is what the reader sees for either of them.
 */
function documentedRows(code: string): PageTables {
  const rows: PageRow[] = [];
  const unparsed: string[] = [];
  let tables = 0;

  for (const table of rowArrays(code)) {
    tables++;
    let parent = '';

    for (const object of rowObjects(table)) {
      const keys = rowKeys(object);
      const raw = keys.get('name');
      if (raw === undefined) {
        // `DocApiRow.name` is not optional, so an element with no readable one is
        // a parse failure on this side — reported as that rather than dropped,
        // which is how a row leaves the gate without anything moving.
        unparsed.push(object.replace(/\s+/g, ' ').trim().slice(0, 60));
        continue;
      }

      const sub = keys.get('sub') === 'true';
      if (!sub) {
        // `<wr-list>` headings fail `isMember` on their own; `[wrAffixOffsetTop]`
        // passes it, and should — bracket form is how a page writes an input.
        parent = raw;
      } else if (!/^<wr-[a-z-]+>$|^\[wr[A-Za-z]+\]$/.test(parent)) {
        // Indented under a type or under another input — an interface field or an
        // allowed value, not a member.
        continue;
      }

      const claimsDefault = keys.has('default');
      const def = keys.get('default');
      const type = keys.get('type');

      for (const piece of raw.split('/')) {
        const name = piece.trim();
        if (isMember(name)) {
          rows.push({
            name,
            claimsDefault,
            ...(def === undefined ? {} : { def }),
            ...(type === undefined ? {} : { type }),
          });
        }
      }
    }
  }

  return { rows, tables, unparsed };
}

/** Member names a page documents; `requireDefault` narrows to the rows claiming to be inputs. */
function documentedMembers(rows: readonly PageRow[], requireDefault = false): string[] {
  return rows.filter(r => !requireDefault || r.claimsDefault).map(r => r.name);
}

/**
 * The spellings of "this input carries no value", which the Default column
 * renders as one thing: an em dash.
 *
 * `undefined` is on the list because it is what `input<T | undefined>(undefined)`
 * puts in the source's own default slot, and `null` because it is the same
 * statement with a value — `[closeLabel]` unset IS `null`, and a page writing
 * either the token or the dash has told the reader the same true thing. Widening
 * past those three would start excusing prose, which is the next entry down.
 */
const NOTHING: ReadonlySet<string> = new Set(['', '—', 'null', 'undefined']);

/**
 * A default whose printed form IS its value.
 *
 * Anything else — `DEFAULT_CHARS`, `randomId('wr-tab')`, `(_, item) => item` —
 * is an expression the extractor read out of the call site, not a value: what
 * the docs should print for it is a judgement (`'auto'`, `'identity'`) that no
 * comparison can make. Those rows are skipped and COUNTED, so the hole shows up
 * in the run's own output instead of being silent.
 */
const LITERAL = /^(?:'[^']*'|"[^"]*"|`[^`]*`|-?\d[\d_]*(?:\.\d+)?|true|false|null|undefined|\[[\s\S]*\]|\{[\s\S]*\})$/;

/**
 * `'linear' (matches reactbits' identity easing)` → `'linear'`.
 *
 * A `@default` tag often carries an aside for the reader of the source. The
 * value is the part before it, and a page printing either the whole tag or just
 * the value is right — a Default column is narrow and the aside belongs in the
 * description.
 */
function withoutAside(value: string): string {
  return value.replace(/\s*\([^()]*\)\s*$/, '').trim();
}

function normalizeDefault(value: string | undefined): string {
  const text = (value ?? '').trim().replace(/\s+/g, ' ');
  return NOTHING.has(text) ? '' : text;
}

/**
 * Every default a page prints that the source contradicts.
 *
 * Two claims are checked and they fail differently. A row the source says is
 * REQUIRED must not print a default at all: `<ngwr-doc-api>` already renders the
 * required badge and an em dash, so `default: '— (required)'` duplicates both
 * and lands as a two-line chip. And a row that does print one must print what
 * the source has, after the normalisations above.
 *
 * A page that prints NO default is not checked against a source that has one —
 * the same line `documentedMembers(src, true)` draws for staleness. A row
 * carrying `default:` is making a claim; a row without one is documenting a
 * member without answering that column, which several pages do deliberately for
 * outputs and directive selectors.
 */
function wrongDefaults(
  rows: readonly PageRow[],
  candidates: Map<string, readonly ApiRow[]>
): { readonly lines: string[]; readonly skipped: string[]; readonly compared: number } {
  const lines: string[] = [];
  const skipped: string[] = [];
  let compared = 0;

  for (const row of rows) {
    const pool = candidates.get(bare(row.name));
    if (!pool || pool.length === 0) continue;
    compared++;

    let verdict: DefaultVerdict = { kind: 'differ', line: '' };
    for (const source of pool) {
      const one = defaultVerdict(row, source);
      if (one.kind === 'ok') {
        verdict = one;
        break;
      }
      if (one.kind === 'skip' || verdict.line === '') verdict = one;
    }

    if (verdict.kind === 'ok') continue;
    if (verdict.kind === 'skip') {
      skipped.push(bare(row.name));
      compared--;
    } else lines.push(verdict.line);
  }

  return { lines, skipped, compared };
}

type DefaultVerdict = { readonly kind: 'ok' } | { readonly kind: 'skip' } | { readonly kind: 'differ'; line: string };

/** One page row against one candidate source member — see `wrongDefaults()`. */
function defaultVerdict(row: PageRow, source: ApiRow): DefaultVerdict {
  const name = bare(row.name);

  if (source.required) {
    if (row.claimsDefault && normalizeDefault(row.def) !== '')
      return {
        kind: 'differ',
        line: `${name}: required in the source, but the page prints ${JSON.stringify(row.def)}`,
      };
    return { kind: 'ok' };
  }

  const declared = (source.default ?? '').trim();
  if (declared && !LITERAL.test(declared) && !LITERAL.test(withoutAside(declared))) return { kind: 'skip' };

  const page = normalizeDefault(row.def);
  if (page === normalizeDefault(declared) || page === normalizeDefault(withoutAside(declared))) return { kind: 'ok' };
  return {
    kind: 'differ',
    line: `${name}: page says ${JSON.stringify(row.def ?? null)}, source says ${JSON.stringify(source.default ?? null)}`,
  };
}

/** A union member that is nothing but a library name, and every library name inside one. */
const BARE_ALIAS = /^Wr[A-Za-z0-9_]*$/;
const ANY_ALIAS = /\bWr[A-Za-z0-9_]*\b/g;

/**
 * A string-union alias and its expansion are ONE spelling, in both directions.
 *
 * The two serve two different readers and the site already ships both, decided
 * by nothing: the expansion answers the person typing
 * `<wr-drawer position="…">`, the alias name answers the person writing
 * `input<WrDrawerPosition>()`. `doc-api.html` renders the Type cell as a bare
 * `<code>` with no link and no tooltip, so a page printing `WrDrawerPosition`
 * gives a reader no path to the four legal strings — and 147 generated rows
 * print the alias while 23 hand-written ones print the expansion, with no
 * editorial rule behind the split. Accepting only the alias would make 23
 * correct pages less useful; accepting only the expansion would make
 * `pnpm gen:api-docs` fail its own output, and would inline `WrIconName` as
 * `string`, which is strictly less true than the name.
 *
 * The resolver is narrow on purpose — only a non-generic
 * `type Wr… = <string literals>` (see `extractStringUnions()`). An interface, a
 * value-derived alias (`WrColor = (typeof WR_COLORS)[number]`), an
 * alias-of-primitive (`WrIconName = string`), a generic, a tuple: all left as
 * text, all falling to the skip-and-count below.
 *
 * **What this lets through: a reordered union.** `window.ts` prints
 * `'normal' | 'compact'` where the source declares `'compact' | 'normal'` — the
 * one live instance in the repo, and it is on the one page the check skips
 * whole. A TypeScript union is unordered and no reader is misled by the
 * sequence. A page that DROPS an arm, ADDS one or RENAMES one still fails,
 * because the comparison is set equality and never subset.
 */
function typeMembers(type: string, unions: Map<string, readonly string[]>, depth = 0): string[] {
  const out: string[] = [];

  for (const member of splitUnion(type.replace(/\s+/g, ' ').trim())) {
    const arm = unbrand(unwrapped(member));
    // Per member rather than splicing the alias's RHS into the string: the RHS
    // can carry prettier's leading `|`, and a spliced one re-parses as an empty
    // member.
    const expansion = depth < 4 && BARE_ALIAS.test(arm) ? unions.get(arm) : undefined;
    if (expansion) out.push(...typeMembers(expansion.join(' | '), unions, depth + 1));
    else out.push(arm);
  }

  return out;
}

/**
 * One enclosing paren pair off a union member, and only when it wraps the whole
 * member: `((date: Date) => boolean)` and `(date: Date) => boolean` are the same
 * type, and the parens exist because the member sits in a union. The
 * whole-member test is what keeps `(date: Date) => boolean` from losing its
 * parameter list.
 */
function unwrapped(member: string): string {
  if (!member.startsWith('(') || !member.endsWith(')')) return member;
  let depth = 0;
  for (let i = 0; i < member.length; i++) {
    const c = member[i];
    if (c === '>' && member[i - 1] === '=') continue;
    if (c === '(' || c === '[' || c === '{' || c === '<') depth++;
    else if (c === ')' || c === ']' || c === '}' || c === '>') {
      depth--;
      // Closed before the end — the pair wraps a prefix, not the member.
      if (depth === 0 && i < member.length - 1) return member;
    }
  }
  return member.slice(1, -1).trim();
}

/**
 * Whether a top-level `undefined` is dropped from both sides of one comparison.
 *
 * `undefined` at the top of an INPUT's type is a declaration artefact, not a
 * value: `input<T | undefined>(undefined)` is what `input<T>()` with no initial
 * value produces, and it says "this input has no value" — exactly what the
 * Default column already renders as an em dash, and the same statement `NOTHING`
 * normalises away on the neighbouring column for the same declaration. Seven
 * rows are this and nothing else.
 *
 * Three gates keep it from becoming a general permission, and each one closes a
 * hole rather than tidying:
 *
 *   - **Decided by the SOURCE.** A page may never ADD `undefined` to a type that
 *     does not have one.
 *   - **Inputs and models only.** On an `output<T | undefined>()` the token is a
 *     value the listener receives, and a page dropping it tells the reader
 *     `$event` is always a `T`. No output declares one today; the guard closes
 *     the hole before it opens.
 *   - **Refused when the source also declares `null`.** `WrTable.items` is
 *     `input<readonly WrTableRow[] | null | undefined>(null)` and its JSDoc says
 *     "`null`/`undefined` renders the empty state" — a declaration naming both
 *     has drawn a distinction, or is sloppy, and either way it should be seen.
 *
 * `null` is deliberately NOT on this list. It is a value with per-component
 * semantics — fall back to config, render a `<span>` instead of an `<a>`, keep
 * "unset" distinct from `false` — and six rows are failing on exactly that.
 */
function dropsUndefined(source: ApiRow, sourceMembers: readonly string[]): boolean {
  if (source.kind !== 'input' && source.kind !== 'model') return false;
  return sourceMembers.includes('undefined') && !sourceMembers.includes('null');
}

/**
 * A bracketed selector row whose type cell is the literal word `directive`.
 *
 * `directive` names the KIND, not the value, and for a marker attribute that is
 * honest — `[wrDialogTitle]`, `<ng-template wrTableExpand>` and eighteen others
 * carry no value at all, and 20 of the 24 such cells never reach a comparison
 * because the directive has no member of that name. For a VALUE-carrying
 * attribute it is a withheld fact, and the four that collide here are exactly
 * those: the selector attribute IS the input binding. The page shape that
 * answers correctly already exists — `reference/components/dialog` writes the
 * bracketed parent row and a bare `sub: true` child typed `R | undefined` — so
 * this counter falls to zero as the other three pages adopt it, which is why the
 * row is counted rather than silently passed.
 *
 * Both halves are load-bearing. Keying on the word alone would let a bare-named
 * input dodge the gate by writing it, and would collide with `guides/csp`, which
 * types `script-src` as `'directive'` in a completely different sense. Keying on
 * the bracket alone costs four comparisons that pass today — `[wrContextMenu]`,
 * `[wrAffixOffsetTop]`, `[wrHotkey]`, `[wrMeta]` — and would skip every
 * `[wrSpotlight].resetX`-shaped row besides.
 */
const SELECTOR_NAME = /^\[[A-Za-z][\w-]*\](?:="[^"]*")?$/;

function isSelectorRow(row: PageRow): boolean {
  return SELECTOR_NAME.test(row.name) && /^directive$/i.test((row.type ?? '').trim());
}

interface TypeReport {
  readonly lines: string[];
  /** Rows that reached a real comparison — the witness that this ran at all. */
  readonly compared: number;
  /** S1 — the selector rows documenting the attribute rather than its value, by name. */
  readonly selectors: string[];
  /** S2 — the members whose library type the extractor could not read. */
  readonly unreadableSource: string[];
  /** S3 — the rows whose `type:` cell could not be parsed on the page. */
  readonly unreadablePage: string[];
}

/** How one page row compares against one candidate source declaration. */
type TypeVerdict = { readonly kind: 'match' } | { readonly kind: 'differ' };

/**
 * One page row against one candidate source declaration.
 *
 * The two sides go through the SAME pipeline — collapse whitespace, split the
 * top-level union, unwrap a member's own parens, unbrand `string & {}`, expand
 * an alias — and are compared as SETS. Nothing in it is source-only or
 * page-only: an asymmetric normaliser is a rule about which side may lie, and
 * there is no such rule here.
 *
 * **There is no longer an alias verdict, and that is the point.** Two of them
 * used to sit here — "the source holds a `Wr…` the resolver cannot expand and
 * the page spelled the arms out", and its mirror — each of them a PASS with a
 * counter ticked, and each of them a total opt-out for the row that earned it.
 * An adversarial pass priced both. `typewriter.variableSpeed` (source
 * `WrTypewriterVariableSpeed | undefined`) passed as `number`, as `string`, as
 * `boolean | null`, as `'a' | 'b'` and as `{ lo: number }`, every one of them
 * exit 0 with the counter reading the same 1 it reads when the page is right.
 * The mirror was worse, because it is not even an unexpandable name: where the
 * SOURCE spelled its arms out, the page could answer with any DECLARED `Wr…` at
 * all — `WrMarqueeImage`, `WrTableColumn` and `WrDrawerOptions` all passed for
 * `marquee.direction`, whose source says `'left' | 'right'`. Only an INVENTED
 * name was caught, so the `declared` set was closing typos and nothing else. A
 * source that spelled the arms out has told you the arms; a page that answers a
 * type name instead of them is not unexpandable, it is wrong.
 *
 * So the answer is a wider index and a narrower rule, rather than the two of
 * them meeting in the middle. `extractTypeAliases()` now expands an alias of a
 * primitive, of a function type, of a value and of an interface, which is what
 * the one live skip actually needed. What it still cannot expand — a generic, an
 * `extends`, a call signature — is REPORTED, and the report says so, because
 * both sides naming that alias the same way is a rule any page can satisfy and
 * an opt-out is not.
 */
function typeVerdict(
  page: string,
  source: ApiRow,
  unions: Map<string, readonly string[]>
): { readonly verdict: TypeVerdict } {
  const wanted = typeMembers(source.type, unions);
  const drop = dropsUndefined(source, wanted);
  const keep = (members: readonly string[]): Set<string> =>
    new Set(drop ? members.filter(m => m !== 'undefined') : members);

  const want = keep(wanted);
  const got = keep(typeMembers(page, unions));
  if (got.size === want.size && [...got].every(m => want.has(m))) return { verdict: { kind: 'match' } };

  return { verdict: { kind: 'differ' } };
}

/** The `Wr…` names on either side of a disagreement that the index could not expand — the report says them out loud. */
function opaqueNames(page: string, source: string, unions: Map<string, readonly string[]>): string[] {
  const named = [...new Set([...(page.match(ANY_ALIAS) ?? []), ...(source.match(ANY_ALIAS) ?? [])])];
  return named.filter(n => !unions.has(n));
}

/**
 * Every type a page prints that the source contradicts.
 *
 * **One claim per ROW, and a row passes if it matches ANY candidate declaration
 * of that name.** The two halves are separate decisions and each closes a hole.
 *
 * Per row, because a name documented twice used to be a free pass: `alpha`,
 * `format`, `position`, `closeLabel` and eleven others carry two rows on a
 * compared page, one match excused both, and ADDING a second correct row would
 * silence an arbitrarily wrong first one on any page at all. `wrongDefaults()`
 * has always counted per row one column over, so on a page like `drawer` the
 * same duplication was one claim for `type` and two for `default`. It is two for
 * both now.
 *
 * Any candidate, because the source side pools an entry point as a whole and a
 * member name is not unique in it: `date-picker` declares `mode` on both
 * `WrDatePicker` and `WrDateRangePicker`, `popconfirm` declares `confirmText` on
 * the directive and the panel, and `table` declares `items` twice. Keeping one
 * row per name — which a `new Map(rows.map(…))` silently does — let the LAST
 * class walked decide, so documenting `WrDatePicker.mode` correctly was reported
 * as wrong against `WrDateRangePicker.mode`. **`any` rather than `all` because
 * the page's headings are invisible here**: the rows live in the class and the
 * heading that says which class they document lives in the template, so "this
 * cell equals SOME same-named public declaration" is the strongest claim the
 * pool can honestly make. `all` would fail every correctly-documented collision
 * on day one.
 *
 * The candidate pool is members, plus — **only where the members cannot go
 * round** — the entry point's exported interface fields
 * (`extractPublicFields()`). `drawer` documents `WrDrawer.closeLabel`
 * (`string | null`) and `WrDrawerOptions.closeLabel` (`string`) on one page, and
 * both cells are right; exactly one row in the showcase needs the fields, and it
 * is that one.
 *
 * **The scoping is the whole of it, and without it the field pool laundered any
 * name documented ONCE.** 47 member names are also an exported field and 11 of
 * them DISAGREE, so a page could answer either — `stepper.linear` documented as
 * `Signal<boolean>` (which is the field's type; the member's is `boolean`) was
 * scored a match, not even a skip, and told a reader the input takes a Signal.
 * A field is admitted now only when a name carries MORE rows than the library
 * declares members of it, which is the only situation the drawer case is: two
 * tables, one heading each, and the headings live in the template where this
 * cannot see them. One row against one member is a question the member pool can
 * answer, so it answers it.
 *
 * **And "any" is per row, not per name: two rows carrying one name owe two
 * DISTINCT declarations** (`pairOff()`). That is what keeps the widened pool
 * from being a way back in. 47 member names are also an exported field and 11 of
 * them differ, so without distinctness `WrDrawer.closeLabel` could quietly drop
 * its `| null` and land on `WrDrawerOptions.closeLabel` instead — re-opening, on
 * this one page, the exact class of defect the type check was written to find.
 * With it, both rows then say `string`, one declaration goes unclaimed, and the
 * row is reported.
 *
 * The three things it cannot compare are counted, never passed — the `LITERAL`
 * discipline one column over — and each counter names the side actually at
 * fault. Two things are NOT among them: a `Wr…` the page prints that the library
 * does not DECLARE is a typo, and an alias neither side's index can expand is a
 * spelling the two sides have to agree on. Both are reported.
 */
/**
 * Which page rows can be paired off with a DISTINCT candidate declaration —
 * Kuhn's augmenting path over a graph too small to deserve anything cleverer.
 *
 * The rule this implements is why the pool can be "any candidate" without
 * becoming a free pass: two rows documenting one name owe two declarations, not
 * one twice. `drawer` prints `closeLabel` in its component table (`string |
 * null`) and again in its options table (`string`), and there are exactly two
 * public declarations to go round — so both cells pass. Drop the `| null` from
 * the component row and both rows now say `string`, both want the same
 * declaration, and `WrDrawer.closeLabel` is left with no row claiming it. A
 * greedy first-fit answers that wrong whenever the rows are considered in the
 * unlucky order, which is the only reason this is a matching rather than a loop.
 */
function pairOff(edges: readonly (readonly number[])[], candidates: number): boolean[] {
  const owner = new Array<number>(candidates).fill(-1);

  const assign = (row: number, seen: boolean[]): boolean => {
    for (const c of edges[row] ?? []) {
      if (seen[c]) continue;
      seen[c] = true;
      if (owner[c] === -1 || assign(owner[c] ?? -1, seen)) {
        owner[c] = row;
        return true;
      }
    }
    return false;
  };

  for (let row = 0; row < edges.length; row++) assign(row, new Array<boolean>(candidates).fill(false));

  // Read back off `owner` rather than off what `assign` returned: an augmenting
  // path re-partners rows it passes through, so the return value describes the
  // moment it was taken and `owner` describes where everything landed.
  const held = edges.map(() => false);
  for (const row of owner) if (row >= 0) held[row] = true;
  return held;
}

function wrongTypes(
  pageRows: readonly PageRow[],
  members: Map<string, readonly ApiRow[]>,
  fields: Map<string, readonly ApiRow[]>,
  unions: Map<string, readonly string[]>,
  declared: ReadonlySet<string>
): TypeReport {
  const lines: string[] = [];
  const selectors: string[] = [];
  const unreadableSource: string[] = [];
  const unreadablePage: string[] = [];
  let compared = 0;

  const byName = new Map<string, PageRow[]>();
  for (const row of pageRows) {
    const key = bare(row.name);
    byName.set(key, [...(byName.get(key) ?? []), row]);
  }

  for (const [name, group] of byName) {
    const declaredMembers = members.get(name);
    if (!declaredMembers || declaredMembers.length === 0) continue;

    // Three shapes leave the comparison before the matching, one row at a time,
    // because each is a statement about that row alone.
    const rows: PageRow[] = [];
    for (const row of group) {
      if (isSelectorRow(row)) {
        selectors.push(row.name);
        continue;
      }
      if (row.type === undefined) {
        unreadablePage.push(row.name);
        continue;
      }

      // A name the library declares nowhere is a typo, not a spelling this
      // cannot resolve. It used to be the only thing caught on this side.
      const invented = [...new Set(row.type.match(ANY_ALIAS) ?? [])].filter(n => !declared.has(n));
      if (invented.length > 0) {
        const named = invented.map(n => JSON.stringify(n)).join(', ');
        lines.push(`${name}: page names ${named}, which the library never declares`);
        continue;
      }

      rows.push(row);
    }
    if (rows.length === 0) continue;

    // The interface fields join only for the rows the members cannot go round —
    // see the docblock. One row against one member is a question the member pool
    // can answer, and a field answering it instead is how `stepper.linear` was
    // documented as `Signal<boolean>` under a green run.
    const pool =
      rows.length > declaredMembers.length ? [...declaredMembers, ...(fields.get(name) ?? [])] : declaredMembers;

    const readable = pool.filter(c => !c.unreadableType);
    if (readable.length === 0) {
      for (const row of rows) unreadableSource.push(row.name);
      continue;
    }
    compared += rows.length;

    const verdicts = rows.map(row => readable.map(source => typeVerdict(row.type ?? '', source, unions).verdict));
    const paired = pairOff(
      verdicts.map(vs => vs.flatMap((v, i) => (v.kind === 'match' ? [i] : []))),
      readable.length
    );

    rows.forEach((row, i) => {
      if (paired[i]) return;

      // A row that HAS a matching declaration and still lost it is a different
      // report from one that has none: nothing is misspelled, there are simply
      // more rows carrying this name than the library has declarations of it.
      if ((verdicts[i] ?? []).some(v => v.kind === 'match')) {
        const spare = readable.filter((_, c) => !verdicts.some((vs, r) => paired[r] && vs[c]?.kind === 'match'));
        lines.push(
          `${name}: ${rows.length} rows document it, but the library declares it ${readable.length} time(s) —` +
            ` ${JSON.stringify(row.type)} is claimed twice and` +
            ` ${spare.map(c => JSON.stringify(c.type)).join(', ')} by nothing`
        );
        return;
      }

      const spellings = [...new Set(readable.map(c => c.type))].map(t => JSON.stringify(t));
      const opaque = opaqueNames(row.type ?? '', readable.map(c => c.type).join(' | '), unions);
      const says = spellings.length > 1 ? `one of ${spellings.join(', ')}` : spellings[0];
      const hint =
        opaque.length > 0
          ? ` (${opaque.join(', ')} cannot be expanded — both sides have to spell it the same way)`
          : '';
      lines.push(`${name}: page says ${JSON.stringify(row.type)}, source says ${says}${hint}`);
    });
  }

  return { lines, compared, selectors, unreadableSource, unreadablePage };
}

/**
 * Pages whose folder names an entry point they deliberately do not document.
 *
 * `reference/components/window` says it in its own opening line: there is no
 * declarative `<wr-window>` for consumers, the manager is the only entry point,
 * and the page documents `WrWindowConfig` / `WrWindowManager` / `WrWindowRef`
 * instead. Its twenty-seven "missing" members are the internal component's
 * inputs, so holding the page to them would be demanding docs for an API the
 * library does not offer.
 */
const DELIBERATE_MISMATCH: ReadonlySet<string> = new Set([
  'projects/showcase/app/reference/components/window/window.ts',
]);

/**
 * What this gate claims, and why none of it is a count any more.
 *
 * **A comparison that did not happen must not read as a comparison that
 * passed**, and until something was published every one of them did. A row
 * parked behind a `//`, a page whose annotation moved out of the shape discovery
 * recognised, a phantom row minted by a snippet, an extractor that quietly
 * stopped seeing a member: each of those left the gate with exit 0 and not one
 * printed number changed. The first answer to that was a block of `FLOORS` — a
 * net sum of pages opened, rows read and comparisons performed, held to never
 * falling — and it was the wrong instrument, in a way that took a third
 * adversarial pass to see clearly.
 *
 * **A sum cannot tell a loss from a loss plus a gain, nor growth from restored
 * slack**, and four separate findings turned out to be that one sentence:
 *
 *   - Replacing a page's hand-written array with `api = API.WrMarquee` — the
 *     migration the failure message below *recommends*, and which 39 pages have
 *     already made — dropped five floors at once and could only be resolved by
 *     hand-editing five numbers. **A gate that fails on its own advice is worse
 *     than no gate.**
 *   - Adding a legitimate new page of five rows in the same commit as parking
 *     four rows of another page behind `//` read 487 against a floor of 486 and
 *     went green, with four rows silently gone from a rendered table.
 *   - Dropping `readonly` from `WrSpinner.size` — so the extractor stops seeing
 *     it — while adding any other readable member kept the row total identical,
 *     which printed the "regenerate and commit" advice, which bakes the loss in.
 *   - Adding one ordinary page under `guides/` pushed a ceiling over and closed
 *     with "the run compared less than it has before" while the comparison
 *     counters sat exactly where they always had. A message that names the wrong
 *     thing is acted on.
 *
 * So the instrument is a NAMED KEY instead of a total, everywhere, and the rule
 * it follows reads the same in every case: **a key that used to be there and is
 * gone is a failure that says its own name; a key that appears is free.** Growth
 * costs nothing, a loss cannot be cancelled by a gain somewhere else, and no
 * number has to be edited to record either.
 *
 * The keys are DERIVED, not committed, which is the part worth defending. Three
 * of them:
 *
 *   - **`Class.member`, from the library read twice.** `unreadMembers()` scans
 *     the same declarations under a far looser rule than `MEMBER_RE`, so a
 *     member the extractor stopped reading — or never read, which no comparison
 *     over its OUTPUT can reach — is named against the file it lives in.
 *   - **The entry point, from the library.** Every entry point the extractor
 *     finds components in must be documented by some page: mapped by folder, or
 *     credited by an `API.WrFoo` the page consumes. A page that leaves the
 *     corpus takes its entry point's coverage with it and is named for it; a new
 *     page is free.
 *   - **The member, per compared page.** `missing` already asks the strongest
 *     claim a docs gate can make — *every public member of every mapped entry
 *     point is documented, and its type and default agree* — against the library
 *     rather than against yesterday's total. Under that claim the migration
 *     above is invariant by construction: the member is still documented,
 *     through the generated file instead of by hand.
 *
 * Nothing is committed because nothing had to be. The one thing a derived key
 * cannot answer is "should this page exist at all", and the honest answer is
 * that the library is the authority on that too: delete a component and its
 * rows, its entry and its page all leave together, and the run says nothing —
 * which is correct, because nothing is missing. Delete the page and keep the
 * component and the entry point is named as undocumented, which is the same
 * event seen from the side that matters.
 *
 * What remains as a written-down list is the two things a run genuinely cannot
 * compare, and those are ALLOWANCES rather than floors — recorded per key so a
 * new one is named and a legitimate new page adds none. A count would have been
 * bumped from 4 to 5 and covered a different row than the one that earned it.
 */

/**
 * Entry points whose components no page documents, and why that is accepted.
 *
 * The check that produces this list is the replacement for a floor on pages
 * opened: an entry point with extracted rows and no page is a coverage hole
 * whatever the totals say, and a new page can never make one of these
 * disappear. Each line is a claim about the docs site, and the way to remove one
 * is to write the page.
 */
const UNDOCUMENTED_ENTRIES: ReadonlyMap<string, string> = new Map([
  [
    'directives',
    'the showcase splits `ngwr/directives` across four pages named after the directive' +
      ' (autofocus, autosize, click-outside, copy-to-clipboard), and a page is held to an entry point as a' +
      ' whole — so each of the four would be reported missing the other three. Their seven members are' +
      ' documented and are NOT compared; fixing it means mapping a page to a class rather than a folder',
  ],
]);

/**
 * Members whose default the source states as an EXPRESSION — `randomId('wr-tab')`,
 * `DEFAULT_CHARS`, `(_, item) => item`. There is no value in them to compare a
 * page against, and what the docs should print instead (`'auto'`, `'identity'`)
 * is a judgement no comparison can make.
 *
 * Keyed by `entry.member`, so documenting one of them on a second page adds
 * nothing here and a NEW expression default in the library is named on the run
 * that introduces it. That is the whole difference from the count this replaces:
 * a total of six could be raised to seven to cover a row other than the one that
 * earned it.
 */
const EXPRESSION_DEFAULTS: ReadonlySet<string> = new Set([
  'tabs.key',
  'decrypt-text.characters',
  'drag-drop.trackBy',
  'virtual-scroll.maxBufferPx',
  'virtual-scroll.minBufferPx',
  'virtual-scroll.trackBy',
]);

/**
 * Bracketed rows typed with the literal word `directive` — the page documents the
 * ATTRIBUTE where the source types its VALUE, so the type columns are answering
 * two different questions and cannot be compared.
 *
 * For a marker attribute that is honest: `[wrDialogTitle]` and eighteen others
 * carry no value at all, and those never reach a comparison because the
 * directive has no member of that name. The four recorded here are the ones
 * where the selector attribute IS the input binding, so the cell is a withheld
 * fact rather than a true one. The page shape that answers correctly already
 * exists — `reference/components/dialog` writes the bracketed parent row and a
 * bare `sub: true` child typed `R | undefined` — so this list should shrink to
 * nothing as the other pages adopt it.
 *
 * Keyed by page and row, because that is what a reviewer can check. A fifth one
 * appearing is a line in a diff saying which page added it.
 */
const SELECTOR_ROWS: ReadonlySet<string> = new Set([
  'projects/showcase/app/reference/components/dialog/dialog.ts [wrDialogClose]',
  'projects/showcase/app/reference/components/drawer/drawer.ts [wrDrawerClose]="value?"',
  'projects/showcase/app/reference/components/table/table.ts [wrTableCell]',
  'projects/showcase/app/reference/services/density/density.ts [wrDensity]',
]);

/** Keys the run saw that no allowance records — each one a new thing this cannot compare. */
function unrecorded(seen: Iterable<string>, allowed: ReadonlySet<string>): string[] {
  return [...new Set([...seen].filter(key => !allowed.has(key)))].sort();
}

/** Allowances nothing needed any more — a note, never a failure: the run got BETTER. */
function spent(seen: Iterable<string>, allowed: ReadonlySet<string>): string[] {
  const found = new Set(seen);
  return [...allowed].filter(key => !found.has(key)).sort();
}

/** What one run found — page disagreements, named failures, and notes that are not failures. */
interface Findings {
  readonly mismatched: number;
  readonly problems: string[];
  readonly notes: string[];
}

function check(api: Map<string, ApiEntry>): Findings {
  // An entry point is compared as a whole, not class by class: `layout/`
  // documents `WrLayout` + header + sider + content + footer on one page, and
  // `table/` documents the column and cell directives alongside the table. The
  // page's own tables are one flat pool of names, so the source side has to be
  // one too, or every sibling directive reads as undocumented drift.
  const byEntry = new Map<string, { readonly primary: string; readonly rows: ApiRow[] }>();
  const pascal = (entry: string): string =>
    `Wr${entry
      .split('-')
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join('')}`;

  for (const e of api.values()) {
    const found = byEntry.get(e.entry);
    if (!found) {
      byEntry.set(e.entry, { primary: e.klass, rows: [...e.rows] });
      continue;
    }
    found.rows.push(...e.rows);
    // The class named after the folder is the page's headline, whatever order
    // the files were walked in.
    if (e.klass === pascal(e.entry)) byEntry.set(e.entry, { primary: e.klass, rows: found.rows });
  }

  const publicNames = extractPublicNames();
  const publicFields = extractPublicFields();
  const declaredTypes = extractLibraryTypeNames();
  const unions = extractTypeAliases();

  // What the run saw, kept BY NAME. Every one of these is either a failure that
  // says which thing it is about, or an allowance keyed the same way — see the
  // block above for why none of them is a total.
  const documentedEntries = new Set<string>();
  const noTable: string[] = [];
  const unnamedRows: string[] = [];
  const expressionDefaults: string[] = [];
  const selectorRows: string[] = [];
  const unreadableSourceTypes: string[] = [];
  const unreadablePageTypes: string[] = [];
  const unmapped: string[] = [];

  // Printed and never gated. A total describes the corpus, and the corpus is
  // supposed to grow — every gate above reads a name instead.
  let pageCount = 0;
  let rowCount = 0;
  let comparedPages = 0;
  let typesCompared = 0;
  let defaultsCompared = 0;
  let mismatched = 0;

  for (const [file, code] of pages()) {
    const rel = relative(ROOT_PATH, file);
    pageCount++;

    const tables = documentedRows(code);
    rowCount += tables.rows.length;
    for (const excerpt of tables.unparsed) unnamedRows.push(`${rel}  {${excerpt}…`);
    // Only a page that says `DocApiRow` has CLAIMED a table. One discovered by
    // `API.WrFoo` alone has finished migrating and correctly has none.
    if (tables.tables === 0 && /\bDocApiRow\b/.test(code)) noTable.push(rel);

    // **Off the code, not off the file.** The scan ran over the raw source, so a
    // TODO comment — `// TODO: migrate this table to API.WrCircularText` — turned
    // the whole `missing` half off for that class, and the failure message this
    // check prints tells contributors to make exactly that migration. Strings go
    // too: a snippet showing a reader how to consume `API.WrFoo` is documentation
    // of the idea, not a use of it.
    //
    // Read before the page is mapped, because consuming `API.WrFoo` is how a
    // page documents an entry point whose folder it is not named after.
    const credited = [...blanked(code, true).matchAll(/\bAPI\.(Wr\w+)/g)].map(m => m[1] ?? '');
    for (const klass of credited) {
      const of = api.get(klass)?.entry;
      if (of !== undefined) documentedEntries.add(of);
    }

    const entry = entryOf(file);
    const found = byEntry.get(entry);
    if (found) documentedEntries.add(entry);

    // The page for an entry point it deliberately documents from another angle is
    // still that entry point's page — see `DELIBERATE_MISMATCH`.
    if (DELIBERATE_MISMATCH.has(rel)) continue;

    if (!found) {
      unmapped.push(rel);
      continue;
    }
    comparedPages++;

    const names = documentedMembers(tables.rows);
    // A page can mix the two: `api = API.WrTDirective` next to a hand-written
    // table of the service's methods. The generated half documents its class in
    // full, so count it before deciding anything is missing.
    for (const klass of credited) {
      for (const r of api.get(klass)?.rows ?? []) names.push(r.name);
    }
    const actual = new Set(
      found.rows
        .map(r => r.name)
        .filter(isMember)
        .map(bare)
    );

    // Angular synthesises `<name>Change` for every `model()`, so a page listing
    // `(valueChange)` beside `[(value)]` is documenting one member from both
    // ends. Recognised, not required: the two-way form is the one to document,
    // and demanding both would add a row to every page that has a model.
    const synthesised = new Set(found.rows.filter(r => r.kind === 'model').map(r => `${bare(r.name)}Change`));

    // Held-to-existing is a narrower set than counted-as-documented: a page's
    // tables also list variant values, CSS tokens and service methods, none of
    // which are members. A row carrying `default:` is claiming to be an input,
    // and that claim is what gets checked.
    const claimed = documentedMembers(tables.rows, true);

    // …but only against the entry point's members, so a row documenting one of
    // the other things it exports — an option interface's field, a helper
    // function, a directive's own attribute — is not a claim that went stale.
    const alsoPublic = publicNames.get(entry) ?? new Set<string>();

    // A member counts as documented however the page writes it. But only a name
    // written BARE is held to existing: `[wrTilt]` in brackets is template
    // syntax, and pages use it to document the directive's own selector, which
    // is not a member of anything.
    const documented = new Set(names.map(bare));
    const missing = [...actual].filter(n => !documented.has(n));
    const known = (n: string): boolean => actual.has(n) || synthesised.has(n) || alsoPublic.has(n);
    const stale = [...new Set(claimed.filter(n => !n.startsWith('[') && !known(bare(n))).map(bare))];

    // Names were only ever half of it. A row can name a real input and still
    // print a default the source does not have — `pnpm check:api-docs` returned
    // 0 on `spinDuration` documented as `999`, because nothing compared the one
    // column a reader copies verbatim into their template.
    //
    // Every candidate is kept, never the last one walked: an entry point is
    // pooled as a whole and a member name is not unique in it — see
    // `wrongTypes()` for the six live collisions and why a row matching ANY of
    // them is the strongest honest claim.
    const bySrcName = new Map<string, ApiRow[]>();
    for (const r of found.rows) {
      const key = bare(r.name);
      bySrcName.set(key, [...(bySrcName.get(key) ?? []), r]);
    }
    const { lines: wrong, skipped, compared: comparedDefaults } = wrongDefaults(tables.rows, bySrcName);
    for (const member of skipped) expressionDefaults.push(`${entry}.${member}`);
    defaultsCompared += comparedDefaults;

    // A `model()` publishes its `<name>Change` output too, and two rows in the
    // whole showcase document one from that end — `select`'s `(valueChange)` and
    // `(searchQueryChange)`. The names half already recognises them; without a
    // source row to compare against, their type cells were the only ones on a
    // compared page that nothing could read. Kept out of `bySrcName` above so
    // the synthesised row cannot start answering the Default column, which is
    // not a question a `<name>Change` output has.
    const byTypeName = new Map([...bySrcName].map(([k, v]) => [k, [...v]]));
    for (const r of found.rows) {
      if (r.kind !== 'model') continue;
      const key = `${bare(r.name)}Change`;
      if (!byTypeName.has(key)) byTypeName.set(key, [{ ...r, name: `(${key})`, kind: 'output', default: undefined }]);
    }

    // …and the entry point's exported interface fields, which are the other
    // thing a docs table on an overlay page documents under its own heading.
    // Handed to `wrongTypes()` SEPARATELY rather than merged in, because they are
    // a fallback and not a second pool: merged, they answered for rows the
    // members could perfectly well have answered, and 11 of the 47 names that are
    // both a member and a field disagree. A field is a type-column candidate
    // only besides — it has no default, and letting one answer that column would
    // excuse a member's.
    const fieldRows = new Map<string, readonly ApiRow[]>();
    for (const [field, spellings] of publicFields.get(entry) ?? []) {
      if (!byTypeName.has(field)) continue;
      fieldRows.set(
        field,
        spellings.map(type => ({ name: field, description: '—', type }))
      );
    }

    // Names and defaults were still only two thirds of it. A row can name a real
    // input, print the right default, and describe a type the component does not
    // have: `input` documented `wrSize` without the `| null` that reaches the
    // config default, and nineteen output rows printed the emitter wrapper
    // instead of the payload a reader binds `$event` to.
    const types = wrongTypes(tables.rows, byTypeName, fieldRows, unions, declaredTypes);
    typesCompared += types.compared;
    for (const name of types.selectors) selectorRows.push(`${rel} ${name}`);
    for (const name of types.unreadableSource) unreadableSourceTypes.push(`${rel} ${name}`);
    for (const name of types.unreadablePage) unreadablePageTypes.push(`${rel} ${name}`);

    if (missing.length === 0 && stale.length === 0 && wrong.length === 0 && types.lines.length === 0) continue;
    mismatched++;
    console.log(`  ${rel}  (${found.primary})`);
    if (missing.length) console.log(`      missing:  ${missing.join(', ')}`);
    if (stale.length) console.log(`      unknown:  ${stale.join(', ')}`);
    for (const line of wrong) console.log(`      default:  ${line}`);
    for (const line of types.lines) console.log(`      type:     ${line}`);
  }

  const problems: string[] = [];
  const notes: string[] = [];

  // Named, one line each, and every line says which thing it is about. The
  // wording matters as much as the gate: a run that closes with "the run
  // compared less than it has before" while the comparison counters sit exactly
  // where they always have sends a reader looking for a loss that did not
  // happen, and the only fix they can find is to edit the number.
  for (const rel of noTable)
    problems.push(`${rel}  references DocApiRow, but no row array could be read from it`);
  for (const row of unnamedRows) problems.push(`${row}  is a row object with no readable name:`);
  for (const row of unreadableSourceTypes)
    problems.push(`${row}  the library's own type could not be read, so the page's cannot be checked`);
  for (const row of unreadablePageTypes) problems.push(`${row}  the page's type: cell could not be parsed`);

  // An entry point the extractor found components in and no page documents. The
  // replacement for a floor on pages opened: a new page can never hide one of
  // these, and a deleted page is named the run after it leaves.
  for (const entry of [...byEntry.keys()].sort())
    if (!documentedEntries.has(entry) && !UNDOCUMENTED_ENTRIES.has(entry))
      problems.push(
        `${entry}: the library declares ${byEntry.get(entry)?.rows.length ?? 0} documented member(s) here` +
          ` and no showcase page documents them`
      );

  for (const key of unrecorded(expressionDefaults, EXPRESSION_DEFAULTS))
    problems.push(`${key}: the source's default is an expression, so nothing can be compared — record it or give it a value`);
  for (const key of unrecorded(selectorRows, SELECTOR_ROWS))
    problems.push(`${key}: typed \`directive\`, so the page documents the attribute where the source types its value`);

  // Allowances nothing needed. Not a failure — the run got better — but said out
  // loud, because a list that only ever grows stops describing anything.
  for (const key of spent(expressionDefaults, EXPRESSION_DEFAULTS))
    notes.push(`EXPRESSION_DEFAULTS no longer needs ${key}`);
  for (const key of spent(selectorRows, SELECTOR_ROWS)) notes.push(`SELECTOR_ROWS no longer needs ${key}`);
  for (const entry of UNDOCUMENTED_ENTRIES.keys())
    if (documentedEntries.has(entry)) notes.push(`UNDOCUMENTED_ENTRIES no longer needs ${entry} — a page documents it now`);

  console.log(
    `\n  read ${pageCount} page(s) documenting an API, ${rowCount} hand-written row(s) on them;\n` +
      `  ${comparedPages} page(s) held to an entry point, ${unmapped.length} documenting something else` +
      ` (guides, utils, validators, interfaces);\n` +
      `  ${typesCompared} type(s) and ${defaultsCompared} default(s) compared against a declaration;\n` +
      `  ${api.size} class(es) and ${[...api.values()].reduce((n, e) => n + e.rows.length, 0)} row(s) in generated/api.ts,` +
      ` every member the library declares read;\n` +
      `  ${byEntry.size - UNDOCUMENTED_ENTRIES.size} of ${byEntry.size} entry point(s) documented by a page,` +
      ` ${UNDOCUMENTED_ENTRIES.size} recorded as not;\n` +
      `  ${expressionDefaults.length} default(s) and ${selectorRows.length} selector row(s) not comparable, all recorded;\n` +
      `  ${mismatched} page(s) disagree with the source.`
  );

  return { mismatched, problems, notes };
}

/**
 * Whether the committed `generated/api.ts` is still what the extractor emits.
 *
 * **The largest hole this check ever had, and it was the half nobody was
 * looking at.** Everything above compares HAND-WRITTEN arrays; 39 pages and 940
 * rows consume `API.WrFoo` instead, and that file is a committed artifact that
 * nothing re-derived and nothing diffed. `build:showcase` regenerates the
 * selector map, the quality numbers and the AI assets — not this — and CI runs
 * `check:api-docs` on its own. So a library type change with no follow-up
 * `pnpm gen:api-docs` shipped a stale cell under a green
 * `0 page(s) disagree`. Proven twice: hand-editing a type in the generated file
 * exited 0, and retyping `wr-spinner` in `projects/lib` — whose page consumes
 * `API.WrSpinner` — exited 0 as well. It is not a type-column problem either:
 * the NAME and DEFAULT columns of those 940 rows had exactly the same cover.
 *
 * Folded in here rather than added as a CI step, deliberately. A step in the
 * workflow covers the pull request and nothing a contributor runs locally, and
 * `pnpm check:api-docs` is already the command whose whole job is "the docs
 * agree with the source" — a generated file that disagrees with its own
 * generator is that sentence exactly. The file is tracked and not gitignored, so
 * comparing against the working tree is comparing against what ships.
 *
 * The diff is a line multiset, not an LCS: every row serialises to one line and
 * the lines are near-unique, so "present here, absent there" reads better than
 * a hunk and needs no algorithm to be trusted. A change that only reorders lines
 * leaves both sides empty, so the first differing line number is printed too.
 *
 * **It cannot tell "the library changed" from "the extractor stopped seeing
 * something", and for a while it told contributors the wrong thing about it.**
 * Annotate a member's type by hand — `readonly size: InputSignal<WrSpinnerSize>
 * = input(…)` — and `MEMBER_RE` no longer matches it. This fires, correctly, and
 * the advice underneath it read `Run \`pnpm gen:api-docs\` and commit the
 * result`: doing that writes 939 rows where there were 940, and the next run is
 * green with nothing anywhere saying a row was lost. That is the one place this
 * check actively instructed the wrong action.
 *
 * So a diff that SHRINKS says so in its own line, and the closing message it
 * takes is chosen by a fact rather than a hedge. The witness underneath it was a
 * floor on the row total for a while, and a floor cannot answer this: dropping
 * `readonly` from one member while adding another readable one leaves the total
 * identical, so the shrink is invisible and the "regenerate and commit" advice
 * comes back. `unreadMembers()` answers it directly instead — a member the
 * library still declares and the extractor no longer reads is NAMED, so a
 * shrinking diff with a clean census is a genuine deletion and a shrinking diff
 * beside a census finding is the loss, and the two get different advice. The row
 * count is read off the serialised text of both sides, so it describes what
 * ships rather than what the extractor thinks it found.
 */
function staleGenerated(api: Map<string, ApiEntry>): { readonly lines: string[]; readonly shrank: boolean } {
  const out = relative(ROOT_PATH, OUT_FILE);
  if (!existsSync(OUT_FILE)) return { lines: [`${out} is missing`], shrank: false };

  const fresh = serialize(api);
  const committed = readFileSync(OUT_FILE, 'utf8');
  if (committed === fresh) return { lines: [], shrank: false };

  const freshLines = fresh.split('\n');
  const committedLines = committed.split('\n');
  const counts = new Map<string, number>();
  for (const line of freshLines) counts.set(line, (counts.get(line) ?? 0) + 1);
  for (const line of committedLines) counts.set(line, (counts.get(line) ?? 0) - 1);

  const added: string[] = [];
  const removed: string[] = [];
  for (const [line, n] of counts) {
    for (let i = 0; i < n; i++) added.push(line);
    for (let i = 0; i < -n; i++) removed.push(line);
  }

  const rows = (text: string): number => (text.match(/^ {4}\{ name: /gm) ?? []).length;
  const shrank = rows(fresh) < rows(committed);

  const lines = [`${out} is stale — the extractor no longer emits what the file holds:`];
  const CAP = 8;
  for (const line of removed.slice(0, CAP)) lines.push(`  - ${line.trim()}`);
  if (removed.length > CAP) lines.push(`  - … and ${removed.length - CAP} more line(s) only in the file`);
  for (const line of added.slice(0, CAP)) lines.push(`  + ${line.trim()}`);
  if (added.length > CAP) lines.push(`  + … and ${added.length - CAP} more line(s) only in the source`);
  if (added.length === 0 && removed.length === 0) {
    const at = freshLines.findIndex((line, i) => line !== committedLines[i]);
    lines.push(`  the same lines in a different order, first at line ${at + 1}`);
  }
  if (shrank)
    lines.push(
      `  it now holds ${rows(committed)} row(s) and the extractor emits ${rows(fresh)} — the docs would LOSE rows`
    );

  return { lines, shrank };
}

function main(): void {
  const api = extractApi();
  const mode = process.argv.includes('--check') ? 'check' : 'write';

  if (mode === 'check') {
    console.log(`Comparing documented API tables against ${api.size} extracted classes\n`);
    const { mismatched, problems, notes } = check(api);

    // The library read a second time, under a rule wide enough that a member has
    // to be deliberately exotic to fall out of it. Everything else in this file
    // compares the extractor's OUTPUT against something; only this can see a
    // member that never reached the output at all.
    // The census is a witness on the extractor's OUTPUT, not a second opinion
    // about the same regex. Built from `MEMBER_RE` re-run inside the census's
    // own region, it agreed with itself whenever `CLASS_RE` failed — three
    // lint-clean spellings (a comment between `})` and `export class`, hoisted
    // decorator metadata) dropped a whole class from the docs with the census
    // silent and the run advising a regenerate that bakes the loss in.
    const read = new Set([...api.values()].flatMap(e => e.rows.map(r => `${e.klass}.${r.prop ?? bare(r.name)}`)));
    const unread = unreadMembers(read);
    if (unread.length > 0) {
      console.log('');
      for (const m of unread) console.log(`  ${m.key}  is a public ${m.kind}() in ${m.file} that the extractor cannot read`);
    }

    const stale = staleGenerated(api);
    if (stale.lines.length > 0) {
      console.log(`\n  ${stale.lines[0]}`);
      for (const line of stale.lines.slice(1)) console.log(`  ${line}`);
    }
    if (problems.length > 0) {
      console.log('');
      for (const line of problems) console.log(`  ${line}`);
    }
    for (const note of notes) console.log(`  note: ${note}`);

    const out = relative(ROOT_PATH, OUT_FILE);
    if (mismatched > 0 || unread.length > 0 || stale.lines.length > 0 || problems.length > 0) {
      if (mismatched > 0) {
        console.error(
          `\n✘ Docs disagree with the source. Add the missing rows, or replace the page's` +
            ` hand-written array with \`API.WrFoo\` and let \`pnpm gen:api-docs\` keep it current.`
        );
      }
      if (unread.length > 0) {
        console.error(
          `\n✘ The library declares ${unread.length} member(s) the extractor cannot read.` +
            ` Each one is public, absent from the docs, and invisible to every comparison over what the` +
            ` extractor emits — which is why they are read a second time. Restore the house shape` +
            ` (\`readonly x = input<T>(…)\` under a JSDoc block), or widen MEMBER_RE in scripts/lib/extract-api.ts.`
        );
      }
      // Three messages, because the run now KNOWS which of the two things a
      // stale file means, and it used to guess. A member deleted from
      // `projects/lib` and a member the extractor stopped being able to READ look
      // identical in this diff — but not to the census above, so the advice can
      // finally differ on the fact instead of hedging. The census wins whenever
      // it has anything to say: regenerating while a member is unreadable writes
      // a file with that member missing, whatever the row total does.
      if (stale.lines.length > 0 && unread.length > 0) {
        console.error(
          `\n✘ ${out} disagrees with the extractor, and the census above says why: the library still declares` +
            ` ${unread.length} member(s) that are no longer being read. Do NOT run \`pnpm gen:api-docs\` yet —` +
            ` it would write a file with those members missing, and the run after it is green.` +
            ` Fix the declarations named above first.`
        );
      }
      if (stale.lines.length > 0 && unread.length === 0 && !stale.shrank) {
        console.error(`\n✘ ${out} is out of date with \`projects/lib\`. Run \`pnpm gen:api-docs\` and commit the result.`);
      }
      if (stale.shrank && unread.length === 0) {
        console.error(
          `\n✘ ${out} would lose rows if it were regenerated now, and every member the library still declares` +
            ` was read — so those rows were genuinely deleted from \`projects/lib\`.` +
            ` Run \`pnpm gen:api-docs\` and commit the result.`
        );
      }
      if (problems.length > 0) {
        console.error(
          `\n✘ ${problems.length} thing(s) above left the comparison, and each line names the page, member or` +
            ` entry point it is about. Fix that, or record it BY KEY in scripts/gen-api-docs.ts` +
            ` (UNDOCUMENTED_ENTRIES / EXPRESSION_DEFAULTS / SELECTOR_ROWS) with the reason —` +
            ` there is no total here to raise, so adding a page or a row can never be what caused this.`
        );
      }
      process.exit(1);
    }

    console.log('\n✓ Every documented API matches the library source.');
    process.exit(0);
  }

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, serialize(api));
  const rows = [...api.values()].reduce((n, e) => n + e.rows.length, 0);
  console.log(`✓ ${relative(ROOT_PATH, OUT_FILE)} — ${api.size} classes, ${rows} rows`);
}

main();
