/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Scans every entry point's stylesheet under `projects/lib` and produces the
 * per-component `--wr-*` hooks each one publishes, with the default it ships.
 *
 * Why this exists: the token layer is catalogued across six `/guides/tokens/*`
 * pages, and the ~370 COMPONENT-scoped properties beside it were catalogued
 * nowhere — so the sanctioned, non-breaking way to restyle a component meant
 * opening `node_modules/ngwr/<name>/styles/_index.scss` to find out what exists.
 * That is not only a documentation gap. A consumer who cannot find a hook
 * reaches for the internal BEM class instead, and those classes are published as
 * stable, so a missing catalogue converts straight into a maintenance obligation
 * nobody agreed to take.
 *
 * Three questions decide every row, and each was a wrong answer first:
 *
 * **Who owns a hook.** Declaring one is not owning one. Twenty-odd components
 * write `--wr-icon-size` inside their own `<wr-icon>` — that is one component
 * SETTING another's hook, and listing it on all twenty-one pages would tell a
 * reader that `.wr-alert` reads a property it never mentions. Ownership goes to
 * the entry point whose own BEM block is the longest prefix of the name
 * (`--wr-icon-size` → `wr-icon` → `ngwr/icon`), and a hook no declarer's block
 * prefixes falls back to the single entry point that declares it. Anything
 * genuinely ambiguous THROWS rather than being filed under a guess.
 *
 * **Whether overriding it does anything.** A hook declared and never read is the
 * same defect `check:tokens` catches at the theme layer, and the per-component
 * layer has no such gate — `check:tokens` says so in as many words, calling a
 * component's knobs "a component's private surface". So a hook has to be read
 * before it is listed, and a read is `var()` in SCSS **or in the component's own
 * TypeScript or template**: `wr-circular-text` writes
 * `translateY(calc(-1 * var(--wr-circular-text-radius)))` from `.ts`, and
 * `wr-aurora` reads three of its hooks through `getPropertyValue`. A
 * stylesheet-only scan reported all four as dead. Specs and harnesses are NOT
 * reads — a test naming a property is documenting it, the same distinction
 * `check:tokens` draws about the showcase's swatch tables.
 *
 * **Which declaration is the default.** A hook is typically declared once on the
 * block and then re-declared by every variant, so the value a reader wants is
 * the BASE one: outside any at-rule, on a selector carrying no BEM modifier and
 * no state. Where a component publishes a hook only from inside variants there
 * is no honest single default, and the row says which selector its value came
 * from rather than picking one and calling it the default.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

import { ROOT_PATH } from './paths/root';

const LIB_ROOT = resolve(ROOT_PATH, 'projects/lib');

/**
 * Entry points whose stylesheet IS the token layer rather than a component.
 *
 * `theme` publishes the global `--wr-*` set, which the six `/guides/tokens/*`
 * pages already document and `check:tokens` already gates.
 */
const TOKEN_LAYER = new Set(['theme']);

/** Directory names the walk never descends into. */
const SKIP_DIRS = new Set(['node_modules', 'schematics', 'mcp']);

interface RawDeclaration {
  readonly name: string;
  readonly value: string;
  readonly scope: string;
  readonly base: boolean;
  readonly file: string;
  readonly line: number;
}

interface EntryPoint {
  /** Path under `projects/lib`: `alert`, `icon/adapters/lucide`. */
  readonly entry: string;
  readonly dir: string;
}

/** Every secondary entry point under `projects/lib`, in path order. */
function entryPoints(dir = LIB_ROOT, prefix = ''): EntryPoint[] {
  const out: EntryPoint[] = [];
  for (const name of readdirSync(dir).sort()) {
    if (name.startsWith('.') || SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (!statSync(full).isDirectory()) continue;
    const entry = prefix ? `${prefix}/${name}` : name;
    if (existsSync(join(full, 'ng-package.json')) && !TOKEN_LAYER.has(entry)) out.push({ entry, dir: full });
    out.push(...entryPoints(full, entry));
  }
  return out;
}

/** Files under `dir` with one of `extensions`, without descending into `stopAt`. */
function filesIn(dir: string, extensions: ReadonlySet<string>, stopAt: ReadonlySet<string>): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    if (name.startsWith('.') || SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!stopAt.has(full)) out.push(...filesIn(full, extensions, stopAt));
      continue;
    }
    if (extensions.has(extname(name))) out.push(full);
  }
  return out;
}

