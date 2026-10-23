/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';

/**
 * v14 to v15 migration. Two halves, split by the rule `migration-v14` follows:
 * a rewrite runs when the new form means what the old one meant in the same
 * place, and a report runs when the repair needs a value only the app knows.
 *
 * **It REWRITES:**
 *
 * - **Import paths.** The seven charts move from `ngwr/<name>` to
 *   `ngwr/charts/<name>` and the twenty-one bits from `ngwr/<name>` to
 *   `ngwr/bits/<name>`; `ngwr/drag-drop` becomes `ngwr/sortable-list`; and
 *   `ngwr/icon/adapters/lucide` becomes `ngwr/icon`, folded into the file's
 *   own `ngwr/icon` import when it has one. In TypeScript, in Sass
 *   `@use` / `@forward`, in `/testing` paths and in JSON (a tsconfig `paths` or
 *   a jest mapper). Every symbol keeps its name, which is what makes a path the
 *   thing a codemod moves without reading the code around it.
 * - **The config calls that became features.** `provideWrDensity(x)`,
 *   `provideWrToastConfig(x)`, `provideWrStorage(x)`, `provideWrMeta(x)`,
 *   `provideWrDateAdapter(x)` and `provideWrTheme(x)` become `withDensity(x)`,
 *   `withToast(x)`, `withStorage(x)`, `withMeta(x)`, `withDates(x)` and
 *   `withTheme(x)` inside ONE `provideWr(...)`, with the imports fixed. Only
 *   where each call is a plain entry of a `providers: [...]` (or a
 *   `makeEnvironmentProviders([...])`) array: there the features keep the
 *   injector, the order and the options the calls had. A call anywhere else (a
 *   variable, a spread, a ternary, an alias) is left alone and reported, and so
 *   is a second call of one kind in one array, since the same feature twice
 *   throws in dev mode and which of the two wins is the app's call. A bare
 *   `provideWrDateAdapter()` is deleted, because the native adapter in
 *   `LOCALE_ID` is what it provided and what v15 resolves with nothing at all.
 *   `provideWrTheme({ attribute })` is reported instead: the option is gone.
 *   The two option types renamed with them move too: from
 *   `WrDateAdapterOptions` to `WrDatesOptions`, from `ProvideWrStorageOptions`
 *   to `WrStorageOptions`.
 * - **`-rgb` reads.** `rgba(var(--wr-color-primary-rgb), 0.12)` becomes
 *   `color-mix(in srgb, var(--wr-color-primary) 12%, transparent)`, which paints
 *   the same. The channel lists cannot be `light-dark()` values, so v15 removed
 *   every one, and a leftover read drops its whole declaration with no error.
 *   An alpha written as `var()` or `calc()` becomes `calc(<alpha> * 100%)`, and
 *   a channel-list fallback becomes an `rgb()` one. A renamed neutral mixes
 *   from its successor in the table below, so `--wr-color-dark-rgb` becomes
 *   `--wr-color-on-surface`. A name whose base token went with no successor
 *   (`secondary`) is not guessed at, and is reported with every other `-rgb`
 *   read this cannot reach.
 * - **The neutral token READS MIGRATION.md lists as one-to-one**, all inside
 *   `var()` or a string: from `--wr-color-light` and `--wr-color-outline` to
 *   `--wr-border-base`; from `--wr-color-border`, `-border-subtle` and
 *   `-border-strong` to `--wr-border-subtle`; from `--wr-color-dark` and
 *   `--wr-color-white-contrast` to `--wr-color-on-surface`; from
 *   `--wr-color-medium` and `--wr-color-muted-text` to
 *   `--wr-color-on-surface-muted`. `--wr-color-white-contrast` was the
 *   `on-surface` value only in dark — in light it was the black that wins on
 *   white — and it moves anyway, because the alternative is a read of a name
 *   nothing declares, which paints nothing in either scheme. A DECLARATION of
 *   one of these names is reported rather than renamed: setting
 *   `--wr-color-medium` in v14 restyled a fill, and the same value written to
 *   `--wr-color-on-surface-muted` would restyle every piece of muted text. A
 *   declaration is any place a name is SET: a CSS declaration, a `[style.--…]`
 *   or `@HostBinding('style.--…')` binding, `setProperty()` /
 *   `removeProperty()`, Renderer2's `setStyle()` / `removeStyle()`, and a
 *   style-object key. The `-rgb` companions of these names follow the same table
 *   into `color-mix()` (see above).
 * - **Two values named after a removed intent**, which always painted a
 *   neutral role: `[wrTypography]` `tone="dark"` / `"medium"` to `"base"` /
 *   `"muted"`, anchored on the directive, and `<wr-timeline-item
 *   color="medium">` to `"neutral"`, anchored on the element — plus the BEM
 *   class each one emits, anywhere, since the classes are public API.
 *
 * **It REPORTS**, naming each file and line and changing nothing: the `@use 'ngwr'`
 * umbrella (which entry points a page renders is the app's list), a density
 * setting with no `@use 'ngwr/density'`, the three sheets that now load the
 * theme sitting above a configured `@use 'ngwr/theme' with`, every use of a
 * removed intent (`secondary`, `light`, `medium`, `dark`) as a colour, class,
 * shade, `$base-colors` key or `WrColor` literal, `[data-theme]`, `theme.dark`,
 * `dark-selector()` and the `attribute` option, the runtime palette functions,
 * a `getPropertyValue()` of a token, a `-rgb` read or a removed token
 * declaration the rewrite could not reach, the provider calls it could not move,
 * `provideWrOverlay()` (deleting it is the whole change), `ngwr/config`,
 * `ngwr/media`, the responsive bottom sheets, `ngwr/markdown` and the editor's
 * `format`, `ngwr/action-sheet`, `ngwr/squircle`, `<wr-drawer showHandle>`, the
 * date-fns and Luxon adapters, the Feather adapter, an undecorated
 * `WrDateAdapter` subclass, the sortable list's loop, the validation copy ngwr
 * no longer ships, the sidebar's new shape, the keyboard inset and the removed
 * `--wr-star-border-stop` hook. Each needs a decision — which intent a
 * `secondary` button becomes, which breakpoint `WrMedia.matches('md')` was —
 * and a migration that pretends to have made it is worse than none, because the
 * silence reads as "nothing to do".
 *
 * **Registered as `15.0.0`, and that version reaches a release candidate.**
 * `ng update` runs a migration whose version satisfies `>from <=to`, and it
 * strips the prerelease off the TARGET before it builds that range
 * (`executeMigrations` in `@angular/cli/src/commands/update/utilities/migration.js`):
 * an update to `15.0.0-rc.2` asks for `<=15.0.0`, and this runs. Semver alone
 * says the opposite — `15.0.0` is above `15.0.0-rc.2` — which is why the choice
 * is written down. `15.0.0-0` would reach the same targets from v14 and lose one
 * case: when the INSTALLED version is a prerelease the CLI starts the range at
 * `>15.0.0-0`, so an app already on rc.0 or rc.1, which shipped with no codemod
 * at all, would never run it. At `15.0.0` that app runs it on its next update,
 * and so does one moving between later candidates. That is safe because every
 * rule here is idempotent: a second run changes nothing and repeats the reports.
 * The spec rebuilds the CLI's range and holds both halves.
 */

const IGNORE_DIRS = new Set(['node_modules', 'dist', '.git', '.cache', '.angular', 'coverage', '.next', '.nuxt']);

interface Transform {
  readonly pattern: RegExp;
  readonly replacement: string;
}

/**
 * What an open tag may hold between its name and the attribute a rule is after:
 * a quoted value consumed only as a PAIR, or one character that is neither a
 * quote nor `>`. The same form `migration-v14` carries, for the same two
 * reasons. A plain `[^>]*?` reads the `>` in `[hidden]="n > 0"` as the end of
 * the tag, and a leftover here is silent — a `tone="dark"` no value matches
 * renders untoned. And a fallback that also matches a quote lets a pairing start
 * at a CLOSING quote and run past `/>` into later elements, with exponentially
 * many parses in the number of quotes after it: that froze `ng update ngwr@14`
 * on ordinary templates up to 14.5.0. The spec's timing cases are sized to fail
 * in seconds on that form.
 */
const IN_TAG = String.raw`(?:"[^"]*"|'[^']*'|[^>"'])*?`;

/** Any open tag, by name, up to where a rule's attribute search starts. */
const ANY_TAG = String.raw`<[a-zA-Z][\w-]*(?![-\w])`;

/** An open tag of one element. `(?![-\w])`, not `\b`: `<wr-timeline` is a prefix of `<wr-timeline-item`. */
const tag = (name: string): string => String.raw`<${name}(?![-\w])`;

// ---------------------------------------------------------------------------
// Rewrites
// ---------------------------------------------------------------------------

