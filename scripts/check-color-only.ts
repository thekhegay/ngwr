/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Fails the build when a state or intent is told apart by COLOUR and nothing
 * else, without saying why that is acceptable.
 *
 * Why this exists, and why it is a source check rather than a browser one. The
 * nine intents cannot be told apart by lightness: v11 deepened five of them so
 * `_contrast()` would pick a WHITE label, and tuning nine colours to one ratio
 * against the same two candidates IS tuning them to one luminance. Measured off
 * `$base-colors`, six of the nine sit inside a 1.06:1 band and `success`
 * against `danger` is 1.004:1 — the same grey. So for a reader with red-green
 * colour blindness, roughly one man in twelve, a `--success` modifier and a
 * `--danger` modifier that differ only in colour are the same element.
 *
 * No runtime gate can report this. axe ships no rule for WCAG 1.4.1, which is
 * why `check:a11y`, `check:contrast` and `check:state-a11y` are all green over
 * a catalog where a sweep upheld thirty-two findings. And no assertion about
 * the COLOURS is satisfiable — the intents have to share a luminance to keep
 * their labels legible, so "make them differ" is a contradiction, not a target.
 * What is checkable is a source fact: does a non-colour declaration exist.
 *
 * What it does NOT do is ban colour-only state. Plenty is correct — a
 * `--wr-color-danger` border against the default `--wr-color-outline` differs
 * in LIGHTNESS, not only in hue; a sequential heat scale that ramps opacity
 * over one hue survives greyscale intact; and a modifier whose channel lives in
 * a SIBLING rule (a `::before` tick, a moving thumb, a different glyph in the
 * template) is fine and simply not visible from the block itself. The rule is
 * that such a block carries a marker naming the channel:
 *
 *     // color-ok: the base border is transparent, so this paints an underline
 *     &--active {
 *       border-bottom-color: var(--wr-color-primary);
 *     }
 *
 * So this is a "say why" gate rather than a "don't" gate — the same shape as
 * `check:rtl` and `check:tokens`, and for the same reason: the exceptions are
 * real, so the only thing worth enforcing is that each one was a decision.
 *
 * Two models already in the tree, worth copying instead of writing a marker:
 * `wr-statistic` draws two genuinely different triangles for up and down, and
 * `wr-calendar-heatmap` ramps opacity over a single hue.
 *
 * Some markers record a DECISION rather than point at a channel, and say so:
 * `wr-tag`, `wr-badge` and `wr-typography`'s tones LABEL rather than report,
 * so their colour is decoration or category and the author's words carry the
 * state. AGENTS.md keeps that as a decided trade beside the `--wr-color-outline`
 * one, with the alternatives that were costed and not taken.
 *
 * LOOPS ARE UNROLLED. Most of the catalog paints its nine intents from an
 * `@each` over `theme.$colors`, and the literal selector `&--#{$name}` names no
 * state — so while this read one concrete selector at a time, a green run said
 * nothing about the badge, the tag, the button or the progress bar, which are
 * exactly where the 1.004:1 lands. An `@each` whose list
 * `scripts/lib/scss-loops.ts` resolves (the module `check:tokens` expands its
 * references through, so the two gates cannot read one loop two ways) is
 * replaced by one copy of its body per member, in place, with every character
 * still pointing at its source line — so a finding names the rule's own line and
 * a marker is found where it was written. A marker above the `@each` covers
 * every rule it generates: a family is one decision, which is `check:tokens`'
 * rule too, and it means the sentence has to be true of every member. A loop
 * whose list cannot be resolved and whose body writes a modifier from it
 * (`#{$pane}--#{$placement}`) FAILS rather than passing — nothing can be judged
 * about members nobody can name, so an author has to say what they are. So
 * does any modifier still spelled as an interpolation once the unrolling is
 * done — a mixin argument, a third loop variable — because masked to `--_____`
 * it named no state and was never judged at all. Three shapes reached that
 * silently before the backstop existed: a list over several lines, a third
 * variable and `#{ $name }` written with spaces.
 *
 * Each reading is proved before the tree is judged. `SELF_TEST` holds a
 * stylesheet for every shape this gate once passed green — those three, a map
 * of maps, a quoted key, a colour inside a shadow, a state that only repaints
 * its children — and a change that loses one fails `pnpm lint` by name. A tree
 * that happens to contain none of them proves nothing about the next one.
 *
 * A CUSTOM PROPERTY IS JUDGED BY ITS VALUE. A hook's name is its author's, and
 * the name pattern this started with read `--wr-alert-title`,
 * `--wr-progress-bar` and `--wr-checkbox-mark` as not-a-colour — which cleared
 * the alert's intent loop and the progress bar's by an accident of naming — and
 * read `--wr-burger-stroke-1: 90 207`, a dash array, as one. So a value that
 * HOLDS a colour anywhere (a hex, a colour function or Sass's `mix()`, a
 * gradient, `transparent`, a `var(--wr-color-…)` inside a shadow or a border
 * shorthand, a `var()` of a colour-named property) makes the declaration
 * colour, a value of numbers and lengths alone makes it not, and anything else —
 * a keyword, a `var()` of a neutrally named hook, a Sass expression — falls back
 * to the name, which no longer counts `-width`, `-style`, `-radius` or `-offset`
 * as colour. The first version of this only tested the START of a value and let
 * anything unrecognised through, which passed a shadow, a border shorthand and
 * a named colour that the name check before it had reported.
 *
 * A STATE IS JUDGED ON WHAT IT REACHES when it declares nothing itself: the
 * colour it puts on its children and into its `@if` / `@else` and `@media`
 * branches. `wr-form-item`'s `&--error { > label { color: … } }` repainted a
 * label and an input border and passed, because the state block was empty and
 * `> label` names no state. And a declaration that paints nothing —
 * `pointer-events`, `cursor`, `transition`, `z-index` — is neither colour nor a
 * channel: `wr-sidebar`'s two active rows cleared on `pointer-events: none`.
 *
 * A MODIFIER MAY CARRY A PREFIX, and a selector may carry parentheses.
 * `wr-typography` writes `&--tone-danger`, which a matcher anchored straight
 * after `--` never made a candidate, and the button group's
 * `> .wr-btn--#{$name}:not(.wr-btn--outlined):not(:last-child)` was read as an
 * empty selector, because the opener pattern could not cross a `(`.
 * `:not(…)` is stripped before the modifier test, since
 * `&:hover:not(.wr-tabs__tab--active)` names the state the rule is NOT for.
 *
 * WHAT IT STILL CANNOT SEE, worth knowing before trusting a green run. It judges
 * a block's OWN declarations, so a channel in a sibling rule or in the template
 * needs the marker to point at it. An `@include` is not expanded, so a mixin
 * that emits the colour — or the channel — is invisible from the block calling
 * it. An `@if` is never evaluated, so its branches count for every member, and
 * a channel written inside one — or inside `@media` — does not clear the state.
 * A few real silhouettes are spelled with colour-valued properties — a
 * hollow dot is `background: transparent` plus an inset ring — and read here as
 * colour. And a value bound from TypeScript (`[style.--wr-event-calendar-color]`)
 * never reaches a stylesheet at all. So a green run is not a claim that two
 * intents can be told apart; it is a claim that every rule relying on hue alone
 * says, in writing, what else a reader has.
 *
 * Wired into `lint`, like `check:rtl` and `check:tokens`: `ci.yml`,
 * `deploy.yml` and `publish.yml` all run `pnpm lint` already.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { EACH, listsIn, type LoopList, loopLists, resolveLoopList } from './lib/scss-loops';

