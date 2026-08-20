/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Scans every `@Component` / `@Directive` under `projects/lib` and produces a
 * `selector part → { symbol, path }` map, so the docs site can answer "which
 * ngwr symbols does this template fragment need?" from a fragment alone.
 *
 * The subpath half is not re-derived here: the class name is looked up in
 * {@link buildSymbolMap}, which reads the `public-api.ts` files that actually
 * decide what `ngwr/<entry>` publishes. A class that map does not know is
 * INTERNAL — an overlay panel, a host the component creates itself — and it is
 * left out of the emitted map rather than pointed at a subpath nobody can
 * import. Left out, but counted: see {@link WrSelectorStats}.
 *
 * Two failure modes this file exists to not have, both of them already paid for
 * on this codebase:
 *
 * **Comments break brace matching.** Finding a decorator body means matching
 * braces from the opening `{`, and a matcher that only skips quoted strings
 * reads the apostrophe in `// mark busy, don't block` — a real comment inside
 * `wr-table`'s `host: { … }` block — as the start of a string, loses balance,
 * and walks off the end of the file. A prototype dropped `wr-table` from the map
 * exactly that way: no error, just a missing entry. So the scan is a character
 * state machine (code / line comment / block comment / the three quote forms,
 * template substitutions included) rather than a regex.
 *
 * **A regex over text with no completeness assertion.** Every occurrence of
 * `@Component(` / `@Directive(` in code has to end in a record or an explicit
 * classification, and anything else THROWS with the file and byte offset. A map
 * that quietly covers most of the declarations reads exactly like a complete
 * one. A decorator may legitimately carry no `selector` (an abstract base); that
 * is a classification, not a hole, and it is tallied separately. The real tally
 * is printed by `pnpm gen:selectors` on every run, which is where to read it —
 * a figure copied into this comment would be the stale half of the same problem.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';

import { buildSymbolMap } from './build-symbol-map';
import { ROOT_PATH } from './paths/root';

const LIB_ROOT = resolve(ROOT_PATH, 'projects/lib');

/**
 * Directory names the scan never descends into.
 *
 * `schematics/` and `mcp/` are Node code shipped in the same tarball, not
 * Angular entry points — `schematics/page/templates.ts` holds a component whose
 * selector is `app-${dashName}`, a template placeholder that is not a selector
 * at all. `testing/` holds harnesses and no components; excluded for speed
 * rather than correctness, which is why it is safe to have it here.
 */
const SKIP_DIRS = new Set(['schematics', 'mcp', 'testing', 'node_modules']);

/** One declaration, as the scanner reads it out of a file. */
interface Declaration {
  readonly klass: string;
  readonly selector: string | null;
  /** Byte offset of the `@` — the coordinate every thrown error quotes. */
  readonly offset: number;
}

type ScanState = 'code' | 'line-comment' | 'block-comment' | 'single' | 'double' | 'template';

const DECORATOR_RE = /@(?:Component|Directive)\s*\(/g;

/** Every `.ts` file the scan covers, sorted so two runs emit the same file. */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    if (name.startsWith('.') || SKIP_DIRS.has(name)) continue;
    const full = resolve(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full));
      continue;
    }
    // Specs declare host components with selectors like `wr-inner-cmp` that
    // exist for one `describe` and ship nowhere.
    if (!name.endsWith('.ts') || name.endsWith('.spec.ts')) continue;
    out.push(full);
  }
  return out;
}

function isWordChar(ch: string | undefined): boolean {
  return ch !== undefined && /[\w$]/.test(ch);
}

/**
 * Walk the decorator body from its opening `{` to the matching `}`, returning
 * the top-level `selector` literal (or `null`) and where the body ends.
 *
 * One pass, because the two questions are the same walk: the state machine that
 * keeps braces balanced through `// don't` is also the thing that knows a
 * `selector:` it passes is real code and not the word inside a doc comment. The
 * key is only honoured at depth 1 — `host: { … }` has no `selector`, but a
 * nested object that grew one must not be mistaken for the component's.
 */
