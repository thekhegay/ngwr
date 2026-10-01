/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';

/**
 * v14 to v15 migration. Split down the middle of the usual rule, and the split
 * falls in an unusual place: the TOKENS are rewritten and the INTENTS are not,
 * even though one change removed both.
 *
 * v15 cut the palette from nine intents to five. `secondary`, `light`, `medium`
 * and `dark` are gone, and what replaced the last three is a six-step neutral
 * gray ramp (`--wr-color-gray-1` … `-6`) read through role aliases that name the
 * JOB rather than a colour — `--wr-color-surface`, `-on-surface`,
 * `-on-surface-muted`, `-outline`, `-hover`, `-fill`, `-fill-subtle`,
 * `-fill-strong`, `-placeholder`.
 *
 * **It REWRITES the token renames**, because for three of the four families the
 * successor is not merely equivalent, it is the SAME VALUE in both themes:
 * `--wr-color-light` was `#cbd5e1` / `#262f44` and `--wr-color-outline` is
 * `#cbd5e1` / `#262f44`; `--wr-color-dark` was `#0f172a` / `#e6ebf3` and
 * `--wr-color-on-surface` is `#0f172a` / `#e6ebf3`. A stylesheet rewritten this
 * way paints identically to the pixel. `medium` is the one that moves, by a
 * step, and it is rewritten anyway for the reason below.
 *
 * **Why rewriting these is not optional.** A `var()` at a name nothing declares
 * is invalid at computed-value time, so the browser drops the WHOLE declaration
 * holding it. `border: 1px solid var(--wr-color-light)` does not fall back to a
 * default border — it draws no border at all, and `background: var(…)` paints
 * nothing. There is no error in the build, none in the console, and none in a
 * test: a dropped declaration is indistinguishable from a rule nobody wrote.
 * This library's own docs site carried 220 of them across 71 files with all nine
 * gates green, which is what `check:tokens` grew a second pass to catch. An app
 * that upgrades without this rule gets the same silence.
 *
 * **It REPORTS every use of a removed INTENT**, and refuses to guess:
 *
 * - **`secondary` has no successor at all.** It was a second brand colour
 *   (`#e21a62`, magenta) and v15 removed the idea rather than the value: a
 *   library cannot know what an app's second brand colour is for. Whether a
 *   `color="secondary"` should become `primary`, `danger`, `info` or a
 *   `--wr-color-*` the app declares itself is a decision only its author can
 *   make.
 * - **`light`, `medium` and `dark` AS INTENTS were fills**, and what replaced
 *   them is a set of roles. `<wr-btn color="dark">` was a near-black slab with
 *   near-white text; the neutral button — `<wr-btn>` with no `color` at all — is
 *   the page surface with a hairline. Those are different buttons, so dropping
 *   the attribute is a visual change the author has to want. The same holds for
 *   `<wr-tag>`, `<wr-badge>`, `<wr-progress>` and every other component whose
 *   `color` takes `WrColor`.
 *
 * How a leftover FAILS decides how loudly this has to speak, and the two halves
 * fail in opposite directions. An app with `strictTemplates` (the Angular CLI
 * default) gets a compile error on a static `color="secondary"` — `TS2322: Type
 * '"secondary"' is not assignable to type '"primary" | "success" | "warning" |
 * "danger" | "info"'` — so that half cannot ship unnoticed. An app WITHOUT it
 * binds the string, the component writes `wr-btn--secondary`, no rule matches,
 * and the button renders neutral with nothing said. The report is for the second
 * app, and for the first it is a map of the errors it is about to see.
 *
 * A CSS selector keyed on one of those classes is the same silence again, in a
 * place no compiler looks: `.wr-btn--secondary { … }` in a consumer stylesheet
 * simply stops matching. That is reported too, and deliberately not rewritten —
 * it is the shape `migration-v13` established, where a selector that stops
 * matching is silent in CSS, in `querySelector` and in a test locator alike, and
 * the right replacement is a decision about what the author meant to select.
 *
 * One more shape fails loudly and is reported so the message is not a puzzle: a
 * compile-time rebrand, `@use 'ngwr/theme' with ($base-colors: (…))`, whose map
 * still carries a removed key. `derived()` `@error`s on an intent the token set
 * has no room for, so the Sass build stops with the key named — but the error
 * says nothing about where the key went.
 */

