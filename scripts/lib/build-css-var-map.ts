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
 *
 * A fourth question qualifies a row rather than deciding it. **Whether a rule
 * can reach it.** `wr-threads` declares `--wr-threads-count: 18` on its block
 * so the stand-in it paints before hydration draws where the canvas will, and
 * then writes the SAME name on its host from `[lineCount]` through
 * `[style.--wr-threads-count]`. An inline style beats every stylesheet rule, and
 * that binding is never `null`, so the section's "set these on the element" is
 * false for exactly that row: the input sets it, and a rule cannot. The map says
 * so ({@link WrCssVar.host}) when the owner's own code writes the hook on the
 * host — a `[style.--wr-x]` host binding or a `setProperty('--wr-x', …)` — and
 * never lets go of it: no `null` or `undefined` branch in the binding and no
 * `removeProperty` of the name. A hook that CAN be released is left alone, since
 * a consumer's rule holds whenever the component steps back, which is what the
 * `--wr-<block>-input-<name>` convention exists for. Template bindings are not
 * read: one lands on an inner element, and the block's default on the host is
 * still the consumer's for everything else that reads it — `wr-event-calendar`
 * binds `--wr-event-calendar-cols` on its time grid while the month grid keeps
 * the declared seven.
 */

import { readFileSync } from 'node:fs';
import { relative } from 'node:path';

import { entryFiles, libEntryPoints } from './entry-points';
import { ROOT_PATH } from './paths/root';
import { blankComments } from './ts-lex';

/**
 * Entry points whose stylesheet IS the token layer rather than a component.
 *
 * `theme` publishes the global `--wr-*` set, which the six `/guides/tokens/*`
 * pages already document and `check:tokens` already gates.
 */
const TOKEN_LAYER = new Set(['theme']);

interface RawDeclaration {
  readonly name: string;
  readonly value: string;
  readonly scope: string;
  readonly base: boolean;
  readonly file: string;
  readonly line: number;
}

/**
 * At-rules whose body is a template rather than emitted CSS.
 *
 * A `--wr-*` written inside a `@mixin` or a `@keyframes` frame is not a hook the
 * component publishes at that point — the mixin's callers decide, and a keyframe
 * declares an animated value.
 */
const TEMPLATE_AT_RULES = /^@(?:mixin|function|keyframes|-\w+-keyframes)\b/;

/**
 * A frame sets a value for the length of an animation and publishes nothing: a consumer
 * who set that name would only be overwritten by it. Left in, `--wr-shiny-text-progress`
 * read as a hook declared on `from`.
 */
const KEYFRAMES = /^@(?:-\w+-)?keyframes\b/;

/** At-rules that make everything inside them conditional: a value, not the default. */
const CONDITIONAL_AT_RULES = /^@(?:media|supports|each|for|while|if|else|container)\b/;

interface Frame {
  /** The selector this frame contributes, already resolved against its parent. */
  readonly selector: string;
  readonly template: boolean;
  readonly conditional: boolean;
  readonly keyframes: boolean;
}