/** What the log says it rewrote, one line per family that changed a file, in this order. */
const FAMILY = {
  charts: 'the seven chart paths, from ngwr/<name> to ngwr/charts/<name>',
  bits: 'the twenty-one bit paths, from ngwr/<name> to ngwr/bits/<name>',
  sortable: 'from ngwr/drag-drop to ngwr/sortable-list',
  lucide: 'from ngwr/icon/adapters/lucide to ngwr/icon',
  providers: 'the provideWrX() config calls, into one provideWr() with a feature each',
  types: 'from WrDateAdapterOptions to WrDatesOptions and from ProvideWrStorageOptions to WrStorageOptions',
  rgb: 'the -rgb reads, to color-mix()',
  tokens: 'the neutral token reads, to --wr-border-* and --wr-color-on-surface*',
  values:
    '[wrTypography] tone from dark to base and from medium to muted, <wr-timeline-item> color from medium to neutral',
  classes: 'the BEM classes those two values emit',
} as const;

const CHARTS = ['bar-chart', 'calendar-heatmap', 'donut-chart', 'gauge', 'line-chart', 'meter-group', 'sparkline'];

const BITS = [
  'aurora',
  'blur-text',
  'border-glow',
  'circular-text',
  'click-spark',
  'confetti',
  'decrypt-text',
  'falling-text',
  'fuzzy-text',
  'glitch-text',
  'gradient-text',
  'marquee',
  'rotating-text',
  'shiny-text',
  'splash-cursor',
  'split-text',
  'spotlight-card',
  'star-border',
  'tilt-card',
  'typewriter',
  'waves',
];

/**
 * A specifier `ngwr/<path>`, as a whole package segment. The lookbehind keeps
 * it off `my-ngwr/gauge` and `@scope/ngwr/…` while still reaching a
 * `node_modules/ngwr/gauge` path in a JSON file; the lookahead keeps
 * `ngwr/gauge` off `ngwr/gauge-x`. A moved path cannot match twice: after the
 * rewrite `ngwr/` is followed by `charts/` or `bits/`, which no rule names —
 * that is what makes a second run a no-op.
 */
const specifier = (path: string): RegExp => new RegExp(String.raw`(?<![\w@.-])ngwr/${path}(?![-\w])`, 'g');

const PATH_FAMILIES: readonly (readonly [string, readonly Transform[]])[] = [
  [FAMILY.charts, CHARTS.map(name => ({ pattern: specifier(name), replacement: `ngwr/charts/${name}` }))],
  [FAMILY.bits, BITS.map(name => ({ pattern: specifier(name), replacement: `ngwr/bits/${name}` }))],
  // The lookbehind is what keeps `@angular/cdk/drag-drop`, a different package
  // every `cdkDrag` user imports, where it is.
  [FAMILY.sortable, [{ pattern: specifier('drag-drop'), replacement: 'ngwr/sortable-list' }]],
  [FAMILY.lucide, [{ pattern: specifier('icon/adapters/lucide'), replacement: 'ngwr/icon' }]],
];

/** `.ts` only: two option types renamed with the functions that took them. */
const TYPE_RENAMES: readonly Transform[] = [
  { pattern: /\bWrDateAdapterOptions\b/g, replacement: 'WrDatesOptions' },
  { pattern: /\bProvideWrStorageOptions\b/g, replacement: 'WrStorageOptions' },
];

/**
 * Removed token to successor, per MIGRATION.md's table. Each name is anchored
 * on both sides, so `--wr-color-light` cannot match inside
 * `--wr-color-light-lighter` (a shade with no successor, reported) or
 * `--wr-color-light-rgb` (rewritten by the `color-mix` rule or reported), and
 * the order of the list cannot decide the outcome.
 */
const TOKEN_RENAMES: readonly (readonly [string, string])[] = [
  ['light', '--wr-border-base'],
  ['outline', '--wr-border-base'],
  ['border', '--wr-border-subtle'],
  ['border-subtle', '--wr-border-subtle'],
  ['border-strong', '--wr-border-subtle'],
  ['dark', '--wr-color-on-surface'],
  ['white-contrast', '--wr-color-on-surface'],
  ['medium', '--wr-color-on-surface-muted'],
  ['muted-text', '--wr-color-on-surface-muted'],
];

/**
 * The places a custom property is SET rather than read, as what comes right
 * before the name: a `[style.--x]` binding (template or host, `.px` suffix or
 * not) and `@HostBinding('style.--x')`, the first argument of `setProperty()` /
 * `removeProperty()`, and the second of Renderer2's `setStyle()` /
 * `removeStyle()`.
 */
const DECLARING_CALL = String.raw`\bstyle\.|(?:setProperty|removeProperty)\(\s*['"\x60]|(?:setStyle|removeStyle)\([^,()]*,\s*['"\x60]`;

/**
 * The fourth place, as what comes right after the name: a CSS declaration, or a
 * quoted key in a style object (`{ '--x': v }`, `[ngStyle]`). A ternary branch
 * `? '--x' : …` matches it too and is listed rather than renamed, which is the
 * safe direction. A backtick is not a key quote — a template literal is a key
 * only inside `[…]` — so `` `--x`: `` in a comment stays a read.
 */
const DECLARING_KEY = String.raw`['"]?\s*:`;

/**
 * READS only: a name in a declaring position is reported — see the docblock at
 * the top of this file for why a declaration is not a rename.
 */
const TOKEN_TRANSFORMS: readonly Transform[] = TOKEN_RENAMES.map(([from, to]) => ({
  pattern: new RegExp(String.raw`(?<![\w-])(?<!${DECLARING_CALL})--wr-color-${from}(?![\w-])(?!${DECLARING_KEY})`, 'g'),
  replacement: to,
}));

/** A removed name a declaration report lists: a renamed neutral, or any `-rgb` channel list. */
const REMOVED_DECLARED = String.raw`--wr-(?:color-(?:light|outline|dark|medium|muted-text|white-contrast|border(?:-subtle|-strong)?)|[\w-]+-rgb)`;

/**
 * Every declaring position {@link TOKEN_TRANSFORMS} leaves alone, from the same
 * two lists, so a name it skips is always listed rather than lost.
 */
const REMOVED_DECLARATION = new RegExp(
  String.raw`(?<![\w-])${REMOVED_DECLARED}(?=${DECLARING_KEY})|(?<=${DECLARING_CALL})${REMOVED_DECLARED}(?![\w-])`
);

/** The v15 token each `--wr-color-<name>-rgb` channel list mixes from. */
const RGB_BASES: Readonly<Record<string, string>> = {
  ...Object.fromEntries(
    ['primary', 'success', 'warning', 'danger', 'info', 'surface', 'on-surface', 'on-surface-muted', 'backdrop'].map(
      name => [name, `--wr-color-${name}`]
    )
  ),
  black: '--wr-color-black',
  white: '--wr-color-white',
  ...Object.fromEntries(TOKEN_RENAMES.map(([from, to]) => [from, to])),
};

/** Component hooks whose channel list became a colour of another name. */
const RGB_HOOKS: Readonly<Record<string, string>> = {
  '--wr-color-picker': '--wr-color-picker-color',
  '--wr-calendar-accent': '--wr-calendar-accent',
};

const ALPHA = String.raw`-?(?:\d+\.?\d*|\.\d+)%?|var\([^()]*\)|calc\((?:[^()]|\([^()]*\))*\)`;
/** A channel-list fallback, `var(--x-rgb, 113, 128, 150)`, which becomes `rgb(113, 128, 150)`. */
const CHANNELS = String.raw`\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}`;
const RGBA = new RegExp(
  String.raw`\brgba?\(\s*var\(\s*(--wr-[\w-]+?)-rgb\s*(?:,\s*(${CHANNELS})\s*)?\)\s*(?:,\s*(${ALPHA})\s*)?\)`,
  'g'
);

function toColorMix(match: string, base: string, fallback: string | undefined, alpha: string | undefined): string {
  const token =
    RGB_HOOKS[base] ?? (base.startsWith('--wr-color-') ? RGB_BASES[base.slice('--wr-color-'.length)] : null);
  if (!token) return match;
  const color = fallback === undefined ? `var(${token})` : `var(${token}, rgb(${fallback}))`;

  let share: string;
  if (alpha === undefined) share = '100%';
  else if (/^-?[\d.]+%$/.test(alpha)) share = alpha;
  else if (/^-?[\d.]+$/.test(alpha)) share = `${Number((Number(alpha) * 100).toFixed(4))}%`;
  else share = `calc(${alpha} * 100%)`;

  return share === '100%' ? color : `color-mix(in srgb, ${color} ${share}, transparent)`;
}

const TYPOGRAPHY = String.raw`\s\[?wrTypography\]?(?![-\w])`;
const TIMELINE_ITEM = tag('wr-timeline-item');