const ROOT = resolve(import.meta.dirname, '..');
const LIB = join(ROOT, 'projects/lib');

/**
 * Where a loop's list is looked up: the roots `check:tokens` reads.
 *
 * Not only the files judged here — the theme is where `$base-colors` lives, and
 * a showcase stylesheet declaring a list of the same name with other members
 * has to make BOTH gates drop it, or one of them expands a loop the other
 * refuses to guess at.
 */
const LOOP_LIST_ROOTS = [LIB, join(ROOT, 'projects/showcase')];

/**
 * The marker is looked for in the CONTIGUOUS comment block directly above the
 * selector, however many lines that runs to — or above any `@each` the rule
 * was generated by.
 *
 * `check:rtl` counts a fixed three lines instead, and the difference is the
 * kind of thing being excused. A physical property needs a clause; "what tells
 * these two states apart other than hue" needs a sentence or three, and a
 * fixed reach silently stopped seeing markers whose explanation was honest
 * enough to need a fourth line. A blank line ends the run, so a marker still
 * cannot reach past the rule it sits above.
 */
const MARKER = 'color-ok:';

/**
 * Modifier names that carry MEANING rather than geometry.
 *
 * Curated rather than "anything after `--`", and the distinction is the whole
 * accuracy of the check: `--sm`, `--outlined`, `--pill` and `--vertical` are
 * shape and size, where a colour-only rule says nothing at all about state, and
 * treating them as findings would bury the real ones. What is listed here is
 * the set a reader has to TELL APART to use the component — a status, a
 * selection, a validity, or one of the nine intents.
 */
const STATEFUL = new RegExp(
  [
    // Selection and navigation.
    String.raw`selected|active|current|checked|indeterminate|open|expanded|collapsed`,
    // Validity and progress.
    String.raw`invalid|error|valid|complete|completed|pending|reachable|loading`,
    // The nine intents, plus the names components give them.
    String.raw`primary|secondary|success|warning|danger|info|neutral|offline|medium|light|dark`,
    // Direction of change — a statistic, a trend, a diff.
    String.raw`up|down|added|removed`,
  ].join('|')
);

