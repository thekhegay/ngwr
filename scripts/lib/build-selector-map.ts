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
 * exactly that way: no error, just a missing entry. So the scan reads the file
 * through `ts-lex` rather than through a regex.
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

import { readFileSync } from 'node:fs';
import { basename, relative } from 'node:path';

import { buildSymbolMap } from './build-symbol-map';
import { walkFiles } from './fs/walk-files';
import { LIB_PATH } from './paths/lib';
import { ROOT_PATH } from './paths/root';
import { isWordChar, lexTs, TsClass, type TsToken } from './ts-lex';


/**
 * Directory names the scan never descends into.
 *
 * `schematics/` and `mcp/` are Node code shipped in the same tarball, not
 * Angular entry points — `schematics/page/templates.ts` holds a component whose
 * selector is `app-${dashName}`, a template placeholder that is not a selector
 * at all. `testing/` holds harnesses and no components; excluded for speed
 * rather than correctness, which is why it is safe to have it here.
 */
const SKIP_DIRS = ['schematics', 'mcp', 'testing', 'node_modules'];

/** The decorators that carry a selector; {@link decoratedClasses} takes pipes too. */
const SELECTOR_DECORATOR_RE = /@(Component|Directive)\s*\(/g;
const DECORATOR_RE = /@(Component|Directive|Pipe)\s*\(/g;

/** Every `.ts` file the scan covers, sorted so two runs emit the same file. */
function sourceFiles(dir: string): string[] {
  return walkFiles(dir, {
    skipDirs: SKIP_DIRS,
    skipDotDirs: true,
    sort: true,
    // Specs declare host components with selectors like `wr-inner-cmp` that
    // exist for one `describe` and ship nowhere.
    include: path => path.endsWith('.ts') && !path.endsWith('.spec.ts') && !basename(path).startsWith('.'),
  });
}

/**
 * Walk the decorator body from its opening `{` to the matching `}`, returning
 * the top-level `selector` literal (or `null`) and where the body ends.
 *
 * Comments and literals are stepped over whole, so `// don't` cannot unbalance
 * the braces. The key is only honoured at depth 1 — `host: { … }` has no
 * `selector`, but a nested object that grew one must not be mistaken for the
 * component's.
 */
function readDecoratorBody(
  source: string,
  starts: ReadonlyMap<number, TsToken>,
  open: number,
  where: string
): { selector: string | null; end: number } {
  let depth = 0;
  let selector: string | null = null;
  let awaiting = false;
  let literalStart = -1;

  for (let i = open; i < source.length; i++) {
    const token = starts.get(i);
    if (token) {
      if (token.kind === 'string' || (token.kind === 'template' && source[i] === '`')) literalStart = i + 1;
      // A substitution's braces count, so a `selector:` inside `${…}` is not at depth 1.
      if (token.kind === 'template' && source[i] === '}') depth--;
      if (token.kind === 'template' && token.closed && source[token.end - 1] !== '`') depth++;
      const closesLiteral =
        token.closed && (token.kind === 'string' || (token.kind === 'template' && source[token.end - 1] === '`'));
      if (awaiting && closesLiteral) {
        // `selector: \`wr-${name}\`` is not something this map can resolve,
        // and guessing would be the silent-shortfall bug in another costume.
        const raw = source.slice(literalStart, token.end - 1);
        if (token.kind === 'template' && raw.includes('${')) {
          throw new Error(`${where}: computed selector \`${raw}\` — cannot be resolved statically`);
        }
        selector = raw;
        awaiting = false;
      }
      i = token.end - 1;
      continue;
    }

    const ch = source[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return { selector, end: i };
    } else if (depth === 1 && ch === 's' && !isWordChar(source[i - 1]) && source.startsWith('selector', i)) {
      const after = /^\s*:/.exec(source.slice(i + 'selector'.length));
      if (after && !isWordChar(source[i + 'selector'.length])) {
        awaiting = true;
        i += 'selector'.length + after[0].length - 1;
      }
    }
  }

  throw new Error(`${where}: unbalanced decorator body — brace matching walked off the end of the file`);
}

/** Every declaration `pattern` finds in one file, plus the count of non-code mentions. */
function declarationsIn(file: string, pattern: RegExp): { declarations: DecoratedClass[]; mentions: number } {
  const source = readFileSync(file, 'utf8');
  const rel = relative(ROOT_PATH, file);
  const lex = lexTs(source);
  const starts = new Map(lex.tokens.map(token => [token.start, token]));
  const declarations: DecoratedClass[] = [];
  let mentions = 0;

  for (const match of source.matchAll(pattern)) {
    const offset = match.index;
    const where = `${rel}:${offset}`;

    // The token also appears in prose — a JSDoc paragraph explaining what the
    // decorator does. Those are mentions, not declarations, and they are
    // reported rather than dropped, so the tally still adds up.
    if (lex.mask[offset] !== TsClass.Code) {
      mentions++;
      continue;
    }

    const open = source.indexOf('{', offset + match[0].length);
    if (open === -1) throw new Error(`${where}: ${match[0]} with no object literal`);
    // Anything but whitespace between `(` and `{` means the metadata is not an
    // inline literal (a spread, a shared const) and the selector is elsewhere.
    const between = source.slice(offset + match[0].length, open);
    if (between.trim() !== '') throw new Error(`${where}: ${match[0]}${between.trim()} — metadata is not an inline object literal`);

    const { selector, end } = readDecoratorBody(source, starts, open, where);
    const tail = source.slice(end + 1, end + 200);
    const klass = /^\s*\)\s*(?:export\s+)?(?:declare\s+)?(?:abstract\s+)?class\s+(\w+)/.exec(tail)?.[1];
    if (!klass) throw new Error(`${where}: no class declaration follows the decorator (saw ${JSON.stringify(tail.slice(0, 60))})`);

    declarations.push({ klass, kind: match[1] as DecoratedClass['kind'], selector, offset, bodyEnd: end });
  }

  return { declarations, mentions };
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

/**
 * Every `@Component`, `@Directive` and `@Pipe` class declared in `file`, in
 * source order. Throws on a decorator it cannot read rather than skipping it.
 */
export function decoratedClasses(file: string): DecoratedClass[] {
  return declarationsIn(file, DECORATOR_RE).declarations;
}

/** One decorated class, as the scan reads it out of a file. */
export interface DecoratedClass {
  readonly klass: string;
  readonly kind: 'Component' | 'Directive' | 'Pipe';
  /** The top-level `selector` literal; `null` for every pipe and for abstract bases. */
  readonly selector: string | null;
  /** Byte offset of the `@` — the coordinate every thrown error quotes. */
  readonly offset: number;
  /** Index of the `}` that closes the decorator's metadata object. */
  readonly bodyEnd: number;
}

/** Build the selector map, with the tally that proves it is complete. */
export function buildSelectorMap(): WrSelectorMap {
  const symbols = buildSymbolMap();
  const files = sourceFiles(LIB_PATH);

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
    const found = declarationsIn(file, SELECTOR_DECORATOR_RE);
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