/**
 * Element-scoped, unlike the class renames below: `tone` and `color` carrying
 * these words mean something else on anything that is not these two.
 * `[wrTypography]` is a directive on any element, so both attribute orders are
 * real markup and each value takes two rules per binding form.
 */
const VALUE_RENAMES: readonly Transform[] = [
  ...(
    [
      ['dark', 'base'],
      ['medium', 'muted'],
    ] as const
  ).flatMap(([from, to]) => [
    {
      pattern: new RegExp(String.raw`(${ANY_TAG}${IN_TAG}${TYPOGRAPHY}${IN_TAG}\stone=")${from}(")`, 'g'),
      replacement: `$1${to}$2`,
    },
    {
      pattern: new RegExp(String.raw`(${ANY_TAG}${IN_TAG}\stone=")${from}("${IN_TAG}${TYPOGRAPHY})`, 'g'),
      replacement: `$1${to}$2`,
    },
    {
      pattern: new RegExp(String.raw`(${ANY_TAG}${IN_TAG}${TYPOGRAPHY}${IN_TAG}\s\[tone\]=")'${from}'(")`, 'g'),
      replacement: `$1'${to}'$2`,
    },
    {
      pattern: new RegExp(String.raw`(${ANY_TAG}${IN_TAG}\s\[tone\]=")'${from}'("${IN_TAG}${TYPOGRAPHY})`, 'g'),
      replacement: `$1'${to}'$2`,
    },
  ]),
  { pattern: new RegExp(String.raw`(${TIMELINE_ITEM}${IN_TAG}\scolor=")medium(")`, 'g'), replacement: '$1neutral$2' },
  {
    pattern: new RegExp(String.raw`(${TIMELINE_ITEM}${IN_TAG}\s\[color\]=")'medium'(")`, 'g'),
    replacement: "$1'neutral'$2",
  },
];

/** The BEM classes those two values emit — public API, and unambiguous anywhere. */
const CLASS_RENAMES: readonly Transform[] = [
  { pattern: /(?<![\w-])wr-typography--tone-dark(?![\w-])/g, replacement: 'wr-typography--tone-base' },
  { pattern: /(?<![\w-])wr-typography--tone-medium(?![\w-])/g, replacement: 'wr-typography--tone-muted' },
  { pattern: /(?<![\w-])wr-timeline-item--medium(?![\w-])/g, replacement: 'wr-timeline-item--neutral' },
];

// ---------------------------------------------------------------------------
// The provider calls
// ---------------------------------------------------------------------------

interface Provider {
  /** The `with…()` feature of `provideWr()` that replaces the call, options unchanged. */
  readonly feature: string;
  /** The entry point both names are imported from. */
  readonly from: string;
}

const PROVIDERS: Readonly<Record<string, Provider>> = {
  provideWrDensity: { feature: 'withDensity', from: 'ngwr/density' },
  provideWrToastConfig: { feature: 'withToast', from: 'ngwr/toast' },
  provideWrStorage: { feature: 'withStorage', from: 'ngwr/storage' },
  provideWrMeta: { feature: 'withMeta', from: 'ngwr/meta' },
  provideWrDateAdapter: { feature: 'withDates', from: 'ngwr/date' },
  provideWrTheme: { feature: 'withTheme', from: 'ngwr/theme' },
};