/**
 * A modifier, `&--x` or a literal `.wr-block--x`, naming a state — directly or
 * after segments of its own, as `&--tone-danger` does.
 */
const MODIFIER = new RegExp(String.raw`--(?:[a-z]+-)*?(?:${STATEFUL.source})\b`);

/**
 * Declarations that paint and do nothing else.
 *
 * `box-shadow` is here deliberately even though it can carry a shape: under
 * `forced-colors` every shadow is dropped outright, so a shadow is never the
 * channel a reader who needs one can rely on. Custom properties are judged
 * separately, by value, in `isColour()` — a component's own hook is the usual
 * way an intent reaches a stylesheet here.
 */
const COLOUR_PROPERTIES = new Set([
  'color',
  'background',
  'background-color',
  'background-image',
  'border-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'border-inline-color',
  'border-inline-start-color',
  'border-inline-end-color',
  'border-block-color',
  'border-block-start-color',
  'border-block-end-color',
  'outline-color',
  'fill',
  'stroke',
  'box-shadow',
  'accent-color',
  'caret-color',
  'text-decoration-color',
  'column-rule-color',
]);

/**
 * A custom property whose name says it carries a colour — and not its geometry.
 * `\b` alone read `--wr-x-border-width`, `-stroke-width` and `-shadow-offset` as
 * colour-named, so a width channel written through a hook needed a false
 * `color-ok:` to pass.
 */
const COLOUR_NAME =
  /^--wr-[\w-]*(?:color|bg|background|border|accent|ink|fill|stroke|shadow)\b(?!-(?:width|style|radius|offset|opacity|size|blur|spread))/;

/** A value that IS a colour: a hex, a colour function, a gradient, a painting keyword. */
const COLOUR_VALUE =
  /^(?:#[\da-f]{3,8}\b|(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark|(?:repeating-)?(?:linear|radial|conic)-gradient|color\.(?:adjust|scale|change|mix|complement|grayscale|invert))\(|(?:transparent|currentcolor|white|black)\b)/i;

/**
 * A value that HOLDS a colour somewhere: a shadow or border shorthand around a
 * `var(--wr-color-…)`, a hex, a colour function — Sass's global `mix()` and
 * `darken()` included. Anchoring every colour test at the start of the value
 * passed `0 0 0 2px var(--wr-color-primary)` and `1px solid var(--wr-color-danger)`
 * as not-colour, which the name check this replaced had reported.
 * `--wr-color-picker-*` is the colour picker's own geometry, not a colour.
 */
const HOLDS_COLOUR =
  /#[\da-f]{3,8}\b|var\(\s*--wr-color-(?!picker-)|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix|light-dark|(?:repeating-)?(?:linear|radial|conic)-gradient|mix|lighten|darken|saturate|desaturate|transparentize|opacify|fade-in|fade-out|adjust-hue|complement|grayscale|invert|color\.[\w-]+)\(|\b(?:transparent|currentcolor)\b/i;

/** Numbers and lengths and nothing else — `90 207`, `2px`, `0 0 1px` — which no colour is. */
const MEASURE = /^[-+\d.\s]+(?:[a-z%]+)?(?:\s+[-+\d.]+(?:[a-z%]+)?)*$/i;

/**
 * Declarations that paint nothing, so they are neither colour nor a channel.
 *
 * Anything outside the colour list used to count as a second channel, which
 * cleared `wr-sidebar`'s active entry on `pointer-events: none` — and would
 * clear any colour-only state that also set a `cursor` or a `transition`. An
 * `animation` is NOT here: a state that pulses or spins is visibly different
 * without hue, and whether its keyframes move anything is not readable from
 * the block.
 */
const PAINTS_NOTHING = /^(?:pointer-events|cursor|user-select|-webkit-user-select|touch-action|z-index|will-change|transition(?:-[\w-]+)?)$/;

interface Declaration {
  readonly name: string;
  readonly value: string;
}

/** A stretch of a stylesheet, each character carrying its offset in the source. */
interface Text {
  readonly text: string;
  readonly at: readonly number[];
}

interface Finding {
  readonly file: string;
  readonly line: number;
  /** The `@each` the rule was generated by, when it was. */
  readonly loop: number | undefined;
  readonly selectors: Set<string>;
  readonly properties: Set<string>;
}

interface UnreadLoop {
  readonly file: string;
  readonly line: number;
  readonly header: string;
  readonly variables: readonly string[];
}

/** An unread loop as `unroll()` records it: its header, and where it closes in the source. */
type Blocked = Omit<UnreadLoop, 'file' | 'line'> & { readonly close: number };

function scssFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      // The theme layer declares the tokens rather than painting a state with
      // them; `check:tokens` is what answers for that file set.
      if (entry === 'theme') continue;
      out.push(...scssFiles(path));
    } else if (entry.endsWith('.scss')) out.push(path);
  }
  return out;
}