const IGNORE_DIRS = new Set(['node_modules', 'dist', '.git', '.cache', '.angular', 'coverage', '.next', '.nuxt']);

interface Transform {
  readonly pattern: RegExp;
  readonly replacement: string;
}

/** The intents v15 removed, for every detector below. */
const REMOVED = ['secondary', 'light', 'medium', 'dark'] as const;

/**
 * Deleted token to successor, longest name first.
 *
 * ORDER IS LOAD-BEARING. `--wr-color-light-rgb` has to be rewritten before
 * `--wr-color-light`, or the shorter rule matches its prefix and leaves
 * `--wr-color-outline-rgb` spelled as `--wr-color-outline` followed by a
 * stranded `-rgb`. Each pattern also ends in a negative lookahead for `[\w-]`,
 * so `--wr-color-light` cannot match inside `--wr-color-light-lighter` even
 * when the order is right — belt and braces, because the family below is
 * exactly the kind of list someone appends to without re-sorting.
 */
const TOKEN_RENAMES: readonly (readonly [string, string])[] = [
  ['--wr-color-muted-text-rgb', '--wr-color-on-surface-muted-rgb'],
  ['--wr-color-muted-text', '--wr-color-on-surface-muted'],
  ['--wr-color-light-rgb', '--wr-color-outline-rgb'],
  ['--wr-color-light', '--wr-color-outline'],
  ['--wr-color-dark-rgb', '--wr-color-on-surface-rgb'],
  ['--wr-color-dark', '--wr-color-on-surface'],
  ['--wr-color-medium-rgb', '--wr-color-on-surface-muted-rgb'],
  ['--wr-color-medium', '--wr-color-on-surface-muted'],
];

/**
 * The sortable list got its own entry point.
 *
 * `ngwr/drag-drop` named a whole interaction while holding one component, and
 * drag and drop is the broader idea — so the namespace is wanted for it and
 * `WrSortableList` took a name of its own. Every symbol keeps its name, which
 * is what makes this a codemod rather than a release note: a path is what a
 * rewrite moves without reading the code around it, the same shape v12's
 * date-adapter move had.
 *
 * Both specifiers, because the entry point ships styles: a TypeScript import
 * and the `@use 'ngwr/drag-drop'` a consumer writes for them. The trailing
 * group keeps it off `@angular/cdk/drag-drop`, which is a different package
 * and stays where it is.
 */