function readDecoratorBody(source: string, open: number, where: string): { selector: string | null; end: number } {
  let state: ScanState = 'code';
  let depth = 0;
  let selector: string | null = null;
  let awaiting = false;
  let literalStart = -1;
  /** Brace depths at which a `${` substitution opened, innermost last. */
  const substitutions: number[] = [];

  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];

    switch (state) {
      case 'line-comment':
        if (ch === '\n') state = 'code';
        break;

      case 'block-comment':
        if (ch === '*' && next === '/') {
          state = 'code';
          i++;
        }
        break;

      case 'single':
      case 'double':
        if (ch === '\\') {
          i++;
          break;
        }
        if (ch === (state === 'single' ? "'" : '"')) {
          if (awaiting) {
            selector = source.slice(literalStart, i);
            awaiting = false;
          }
          state = 'code';
        }
        break;

      case 'template':
        if (ch === '\\') {
          i++;
          break;
        }
        if (ch === '$' && next === '{') {
          // A substitution is code again, and its closing `}` is a brace the
          // depth counter must see open first or it will close the decorator.
          depth++;
          substitutions.push(depth);
          state = 'code';
          i++;
          break;
        }
        if (ch === '`') {
          if (awaiting) {
            // `selector: \`wr-${name}\`` is not something this map can resolve,
            // and guessing would be the silent-shortfall bug in another costume.
            const raw = source.slice(literalStart, i);
            if (raw.includes('${')) throw new Error(`${where}: computed selector \`${raw}\` — cannot be resolved statically`);
            selector = raw;
            awaiting = false;
          }
          state = 'code';
        }
        break;

      case 'code':
        if (ch === '/' && next === '/') {
          state = 'line-comment';
          i++;
          break;
        }
        if (ch === '/' && next === '*') {
          state = 'block-comment';
          i++;
          break;
        }
        if (ch === "'" || ch === '"' || ch === '`') {
          state = ch === "'" ? 'single' : ch === '"' ? 'double' : 'template';
          literalStart = i + 1;
          break;
        }
        if (ch === '{') {
          depth++;
          break;
        }
        if (ch === '}') {
          if (substitutions.length > 0 && substitutions[substitutions.length - 1] === depth) {
            substitutions.pop();
            depth--;
            state = 'template';
            break;
          }
          depth--;
          if (depth === 0) return { selector, end: i };
          break;
        }
        if (depth === 1 && ch === 's' && !isWordChar(source[i - 1]) && source.startsWith('selector', i)) {
          const after = /^\s*:/.exec(source.slice(i + 'selector'.length));
          if (after && !isWordChar(source[i + 'selector'.length])) {
            awaiting = true;
            i += 'selector'.length + after[0].length - 1;
          }
        }
        break;
    }
  }

  throw new Error(`${where}: unbalanced decorator body — brace matching walked off the end of the file`);
}

/** Every declaration in one file, plus the count of non-code mentions. */
function declarationsIn(file: string): { declarations: Declaration[]; mentions: number } {
  const source = readFileSync(file, 'utf8');
  const rel = relative(ROOT_PATH, file);
  const declarations: Declaration[] = [];
  let mentions = 0;

  DECORATOR_RE.lastIndex = 0;
  for (const match of source.matchAll(DECORATOR_RE)) {
    const offset = match.index;
    const where = `${rel}:${offset}`;

    // The token also appears in prose — a JSDoc paragraph explaining what the
    // decorator does. Those are mentions, not declarations, and they are
    // reported rather than dropped, so the tally still adds up.
    if (!inCode(source, offset)) {
      mentions++;
      continue;
    }

    const open = source.indexOf('{', offset + match[0].length);
    if (open === -1) throw new Error(`${where}: ${match[0]} with no object literal`);
    // Anything but whitespace between `(` and `{` means the metadata is not an
    // inline literal (a spread, a shared const) and the selector is elsewhere.
    const between = source.slice(offset + match[0].length, open);
    if (between.trim() !== '') throw new Error(`${where}: ${match[0]}${between.trim()} — metadata is not an inline object literal`);

    const { selector, end } = readDecoratorBody(source, open, where);
    const tail = source.slice(end + 1, end + 200);
    const klass = /^\s*\)\s*(?:export\s+)?(?:declare\s+)?(?:abstract\s+)?class\s+(\w+)/.exec(tail)?.[1];
    if (!klass) throw new Error(`${where}: no class declaration follows the decorator (saw ${JSON.stringify(tail.slice(0, 60))})`);

    declarations.push({ klass, selector, offset });
  }

  return { declarations, mentions };
}