/** Strip comments so a `//` mention of a property is not read as a declaration. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\n]/g, ' ')).replace(/\/\/[^\n]*/g, '');
}

/**
 * `#{…}` holds braces that open no block, so every brace count here runs over a
 * copy with the interpolations masked — same length, so offsets still agree.
 */
function masked(source: string): string {
  return source.replace(/#\{[^}]*\}/g, match => '_'.repeat(match.length));
}

function closingBrace(source: string, open: number): number {
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return i;
  }
  return -1;
}

function slice(piece: Text, from: number, to = piece.text.length): Text {
  return { text: piece.text.slice(from, to), at: piece.at.slice(from, to) };
}

function joined(pieces: readonly Text[]): Text {
  return { text: pieces.map(p => p.text).join(''), at: ([] as number[]).concat(...pieces.map(p => p.at)) };
}

/**
 * Substitute a member for `#{$variable}`. The substituted characters all point
 * at the interpolation they replaced, so a finding inside the copy still lands
 * on the line the author wrote.
 */
function bind(piece: Text, bound: ReadonlyMap<string, string>): Text {
  // `#{ $name }` is the same interpolation, and Sass, prettier and stylelint
  // all accept it; an exact `#{$name}` left it unbound and masked to `_____`,
  // which names no state, so a colour-only loop passed on a space.
  const pattern = new RegExp(String.raw`#\{\s*\$(${[...bound.keys()].join('|')})\s*\}`, 'g');
  const pieces: Text[] = [];
  let from = 0;
  for (const match of piece.text.matchAll(pattern)) {
    const index = match.index ?? 0;
    const value = bound.get(match[1]) ?? '';
    pieces.push(slice(piece, from, index), { text: value, at: Array<number>(value.length).fill(piece.at[index]) });
    from = index + match[0].length;
  }
  pieces.push(slice(piece, from));
  return joined(pieces);
}

/**
 * Does a SELECTOR in this loop body interpolate the variable into a modifier —
 * `&--#{$name}`, `#{$pane}--#{$placement}`? A declaration spelling it
 * (`--wr-color-#{$name}-soft: …`) is not one: that names a property, not a state.
 */