const ENTRY_POINT_TRANSFORMS: readonly Transform[] = [
  { pattern: /(['"])ngwr\/drag-drop(['"/])/g, replacement: '$1ngwr/sortable-list$2' },
];

const TOKEN_TRANSFORMS: readonly Transform[] = TOKEN_RENAMES.map(([from, to]) => ({
  pattern: new RegExp(`${from.replace(/-/g, '-')}(?![\\w-])`, 'g'),
  replacement: to,
}));

/**
 * What an open tag may hold between its name and the attribute a rule is after:
 * a quoted value consumed only as a PAIR, or any one character that is neither
 * a quote nor `>`.
 *
 * Copied from `migration-v14`, and the reason is worth restating rather than
 * cross-referencing. The ambiguous spelling, `[^>]*?`, gets two things wrong at
 * once. It MISSES, because a `>` inside a binding such as
 * `[disabled]="n > 0"` looks like the end of the tag, and a leftover here is
 * silent: a `tone="dark"` that matches no value renders untoned with no error.
 * And it HANGS, because the fallback also matches a quote, so a pairing that
 * starts at a closing quote runs past `/>` into later elements, with
 * exponentially many parses in the number of quotes that follow. That froze
 * `ng update ngwr@14` on ordinary templates in every 14.x release up to 14.5.0.
 */
const IN_TAG = String.raw`(?:"[^"]*"|'[^']*'|[^>"'])*?`;

/**
 * Two value renames the removed intents left behind, and these ARE rewritten
 * where a `color` is not, because here the new form means what the old one
 * meant in the same place.
 *
 * Both values were named after an intent and never painted one. `<wr-typography
 * tone="dark">` always resolved to `--wr-color-on-surface` and `tone="medium"`
 * to `-on-surface-muted`, the two neutral ROLES; `<wr-timeline-item
 * color="medium">` always drew the hollow ring, which is the quiet dot rather
 * than a filled intent. v15 moved each name onto what the value does, so the
 * replacement is exact and nothing an app knows is needed to pick it.
 *
 * Scoped to the element, unlike the intent DETECTOR below, and for the opposite
 * reason: `tone` and `color` carrying these words mean something else on
 * anything that is not these two. The anchor is `(?![-\w])` rather than `\b`,
 * so `<wr-timeline-item>` cannot be matched by a rule written for
 * `<wr-timeline>`.
 */
const TYPO = String.raw`\swrTypography(?![-\w])`;
const TIMELINE_ITEM = String.raw`<wr-timeline-item(?![-\w])`;

const VALUE_RENAMES: readonly Transform[] = [
  // `[wrTypography]` is a directive on any element, so the anchor is the
  // attribute rather than a tag, and the two attribute orders are both real
  // markup, hence two rules per value.
  { pattern: new RegExp(String.raw`(${TYPO}${IN_TAG}\stone=")dark(")`, 'g'), replacement: '$1base$2' },
  { pattern: new RegExp(String.raw`(${TYPO}${IN_TAG}\stone=")medium(")`, 'g'), replacement: '$1muted$2' },
  { pattern: new RegExp(String.raw`(\stone=")dark("${IN_TAG}${TYPO})`, 'g'), replacement: '$1base$2' },
  { pattern: new RegExp(String.raw`(\stone=")medium("${IN_TAG}${TYPO})`, 'g'), replacement: '$1muted$2' },
  {
    pattern: new RegExp(String.raw`(${TIMELINE_ITEM}${IN_TAG}\scolor=")medium(")`, 'g'),
    replacement: '$1neutral$2',
  },
];

/**
 * The BEM classes those two values emit. Public API here, so a consumer
 * stylesheet or test locator keyed on one has to move with the component, and
 * the name is unambiguous enough to rewrite anywhere.
 */
const CLASS_RENAMES: readonly Transform[] = [
  { pattern: /\bwr-typography--tone-dark\b/g, replacement: 'wr-typography--tone-base' },
  { pattern: /\bwr-typography--tone-medium\b/g, replacement: 'wr-typography--tone-muted' },
  { pattern: /\bwr-timeline-item--medium\b/g, replacement: 'wr-timeline-item--neutral' },
];

/**
 * A shade of a removed intent, which has no successor and must not be guessed
 * at. `--wr-color-light-lighter` was `color.adjust(#cbd5e1, +5%)`; no role
 * resolves to it, and the nearest — `--wr-color-fill-subtle` or `-outline` —
 * depends on whether the rule paints a surface or a line.
 */
const ORPHAN_SHADE = new RegExp(
  String.raw`--wr-color-(?:${REMOVED.join('|')})-(?:light|lighter|dark|darker|contrast|soft|soft-border|soft-contrast|active|ink)(?![\w-])`
);

/** Anything at all in the `secondary` family — no part of it has a successor. */
const SECONDARY_TOKEN = /--wr-color-secondary(?![\w-])|--wr-color-secondary-[\w-]+/;

/**
 * A `color` attribute naming a removed intent, anywhere in any open tag.
 *
 * Deliberately NOT anchored to an element, and that is the opposite call from
 * every rule in `migration-v14`. `color` carrying one of exactly these four
 * values is ngwr's vocabulary and nobody else's, and the alternative is a list
 * of every component that takes a `WrColor` — `wr-btn`, `wr-tag`, `wr-badge`,
 * `wr-alert`, `wr-progress`, `wr-spinner`, `wr-skeleton`, `wr-avatar`,
 * `wr-timeline-item`, and the attribute forms `button[wr-btn]` and `a[wr-btn]`
 * besides — which is a list that is wrong the moment the catalog grows. A report
 * that over-names is recoverable; one that silently misses the component someone
 * actually used is not.
 *
 * The two VALUE renames above are the opposite call, and they are element
 * scoped for the opposite reason: `tone` and `color` carrying those words mean
 * something else on anything that is not those two. Being element scoped is
 * what makes them step over a tag, which is why `IN_TAG` exists here at all.
 */
const REMOVED_INTENT_ATTR = new RegExp(String.raw`\s\[?color\]?\s*=\s*["']\s*'?(?:${REMOVED.join('|')})'?\s*["']`);

/** A BEM class for a removed intent, in a stylesheet or a test locator. */
const REMOVED_INTENT_CLASS = new RegExp(String.raw`\.?wr-[\w-]+--(?:${REMOVED.join('|')})(?![\w-])`);

/**
 * A `<wr-sortable-list>` still rendering its row through an `<ng-template>`.
 *
 * Reported rather than rewritten, and this is the clearest case of the rule in
 * the file: turning the template into a loop needs the name of the array and a
 * track expression, and only the author knows both. The template's context
 * variables (`let-row`, `let-i="index"`) also become ordinary bindings in the
 * caller's own `@for`, which is a rewrite of the row's body rather than of its
 * wrapper.
 *
 * It fails loudly — `contentChild.required(TemplateRef)` is gone, so the
 * template is simply never rendered and the list comes up empty — but an empty
 * list reads as "no data" rather than as a migration step, which is why it is
 * worth naming the files.
 */
const SORTABLE_TEMPLATE = new RegExp(String.raw`<wr-sortable-list(?![-\w])[\s\S]*?<ng-template`);

/**
 * The `ngwr/squircle` entry point, in any of the shapes an app holds it by.
 *
 * REPORTED, never rewritten, and the native route is not a successor in the
 * sense the rewrite rule means. `corner-shape: squircle` is a different thing:
 * it is non-deterministic — a browser without it draws a plain rounded corner,
 * which is precisely why the directive existed — it is driven by a `shape`
 * input or the `smooth-br` mixin rather than by an attribute, it takes none of
 * `[radius]` / `[smoothing]` / `[borderWidth]` / `[borderColor]` / `[corners]`,
 * and `<wr-squircle>` as a standalone container has no tag to become. Rewriting
 * `wrSquircle` to `shape="squircle"` would also be wrong on every host that is
 * not an ngwr component, which is most of them.
 *
 * Unanchored, like the removed-intent detector and for the same reason: every
 * spelling here is ngwr's vocabulary and nobody else's, so nothing it can reach
 * belongs to another library.
 */
const SQUIRCLE = new RegExp(
  [
    String.raw`['"]ngwr/squircle['"]`,
    String.raw`\bwrSquircle(?![\w-])`,
    String.raw`<wr-squircle(?![-\w])`,
    String.raw`\b(?:WrSquircle|WrSquircleHost|WrSquircleCorners|WrSquircleCornerMask|squirclePath)\b`,
    String.raw`\.?wr-squircle(?:--[\w-]+)?(?![\w-])`,
    String.raw`--wr-squircle-[\w-]+`,
  ].join('|')
);

/**
 * The `ngwr/action-sheet` entry point, the same way.
 *
 * REPORTED because there is nothing to rewrite it to: an action sheet was a
 * thin preset over `<wr-drawer>` — bottom position, rounded corners, a grab
 * handle — and two of those three are gone with it. A `<wr-drawer position=
 * "bottom" rounded>` carrying the app's own rows is the shape that replaces it,
 * and the rows, their roles, their order and the cancel group are markup only
 * the app can write.
 *
 * How a leftover fails splits the same way the intent half does: a
 * `<wr-action-sheet>` in a template is NG8001 under `strictTemplates` and an
 * inert unknown element without it, an import is a build error, and a
 * `.wr-action-sheet` selector in a stylesheet or a locator simply stops
 * matching, silently.
 */
const ACTION_SHEET = new RegExp(
  [
    String.raw`['"]ngwr/action-sheet(?:/testing)?['"]`,
    String.raw`<wr-action-sheet(?![-\w])`,
    String.raw`\bWrActionSheet[\w]*\b`,
    String.raw`\.?wr-action-sheet(?:__[\w-]+)?(?:--[\w-]+)?(?![\w-])`,
  ].join('|')
);

/**
 * `<wr-drawer showHandle>` — the grab handle and the swipe-to-dismiss gesture
 * it gated, both removed in v15 for the reason the action sheet was.
 *
 * ANCHORED to the element, which is the opposite of the call the intent
 * detector makes two constants up, and the difference is not stylistic:
 * `showHandle` is a live public input on `<wr-compare>` (default `true`) and an
 * internal computed on `wr-textarea`, so the unanchored shape would name files
 * that need no change and invite someone to delete correct markup.
 *
 * Reported rather than rewritten even though stripping the attribute is
 * mechanical, because stripping it does not preserve meaning — the drawer loses
 * a dismissal the author chose, and whether that wants a visible close button
 * in its place is theirs to decide. A bound `[showHandle]` is an NG8002 they
 * cannot miss; a bare `showHandle` is inert and silent, and the silent one is
 * the shape the report exists for.
 */
const DRAWER_HANDLE = new RegExp(String.raw`<wr-drawer(?![-\w])${IN_TAG}\s\[?showHandle\]?(?![-\w])`);

/**
 * The handle's BEM classes in a consumer stylesheet or a test locator. Public
 * API here, and a selector that stops matching is silent in CSS, in
 * `querySelector` and in a locator alike — the case `migration-v13` established
 * and `REMOVED_INTENT_CLASS` repeats.
 */
const DRAWER_HANDLE_CLASS = /\.?wr-drawer__(?:handle|grabber)(?![\w-])|\.?wr-drawer__panel--handle(?![\w-])/;

/** `$base-colors:` configured with a key v15 removed. */
const BASE_COLORS_KEY = new RegExp(String.raw`\$base-colors\s*:[\s\S]{0,400}?\b(?:${REMOVED.join('|')})\s*:`);

/** `WR_COLORS` or `WrColor` used where the narrowed union now bites. */
const WR_COLOR_LITERAL = new RegExp(String.raw`(?:WrColor|WR_COLORS)[\s\S]{0,120}?['"](?:${REMOVED.join('|')})['"]`);

function ngUpdateV15(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const intentAttrs: string[] = [];
    const intentClasses: string[] = [];
    const secondaryTokens: string[] = [];
    const orphanShades: string[] = [];
    const baseColors: string[] = [];
    const colorLiterals: string[] = [];
    const sortableTemplates: string[] = [];
    const squircles: string[] = [];
    const actionSheets: string[] = [];
    const drawerHandles: string[] = [];
    let rewritten = 0;

    visit(tree, '/', filePath => {
      const lower = filePath.toLowerCase();
      const isTs = lower.endsWith('.ts');
      const isHtml = lower.endsWith('.html');
      const isStyle = lower.endsWith('.scss') || lower.endsWith('.css');

      if (!isTs && !isHtml && !isStyle) return;

      // Read ONCE, and detect off what the user wrote rather than off what the
      // rewrite left: none of the token renames touches a token any detector
      // below reports, and relying on that silently is the coupling that breaks
      // the next time one is added.
      const content = tree.readText(filePath);

      // A token name is unambiguous in all three file kinds — a stylesheet
      // declares and reads it, a template writes it in an inline `style`, and a
      // component writes one into a signal or a class binding.
      const next = apply(content, [
        ...ENTRY_POINT_TRANSFORMS,
        ...TOKEN_TRANSFORMS,
        ...(isTs || isHtml ? VALUE_RENAMES : []),
        ...CLASS_RENAMES,
      ]);
      if (next !== content) {
        tree.overwrite(filePath, next);
        rewritten += 1;
      }

      if ((isHtml || isTs) && REMOVED_INTENT_ATTR.test(content)) intentAttrs.push(filePath);
      if (REMOVED_INTENT_CLASS.test(content)) intentClasses.push(filePath);
      if (SECONDARY_TOKEN.test(content)) secondaryTokens.push(filePath);
      if (ORPHAN_SHADE.test(content)) orphanShades.push(filePath);
      if (isStyle && BASE_COLORS_KEY.test(content)) baseColors.push(filePath);
      if (isTs && WR_COLOR_LITERAL.test(content)) colorLiterals.push(filePath);
      if ((isTs || isHtml) && SORTABLE_TEMPLATE.test(content)) sortableTemplates.push(filePath);
      if (SQUIRCLE.test(content)) squircles.push(filePath);
      if (ACTION_SHEET.test(content)) actionSheets.push(filePath);
      if ((isTs || isHtml) && DRAWER_HANDLE.test(content)) drawerHandles.push(filePath);
      else if (DRAWER_HANDLE_CLASS.test(content)) drawerHandles.push(filePath);
    });

    if (rewritten > 0) {
      context.logger.info(
        `ngwr v15 migration: rewrote ${rewritten} file(s). Neutral tokens — ` +
          '--wr-color-light to --wr-color-outline, --wr-color-dark to --wr-color-on-surface, ' +
          '--wr-color-muted-text and --wr-color-medium to --wr-color-on-surface-muted, and each ' +
          '-rgb companion with them. The first two carry the identical value in both themes, so ' +
          'those rules paint exactly as they did; --wr-color-medium moves by one step of the ' +
          'neutral ramp, because it was a FILL and the role that replaces it is calibrated as ' +
          'TEXT. The sortable list moved to an entry point of its own, from ngwr/drag-drop to ' +
          'ngwr/sortable-list, import path and @use alike, every symbol keeping its name. ' +
          'Values named after a removed intent that always painted a neutral role — ' +
          '[wrTypography] tone from dark to base and from medium to muted, <wr-timeline-item> ' +
          'color from medium to neutral, and the BEM class each of them emits.'
      );
      context.logger.info('Verify the result with `git diff` — a few edge cases may need manual touch-up.');
    }

    if (intentAttrs.length > 0) {
      context.logger.warn(
        `ngwr v15: a \`color\` naming a removed intent in ${intentAttrs.length} file(s). The palette is five ` +
          'intents now — primary, success, warning, danger, info — and secondary, light, medium and dark are ' +
          'gone. There is no mechanical replacement: secondary was a second BRAND colour, and light / medium / ' +
          'dark were neutral FILLS, where what replaced them is a set of roles. Omitting `color` gives the ' +
          'neutral variant, which is a different thing from a dark or a mid-grey slab, so choose per site. ' +
          'With strictTemplates this is a compile error (TS2322) and the list below is the one you are about ' +
          'to see; without it the string binds, no rule matches, and the component renders neutral in silence.'
      );
      for (const file of intentAttrs) context.logger.warn(`  ${file}`);
    }

    if (intentClasses.length > 0) {
      context.logger.warn(
        `ngwr v15: a \`.wr-…--secondary\` / \`--light\` / \`--medium\` / \`--dark\` class in ` +
          `${intentClasses.length} file(s). The component no longer emits it, so a stylesheet rule keyed on ` +
          'one stops matching and a test locator stops finding anything — both silently, because CSS has no ' +
          'error for a selector that matches nothing. Rewritten by hand on purpose: which class the rule ' +
          'should key on instead depends on what it was styling.'
      );
      for (const file of intentClasses) context.logger.warn(`  ${file}`);
    }

    if (secondaryTokens.length > 0) {
      context.logger.warn(
        `ngwr v15: a \`--wr-color-secondary*\` token in ${secondaryTokens.length} file(s). The whole family is ` +
          'gone and none of it has a successor — a second brand colour is not something the library can pick ' +
          'for you. A `var()` at a name nothing declares makes the declaration INVALID, so the browser drops ' +
          'it whole: a border that never draws, a background that stays transparent, and no error anywhere. ' +
          'Point each one at an intent you do have, or declare the colour yourself.'
      );
      for (const file of secondaryTokens) context.logger.warn(`  ${file}`);
    }

    if (orphanShades.length > 0) {
      context.logger.warn(
        `ngwr v15: a SHADE of a removed intent in ${orphanShades.length} file(s) — a \`-light\`, \`-lighter\`, ` +
          '`-dark`, `-darker`, `-contrast`, `-soft*`, `-active` or `-ink` hung off secondary, light, medium or ' +
          'dark. The base tokens were renamed for you because their successors carry the same value; these ' +
          'have none. Which role fits depends on the rule: a surface takes --wr-color-fill-subtle / -fill / ' +
          '-fill-strong, a line takes --wr-color-outline, text takes --wr-color-on-surface or -on-surface-muted.'
      );
      for (const file of orphanShades) context.logger.warn(`  ${file}`);
    }

    if (baseColors.length > 0) {
      context.logger.warn(
        `ngwr v15: a \`$base-colors\` configuration carrying a removed key in ${baseColors.length} file(s). ` +
          '`derived()` refuses an intent the token set has no room for, so the Sass build stops and names the ' +
          'key — drop secondary, light, medium and dark from the map. The neutrals are no longer seeded there ' +
          'at all: they are the six-step gray ramp, and each theme sets its own.'
      );
      for (const file of baseColors) context.logger.warn(`  ${file}`);
    }

    if (colorLiterals.length > 0) {
      context.logger.warn(
        `ngwr v15: a removed intent written as a \`WrColor\` literal in ${colorLiterals.length} file(s). The ` +
          'union is narrower now, so this is a type error rather than a silent one — listed here so the ' +
          'errors have a cause beside them.'
      );
      for (const file of colorLiterals) context.logger.warn(`  ${file}`);
    }

    if (sortableTemplates.length > 0) {
      context.logger.warn(
        `ngwr v15: <wr-sortable-list> with an <ng-template> row in ${sortableTemplates.length} file(s). The list no ` +
          'longer owns the loop: write your own and project one <wr-sortable-item> per row, which also gives a row ' +
          'somewhere to carry its own markup. `trackBy` is gone with the loop — the track expression is yours now. ' +
          'Not rewritten because turning a template into a loop needs the array name and a track key, and only you ' +
          'know both. The list renders nothing until you do, which looks like empty data rather than a missed step.'
      );
      for (const file of sortableTemplates) context.logger.warn(`  ${file}`);
    }

    if (squircles.length > 0) {
      context.logger.warn(
        `ngwr v15: the \`ngwr/squircle\` entry point in ${squircles.length} file(s). It is gone — the directive, ` +
          '<wr-squircle>, squirclePath and the .wr-squircle classes with it. It was deprecated in v14 and the native ' +
          'route is what replaces it: `shape="squircle"` on wr-btn / wr-avatar / wr-badge, or the `smooth-br` mixin ' +
          "from `@use 'ngwr/theme'` on anything else. Not rewritten, because the two are not the same thing — " +
          'corner-shape falls back to a plain rounded corner where a browser has not shipped it, which is the ' +
          'determinism the directive existed to give, and it takes no radius, smoothing, corners or border inputs. ' +
          'An import and an `@use` are build errors; a leftover `wrSquircle` attribute is silent, and the element ' +
          'simply renders with its ordinary border-radius.'
      );
      for (const file of squircles) context.logger.warn(`  ${file}`);
    }

    if (actionSheets.length > 0) {
      context.logger.warn(
        `ngwr v15: \`ngwr/action-sheet\` in ${actionSheets.length} file(s). The component and its test harness are ` +
          'gone: ngwr is not a mobile library, and the sheet was a thin preset over <wr-drawer> — bottom position, ' +
          'rounded corners, a grab handle — two of which v15 removed anyway. Write the drawer directly: ' +
          '<wr-drawer position="bottom" rounded> with your own rows. Not rewritten, because the rows, their roles, ' +
          'their order and the cancel group are markup only you have. With strictTemplates a leftover element is ' +
          'NG8001; without it the tag renders as nothing at all, and a `.wr-action-sheet` selector or locator stops ' +
          'matching in silence.'
      );
      for (const file of actionSheets) context.logger.warn(`  ${file}`);
    }

    if (drawerHandles.length > 0) {
      context.logger.warn(
        `ngwr v15: <wr-drawer showHandle> or a \`.wr-drawer__handle\` selector in ${drawerHandles.length} file(s). ` +
          'The grab handle and the swipe-to-dismiss it gated are gone, for the same reason the action sheet is. ' +
          'The drawer still closes on the backdrop, on Escape and through its own dismiss button (`closable`, on by ' +
          'default) — so for most drawers deleting the attribute is the whole migration. Not rewritten, because ' +
          'removing an affordance the author chose is a decision rather than a rename, and a drawer that relied on ' +
          'the swipe may want a visible close control in its place. A bound [showHandle] is NG8002; a bare one is ' +
          'inert and says nothing.'
      );
      for (const file of drawerHandles) context.logger.warn(`  ${file}`);
    }

    if (
      rewritten === 0 &&
      intentAttrs.length === 0 &&
      intentClasses.length === 0 &&
      secondaryTokens.length === 0 &&
      orphanShades.length === 0 &&
      baseColors.length === 0 &&
      colorLiterals.length === 0 &&
      sortableTemplates.length === 0 &&
      squircles.length === 0 &&
      actionSheets.length === 0 &&
      drawerHandles.length === 0
    ) {
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