/**
 * Whether `offset` sits in code rather than inside a comment or a string.
 *
 * Same state machine as {@link readDecoratorBody}, run from the top of the file
 * without the brace bookkeeping — a decorator token in a `/** … *\/` block is
 * documentation, and treating it as a declaration would make the completeness
 * assertion fail on prose.
 */
function inCode(source: string, offset: number): boolean {
  let state: ScanState = 'code';
  const substitutions: boolean[] = [];

  for (let i = 0; i < offset; i++) {
    const ch = source[i];
    const next = source[i + 1];

    switch (state) {
      case 'line-comment':
        if (ch === '\n') state = 'code';
        break;
      case 'block-comment':
        if (ch === '*' && next === '/') {
          state = 'code';
          i++;
        }
        break;
      case 'single':
      case 'double':
        if (ch === '\\') i++;
        else if (ch === (state === 'single' ? "'" : '"')) state = 'code';
        break;
      case 'template':
        if (ch === '\\') i++;
        else if (ch === '$' && next === '{') {
          substitutions.push(true);
          state = 'code';
          i++;
        } else if (ch === '`') state = 'code';
        break;
      case 'code':
        if (ch === '/' && next === '/') {
          state = 'line-comment';
          i++;
        } else if (ch === '/' && next === '*') {
          state = 'block-comment';
          i++;
        } else if (ch === "'") state = 'single';
        else if (ch === '"') state = 'double';
        else if (ch === '`') state = 'template';
        else if (ch === '}' && substitutions.length > 0) {
          substitutions.pop();
          state = 'template';
        }
        break;
    }
  }

  return state === 'code';
}

/** A single matcher out of a comma-separated selector: `button[wr-btn]`. */
interface SelectorPart {
  readonly tag: string | null;
  readonly attributes: readonly string[];
}

const PART_RE = /^([a-zA-Z][\w-]*)?((?:\[[^\]]+\])*)$/;
const ATTR_RE = /\[([^\]]+)\]/g;

/**
 * Split `'wr-btn, button[wr-btn], a[wr-btn]'` into its matchers.
 *
 * Throws on a shape it does not understand (a class selector, a `:not()`)
 * rather than skipping it — a selector form nobody taught this function about
 * is the same silent shortfall as a broken brace match, one level down.
 */
function parseSelector(selector: string, where: string): SelectorPart[] {
  return selector.split(',').map(raw => {
    const part = raw.trim();
    const match = PART_RE.exec(part);
    if (!match) throw new Error(`${where}: unsupported selector form ${JSON.stringify(part)} in ${JSON.stringify(selector)}`);

    const attributes: string[] = [];
    for (const attr of match[2].matchAll(ATTR_RE)) {
      // `[type=checkbox]` identifies by value; the map keys on the name.
      attributes.push(attr[1].split('=')[0].trim());
    }
    return { tag: match[1] ?? null, attributes };
  });
}

/**
 * First writer wins, and a second one that disagrees throws.
 *
 * Two components answering to one selector part is an ambiguity the consumer
 * cannot resolve from a template fragment, so the map must not pick a winner
 * quietly — files are scanned in sorted order and the "winner" would be
 * whichever one sorts first, which is not a decision anybody made.
 */
function claim(bucket: Record<string, WrSelectorTarget>, key: string, target: WrSelectorTarget): void {
  const existing = bucket[key];
  if (existing && existing.symbol !== target.symbol) {
    throw new Error(`selector \`${key}\` is claimed by both ${existing.symbol} and ${target.symbol} — the map cannot pick one`);
  }
  bucket[key] = target;
}