function writesModifier(body: string, variable: string): boolean {
  // `¤` stands in for the variable: no stylesheet here writes one, it is not a
  // word character, and it survives the masking of every other interpolation.
  const marked = masked(body.replace(new RegExp(String.raw`#\{\s*\$${variable}\s*\}`, 'g'), '¤'));
  for (const [, selector] of marked.matchAll(/([^{};]*)\{/g)) {
    if (!selector.trim().startsWith('@') && /--[\w-]*¤/.test(selector)) return true;
  }
  return false;
}

/**
 * Replace every `@each` with one copy of its body per member.
 *
 * In place rather than judged apart, because a loop body that declares straight
 * into its enclosing rule is that rule's own declarations, and lifting it out
 * would judge the enclosing block without them. Nested loops unroll through the
 * recursion. A loop whose list cannot be resolved keeps a single copy with its
 * interpolation masked — every rule in it is still judged, it just cannot be
 * judged per member — and, when that interpolation writes a modifier, it is
 * recorded as unread.
 */
function unroll(piece: Text, lists: ReadonlyMap<string, LoopList>, unread: Map<number, Blocked>): Text {
  const blind = masked(piece.text);
  const each = EACH.exec(blind);
  if (!each) return piece;

  const start = each.index;
  const open = start + each[0].length - 1;
  const close = closingBrace(blind, open);
  if (close < 0) return piece;

  const [, first, second, expression] = each;
  const body = slice(piece, open + 1, close);
  const list = resolveLoopList(expression, lists);
  const copies: Text[] = [];
  // A variable past the second — `@each $name, $glyph, $size in …` — is never
  // bound: no list here is read as rows of three.
  const unbound = [...each[0].split(/\s+in\s+/)[0].matchAll(/\$([\w-]+)/g)].map(match => match[1]).slice(2);

  if (list && list.keys.length > 0) {
    // A map whose values are not all plain names cannot be paired member by
    // member, so the second variable stays unbound rather than misaligned.
    const paired = second !== undefined && list.values.length === list.keys.length;
    if (second !== undefined && !paired) unbound.push(second);
    list.keys.forEach((key, index) => {
      const bound = new Map([[first, key]]);
      if (paired) bound.set(second, list.values[index]);
      copies.push(unroll(bind(body, bound), lists, unread));
    });
  } else {
    unbound.push(first, ...(second === undefined ? [] : [second]));
    copies.push(unroll(body, lists, unread));
  }

  const variables = unbound.filter(variable => writesModifier(body.text, variable));
  if (variables.length > 0) {
    unread.set(piece.at[start], { header: piece.text.slice(start, open).trim().replace(/\s+/g, ' '), variables, close: piece.at[close] });
  }

  return joined([slice(piece, 0, start), ...copies, unroll(slice(piece, close + 1), lists, unread)]);
}

/**
 * Is this declaration colour and nothing else?
 *
 * A standard property is judged by its name, from the list above. A custom
 * property is judged by its VALUE first — see the file docblock for the three
 * hooks whose names hid what they held — and by its name only when the value
 * cannot say. The one value that clears a colour-named hook is a plain measure,
 * because `--wr-burger-stroke-1: 90 207` is a dash array.
 */
function isColour({ name, value }: Declaration): boolean {
  if (!name.startsWith('--')) return COLOUR_PROPERTIES.has(name);
  if (COLOUR_VALUE.test(value)) return true;
  const reference = /^var\(\s*(--[\w-]+)/.exec(value);
  if (reference && COLOUR_NAME.test(reference[1])) return true;
  if (HOLDS_COLOUR.test(value)) return true;
  if (MEASURE.test(value)) return false;
  return COLOUR_NAME.test(name);
}

/**
 * The declarations a block writes ITSELF, at its own nesting level.
 *
 * Walked by brace depth rather than sliced up to the first `{`, because a
 * nested rule may come BEFORE a declaration — and the sliced version then read
 * an empty body, found no properties, and let the block through. It is a
 * false NEGATIVE, which is the worse direction for a gate: nothing is printed,
 * so nothing looks wrong. Found by a self-test rather than by review.
 */
function ownDeclarations(source: string, from: number): Declaration[] {
  return declarationsUnder(source, from, () => false);
}

/**
 * Every declaration a state's block reaches that is not judged on its own:
 * its own, and those of each nested block that names no state of its own — a
 * child rule, an `@if` / `@else` branch, an `@media` query.
 *
 * What a state rule that declares nothing ITSELF is judged on, and two shapes
 * passed because it was not. `&--error { > label { color: … } }` repaints its
 * label and changes nothing else; and a loop body writing its per-intent
 * exception as `@if $name == light { … } @else { … }` declares nothing at its
 * own level either. Both were skipped as empty whatever they painted. So the
 * colour a state puts on its children and into its branches counts against it
 * — every branch, for every member, since no condition is evaluated — while
 * their other declarations do not clear it, for the reason the own-declarations
 * rule gives, and because a channel inside `@if $name == light` or
 * `@media (hover: hover)` is not a channel every member or every reader has.
 */
function reachedDeclarations(source: string, from: number): Declaration[] {
  return declarationsUnder(source, from, selector => !MODIFIER.test(withoutNegations(selector.trim())));
}

/**
 * The declarations under a block, reading through every nested block `enter`
 * accepts and skipping the rest. Walked by brace depth, because a nested rule
 * may come before a declaration.
 */
function declarationsUnder(source: string, from: number, enter: (selector: string) => boolean): Declaration[] {
  const found: Declaration[] = [];
  // One entry per open brace: whether its contents are read.
  const open: boolean[] = [];
  let segment = '';

  for (let i = from; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') {
      // Whatever preceded this brace was a selector, never a declaration.
      open.push(open.every(Boolean) && enter(segment));
      segment = '';
      continue;
    }
    if (ch === '}') {
      if (open.length === 0) break;
      open.pop();
      segment = '';
      continue;
    }
    if (!open.every(Boolean)) continue;
    if (ch === ';') {
      const match = /^\s*([\w-]+)\s*:([\s\S]*)$/.exec(segment);
      if (match) found.push({ name: match[1], value: match[2].trim() });
      segment = '';
      continue;
    }
    segment += ch;
  }

  return found;
}

/**
 * Does this block create a pseudo-element — `&::before` or `&::after` carrying
 * a `content` declaration — anywhere inside it?
 *
 * Scoped to the block by brace depth, so a sibling rule further down the file
 * cannot vouch for it.
 */
function createsPseudoElement(source: string, from: number): boolean {
  let depth = 0;
  let end = source.length;
  for (let i = from; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      if (depth === 0) {
        end = i;
        break;
      }
      depth--;
    }
  }

  const body = source.slice(from, end);
  for (const nested of body.matchAll(/([^{};]*::(?:before|after)[^{};]*)\{([^{}]*)\}/g)) {
    if (/(^|;)\s*content\s*:/.test(nested[2])) return true;
  }
  return false;
}

/**
 * The selector with every `:not(…)` removed, balanced parentheses and all.
 *
 * `&:hover:not(.wr-calendar__day--selected)` is the hover of a day that is NOT
 * selected; reading the modifier inside the negation as the rule's own state
 * reported four hover rules as selection cues.
 */
function withoutNegations(selector: string): string {
  let out = '';
  let i = 0;
  while (i < selector.length) {
    if (selector.startsWith(':not(', i)) {
      let depth = 0;
      let j = i + 4;
      for (; j < selector.length; j++) {
        if (selector[j] === '(') depth++;
        else if (selector[j] === ')' && --depth === 0) break;
      }
      i = j + 1;
      continue;
    }
    out += selector[i++];
  }
  return out;
}