/** `&--open` under `.wr-select` → `.wr-select--open`; `.a` under `.b` → `.b .a`. */
function resolveSelector(parent: string, own: string): string {
  const head = own.split(',')[0].trim();
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
  // `:where(.wr-chart-legend)` is the block itself at zero specificity — declared that
  // way so a chart that draws the legend re-points its hooks from any selector — not a
  // state of it, so the wrapper is looked through before the test.
  return !/--|:|\[/.test(selector.replace(/:where\(([^()]*)\)/g, '$1'));
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
    if (!text.startsWith('--wr-') || stack.some(f => f.keyframes)) return;
    const colon = text.indexOf(':');
    if (colon < 0) return;
    const name = text.slice(0, colon).trim();
    if (!/^--wr-[a-z0-9-]+$/.test(name)) return;
    // Unsetting a variable publishes nothing: it is what stops a nested instance
    // inheriting what an input wrote on its parent, and a consumer has no use for it.
    if (text.slice(colon + 1).trim() === 'initial') return;
    const scope = stack.length > 0 ? stack[stack.length - 1].selector : '';
    out.push({
      name,
      // Collapsed to one line, and tidied inside the parentheses: a
      // `light-dark(` pair with a colour per line is the usual way a themed
      // hook is written, and collapsing alone printed `light-dark( #fff, #000 )`.
      value: text
        .slice(colon + 1)
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/\( /g, '(')
        .replace(/ \)/g, ')'),
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
    // interpolation — `#{theme.dark-selector()} .wr-aurora`, the shape every
    // bit's dark block had before v15 moved dark values into `light-dark()` —
    // came out as a bare `.wr-aurora` at the top level. Nothing failed: the dark
    // override read as the component's own base rule, and `--wr-aurora-stop-1`
    // published the dark `#5227ff` as its documented default. Interpolation had
    // until then only ever appeared mid-token (`--wr-color-#{$name}-dark`), where
    // the resulting frame's declarations were rejected by the `--wr-*` name test
    // anyway — and a selector still starts with one today (`#{&}` in the
    // typography sheet, `#{$pane}` in the overlay arrow), so the order stays.
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
        keyframes: (parent?.keyframes ?? false) || (atRule && KEYFRAMES.test(head)),
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
  const src = blankComments(source, { html: true });
  const out = new Set<string>();
  for (const [, name] of src.matchAll(/var\(\s*(--wr-[a-z0-9-]+)/g)) out.add(name);
  for (const [, name] of src.matchAll(/getPropertyValue\(\s*['"`](--wr-[a-z0-9-]+)['"`]/g)) out.add(name);
  return out;
}

/** The hooks one file writes on the component's host, and the ones it also lets go of. */
interface HostWrites {
  readonly written: Set<string>;
  readonly released: Set<string>;
}

/**
 * A `[style.--wr-x]` or `[style.--wr-x.px]` host binding with its expression, as the
 * `host: {}` metadata spells it: a quoted key, a colon, a quoted expression. A
 * template binding is an attribute (`[style.--wr-x]="…"`) and does not match.
 */
const HOST_STYLE_BINDING = /\[style\.(--wr-[a-z0-9-]+)(?:\.[a-z%]+)?\]['"]\s*:\s*(["'`])((?:(?!\2).)*)\2/g;

/**
 * `[style.--wr-x]: 'expr'` host bindings and `setProperty('--wr-x', …)` calls,
 * comments stripped.
 *
 * Which of the two sets a name lands in is read off the text, not the types: a
 * binding whose expression names `null` or `undefined` has a branch that gives
 * the host's value back (`categoryTotal() || null`, `hasLines() ? reach() : null`),
 * and a `removeProperty` of the name is the same release for `setProperty`. The
 * hook rule in AGENTS.md is what makes the textual read sound: a binding to a
 * hook's own name is non-nullable by convention, and the nullable one writes
 * `--wr-<block>-input-<name>`, which no stylesheet declares and so never
 * reaches this map at all.
 */
function hostWritesIn(source: string): HostWrites {
  const src = blankComments(source);
  const written = new Set<string>();
  const released = new Set<string>();
  for (const [, name, , expression] of src.matchAll(HOST_STYLE_BINDING)) {
    (/\b(?:null|undefined)\b/.test(expression) ? released : written).add(name);
  }
  for (const [, name] of src.matchAll(/\.setProperty\(\s*['"`](--wr-[a-z0-9-]+)['"`]/g)) written.add(name);
  for (const [, name] of src.matchAll(/\.removeProperty\(\s*['"`](--wr-[a-z0-9-]+)['"`]/g)) released.add(name);
  return { written, released };
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
  const eps = libEntryPoints().filter(entry => !TOKEN_LAYER.has(entry));

  const declared = new Map<string, RawDeclaration[]>();
  const declarers = new Map<string, Set<string>>();
  const blocks = new Map<string, Set<string>>();
  const reads = new Set<string>();
  // Per entry point, not pooled: only the OWNER's own write makes a hook the
  // input's. Another component writing a hook on its own inner `<wr-icon>` says
  // nothing about what a rule can reach on a bare one.
  const hostWrites = new Map<string, HostWrites>();

  for (const entry of eps) {
    const styles = entryFiles(entry, { extensions: ['.scss'], skipInternal: false });
    const code = entryFiles(entry, { extensions: ['.ts', '.html'], skipInternal: false }).filter(f => !isTestSource(f));

    const own: RawDeclaration[] = [];
    const owned = new Set<string>();
    const writes: HostWrites = { written: new Set(), released: new Set() };
    for (const file of styles) {
      const parsed = declarationsIn(file);
      own.push(...parsed.declarations);
      for (const block of parsed.blocks) owned.add(block);
      for (const name of readsIn(readFileSync(file, 'utf8'))) reads.add(name);
    }
    for (const file of code) {
      const source = readFileSync(file, 'utf8');
      for (const name of readsIn(source)) reads.add(name);
      if (!file.endsWith('.ts')) continue;
      const found = hostWritesIn(source);
      for (const name of found.written) writes.written.add(name);
      for (const name of found.released) writes.released.add(name);
    }

    declared.set(entry, own);
    blocks.set(entry, owned);
    hostWrites.set(entry, writes);
    for (const d of own) {
      if (!declarers.has(d.name)) declarers.set(d.name, new Set());
      declarers.get(d.name)!.add(entry);
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
  for (const file of entryFiles('theme', { extensions: ['.scss'], skipInternal: false })) {
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
    const writes = hostWrites.get(entry)!;
    if (!byEntry.has(entry)) byEntry.set(entry, []);
    byEntry.get(entry)!.push({
      name,
      value: chosen.value,
      scope: chosen.scope,
      base: chosen.base,
      overrides: all.length - 1,
      host: writes.written.has(name) && !writes.released.has(name),
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
  /**
   * The value shipped where {@link scope} declares it, verbatim from the SCSS.
   * A `light-dark()` pair is kept whole: which side applies is decided where
   * the hook is read, by that element's `color-scheme`, so neither side alone
   * is the default.
   */
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
  /**
   * Whether the component writes this hook on its own host — a `[style.--wr-x]`
   * host binding or `setProperty` — and never releases it. An inline value beats
   * every stylesheet rule, so the input or state behind the binding sets it and
   * {@link value} is only what the stylesheet shows before the component writes;
   * `--wr-threads-count` mirrors `[lineCount]` this way.
   */
  readonly host: boolean;
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