const PROVIDER_CALL = /^(provideWr(?:Density|ToastConfig|Storage|Meta|DateAdapter|Theme))\s*\(/;
const PROVIDE_WR_CALL = /^provideWr\s*\(/;
/** The arrays a provider call can be moved inside of: what Angular reads as providers. */
const ARRAY_OPENERS = /\bproviders\s*:\s*\[|\bmakeEnvironmentProviders\(\s*\[/g;

interface Element {
  /** First character of the expression, past leading whitespace and comments. */
  readonly start: number;
  /** Just past its last character. */
  readonly end: number;
  /** The comma that ends it, or -1 for the last element. */
  readonly comma: number;
}

interface Edit {
  readonly from: number;
  readonly to: number;
  readonly text: string;
}

/**
 * Index of the bracket closing the one at `open`, skipping strings, template
 * literals and comments; -1 when the source does not balance, in which case
 * the caller leaves the array alone rather than guess.
 */
function matchBracket(source: string, open: number): number {
  const closers: Readonly<Record<string, string>> = { '(': ')', '[': ']', '{': '}' };
  const stack: string[] = [];

  for (let i = open; i < source.length; i += 1) {
    const char = source[i];
    const skipped = skipNonCode(source, i);
    if (skipped < 0) return -1;
    if (skipped !== i) {
      i = skipped;
      continue;
    }
    if (char in closers) {
      stack.push(closers[char]);
    } else if (char === ')' || char === ']' || char === '}') {
      if (stack.pop() !== char) return -1;
      if (stack.length === 0) return i;
    }
  }
  return -1;
}

/**
 * When `i` opens a string, a template literal or a comment, the index of its
 * last character; otherwise `i` itself; -1 when it never closes.
 */
function skipNonCode(source: string, i: number): number {
  const char = source[i];
  if (char === '/' && source[i + 1] === '/') {
    const newline = source.indexOf('\n', i);
    return newline < 0 ? source.length - 1 : newline;
  }
  if (char === '/' && source[i + 1] === '*') {
    const close = source.indexOf('*/', i + 2);
    return close < 0 ? -1 : close + 1;
  }
  if (char === '"' || char === "'") {
    for (let j = i + 1; j < source.length; j += 1) {
      if (source[j] === '\\') j += 1;
      else if (source[j] === char) return j;
      else if (source[j] === '\n') return -1;
    }
    return -1;
  }
  if (char === '`') {
    for (let j = i + 1; j < source.length; j += 1) {
      if (source[j] === '\\') {
        j += 1;
      } else if (source[j] === '`') {
        return j;
      } else if (source[j] === '$' && source[j + 1] === '{') {
        const close = matchBracket(source, j + 1);
        if (close < 0) return -1;
        j = close;
      }
    }
    return -1;
  }
  return i;
}

/**
 * The source with every string, template literal and comment blanked to
 * spaces, newlines kept, so it has the same length and line structure: a
 * pattern run over it finds code only, at the index it has in the source. An
 * unterminated quote (a regex literal holding one, say) blanks that character
 * alone rather than the rest of the file.
 */
function codeView(source: string): string {
  const parts: string[] = [];
  let last = 0;
  for (let i = 0; i < source.length; i += 1) {
    const skipped = skipNonCode(source, i);
    if (skipped === i) continue;
    const end = skipped < 0 ? i : skipped;
    parts.push(source.slice(last, i), source.slice(i, end + 1).replace(/[^\n]/g, ' '));
    last = end + 1;
    i = end;
  }
  parts.push(source.slice(last));
  return parts.join('');
}

/** The top-level, comma-separated elements between `from` and `to` (exclusive). */
function splitElements(source: string, from: number, to: number): Element[] | null {
  const elements: Element[] = [];
  let start = -1;
  let end = -1;

  for (let i = from; i < to; i += 1) {
    const char = source[i];
    if (/\s/.test(char)) continue;

    const skipped = skipNonCode(source, i);
    if (skipped < 0) return null;
    const isComment = char === '/' && (source[i + 1] === '/' || source[i + 1] === '*');

    if (char === ',') {
      if (start >= 0) elements.push({ start, end, comma: i });
      start = -1;
      continue;
    }
    if (!isComment && start < 0) start = i;

    if (skipped !== i) {
      if (!isComment) end = skipped + 1;
      i = skipped;
      continue;
    }
    if (char === '(' || char === '[' || char === '{') {
      const close = matchBracket(source, i);
      if (close < 0 || close >= to) return null;
      i = close;
    }
    end = i + 1;
  }
  if (start >= 0) elements.push({ start, end, comma: -1 });
  return elements;
}

/** The whitespace a line opens with, when the element is the first thing on it. */
function indentOf(source: string, at: number): string {
  const lineStart = source.lastIndexOf('\n', at - 1) + 1;
  return /^[ \t]*/.exec(source.slice(lineStart, at))?.[0] ?? '';
}

/**
 * What to cut to remove element `k`: its own line(s) when it has them, else
 * the element and its comma, else — for a last element with no trailing
 * comma — the comma before it.
 */
function removal(source: string, elements: readonly Element[], k: number): Edit {
  const element = elements[k];

  if (element.comma >= 0) {
    const lineStart = source.lastIndexOf('\n', element.start - 1) + 1;
    const ownLine = source.slice(lineStart, element.start).trim() === '';
    let to = element.comma + 1;
    while (source[to] === ' ' || source[to] === '\t') to += 1;
    if (ownLine && source[to] === '\r') to += 1;
    if (ownLine && source[to] === '\n') return { from: lineStart, to: to + 1, text: '' };
    return { from: element.start, to, text: '' };
  }
  if (k > 0) return { from: elements[k - 1].comma, to: element.end, text: '' };
  return { from: element.start, to: element.end, text: '' };
}

interface Item {
  readonly text: string;
  /** Moved from the array's level into `provideWr(...)`, so a multi-line one gains an indent. */
  readonly moved: boolean;
}

function formatProvideWr(items: readonly Item[], indent: string): string {
  if (items.length === 1) return `provideWr(${items[0].text})`;

  const inline = `provideWr(${items.map(item => item.text).join(', ')})`;
  if (!items.some(item => item.text.includes('\n')) && indent.length + inline.length <= 100) return inline;

  const inner = `${indent}  `;
  const lines = items.map(item => `${inner}${item.moved ? item.text.replace(/\n/g, '\n  ') : item.text},`);
  return `provideWr(\n${lines.join('\n')}\n${indent})`;
}

interface Call {
  /** Its index among the array's elements. */
  readonly k: number;
  readonly name: string;
  /** The text between its parentheses, moved into the feature verbatim. */
  readonly args: string;
}

/**
 * `provideWrDateAdapter()` with no options provided the native adapter in
 * `LOCALE_ID`, which is what v15 resolves with nothing provided — so it is
 * deleted rather than turned into a `withDates()` that says nothing.
 */
const isBareDate = (call: Call): boolean => call.name === 'provideWrDateAdapter' && call.args.trim() === '';

/**
 * Moves every provider call that is a plain entry of a providers array into
 * one `provideWr(...)` per array, merging into a `provideWr(...)` the array
 * already holds. Answers the rewritten text and the names it moved.
 */
function rewriteProviders(source: string): { readonly text: string; readonly moved: ReadonlySet<string> } {
  const edits: Edit[] = [];
  const moved = new Set<string>();

  // Matched in the code view, so a providers array quoted in a docs snippet or
  // left in a comment is not rewritten as though it were the app's.
  const view = codeView(source);
  ARRAY_OPENERS.lastIndex = 0;
  for (let opener = ARRAY_OPENERS.exec(view); opener; opener = ARRAY_OPENERS.exec(view)) {
    const open = opener.index + opener[0].length - 1;
    const close = matchBracket(source, open);
    if (close < 0) continue;
    const elements = splitElements(source, open + 1, close);
    if (!elements) continue;

    const calls: Call[] = [];
    let existing = -1;

    elements.forEach((element, k) => {
      const text = source.slice(element.start, element.end);
      const paren = source.indexOf('(', element.start);
      // The call has to BE the element: `provideWrMeta().x` or a call inside a
      // ternary is not a provider entry this can move.
      const whole = paren >= 0 && matchBracket(source, paren) === element.end - 1;
      if (PROVIDE_WR_CALL.test(text) && whole) existing = k;

      const call = PROVIDER_CALL.exec(text);
      if (!call || !whole) return;
      const args = source.slice(paren + 1, element.end - 1);
      // `attribute` is gone with the `[data-theme]` it named, so the call is
      // reported rather than moved into a feature that would refuse the key.
      if (call[1] === 'provideWrTheme' && /\battribute\b/.test(args)) return;
      calls.push({ k, name: call[1], args });
    });
    if (calls.length === 0) continue;

    // The same call twice in one array: v14 let the later one win, and the same
    // feature twice in provideWr(...) throws in dev mode, so only the first of
    // each is moved and the rest stay where they are, for the report to name.
    // Which one should win is the app's call.
    const firsts = calls.filter((call, i) => calls.findIndex(other => other.name === call.name) === i);
    calls.splice(0, calls.length, ...firsts);

    // Merging into a provideWr(...) already there: the same kind twice throws in
    // dev mode, so a duplicate is left where it is and reported instead.
    let existingArgs: Element[] = [];
    if (existing >= 0) {
      const element = elements[existing];
      const existingParen = source.indexOf('(', element.start);
      const inner = source.slice(existingParen + 1, element.end - 1);
      if (/\/[/*]/.test(inner)) continue;
      existingArgs = splitElements(source, existingParen + 1, element.end - 1) ?? [];
      const kinds = existingArgs.map(arg => /^(\w+)\s*\(/.exec(source.slice(arg.start, arg.end))?.[1]);
      for (let i = calls.length - 1; i >= 0; i -= 1) {
        if (!isBareDate(calls[i]) && kinds.includes(PROVIDERS[calls[i].name].feature)) calls.splice(i, 1);
      }
      if (calls.length === 0) continue;
    }

    const features: Item[] = calls
      .filter(call => !isBareDate(call))
      .map(call => ({ text: `${PROVIDERS[call.name].feature}(${call.args})`, moved: true }));

    const removals: Edit[] = [];
    if (existing >= 0) {
      const element = elements[existing];
      const items: Item[] = [
        ...existingArgs.map(arg => ({ text: source.slice(arg.start, arg.end), moved: false })),
        ...features,
      ];
      // Only bare date calls to delete: the provideWr(...) already there stays as written.
      if (features.length > 0) {
        edits.push({
          from: element.start,
          to: element.end,
          text: formatProvideWr(items, indentOf(source, element.start)),
        });
      }
      for (const call of calls) removals.push(removal(source, elements, call.k));
    } else {
      const first = calls.find(call => !isBareDate(call));
      for (const call of calls) {
        if (call === first) {
          const element = elements[call.k];
          edits.push({
            from: element.start,
            to: element.end,
            text: formatProvideWr(features, indentOf(source, element.start)),
          });
        } else {
          removals.push(removal(source, elements, call.k));
        }
      }
    }

    // Two neighbours removed together share the comma between them; merge.
    removals.sort((a, b) => a.from - b.from);
    for (const cut of removals) {
      const last = edits[edits.length - 1];
      if (last?.text === '' && cut.from <= last.to && cut.from >= last.from) {
        edits[edits.length - 1] = { from: last.from, to: Math.max(last.to, cut.to), text: '' };
      } else {
        edits.push(cut);
      }
    }
    for (const call of calls) moved.add(call.name);
  }

  if (edits.length === 0) return { text: source, moved };

  edits.sort((a, b) => b.from - a.from);
  let text = source;
  let floor = Number.POSITIVE_INFINITY;
  for (const edit of edits) {
    // Overlap means two arrays disagreed about one range; keep the source.
    if (edit.to > floor) return { text: source, moved: new Set() };
    text = text.slice(0, edit.from) + edit.text + text.slice(edit.to);
    floor = edit.from;
  }
  return { text: fixImports(text, moved), moved };
}

const NAMED_IMPORT = /import\s+(type\s+)?\{([^}]*)\}\s*from\s*(['"])([^'"]+)\3\s*;?/g;
/** A named import in the code view, where the module string is blanked. */
const VIEW_IMPORT = /import\s+(?:type\s+)?\{[^}]*\}\s*from\b/g;

/** `name` written in code outside an import declaration. */
function usedInCode(view: string, name: RegExp): boolean {
  return name.test(view.replace(VIEW_IMPORT, ''));
}

function importsName(view: string, name: string): boolean {
  return new RegExp(String.raw`import\s+(?:type\s+)?\{[^}]*(?<![\w$])${name}(?![\w$])[^}]*\}\s*from\b`).test(view);
}

/**
 * Removes `remove` from, and adds `add` to, the first value import of
 * `module`, writing a new import line when there is none and dropping a
 * declaration that ends up empty. Only a declaration in CODE counts: a docs
 * snippet in a template literal holds `import … from 'ngwr/density'` lines too,
 * and editing one of those, or appending a real import after it, puts a name
 * in the file that nothing uses. Specifiers are matched exactly, so an aliased
 * `provideWrDensity as density` is never taken out from under its alias.
 */
function editImport(source: string, module: string, remove: readonly string[], add: readonly string[]): string {
  const view = codeView(source);

  NAMED_IMPORT.lastIndex = 0;
  for (let match = NAMED_IMPORT.exec(source); match; match = NAMED_IMPORT.exec(source)) {
    if (view[match.index] !== 'i' || match[1] || match[4] !== module) continue;

    const body = match[2];
    const names = body
      .split(',')
      .map(name => name.trim())
      .filter(name => name.length > 0 && !remove.includes(name));
    for (const name of add) if (!names.includes(name)) names.push(name);

    if (names.length === 0) {
      let to = match.index + match[0].length;
      if (source[to] === '\r') to += 1;
      if (source[to] === '\n') to += 1;
      return source.slice(0, match.index) + source.slice(to);
    }

    const indent = /\n([ \t]+)\S/.exec(body)?.[1];
    const next = indent ? `\n${indent}${names.join(`,\n${indent}`)},\n` : ` ${names.join(', ')} `;
    const declaration = match[0].replace(`{${body}}`, `{${next}}`);
    return source.slice(0, match.index) + declaration + source.slice(match.index + match[0].length);
  }

  if (add.length === 0) return source;

  const quote = /\bfrom\s+"/.test(source) && !/\bfrom\s+'/.test(source) ? '"' : "'";
  const line = `import { ${add.join(', ')} } from ${quote}${module}${quote};`;

  // Into the ngwr group, in order, when the file has one: before the first
  // ngwr import that sorts after this module, else after the last of them.
  const imports = [...view.matchAll(/^import\b[^;]*;[ \t]*$/gm)].map(match => ({
    at: match.index,
    end: match.index + match[0].length,
    module: /from\s*(['"])([^'"]+)\1/.exec(source.slice(match.index, match.index + match[0].length))?.[2] ?? '',
  }));
  const ngwr = imports.filter(entry => entry.module === 'ngwr' || entry.module.startsWith('ngwr/'));
  const after = ngwr.find(entry => entry.module > module);
  if (after) return `${source.slice(0, after.at)}${line}\n${source.slice(after.at)}`;
  const last = ngwr[ngwr.length - 1] ?? imports[imports.length - 1];
  if (!last) return `${line}\n${source}`;
  return `${source.slice(0, last.end)}\n${line}${source.slice(last.end)}`;
}

function fixImports(source: string, moved: ReadonlySet<string>): string {
  let text = source;

  for (const name of moved) {
    const { feature, from } = PROVIDERS[name];
    const view = codeView(text);
    const stillUsed = usedInCode(view, new RegExp(String.raw`(?<![\w$])${name}(?![\w$])`));
    const featureUsed = usedInCode(view, new RegExp(String.raw`(?<![\w$.])${feature}\s*\(`));
    const add = featureUsed && !importsName(view, feature) ? [feature] : [];
    text = editImport(text, from, stillUsed ? [] : [name], add);
  }

  const view = codeView(text);
  if (usedInCode(view, /(?<![\w$.])provideWr\s*\(/) && !importsName(view, 'provideWr')) {
    text = editImport(text, 'ngwr', [], ['provideWr']);
  }
  return text;
}

/**
 * Folds every named value import of `module` into the first one, in code only.
 * A `type`-only declaration stays apart, since joining it would turn its names
 * into value imports.
 */
function mergeImports(source: string, module: string): string {
  const view = codeView(source);
  const declarations = [...source.matchAll(NAMED_IMPORT)].filter(
    match => view[match.index] === 'i' && !match[1] && match[4] === module
  );
  if (declarations.length < 2) return source;

  let text = source;
  const names: string[] = [];
  for (const match of declarations.slice(1).reverse()) {
    names.unshift(
      ...match[2]
        .split(',')
        .map(name => name.trim())
        .filter(name => name.length > 0)
    );
    let to = match.index + match[0].length;
    if (text[to] === '\r') to += 1;
    if (text[to] === '\n') to += 1;
    text = text.slice(0, match.index) + text.slice(to);
  }
  return editImport(text, module, [], names);
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

type Kind = 'ts' | 'html' | 'style' | 'json';

interface FileView {
  readonly path: string;
  readonly kind: Kind;
  /** The file after every rewrite above — what a detector reads, and what the line numbers count in. */
  readonly after: string;
}

interface Report {
  /** What was found; the log reads "`lead` in N file(s)." */
  readonly lead: string;
  readonly body: string;
  /** Where in `file.after` it found what it looks for; empty when it found nothing. */
  readonly find: (file: FileView) => readonly number[];
}

/**
 * Every offset in `text` where `pattern` matches, at the first character that
 * is not whitespace: several patterns open on the `\s` before an attribute, and
 * that one is a newline when the attribute starts its line.
 */
function at(text: string, pattern: RegExp): number[] {
  const global = pattern.global ? pattern : new RegExp(pattern.source, `${pattern.flags}g`);
  return [...text.matchAll(global)].map(match => match.index + (/^\s*/.exec(match[0])?.[0].length ?? 0));
}

/** The 1-based lines those offsets fall on, ascending, each once. */
function linesOf(text: string, offsets: readonly number[]): number[] {
  const lines = new Set<number>();
  for (const offset of offsets) {
    let line = 1;
    for (let i = text.indexOf('\n'); i >= 0 && i < offset; i = text.indexOf('\n', i + 1)) line += 1;
    lines.add(line);
  }
  return [...lines].sort((a, b) => a - b);
}

const REMOVED = ['secondary', 'light', 'medium', 'dark'] as const;
const REMOVED_ALT = REMOVED.join('|');

const isMarkup = (file: FileView): boolean => file.kind === 'ts' || file.kind === 'html';
const isStyle = (file: FileView): boolean => file.kind === 'style';
const isCode = (file: FileView): boolean => file.kind !== 'json';

/** `<wr-sidebar …>` open tags, deterministically: the quote-safe class cannot backtrack. */
const SIDEBAR_TAG = /<wr-sidebar(?![-\w])((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;

/** A sortable list rendering its row from a template, inside its own element. */
const SORTABLE_TEMPLATE = /<wr-sortable-list(?![-\w])(?:(?!<\/wr-sortable-list>)[\s\S])*?<ng-template(?![-\w])/;

const attrOn = (element: string, attr: string): RegExp =>
  new RegExp(String.raw`${tag(element)}${IN_TAG}\s\[?${attr}\]?(?![-\w])`);

const EDITOR_FORMAT = attrOn('wr-editor', 'format');
const DRAWER_HANDLE = attrOn('wr-drawer', 'showHandle');
const SORTABLE_TRACK_BY = attrOn('wr-sortable-list', 'trackBy');

const directiveWith = (directive: string, attr: string): RegExp[] => [
  new RegExp(String.raw`${ANY_TAG}${IN_TAG}\s\[?${directive}\]?(?![-\w])${IN_TAG}\s\[?${attr}\]?(?![-\w])`),
  new RegExp(String.raw`${ANY_TAG}${IN_TAG}\s\[?${attr}\]?(?![-\w])${IN_TAG}\s\[?${directive}\]?(?![-\w])`),
];

const RESPONSIVE: readonly RegExp[] = [
  attrOn('wr-select', 'responsive'),
  attrOn('wr-command-palette', 'responsive'),
  ...directiveWith('wrDropdown', 'responsive'),
  ...directiveWith('wrPopover', 'responsive'),
];

/**
 * Every report, in the order the log prints them. Each reads `after`, so the
 * lines it names are the lines of the file the user opens, and so a site the
 * rewrite already resolved is not named — `<wr-timeline-item color="medium">`
 * is a removed intent until the value rename moves it. What the others look
 * for survives every rewrite (a `getPropertyValue('--wr-color-outline')` that
 * becomes `'--wr-border-base'` still matches its pattern), so reading `after`
 * finds what `before` would have.
 */
const REPORTS: readonly Report[] = [
  {
    lead: "the `@use 'ngwr'` umbrella",
    body:
      "It no longer resolves. Write `@use 'ngwr/theme'` first, then one `@use` per entry point you render, " +
      "for example `@use 'ngwr/button'` — each component's page shows its two lines under Installation. The " +
      "umbrella also carried the density scale: with `withDensity()` or `[wrDensity]`, add `@use 'ngwr/density'`. " +
      'Not rewritten, because which entry points a page renders is your list, and compiling all of them is the ' +
      'cost the umbrella was removed for.',
    find: file => (isStyle(file) ? at(file.after, /@(?:use|forward|import)\s+['"]ngwr['"]/) : []),
  },
  {
    lead: "a sheet that now loads the theme above a configured `@use 'ngwr/theme' with (…)`",
    body:
      '`ngwr/reset`, `ngwr/animations` and `ngwr/typography-utilities` load the theme now, and Sass configures a ' +
      'module only at its first load, so the build stops with "This module was already loaded". Move them below ' +
      "the configured `@use 'ngwr/theme'`.",
    find: file => {
      if (!isStyle(file)) return [];
      const configured = /@use\s+['"]ngwr\/theme['"]\s+with\b/.exec(file.after);
      if (!configured) return [];
      return at(
        file.after.slice(0, configured.index),
        /@(?:use|forward)\s+['"]ngwr\/(?:reset|animations|typography-utilities)['"]/
      );
    },
  },
  {
    lead: 'a `color` naming a removed intent',
    body:
      'The palette is five intents — primary, success, warning, danger, info. `secondary` was a second brand ' +
      'colour, and `light`, `medium` and `dark` were neutral fills; omitting `color` gives the neutral variant, ' +
      'which is a different thing from a dark slab. Choose per site. With strictTemplates this is a compile error; ' +
      'without it the component renders neutral and says nothing.',
    find: file =>
      isMarkup(file)
        ? at(file.after, new RegExp(String.raw`\s\[?color\]?\s*=\s*["']\s*'?(?:${REMOVED_ALT})'?\s*["']`))
        : [],
  },
  {
    lead: 'a `.wr-…--secondary`, `--light`, `--medium` or `--dark` class',
    body:
      'The components no longer emit it, so a stylesheet rule stops matching and a test locator stops finding ' +
      'anything, both silently. Which class the rule should key on instead depends on what it styled.',
    find: file =>
      isCode(file) ? at(file.after, new RegExp(String.raw`(?<![\w-])wr-[\w-]+--(?:${REMOVED_ALT})(?![\w-])`)) : [],
  },
  {
    lead: 'a `--wr-color-secondary*` token',
    body:
      'The whole family is gone, with no successor: a second brand colour is not something ngwr can pick for you. ' +
      'A `var()` at a name nothing declares drops its whole declaration, with no error. Point each one at an ' +
      'intent you keep, or declare the colour yourself.',
    find: file => (isCode(file) ? at(file.after, /--wr-color-secondary(?![\w])/) : []),
  },
  {
    lead: 'a shade of a removed intent',
    body:
      'A `-light`, `-lighter`, `-dark`, `-darker`, `-contrast`, `-soft*`, `-active` or `-ink` of light, medium or ' +
      'dark has no successor. Pick the role by the job: `--wr-color-fill-subtle`, `-fill` or `-fill-strong` for a ' +
      'surface, `--wr-border-base` for a line, `--wr-color-on-surface` or `-on-surface-muted` for text.',
    find: file =>
      isCode(file)
        ? at(
            file.after,
            /--wr-color-(?:light|medium|dark)-(?:light|lighter|dark|darker|contrast|soft|soft-border|soft-contrast|active|ink)(?![\w-])/
          )
        : [],
  },
  {
    lead: 'a `$base-colors` map with a removed key',
    body:
      'The Sass build stops on it. Drop secondary, light, medium and dark from the map: the neutrals are the gray ' +
      'ramp now, and each scheme sets its own.',
    find: file =>
      isStyle(file)
        ? at(file.after, new RegExp(String.raw`\$base-colors\s*:[\s\S]{0,400}?\b(?:${REMOVED_ALT})\s*:`))
        : [],
  },
  {
    lead: 'a removed intent written as a `WrColor` literal',
    body: 'The union is five intents now, so this is a type error. Listed so the errors have a cause beside them.',
    find: file =>
      file.kind === 'ts'
        ? at(file.after, new RegExp(String.raw`(?:WrColor|WR_COLORS)[\s\S]{0,120}?['"](?:${REMOVED_ALT})['"]`))
        : [],
  },
  {
    lead: 'a `-rgb` read the rewrite could not turn into `color-mix()`',
    body:
      'Every `-rgb` token is gone. Replace `rgba(var(--wr-color-primary-rgb), 0.12)` with ' +
      '`color-mix(in srgb, var(--wr-color-primary) 12%, transparent)`. Left as it is, the read drops its whole ' +
      'declaration, with no error. The ones left are an interpolated name, an alpha this cannot read, a fallback, ' +
      'or a base with no successor.',
    find: file => (isCode(file) ? at(file.after, /var\(\s*--wr-[\w#{}$-]*-rgb(?![\w-])/) : []),
  },
  {
    lead: 'a declaration of a token v15 removed',
    body:
      'Reads were renamed; a declaration was not — in CSS, in a `[style.--…]` binding, in `setProperty()` or ' +
      'as a style-object key — because it sets something nothing reads and which role it should set now is your ' +
      'call: `--wr-color-on-surface` is body text, `--wr-color-on-surface-muted` muted text, `--wr-border-base` ' +
      'the hairline, `--wr-border-subtle` the faint border. A `-rgb` declaration can go.',
    find: file => (isCode(file) ? at(file.after, REMOVED_DECLARATION) : []),
  },
  {
    lead: '`[data-theme]`',
    body:
      'Nothing writes the attribute and no rule reads it: the theme follows `color-scheme` and `light-dark()`. A ' +
      "`[data-theme='dark']` selector compiles and matches nothing. Write the dark value in the declaration, " +
      '`color: light-dark(#111, #eee)`; force a scheme with `WrTheme.set()` or `color-scheme` on any element; ' +
      'read `WrTheme.resolved()` instead of the attribute.',
    find: file =>
      isCode(file) ? at(file.after, /\[data-theme\b|\bdata-theme\s*=|['"`]data-theme['"`]|\bdataset\.theme\b/) : [],
  },
  {
    lead: '`theme.dark`, `dark-selector()` or `$theme-attribute`',
    body:
      'All three are gone, with no replacement helper: write `light-dark(<light>, <dark>)` in the declaration ' +
      'itself. `light-dark()` takes colours only.',
    find: file =>
      isStyle(file)
        ? at(file.after, /@include\s+(?:[\w-]+\.)?dark(?![-\w])|\bdark-selector\s*\(|\$theme-attribute\b/)
        : [],
  },
  {
    lead: 'the theme `attribute` option',
    body:
      'It went with `[data-theme]`. Delete the key from `provideWrTheme()` / `withTheme()` and ' +
      '`wrThemePrePaintScript()`; the call with it is not moved into `provideWr()` for you.',
    find: file =>
      file.kind === 'ts'
        ? at(file.after, /\b(?:provideWrTheme|withTheme|wrThemePrePaintScript)\(\s*\{[^)]*?\battribute\s*:/)
        : [],
  },
  {
    lead: '`wrThemeTokens()`, `wrIntentTokens()` or `wrContrastFor()`',
    body:
      "Runtime rebranding is gone. Rebrand at compile time: `@use 'ngwr/theme' with ($base-colors: (…))` moves " +
      'the light side, `@include theme.rebrand($colors, $dark)` moves both.',
    find: file => (file.kind === 'ts' ? at(file.after, /\b(?:wrThemeTokens|wrIntentTokens|wrContrastFor)\b/) : []),
  },
  {
    lead: 'a `getPropertyValue()` of a colour token',
    body:
      'It returns the raw `light-dark(…)` text now, in either scheme, and a canvas cannot draw it. Read the ' +
      "element's computed colour instead: `resolveCssColor()` from `ngwr/utils` takes an element, any colour " +
      'expression and a fallback.',
    find: file => (file.kind === 'ts' ? at(file.after, /getPropertyValue\(\s*['"`]--wr-(?:color|border)-/) : []),
  },
  {
    lead: 'a provider call this could not move into `provideWr()`',
    body:
      '`provideWrDensity()`, `provideWrToastConfig()`, `provideWrStorage()`, `provideWrMeta()`, ' +
      '`provideWrDateAdapter()` and `provideWrTheme()` are gone. Each becomes a feature of one `provideWr()` from ' +
      '`ngwr`: `withDensity()`, `withToast()`, `withStorage()`, `withMeta()`, `withDates()`, `withTheme()`, with ' +
      'the same options. These were not a plain entry of a providers array (a variable, a spread, a ternary, an ' +
      'alias), repeated a kind the array or its `provideWr()` already had (the same feature twice throws in dev ' +
      'mode, so which one wins is your call), or passed the theme `attribute`. The build fails until they move.',
    find: file =>
      file.kind === 'ts' ? at(file.after, /\bprovideWr(?:Density|ToastConfig|Storage|Meta|DateAdapter|Theme)\b/) : [],
  },
  {
    lead: '`provideWrOverlay()`',
    body:
      'It is gone because what it did is the default: every ngwr overlay renders into its own container with no ' +
      'call. Delete the call and its import; that is the whole change. `WR_OVERLAY` and `WR_OVERLAY_CONTAINER` stay.',
    find: file => (file.kind === 'ts' ? at(file.after, /\bprovideWrOverlay\b/) : []),
  },
  {
    lead: '`ngwr/config`',
    body:
      '`provideWrConfig()`, `WR_CONFIG` and `useConfigValue()` are gone: a default is the one written on the input. ' +
      'Bind each key the call set where you want it — deleting the call silently resets every control it reached ' +
      'to `md` and the standard radius.',
    find: file =>
      isCode(file) ? at(file.after, /['"]ngwr\/config['"]|\bprovideWrConfig\b|\bWR_CONFIG\b|\buseConfigValue\b/) : [],
  },
  {
    lead: '`ngwr/media`',
    body:
      "`WrMedia` and its providers are gone. Use the CDK's `BreakpointObserver` from `@angular/cdk/layout`. A named " +
      'key becomes its width — `md` is `(min-width: 768px)`, the rest are `$breakpoints` in `ngwr/breakpoints`. The ' +
      'SCSS mixins are unchanged.',
    find: file =>
      isCode(file)
        ? at(file.after, /['"]ngwr\/media['"]|\bWrMedia\b|\bprovideWrMedia\b|\b(?:DEFAULT_)?WR_BREAKPOINTS\b/)
        : [],
  },
  {
    lead: 'a responsive bottom sheet',
    body:
      '`provideWrResponsiveOverlays()`, `wrPresentAsSheet`, the overlay stylesheet and the `responsive` input on ' +
      '`<wr-select>`, `[wrDropdown]`, `[wrPopover]`, `<wr-command-palette>` and `WrDialog.open()` are gone: ' +
      'overlays always float. For a sheet on a phone, open a `<wr-drawer position="bottom">` yourself. A bare ' +
      '`responsive` and a `.wr-overlay-sheet` rule are inert, which is why they are listed.',
    find: file => {
      const text = file.after;
      return [
        ...(isCode(file)
          ? [
              ...at(
                text,
                /\b(?:provideWrResponsiveOverlays|WR_RESPONSIVE_OVERLAYS|wrPresentAsSheet|WrResponsiveOverlaysConfig|isPresentedAsSheet)\b/
              ),
              ...at(text, /(?<![\w-])wr-(?:overlay-sheet|overlay-backdrop|command-palette--sheet)(?![\w-])/),
            ]
          : []),
        ...(isStyle(file) ? at(text, /@(?:use|forward|import)\s+['"]ngwr\/overlay['"]/) : []),
        ...(isMarkup(file) ? RESPONSIVE.flatMap(pattern => at(text, pattern)) : []),
        ...(file.kind === 'ts' && /\bWrDialog\b/.test(text) ? at(text, /\bresponsive\s*:\s*(?:true|false)\b/) : []),
        ...(file.kind === 'ts' && /\bWrPopoverHarness\b/.test(text) ? at(text, /\.isSheet\(\)/) : []),
      ];
    },
  },
  {
    lead: '`ngwr/markdown`',
    body:
      "`<wr-markdown>`, its parser, `provideWrMarkdownHighlighter()` and `@use 'ngwr/markdown'` are gone. A stored " +
      'document renders through `<wr-editor readonly [toolbar]="false">`, whose value is the `WrEditorJson` tree; ' +
      'markdown converts to it at your own boundary.',
    find: file =>
      isCode(file)
        ? [
            ...at(
              file.after,
              /['"]ngwr\/markdown(?:\/testing)?['"]|<wr-markdown(?![-\w])|\bprovideWrMarkdownHighlighter\b|\bWR_MARKDOWN_HIGHLIGHTER\b|\bWrMarkdown\w*|\b(?:parseMarkdown|parseInlines|serializeMarkdown|safeMarkdownUrl)\b/
            ),
            ...at(file.after, /(?<![\w-])wr-markdown(?![\w])/),
          ]
        : [],
  },
  {
    lead: '`<wr-editor format>`',
    body:
      'The editor value is always the document as a `WrEditorJson` tree, and `null` when empty. A stored HTML or ' +
      "markdown string, or an initial `''`, is refused: the editor stays empty and read-only, and only dev mode " +
      'says why. Convert at your boundary, and start an empty field at `null`.',
    find: file => [
      ...(isMarkup(file) ? at(file.after, EDITOR_FORMAT) : []),
      ...(file.kind === 'ts' ? at(file.after, /\bWrEditorFormat\b/) : []),
    ],
  },
  {
    lead: '`ngwr/action-sheet`',
    body:
      'The component and its harness are gone. Write `<wr-drawer position="bottom" rounded>` with your own rows — ' +
      'their roles, order and cancel group are markup only you have. A leftover `.wr-action-sheet` selector ' +
      'matches nothing, silently.',
    find: file =>
      isCode(file)
        ? at(
            file.after,
            /['"]ngwr\/action-sheet(?:\/testing)?['"]|<wr-action-sheet(?![-\w])|\bWrActionSheet\w*|(?<![\w-])wr-action-sheet(?![\w])/
          )
        : [],
  },
  {
    lead: '`ngwr/squircle`',
    body:
      'The directive and `<wr-squircle>` are gone. Use `shape="squircle"` on `wr-btn`, `wr-avatar` or `wr-badge`, ' +
      "or the `smooth-br` mixin from `@use 'ngwr/theme'`. Not rewritten, because they are not the same thing: the " +
      'native `corner-shape` falls back to a plain rounded corner and takes no radius or border inputs. A bare ' +
      '`wrSquircle` attribute is silent.',
    find: file =>
      isCode(file)
        ? at(
            file.after,
            /['"]ngwr\/squircle['"]|\bwrSquircle(?![\w-])|<wr-squircle(?![-\w])|\b(?:WrSquircle\w*|squirclePath)\b|(?<![\w-])wr-squircle(?![\w])|--wr-squircle-/
          )
        : [],
  },
  {
    lead: '`<wr-drawer showHandle>` or a `.wr-drawer__handle` selector',
    body:
      'The grab handle and its swipe-to-dismiss are gone. The drawer still closes on the backdrop, on Escape and ' +
      'through its own dismiss button, so deleting the attribute is usually the whole change — unless the swipe ' +
      'was the only way out, which is your call.',
    find: file => [
      ...(isMarkup(file) ? at(file.after, DRAWER_HANDLE) : []),
      ...(isCode(file)
        ? at(file.after, /(?<![\w-])wr-drawer__(?:handle|grabber)(?![\w-])|(?<![\w-])wr-drawer__panel--handle(?![\w-])/)
        : []),
    ],
  },
  {
    lead: 'the date-fns or Luxon adapter',
    body:
      '`ngwr/date/adapters/fns` and `ngwr/date/adapters/luxon` are gone. The native adapter needs no provider; for ' +
      'another library, extend `WrDateAdapter<Date>` and pass the class as `provideWr(withDates({ adapter }))`. A ' +
      'format token only date-fns or Luxon knew (`EEEE`, `PPP`) now prints as letters.',
    find: file =>
      isCode(file)
        ? at(
            file.after,
            /['"]ngwr\/date\/adapters\/(?:fns|luxon)['"]|\b(?:provideWrDateFnsAdapter|provideWrLuxonAdapter|WrDateFnsAdapter|WrLuxonAdapter|WR_DATE_FNS_LOCALE)\b/
          )
        : [],
  },
  {
    lead: 'an undecorated `WrDateAdapter` subclass',
    body: "Add `@Service()` to it: undecorated, it inherits the base's injectable definition and dev mode warns.",
    find: file =>
      file.kind === 'ts' && !file.after.includes('@Service(')
        ? at(file.after, /\bclass\s+\w+\s+extends\s+WrDateAdapter\b/)
        : [],
  },
  {
    lead: 'the Feather icon adapter',
    body:
      "`ngwr/icon/adapters/feather` is gone. Register Feather's own SVG files with `svgIcon()` from `ngwr/icon`. " +
      'Its glyphs no longer carry `wr-icon__svg`; style `.wr-icon svg` instead.',
    find: file => (isCode(file) ? at(file.after, /['"]ngwr\/icon\/adapters\/feather['"]|\bfeatherIcons\b/) : []),
  },
  {
    lead: '<wr-sortable-list> with an <ng-template> row or a `trackBy`',
    body:
      'The list no longer owns the loop. Write your own `@for` and project one `<wr-sortable-item>` per row; ' +
      '`trackBy` went with the loop. Not rewritten, because a loop needs the array name and a track key, and only ' +
      'you know both. Until then the list renders nothing, which reads as empty data.',
    find: file => (isMarkup(file) ? [...at(file.after, SORTABLE_TEMPLATE), ...at(file.after, SORTABLE_TRACK_BY)] : []),
  },
  {
    lead: '`provideWrFormErrors()` or `WR_FORM_ERRORS`',
    body:
      'ngwr ships no validation copy. Move each message to the validator — `required(path.email, { message })` — ' +
      'or to a `validation` namespace in your own i18n catalog (`validation.minlength`, payload as params). ' +
      'Without one, a field is marked invalid and shows no message.',
    find: file =>
      file.kind === 'ts'
        ? at(
            file.after,
            /\b(?:provideWrFormErrors|WR_FORM_ERRORS|WR_FORM_ERROR_FALLBACKS|WrFormErrorContext|WrFormErrorMessages?)\b/
          )
        : [],
  },
  {
    lead: "<wr-sidebar>'s old shape",
    body:
      'It has a new look. `badge` is a `{ text, tone }` object and numbers go in `count`; there are no icons by ' +
      'default — bind `defaultGroupIcon` and `defaultItemIcon` to keep `folder` and `caret-forward`; and ' +
      '`.wr-sidebar__entry`, `__item`, `__group-toggle` and `__item-title` are `.wr-sidebar__row`, ' +
      '`.wr-sidebar__row--group` and `.wr-sidebar__title`. The icons and the classes fail silently.',
    find: file => {
      if (!isCode(file)) return [];
      const text = file.after;
      return [
        ...at(text, /(?<![\w-])wr-sidebar__(?:entry|item|group-toggle|item-title)(?:--[\w-]+)?(?![\w-])/),
        ...(file.kind === 'ts' && /\bWrSidebar\w*/.test(text) ? at(text, /\bbadge\s*:\s*['"`]/) : []),
        ...(isMarkup(file)
          ? [...text.matchAll(SIDEBAR_TAG)]
              .filter(open => !/\bdefault(?:Group|Item)Icon\b/.test(open[1]))
              .map(open => open.index)
          : []),
      ];
    },
  },
  {
    lead: '`WrVisualViewport` or `--wr-keyboard-inset`',
    body:
      'Both are gone. A `var(--wr-keyboard-inset, 0px)` compiles and stays `0px`. Read `window.visualViewport` ' +
      'yourself if you need the inset.',
    find: file => (isCode(file) ? at(file.after, /--wr-keyboard-inset|\bWrVisualViewport\b/) : []),
  },
  {
    lead: 'the `--wr-star-border-stop` hook',
    body: "It is gone; the ray's fade is fixed. Override the gradient on `.wr-star-border__ray` instead.",
    find: file => (isCode(file) ? at(file.after, /--wr-star-border-stop\b/) : []),
  },
];

/**
 * Three reports that need the whole project before they can speak, because the
 * absence of something anywhere is what makes them true: a density setting with
 * no density sheet, and the two validation gaps, which a `validation` namespace
 * in any catalog already closes.
 */
interface ProjectFacts {
  densitySheet: boolean;
  validationCatalog: boolean;
  dateFormatKey: boolean;
  readonly densityUsers: Hit[];
  readonly formFields: Hit[];
  readonly datePickers: Hit[];
}

/** One file a report names, with the lines it found something on. */
interface Hit {
  readonly path: string;
  readonly lines: readonly number[];
}

const DENSITY_USE = /\bwithDensity\s*\(|\bprovideWrDensity\b|\bWrDensity\b|\s\[?wrDensity\]?(?![-\w])/;
const DENSITY_SHEET = /['"](?:[\w./-]*\/)?ngwr\/density(?:\/[\w./-]*)?['"]/;
const VALIDATION_CATALOG = /(?<![\w$])['"]?validation['"]?\s*:\s*\{/;
const DATE_FORMAT_KEY = /(?<![\w$])['"]?dateFormat['"]?\s*:\s*['"`]/;
const FORM_FIELD = /<wr-(?:form-field|schema-form)(?![-\w])/;
const FORM_ERROR = /<wr-form-error(?![-\w])/;
const DATE_PICKER = /<wr-date(?:-range)?-picker(?![-\w])/;

function ngUpdateV15(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const found = REPORTS.map(() => [] as Hit[]);
    const families = new Set<string>();
    const facts: ProjectFacts = {
      densitySheet: false,
      validationCatalog: false,
      dateFormatKey: false,
      densityUsers: [],
      formFields: [],
      datePickers: [],
    };
    let rewritten = 0;

    visit(tree, '/', path => {
      const lower = path.toLowerCase();
      let kind: Kind;
      if (lower.endsWith('.ts')) kind = 'ts';
      else if (lower.endsWith('.html')) kind = 'html';
      else if (lower.endsWith('.scss') || lower.endsWith('.sass') || lower.endsWith('.css')) kind = 'style';
      else if (lower.endsWith('.json')) kind = 'json';
      else return;

      const before = tree.readText(path);
      let after = before;
      const step = (family: string, run: (text: string) => string): void => {
        const next = run(after);
        if (next !== after) families.add(family);
        after = next;
      };

      for (const [family, transforms] of PATH_FAMILIES) {
        step(family, text => {
          const next = apply(text, transforms);
          // `ngwr/icon/adapters/lucide` lands on a module the file almost always
          // imports already, for `provideWrIcons`; two declarations from one
          // module compile, and every duplicate-import lint rule flags them.
          return kind === 'ts' && family === FAMILY.lucide && next !== text ? mergeImports(next, 'ngwr/icon') : next;
        });
      }

      if (kind !== 'json') {
        if (kind === 'ts') {
          step(FAMILY.providers, text => rewriteProviders(text).text);
          step(FAMILY.types, text => apply(text, TYPE_RENAMES));
        }
        step(FAMILY.rgb, text => text.replace(RGBA, toColorMix));
        step(FAMILY.tokens, text => apply(text, TOKEN_TRANSFORMS));
        if (kind !== 'style') {
          step(FAMILY.values, text => apply(text, VALUE_RENAMES));
        }
        step(FAMILY.classes, text => apply(text, CLASS_RENAMES));
      }

      if (after !== before) {
        tree.overwrite(path, after);
        rewritten += 1;
      }

      const file: FileView = { path, kind, after };
      const record = (into: Hit[], offsets: readonly number[]): void => {
        if (offsets.length > 0) into.push({ path, lines: linesOf(after, offsets) });
      };
      REPORTS.forEach((report, i) => record(found[i], report.find(file)));

      if (kind !== 'json') record(facts.densityUsers, at(after, DENSITY_USE));
      if ((kind === 'style' || kind === 'json') && DENSITY_SHEET.test(after)) facts.densitySheet = true;
      if (kind === 'ts' || kind === 'json') {
        if (VALIDATION_CATALOG.test(after)) facts.validationCatalog = true;
        if (DATE_FORMAT_KEY.test(after)) facts.dateFormatKey = true;
      }
      if (isMarkup(file) && !FORM_ERROR.test(after)) record(facts.formFields, at(after, FORM_FIELD));
      if (isMarkup(file)) record(facts.datePickers, at(after, DATE_PICKER));
    });

    if (rewritten > 0) {
      const fired = Object.values(FAMILY).filter(family => families.has(family));
      context.logger.info(`ngwr v15 migration: rewrote ${rewritten} file(s): ${fired.join('; ')}.`);
      context.logger.info('Verify the result with `git diff` — a few edge cases may need manual touch-up.');
    }

    let reported = 0;
    // `path:line`, which terminals and editors open at the line; the rest of
    // the file's lines follow, so a stylesheet with forty hits is one entry.
    const warn = (lead: string, body: string, hits: readonly Hit[]): void => {
      if (hits.length === 0) return;
      reported += 1;
      context.logger.warn(`ngwr v15: ${lead} in ${hits.length} file(s). ${body}`);
      for (const { path, lines } of hits) context.logger.warn(`  ${path}:${lines.join(', ')}`);
    };

    REPORTS.forEach((report, i) => warn(report.lead, report.body, found[i]));

    if (!facts.densitySheet) {
      warn(
        "a density setting with no `@use 'ngwr/density'` anywhere",
        'The scale lived in the removed umbrella and no component loads it, so `withDensity()` and `[wrDensity]` do ' +
          "nothing until a global stylesheet adds `@use 'ngwr/density'` after `@use 'ngwr/theme'`.",
        facts.densityUsers
      );
    }
    if (!facts.validationCatalog) {
      warn(
        'a form field with no <wr-form-error> and no `validation` catalog in the project',
        'ngwr ships no validation copy, so an error with no source shows no message — and a production build says ' +
          'nothing. Give each error one: `{ message }` on the validator, `validation.<key>` in your catalog, or ' +
          '`<wr-form-error key>`. If every rule here already carries a message, there is nothing to do.',
        facts.formFields
      );
    }
    if (!facts.dateFormatKey) {
      warn(
        'a date picker with no `validation.dateFormat` in the project',
        'Its refusals have no English default now: they read `validation.dateFormat`, `minDate`, `maxDate` and ' +
          '`dateFilter` from your catalog, with the example date as `example`. Without them a refused entry is a ' +
          'danger border and `aria-invalid`, with no sentence.',
        facts.datePickers
      );
    }

    if (rewritten === 0 && reported === 0) {
      context.logger.info('ngwr v15 migration: nothing to do — no affected usage found.');
    }

    return tree;
  };
}

function apply(content: string, transforms: readonly Transform[]): string {
  let next = content;
  for (const { pattern, replacement } of transforms) {
    next = next.replace(pattern, replacement);
  }
  return next;
}

function visit(tree: Tree, path: string, visitor: (filePath: string) => void): void {
  const dir = tree.getDir(path);
  for (const file of dir.subfiles) visitor(`${path === '/' ? '' : path}/${file}`);
  for (const sub of dir.subdirs) {
    if (IGNORE_DIRS.has(sub)) continue;
    visit(tree, `${path === '/' ? '' : path}/${sub}`, visitor);
  }
}

export default ngUpdateV15;
