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
 * A page that prints NO default is still not held to one the source has — the
 * same line `documentedMembers(src, true)` already drew for staleness. And one
 * rule that is not a tolerance at all: a row the source marks REQUIRED must
 * print no default. `<ngwr-doc-api>` renders a required badge and an em dash
 * already, so `default: '— (required)'` — which ten pages carried — says both a
 * second time and lands as a two-line chip in a column sized for `'md'`.
 */

import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { type ApiEntry, type ApiRow, extractApi, extractPublicNames } from './lib/extract-api';
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
 * Hand-written row arrays still living in showcase pages, keyed by file.
 *
 * The identifier is `\w+`, not the literal `api`, and that is the whole
 * difference between a gate and a gesture: pages name their tables `typeRows`,
 * `configApi`, `serviceApi`, `apiRows`… and for as long as discovery insisted on
 * `api` those pages were never opened, so `check()` printed a green
 * "0 page(s) disagree" over tables it had not read. Twelve of them disagreed.
 */
function handWritten(): Map<string, string> {
  const found = new Map<string, string>();
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, name.name);
      if (name.isDirectory()) {
        if (name.name !== 'generated') walk(full);
      } else if (name.name.endsWith('.ts')) {
        const src = readFileSync(full, 'utf8');
        if (/readonly \w+\s*:\s*readonly DocApiRow\[\]\s*=\s*\[/.test(src)) found.set(full, src);
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
  return name
    // A row can carry the binding's VALUE beside its name — the drawer page
    // documents `[wrDrawerClose]="value?"` to show the payload is optional.
    // Without this the row reads as unparseable and its member as undocumented.
    .replace(/=.*$/, '')
    .replace(/^(?:\[[A-Za-z]+\]|<wr-[a-z-]+>)\./, '')
    // Repeated, not once: `[(position)]` is a banana-in-a-box, two layers deep.
    .replace(/^[[(]+/, '')
    .replace(/[\])]+$/, '')
    .replace(/^\./, '');
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
}

/**
 * Every member row a page documents, from every table on it.
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
 * unless the slash is split. Both halves inherit the row's one `default:`,
 * which is what the reader sees for either of them.
 */
function documentedRows(src: string): PageRow[] {
  // Split on the name rather than matching a whole `{…}` row: a description can
  // contain braces, and a row regex that assumes it cannot silently drops the
  // row — which then reads as an undocumented member.
  const parts = src.split(/name:\s*'([^']+)'/);
  const out: PageRow[] = [];
  let parent = '';

  for (let i = 1; i < parts.length; i += 2) {
    const raw = parts[i] ?? '';
    const tail = (parts[i + 1] ?? '').split('},')[0] ?? '';
    const sub = /\bsub:\s*true/.test(tail);

    if (!sub) {
      // `<wr-list>` headings fail `isMember` on their own; `[wrAffixOffsetTop]`
      // passes it, and should — bracket form is how a page writes an input.
      parent = raw;
    } else if (!/^<wr-[a-z-]+>$|^\[wr[A-Za-z]+\]$/.test(parent)) {
      // Indented under a type or under another input — an interface field or an
      // allowed value, not a member.
      continue;
    }

    const claimsDefault = /\bdefault:/.test(tail);
    // Quote-agnostic: a page writes `default: "'speedUp'"` when the value is
    // itself quoted, and `default: '20'` when it is not.
    const def = /\bdefault:\s*(['"`])((?:\\.|(?!\1).)*)\1/.exec(tail)?.[2];

    for (const piece of raw.split('/')) {
      const name = piece.trim();
      if (isMember(name)) out.push({ name, claimsDefault, ...(def === undefined ? {} : { def }) });
    }
  }

  return out;
}

/** Member names a page documents; `requireDefault` narrows to the rows claiming to be inputs. */
function documentedMembers(src: string, requireDefault = false): string[] {
  return documentedRows(src)
    .filter(r => !requireDefault || r.claimsDefault)
    .map(r => r.name);
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
function wrongDefaults(src: string, bySrcName: Map<string, ApiRow>): { readonly lines: string[]; readonly skipped: number } {
  const lines: string[] = [];
  let skipped = 0;

  for (const row of documentedRows(src)) {
    const source = bySrcName.get(bare(row.name));
    if (!source) continue;

    if (source.required) {
      if (row.claimsDefault && normalizeDefault(row.def) !== '') {
        lines.push(`${bare(row.name)}: required in the source, but the page prints ${JSON.stringify(row.def)}`);
      }
      continue;
    }

    const declared = (source.default ?? '').trim();
    if (declared && !LITERAL.test(declared) && !LITERAL.test(withoutAside(declared))) {
      skipped++;
      continue;
    }

    const page = normalizeDefault(row.def);
    if (page === normalizeDefault(declared) || page === normalizeDefault(withoutAside(declared))) continue;
    lines.push(`${bare(row.name)}: page says ${JSON.stringify(row.def ?? null)}, source says ${JSON.stringify(source.default ?? null)}`);
  }

  return { lines, skipped };
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

function check(api: Map<string, ApiEntry>): number {
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

  let mismatched = 0;
  let unmapped = 0;
  let unreadableDefaults = 0;

  for (const [file, src] of handWritten()) {
    const rel = relative(ROOT_PATH, file);
    if (DELIBERATE_MISMATCH.has(rel)) continue;

    const entry = entryOf(file);
    const found = byEntry.get(entry);
    if (!found) {
      unmapped++;
      continue;
    }

    const names = documentedMembers(src);
    // A page can mix the two: `api = API.WrTDirective` next to a hand-written
    // table of the service's methods. The generated half documents its class in
    // full, so count it before deciding anything is missing.
    for (const m of src.matchAll(/\bAPI\.(Wr\w+)/g)) {
      for (const r of api.get(m[1] ?? '')?.rows ?? []) names.push(r.name);
    }
    const actual = new Set(found.rows.map(r => r.name).filter(isMember).map(bare));

    // Angular synthesises `<name>Change` for every `model()`, so a page listing
    // `(valueChange)` beside `[(value)]` is documenting one member from both
    // ends. Recognised, not required: the two-way form is the one to document,
    // and demanding both would add a row to every page that has a model.
    const synthesised = new Set(found.rows.filter(r => r.kind === 'model').map(r => `${bare(r.name)}Change`));

    // Held-to-existing is a narrower set than counted-as-documented: a page's
    // tables also list variant values, CSS tokens and service methods, none of
    // which are members. A row carrying `default:` is claiming to be an input,
    // and that claim is what gets checked.
    const claimed = documentedMembers(src, true);

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
    const { lines: wrong, skipped } = wrongDefaults(src, new Map(found.rows.map(r => [bare(r.name), r])));
    unreadableDefaults += skipped;

    if (missing.length === 0 && stale.length === 0 && wrong.length === 0) continue;
    mismatched++;
    console.log(`  ${rel}  (${found.primary})`);
    if (missing.length) console.log(`      missing:  ${missing.join(', ')}`);
    if (stale.length) console.log(`      unknown:  ${stale.join(', ')}`);
    for (const line of wrong) console.log(`      default:  ${line}`);
  }

  console.log(
    `\n  ${mismatched} page(s) disagree with the source;` +
      ` ${unmapped} not mapped to an entry point (interfaces, guides, groups);` +
      ` ${unreadableDefaults} default(s) not comparable (the source's is an expression, not a value).`
  );
  return mismatched;
}

function main(): void {
  const api = extractApi();
  const mode = process.argv.includes('--check') ? 'check' : 'write';

  if (mode === 'check') {
    console.log(`Comparing hand-written API tables against ${api.size} extracted classes\n`);
    const mismatched = check(api);
    if (mismatched > 0) {
      console.error(
        `\n✘ Docs disagree with the source. Add the missing rows, or replace the page's` +
          ` hand-written array with \`API.WrFoo\` and let \`pnpm gen:api-docs\` keep it current.`
      );
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