function sortKeys(bucket: Record<string, WrSelectorTarget>): Record<string, WrSelectorTarget> {
  return Object.fromEntries(Object.entries(bucket).sort(([a], [b]) => a.localeCompare(b)));
}

/** Build the selector map, with the tally that proves it is complete. */
export function buildSelectorMap(): WrSelectorMap {
  const symbols = buildSymbolMap();
  const files = sourceFiles(LIB_ROOT);

  const tags: Record<string, WrSelectorTarget> = {};
  const attributes: Record<string, WrSelectorTarget> = {};
  const internalClasses = new Set<string>();
  let declarations = 0;
  let mentions = 0;
  let mapped = 0;
  let withoutSelector = 0;
  // Counted separately from `internalClasses.size`, and the difference is the
  // invariant: the Set holds distinct NAMES, and two internal classes sharing a
  // name would make the three buckets stop summing to `declarations` — which is
  // exactly the completeness claim this file exists to make.
  let internal = 0;

  for (const file of files) {
    const found = declarationsIn(file);
    mentions += found.mentions;

    for (const decl of found.declarations) {
      declarations++;
      const where = `${relative(ROOT_PATH, file)}:${decl.offset}`;

      if (decl.selector === null) {
        // Accounted for, not dropped: an abstract base or a decorator that only
        // carries `host`/`providers` has nothing a template can name.
        withoutSelector++;
        continue;
      }

      const path = symbols[decl.klass];
      if (!path) {
        internal++;
        internalClasses.add(decl.klass);
        continue;
      }

      mapped++;
      const target: WrSelectorTarget = { symbol: decl.klass, path };

      for (const part of parseSelector(decl.selector, where)) {
        // A native host tag (`button[wr-btn]`, `ng-template[wrTableExpand]`) is
        // the element the directive attaches TO — the attribute is the matcher.
        // A `wr-` tag is recorded even when qualified, since it is ours either
        // way, which is how `wr-btn` lands in both buckets.
        if (part.tag && (part.attributes.length === 0 || part.tag.startsWith('wr-'))) claim(tags, part.tag, target);
        for (const attr of part.attributes) claim(attributes, attr, target);
      }
    }
  }

  return {
    tags: sortKeys(tags),
    attributes: sortKeys(attributes),
    stats: {
      files: files.length,
      declarations,
      mentions,
      mapped,
      withoutSelector,
      internal,
      internalClasses: [...internalClasses].sort(),
    },
  };
}

/** Where a selector part resolves to. */
export interface WrSelectorTarget {
  /** The exported class, e.g. `WrButton`. */
  readonly symbol: string;
  /** The public subpath it is imported from, e.g. `ngwr/button`. */
  readonly path: string;
}

/**
 * What the scan saw, so a reader can tell a deliberate subset from a lossy one.
 * Every declaration lands in exactly one of `mapped` / `withoutSelector` /
 * `internal` — the three sum to `declarations`, and the generator prints them.
 */
export interface WrSelectorStats {
  /** Files opened (`.ts`, minus specs and {@link SKIP_DIRS}). */
  readonly files: number;
  /** `@Component(` / `@Directive(` occurrences found in CODE. */
  readonly declarations: number;
  /** The same token inside a comment or a string — prose, not a declaration. */
  readonly mentions: number;
  /** Declarations that resolved to at least one selector part. */
  readonly mapped: number;
  /** Declarations with no `selector` key at all (abstract bases and the like). */
  readonly withoutSelector: number;
  /** Declarations whose class no `public-api.ts` exports — dropped on purpose. */
  readonly internal: number;
  /**
   * Those class names, sorted, so the tally can be read rather than trusted.
   * DISTINCT names, so this can be shorter than {@link internal} — the count is
   * what the invariant is stated over, the list is what a reader checks.
   */
  readonly internalClasses: readonly string[];
}

export interface WrSelectorMap {
  /** Bare element selectors: `wr-alert`, `wr-btn`. */
  readonly tags: Record<string, WrSelectorTarget>;
  /** Attribute selectors: `wrInput`, `wr-btn` (from `button[wr-btn]`). */
  readonly attributes: Record<string, WrSelectorTarget>;
  readonly stats: WrSelectorStats;
}