/**
 * Is there a `color-ok:` in the comment block immediately above this line?
 *
 * Walks upward over `//` lines and stops at the first line that is not one — a
 * declaration, a brace, or a blank line. That last stop is what keeps a marker
 * from vouching for a rule it does not sit against.
 */
function markedAbove(lines: readonly string[], selectorLine: number): boolean {
  for (let i = selectorLine - 2; i >= 0; i--) {
    const text = lines[i].trim();
    if (!text.startsWith('//')) return false;
    if (text.includes(MARKER)) return true;
  }
  return false;
}

/**
 * Walk one stylesheet brace by brace, with its loops unrolled, and judge each
 * block on its OWN declarations.
 *
 * Judging the whole subtree would excuse a colour-only modifier because some
 * descendant of it happens to set a width; judging only the own declarations is
 * the question actually being asked, which is "does this modifier, by itself,
 * change anything a reader without hue can see".
 */
function judge(file: string, raw: string, lists: ReadonlyMap<string, LoopList>): { found: Finding[]; unread: UnreadLoop[] } {
  const found = new Map<number, Finding>();
  const unread = new Map<number, UnreadLoop>();
  const source = withoutComments(raw);
  const rawLines = raw.split('\n');
  // Comments are stripped within a line and never across one, so a line
  // number in `source` is a line number in the file.
  const lineOf = (offset: number): number => source.slice(0, offset).split('\n').length;

  // Every `@each` in the file as written, so a rule can be traced back to the
  // loops that generated it and a marker above any of them found.
  const blind = masked(source);
  const loops: { start: number; close: number; line: number }[] = [];
  for (const each of blind.matchAll(new RegExp(EACH.source, 'g'))) {
    const start = each.index ?? 0;
    loops.push({ start, close: closingBrace(blind, start + each[0].length - 1), line: lineOf(start) });
  }
  const markedLoop = (offset: number): boolean =>
    loops.some(loop => loop.start < offset && offset < loop.close && markedAbove(rawLines, loop.line));
  const innermostLoop = (offset: number): number | undefined =>
    loops.filter(loop => loop.start < offset && offset < loop.close).at(-1)?.line;

  const blocked = new Map<number, Blocked>();
  const expanded = unroll({ text: source, at: Array.from(source, (_, i) => i) }, lists, blocked);
  for (const [start, { header, variables }] of blocked) {
    if (markedAbove(rawLines, lineOf(start)) || markedLoop(start)) continue;
    unread.set(lineOf(start), { file, line: lineOf(start), header, variables });
  }

  // Whatever interpolation is left — a list nobody could read, a `#{$gutter}`
  // — is masked, so its braces open no block.
  const text = masked(expanded.text);

  // Every `{` with the text that precedes it is a candidate selector.
  for (const opener of text.matchAll(/([^{};]*)\{/g)) {
    const selector = opener[1].trim().replace(/\s+/g, ' ');
    if (!selector || selector.startsWith('@')) continue;

    // Two positions matter and they are not the same line. The selector
    // pattern is `[^{};]*`, which crosses newlines, so the match begins
    // right after the previous block closed — anchoring anything on it reads
    // several lines too high. So: report the BRACE's line, and look for the
    // marker above the selector's FIRST line, which for a multi-line selector
    // list is not the brace's. Getting that second part wrong put a marker
    // written directly above a two-line selector list out of reach.
    const bodyStart = (opener.index ?? 0) + opener[0].length;
    const brace = expanded.at[bodyStart - 1];
    const leading = opener[1].length - opener[1].trimStart().length;
    const first = expanded.at[(opener.index ?? 0) + leading];
    const marked = (): boolean => markedAbove(rawLines, lineOf(first)) || markedLoop(first);

    // The backstop behind every loop reading above. A modifier still spelled
    // as an interpolation once unrolling is done names members nobody bound —
    // a loop whose header this never matched, a variable past the second, a
    // spelling `bind()` does not know — and masking would turn it into
    // `--_____`, which names no state and so was never judged at all. Each of
    // those three passed green before this existed.
    const written = expanded.text.slice(opener.index ?? 0, (opener.index ?? 0) + opener[1].length);
    const names = [...written.matchAll(/--[\w-]*#\{\s*\$([\w-]+)/g)].map(match => match[1]);
    if (names.length > 0) {
      const reported = [...blocked].some(([start, loop]) => start < first && first < loop.close);
      if (!reported && !marked()) {
        unread.set(lineOf(brace), { file, line: lineOf(brace), header: selector, variables: [...new Set(names)] });
      }
      continue;
    }

    if (!MODIFIER.test(withoutNegations(selector))) continue;

    // A nested `&::before` / `&::after` that declares `content` is a box this
    // modifier BRINGS INTO BEING — a bar, a tick, a dot that is not on the
    // element otherwise. That is the modifier's own channel and not something
    // "elsewhere", so it clears the block rather than needing a marker to
    // point at it. A nested DESCENDANT rule is the opposite case and still
    // does not count: `&--active &__icon` restyles something that is there
    // either way.
    if (createsPseudoElement(text, bodyStart)) continue;
    const declarations = ownDeclarations(text, bodyStart).filter(({ name }) => !PAINTS_NOTHING.test(name));
    if (declarations.some(declaration => !isColour(declaration))) continue;
    const painted =
      declarations.length > 0
        ? declarations
        : reachedDeclarations(text, bodyStart).filter(declaration => !PAINTS_NOTHING.test(declaration.name) && isColour(declaration));
    if (painted.length === 0 || marked()) continue;

    const line = lineOf(brace);
    const finding = found.get(line) ?? {
      file,
      line,
      loop: innermostLoop(first),
      selectors: new Set<string>(),
      properties: new Set<string>(),
    };
    finding.selectors.add(selector);
    for (const { name } of painted) finding.properties.add(name);
    found.set(line, finding);
  }

  return { found: [...found.values()], unread: [...unread.values()] };
}

function check(): { found: Finding[]; unread: UnreadLoop[] } {
  const lists = loopLists(LOOP_LIST_ROOTS);
  const found: Finding[] = [];
  const unread: UnreadLoop[] = [];
  for (const file of scssFiles(LIB)) {
    const judged = judge(relative(ROOT, file), readFileSync(file, 'utf8'), lists);
    found.push(...judged.found);
    unread.push(...judged.unread);
  }
  return { found, unread };
}

/**
 * Stylesheets this gate once passed green, each with what it must report.
 *
 * Every entry is a reading that was missing, and each passed silently rather
 * than failing, because a rule the walk never reaches prints nothing. A tree
 * that happens to contain none of these shapes cannot prove the gate would see
 * the next one, so the gate proves it on itself before it judges the tree, and
 * a change that loses one of these readings fails `pnpm lint` naming it.
 * `found` counts findings (one per rule, whatever it unrolls to), `unread` the
 * loops and modifiers it cannot name. The lists a fixture declares go through
 * the same `listsIn()` the tree's do.
 */
const SELF_TEST: readonly { readonly why: string; readonly scss: string; readonly found: number; readonly unread: number }[] = [
  {
    why: 'an inline list over several lines',
    scss: '.wr-zz { @each $name in (\n  success,\n  danger\n) { &--#{$name} { color: var(--wr-color-#{$name}); } } }',
    found: 1,
    unread: 0,
  },
  {
    why: 'a third loop variable',
    scss: '.wr-zz { @each $name, $glyph, $size in (success check 1px, danger cross 2px) { &--#{$name} { color: red; } } }',
    found: 0,
    unread: 1,
  },
  {
    why: 'a marker above a loop with a third variable',
    scss: `.wr-zz {
      // color-ok: a fixture — the marker has to reach the loop it sits above
      @each $name, $glyph, $size in (success check 1px, danger cross 2px) {
        &--#{$name} { color: red; }
      }
    }`,
    found: 0,
    unread: 0,
  },
  {
    why: 'a modifier written from a mixin argument',
    scss: '@mixin zz-state($state) { &--#{$state} { color: red; } }\n.wr-zz { @include zz-state(danger); }',
    found: 0,
    unread: 1,
  },
  {
    why: '`#{ $name }` over a list it resolves',
    scss: '.wr-zz { @each $name in theme.$colors { &--#{ $name } { color: var(--wr-color-#{$name}); } } }',
    found: 1,
    unread: 0,
  },
  {
    why: '`#{ $name }` over a list it cannot resolve',
    scss: '.wr-zz { @each $name in map.keys(theme.$base-colors) { &--#{ $name } { color: red; } } }',
    found: 0,
    unread: 1,
  },
  {
    why: 'a map of maps, which used to resolve to the wrong names',
    scss: '$zz-states: (\n  idle: (\n    bg: gray,\n  ),\n  danger: (\n    bg: red,\n  ),\n);\n.wr-zz { @each $state, $spec in $zz-states { &--#{$state} { color: map.get($spec, bg); } } }',
    found: 0,
    unread: 1,
  },
  {
    why: 'a quoted key, which used to drop that member',
    scss: "$zz-list: (success: x, 'danger': y);\n.wr-zz { @each $state, $v in $zz-list { &--#{$state} { color: red; } } }",
    found: 0,
    unread: 1,
  },
  {
    why: 'a colour inside a shadow, a border shorthand, a named colour and a Sass `mix()`',
    scss: `.wr-zz {
      &--selected { --wr-zz-ring: 0 0 0 2px var(--wr-color-primary); }
      &--invalid { --wr-zz-edge: 1px solid var(--wr-color-danger); }
      &--active { --wr-zz-accent: red; }
      &--checked { --wr-zz-tint: mix(#336699, white, 20%); }
    }`,
    found: 4,
    unread: 0,
  },
  {
    why: 'declarations inside `@if` / `@else` and `@media`',
    scss: `.wr-zz {
      @each $name in theme.$colors { &--#{$name} { @if $name == light { color: var(--wr-color-dark); } @else { color: var(--wr-color-#{$name}-ink); } } }
      &--open { @media (hover: hover) { background: var(--wr-color-primary-soft); } }
    }`,
    found: 2,
    unread: 0,
  },
  {
    why: 'a `cursor` or a `transition` beside a colour',
    scss: `.wr-zz {
      &--selected { color: var(--wr-color-primary-ink); cursor: default; }
      &--active { background: red; transition: background 0.2s; }
    }`,
    found: 2,
    unread: 0,
  },
  {
    why: 'a state that only repaints its children',
    scss: '.wr-zz { &--error { > label { color: var(--wr-color-danger-ink); } .wr-input { --wr-input-border: var(--wr-color-danger); } } }',
    found: 1,
    unread: 0,
  },
  {
    why: 'geometry hooks and a dash array, which are not colour',
    scss: `.wr-zz {
      &--selected { --wr-zz-border-width: var(--wr-zz-thick); }
      &--active { --wr-zz-stroke-width: $thick; }
      &--checked { --wr-zz-size: var(--wr-zz-border-width-lg); }
      &--open { --wr-zz-stroke: 90 207; }
    }`,
    found: 0,
    unread: 0,
  },
];

function selfTest(lists: ReadonlyMap<string, LoopList>): string[] {
  return SELF_TEST.flatMap(({ why, scss, found, unread }) => {
    const judged = judge('self-test.scss', scss, new Map([...lists, ...listsIn([scss])]));
    if (judged.found.length === found && judged.unread.length === unread) return [];
    return [`${why}: expected ${found} finding(s) and ${unread} unread, got ${judged.found.length} and ${judged.unread.length}`];
  });
}

const blindSpots = selfTest(loopLists(LOOP_LIST_ROOTS));
if (blindSpots.length > 0) {
  console.error(`\n✖ check:color-only is blind to a shape it is meant to see:\n`);
  for (const spot of blindSpots) console.error(`  ${spot}`);
  console.error(`\n  A green run over the tree would mean nothing — see SELF_TEST in scripts/check-color-only.ts.\n`);
  process.exit(1);
}

const { found, unread } = check();

if (found.length > 0 || unread.length > 0) {
  const counts = [
    found.length > 0 && `${found.length} state${found.length === 1 ? '' : 's'} told apart by colour alone`,
    unread.length > 0 && `${unread.length} loop${unread.length === 1 ? '' : 's'} or modifier${unread.length === 1 ? '' : 's'} this check cannot read`,
  ].filter(Boolean);
  console.error(`\n✖ ${counts.join(', and ')}:\n`);
  for (const { file, line, loop, selectors, properties } of found) {
    const generated = loop === undefined ? '' : `  (×${selectors.size}, unrolled from the @each at line ${loop})`;
    const shown = [...selectors].slice(0, 3).join(', ') + (selectors.size > 3 ? ', …' : '');
    console.error(`  ${file}:${line}${generated}`);
    console.error(`    ${shown} → ${[...properties].join(', ')}`);
  }
  for (const { file, line, header, variables } of unread) {
    console.error(`  ${file}:${line}`);
    console.error(`    ${header} → members this check cannot name, written as ${variables.map(v => `\`--#{$${v}}\``).join(' and ')}`);
  }
  console.error(`
  Six of the nine intents sit inside a 1.06:1 band of relative luminance, and
  \`success\` against \`danger\` is 1.004:1 — the same grey. A modifier whose only
  declarations are colour is invisible to a reader with red-green colour
  blindness, and no gate but this one can see it: axe ships no WCAG 1.4.1 rule.

  Give the state a channel that is not hue — a glyph, a label, a weight, a
  border STYLE, an opacity ramp, a position. \`wr-statistic\` draws two different
  triangles; \`wr-calendar-heatmap\` ramps opacity over one hue.

  Or, if colour alone is right here — the cue separates in LIGHTNESS as well as
  hue, the scale is sequential, or the real channel lives in a sibling rule or
  in the template — say so above the selector:

    // color-ok: <what tells these apart besides hue>

  A rule generated by an \`@each\` takes the marker above the \`@each\`, and one
  sentence then covers every member, so it has to be true of all of them. A
  loop whose list this check cannot resolve, or a modifier interpolated from
  anything else — a mixin argument, a third loop variable — is judged the same
  way: say above it what its members are, since nothing here can name them.
`);
  process.exit(1);
}

console.log('✓ Colour — every state has a channel besides hue, or says why it needs none.');