/**
 * At-rules whose body is a template rather than emitted CSS.
 *
 * A `--wr-*` written inside a `@mixin` or a `@keyframes` frame is not a hook the
 * component publishes at that point — the mixin's callers decide, and a keyframe
 * declares an animated value.
 */
const TEMPLATE_AT_RULES = /^@(?:mixin|function|keyframes|-\w+-keyframes)\b/;

/** At-rules that make everything inside them conditional: a value, not the default. */
const CONDITIONAL_AT_RULES = /^@(?:media|supports|each|for|while|if|else|container)\b/;

interface Frame {
  /** The selector this frame contributes, already resolved against its parent. */
  readonly selector: string;
  readonly template: boolean;
  readonly conditional: boolean;
}

/**
 * The one interpolation the library writes into a selector, and what it compiles
 * to under the default configuration.
 *
 * `theme.dark-selector()` returns `[data-theme='dark']`, built from
 * `$theme-attribute` so a consumer can rename the attribute. Nine component
 * stylesheets key their dark block on it, and the scanner is a text scan: left
 * as `#{…}` the selector carries neither the `[` nor the `--` that
 * {@link isBaseSelector} looks for, so a dark override reads as the component's
 * own base rule and its value is published as the DEFAULT — which is how
 * `--wr-aurora-stop-1` briefly documented itself as the dark `#5227ff`.
 * Substituting the default keeps the row identical to the one a hand-written
 * literal produced, which is what a reader of the docs page wants either way.
 */
const DARK_SELECTOR = /#\{\s*(?:[\w-]+\.)?dark-selector\(\)\s*\}/g;

/** `&--open` under `.wr-select` → `.wr-select--open`; `.a` under `.b` → `.b .a`. */
function resolveSelector(parent: string, own: string): string {
  const head = own.split(',')[0].trim().replace(DARK_SELECTOR, "[data-theme='dark']");
  if (!parent) return head.replaceAll('&', '').trim() || head;
  if (head.includes('&')) return head.replaceAll('&', parent);
  return `${parent} ${head}`;
}

/**
 * A selector that names the component itself rather than one of its states.
 *
 * `.wr-alert` and `.wr-alert__icon` are base; `.wr-alert--success`,
 * `.wr-btn:hover` and `[data-wr-density='sm']` are not. `:root` is base — the
 * density entry point publishes its multipliers there and nowhere else.
 */
function isBaseSelector(selector: string): boolean {
  if (selector === ':root' || selector === 'html' || selector === ':host') return true;
  return !/--|:|\[/.test(selector);
}

/**
 * Every `--wr-*` declaration in one stylesheet, with the selector it lands on.
 *
 * A character state machine rather than a line scan, for the reason
 * `build-selector-map.ts` records about decorators: a comment carrying an
 * apostrophe or a brace derails anything simpler, and the failure is a silently
 * missing entry rather than an error. Parenthesis depth is tracked too, so the
 * `;` inside a `linear-gradient(…, …)` split across lines does not end the
 * declaration early.
 */
function declarationsIn(file: string): { declarations: RawDeclaration[]; blocks: Set<string> } {
  const src = readFileSync(file, 'utf8');
  const out: RawDeclaration[] = [];
  const blocks = new Set<string>();
  const stack: Frame[] = [];

  let buffer = '';
  let line = 1;
  let bufferLine = 1;
  let parens = 0;
  let index = 0;

  const flushStatement = (): void => {
    const text = buffer.trim();
    buffer = '';
    bufferLine = line;
    if (!text.startsWith('--wr-')) return;
    const colon = text.indexOf(':');
    if (colon < 0) return;
    const name = text.slice(0, colon).trim();
    if (!/^--wr-[a-z0-9-]+$/.test(name)) return;
    const scope = stack.length > 0 ? stack[stack.length - 1].selector : '';
    out.push({
      name,
      value: text.slice(colon + 1).trim().replace(/\s+/g, ' '),
      scope,
      base:
        scope !== '' &&
        isBaseSelector(scope) &&
        !stack.some(f => f.conditional) &&
        !stack.some(f => f.template),
      file,
      line: bufferLine,
    });
  };

  while (index < src.length) {
    const ch = src[index];

    if (ch === '\n') {
      line++;
      buffer += ' ';
      index++;
      continue;
    }

    if (ch === '/' && src[index + 1] === '/') {
      while (index < src.length && src[index] !== '\n') index++;
      continue;
    }

    if (ch === '/' && src[index + 1] === '*') {
      index += 2;
      while (index < src.length && !(src[index] === '*' && src[index + 1] === '/')) {
        if (src[index] === '\n') line++;
        index++;
      }
      index += 2;
      continue;
    }

    if (ch === '"' || ch === "'") {
      const quote = ch;
      buffer += ch;
      index++;
      while (index < src.length && src[index] !== quote) {
        if (src[index] === '\\') {
          buffer += src[index];
          index++;
        }
        if (src[index] === '\n') line++;
        buffer += src[index];
        index++;
      }
      buffer += quote;
      index++;
      continue;
    }

    // `#{$name}` is an interpolation, not a block: its braces must not move the
    // nesting depth, and the whole run belongs to whatever statement holds it.
    //
    // The `#` is consumed BEFORE the depth loop starts, and that is the whole
    // subtlety: the loop counts braces at the character it is looking at, so
    // entering it on the `#` left `depth` at 0 and the `while` ended the run
    // after one character. The `{` then reached the block branch below and
    // opened a frame, the `}` closed it, and a rule whose selector STARTS with an
    // interpolation — `#{theme.dark-selector()} .wr-aurora` — came out as a bare
    // `.wr-aurora` at the top level. Nothing failed: the dark override read as
    // the component's own base rule, and `--wr-aurora-stop-1` published the dark
    // `#5227ff` as its documented default. Interpolation had until now only ever
    // appeared mid-token (`--wr-color-#{$name}-dark`), where the resulting
    // frame's declarations were rejected by the `--wr-*` name test anyway.
    if (ch === '#' && src[index + 1] === '{') {
      buffer += ch;
      index++;
      let depth = 0;
      do {
        if (src[index] === '{') depth++;
        if (src[index] === '}') depth--;
        if (src[index] === '\n') line++;
        buffer += src[index];
        index++;
      } while (index < src.length && depth > 0);
      continue;
    }

    if (ch === '(') parens++;
    if (ch === ')') parens = Math.max(0, parens - 1);

    if (parens === 0 && ch === '{') {
      const head = buffer.trim();
      buffer = '';
      bufferLine = line;
      const parent = stack.length > 0 ? stack[stack.length - 1] : null;
      const atRule = head.startsWith('@');
      // The blocks the FILE owns are the ones it opens a rule with, at the
      // outermost level: `.wr-empty` names `.wr-icon` inside itself to size the
      // glyph, and treating that as a block empty owns had `ngwr/empty` and
      // `ngwr/icon` both claiming `--wr-icon-size`.
      if (!atRule && !parent) {
        for (const part of head.split(',')) {
          // The FIRST compound only: `.wr-select .wr-option` opens on the select.
          const first = part.trim().split(/[\s>+~]+/)[0];
          const cls = /\.(wr-[a-z0-9-]+)/.exec(first);
          if (cls) blocks.add(cls[1].split('__')[0].split('--')[0]);
        }
      }
      stack.push({
        // An at-rule is transparent to the selector: a declaration inside
        // `@media` still lands on whatever rule encloses it.
        selector: atRule ? (parent?.selector ?? '') : resolveSelector(parent?.selector ?? '', head),
        template: (parent?.template ?? false) || (atRule && TEMPLATE_AT_RULES.test(head)),
        conditional: (parent?.conditional ?? false) || (atRule && CONDITIONAL_AT_RULES.test(head)),
      });
      index++;
      continue;
    }

    if (parens === 0 && ch === '}') {
      flushStatement();
      stack.pop();
      index++;
      continue;
    }

    if (parens === 0 && ch === ';') {
      flushStatement();
      index++;
      continue;
    }

    buffer += ch;
    index++;
  }

  return { declarations: out, blocks };
}

/** `var(--wr-x)` and `getPropertyValue('--wr-x')`, comments stripped. */
function readsIn(source: string): Set<string> {
  const src = source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^[ \t]*\/\/.*$/gm, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  const out = new Set<string>();
  for (const [, name] of src.matchAll(/var\(\s*(--wr-[a-z0-9-]+)/g)) out.add(name);
  for (const [, name] of src.matchAll(/getPropertyValue\(\s*['"`](--wr-[a-z0-9-]+)['"`]/g)) out.add(name);
  return out;
}

/**
 * Reads that do not count.
 *
 * A spec asserting `translateY(calc(-1 * var(--wr-circular-text-radius)))` is
 * quoting the component, not painting with the hook — and a harness's JSDoc
 * naming one is documentation. Counting either would make a hook look alive on
 * the strength of the test written about it, the same way counting the
 * showcase's swatch tables called three dead token families alive.
 */
function isTestSource(file: string): boolean {
  return file.includes('/testing/') || file.endsWith('.spec.ts');
}

/** The catalogue, from the library's stylesheets and the code that reads them. */
export function buildCssVarMap(): WrCssVarMap {
  const eps = entryPoints();
  const dirs = new Set(eps.map(e => e.dir));

  const declared = new Map<string, RawDeclaration[]>();
  const declarers = new Map<string, Set<string>>();
  const blocks = new Map<string, Set<string>>();
  const reads = new Set<string>();

  for (const ep of eps) {
    const nested = new Set([...dirs].filter(d => d !== ep.dir && d.startsWith(`${ep.dir}/`)));
    const styles = filesIn(ep.dir, new Set(['.scss']), nested);
    const code = filesIn(ep.dir, new Set(['.ts', '.html']), nested).filter(f => !isTestSource(f));

    const own: RawDeclaration[] = [];
    const owned = new Set<string>();
    for (const file of styles) {
      const parsed = declarationsIn(file);
      own.push(...parsed.declarations);
      for (const block of parsed.blocks) owned.add(block);
      for (const name of readsIn(readFileSync(file, 'utf8'))) reads.add(name);
    }
    for (const file of code) for (const name of readsIn(readFileSync(file, 'utf8'))) reads.add(name);

    declared.set(ep.entry, own);
    blocks.set(ep.entry, owned);
    for (const d of own) {
      if (!declarers.has(d.name)) declarers.set(d.name, new Set());
      declarers.get(d.name)!.add(ep.entry);
    }
  }

  // The theme layer reads component hooks nowhere, but it is where a shared
  // mixin would, so it counts as a source like any other. What it DECLARES is
  // the other half: `--wr-disabled-opacity` is a global token that `wr-calendar`
  // re-declares on one disabled day, and with the theme excluded from the scan
  // the calendar was left as its only declarer and so its owner. A token the six
  // `/guides/tokens/*` pages already carry is not a component's hook, wherever a
  // component happens to retune it.
  const themeTokens = new Set<string>();
  for (const file of filesIn(join(LIB_ROOT, 'theme'), new Set(['.scss']), new Set())) {
    const source = readFileSync(file, 'utf8');
    for (const name of readsIn(source)) reads.add(name);
    for (const d of declarationsIn(file).declarations) themeTokens.add(d.name);
  }

  const owner = new Map<string, string>();
  for (const [name, candidates] of declarers) {
    if (themeTokens.has(name)) continue;
    const scored = [...candidates]
      .map(entry => {
        const prefixes = [...(blocks.get(entry) ?? [])].filter(b => name.startsWith(`--${b}-`));
        return { entry, best: Math.max(0, ...prefixes.map(p => p.length)) };
      })
      .sort((a, b) => b.best - a.best || a.entry.localeCompare(b.entry));

    if (scored[0].best > 0) {
      if (scored.length > 1 && scored[1].best === scored[0].best)
        throw new Error(
          `${name}: ${scored[0].entry} and ${scored[1].entry} both claim it by block prefix. ` +
            `Ownership has to be decidable — rename one of the two blocks, or teach ` +
            `scripts/lib/build-css-var-map.ts which one publishes the hook.`
        );
      owner.set(name, scored[0].entry);
      continue;
    }

    // No block prefixes the name. One declarer is still an answer — `ngwr/density`
    // publishes `--wr-density-*` from `:root`, painting no `.wr-*` block at all.
    if (candidates.size === 1) {
      owner.set(name, scored[0].entry);
      continue;
    }

    throw new Error(
      `${name}: declared by ${[...candidates].sort().join(', ')} and prefixed by none of their blocks. ` +
        `A hook has to have one owner before it can be documented as one component's.`
    );
  }

  const orphans: WrCssVarOrphan[] = [];
  const byEntry = new Map<string, WrCssVar[]>();
  let delegated = 0;

  for (const [name, entry] of [...owner].sort(([a], [b]) => a.localeCompare(b))) {
    const all = declared.get(entry)!.filter(d => d.name === name);
    delegated += (declarers.get(name)?.size ?? 1) - 1;

    if (!reads.has(name)) {
      const first = all[0];
      orphans.push({ name, where: `${relative(ROOT_PATH, first.file)}:${first.line}` });
      continue;
    }

    const chosen = all.find(d => d.base) ?? all[0];
    if (!byEntry.has(entry)) byEntry.set(entry, []);
    byEntry.get(entry)!.push({
      name,
      value: chosen.value,
      scope: chosen.scope,
      base: chosen.base,
      overrides: all.length - 1,
    });
  }

  const entries: WrCssVarEntry[] = [...byEntry]
    .map(([entry, vars]) => ({
      entry,
      subpath: `ngwr/${entry}`,
      vars: [...vars].sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.subpath.localeCompare(b.subpath));

  return {
    entries,
    orphans: orphans.sort((a, b) => a.name.localeCompare(b.name)),
    delegated,
    total: entries.reduce((sum, e) => sum + e.vars.length, 0),
  };
}

/** One `--wr-*` hook a component publishes. */
export interface WrCssVar {
  /** The property, with its leading dashes: `--wr-alert-bg`. */
  readonly name: string;
  /** The value shipped where {@link scope} declares it, verbatim from the SCSS. */
  readonly value: string;
  /** The selector the value above is declared on: `.wr-alert`, `:root`. */
  readonly scope: string;
  /**
   * Whether {@link scope} is the component's own base rule — no BEM modifier, no
   * state, no at-rule around it. False means the component publishes this hook
   * only from a variant, so {@link value} is that variant's value and not a
   * default the reader can assume.
   */
  readonly base: boolean;
  /** How many further declarations override it (variants, states, media). */
  readonly overrides: number;
}

/** Every hook one entry point owns, in name order. */
export interface WrCssVarEntry {
  /** The entry point's directory name under `projects/lib`: `alert`, `date-picker`. */
  readonly entry: string;
  /** Its public subpath: `ngwr/alert`. */
  readonly subpath: string;
  readonly vars: readonly WrCssVar[];
}

/** A hook declared somewhere under `projects/lib` that nothing there reads. */
export interface WrCssVarOrphan {
  readonly name: string;
  /** Repository-relative, with a line number. */
  readonly where: string;
}

export interface WrCssVarMap {
  /** Entry points that publish at least one readable hook, in subpath order. */
  readonly entries: readonly WrCssVarEntry[];
  /** Declared and never read — a finding, not a row. */
  readonly orphans: readonly WrCssVarOrphan[];
  /** Declarations filed under another entry point's hook, e.g. `--wr-icon-size`. */
  readonly delegated: number;
  /** Total hooks listed across {@link entries}. */
  readonly total: number;
}
