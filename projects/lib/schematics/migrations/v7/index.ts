/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';

/**
 * v6 → v7 migration. Replaces the 10 entry-points that were folded into
 * consolidator components:
 *
 *   wr-autocomplete       → <wr-select mode="search">
 *   wr-chips-input        → <wr-select mode="tag">
 *   wr-time-picker        → <wr-date-picker mode="time">
 *   wr-date-time-picker   → <wr-date-picker mode="datetime">
 *   wr-tooltip ([wrTooltip])
 *                          → <wr-popover mode="tooltip"> + [wrPopover]
 *   wr-tree-select        → <wr-tree openOn="overlay">
 *   wr-bottom-sheet       → <wr-drawer position="bottom">
 *   wr-count-up-text      → <wr-count-up> (entry: ngwr/counter)
 *   ngwr/count-up         → ngwr/counter (entry merged; tag unchanged)
 *   ngwr/tag              → ngwr/badge   (entry merged; tag unchanged)
 *   wr-animated-text      → per mode: <wr-typewriter> (typewriter),
 *                            <wr-decrypt-text> (scramble),
 *                            <wr-split-text> (split)
 *
 * Touches every `.html`, `.ts`, and `.scss` file in the workspace
 * (excluding `node_modules`, `dist`, `.git`, `coverage`).
 *
 * Regex-based on purpose — the symbol / tag names are distinctive enough
 * to be safe, and this keeps the migration dependency-free (no @angular
 * compiler import needed).
 */

interface Transform {
  readonly pattern: RegExp;
  readonly replacement: string | ((match: string, ...groups: string[]) => string);
}

const HTML_TRANSFORMS: readonly Transform[] = [
  // wr-autocomplete → wr-select mode="search"
  { pattern: /<wr-autocomplete(\s|>|\/)/g, replacement: '<wr-select mode="search"$1' },
  { pattern: /<\/wr-autocomplete>/g, replacement: '</wr-select>' },

  // wr-chips-input → wr-select mode="tag"
  { pattern: /<wr-chips-input(\s|>|\/)/g, replacement: '<wr-select mode="tag"$1' },
  { pattern: /<\/wr-chips-input>/g, replacement: '</wr-select>' },

  // wr-time-picker → wr-date-picker mode="time"
  { pattern: /<wr-time-picker(\s|>|\/)/g, replacement: '<wr-date-picker mode="time"$1' },
  { pattern: /<\/wr-time-picker>/g, replacement: '</wr-date-picker>' },

  // wr-date-time-picker → wr-date-picker mode="datetime"
  { pattern: /<wr-date-time-picker(\s|>|\/)/g, replacement: '<wr-date-picker mode="datetime"$1' },
  { pattern: /<\/wr-date-time-picker>/g, replacement: '</wr-date-picker>' },

  // [wrTooltip] directive → [wrPopover] + mode="tooltip"
  { pattern: /\[wrTooltip\]="([^"]+)"/g, replacement: '[wrPopover]="$1" mode="tooltip"' },
  { pattern: /\[wrTooltip\]='([^']+)'/g, replacement: '[wrPopover]=\'$1\' mode="tooltip"' },
  // String literal form: wrTooltip="some text"  →  [wrPopover]="'some text'" mode="tooltip"
  // (Plain string attr is rare; covered as a best-effort.)
  { pattern: /\bwrTooltip="([^"]+)"/g, replacement: `[wrPopover]="'$1'" mode="tooltip"` },

  // wr-tree-select → wr-tree openOn="overlay"
  { pattern: /<wr-tree-select(\s|>|\/)/g, replacement: '<wr-tree openOn="overlay"$1' },
  { pattern: /<\/wr-tree-select>/g, replacement: '</wr-tree>' },

  // wr-bottom-sheet → wr-drawer position="bottom"
  { pattern: /<wr-bottom-sheet(\s|>|\/)/g, replacement: '<wr-drawer position="bottom"$1' },
  { pattern: /<\/wr-bottom-sheet>/g, replacement: '</wr-drawer>' },

  // wr-count-up-text → wr-count-up (just a rename — same surface)
  { pattern: /<wr-count-up-text(\s|>|\/)/g, replacement: '<wr-count-up$1' },
  { pattern: /<\/wr-count-up-text>/g, replacement: '</wr-count-up>' },

  // wr-image → wr-lightbox (rename — same surface)
  { pattern: /<wr-image(\s|>|\/)/g, replacement: '<wr-lightbox$1' },
  { pattern: /<\/wr-image>/g, replacement: '</wr-lightbox>' },

  // wr-animated-text → mode-specific target. Handles the self-closing and
  // empty-pair element forms (the component never projected content). The
  // attribute form (`<h1 wr-animated-text …>`) has no 1:1 target and is
  // left for manual migration; a bound `[mode]` falls back to typewriter.
  {
    pattern: /<wr-animated-text\b([^>]*?)\s*(\/>|>\s*<\/wr-animated-text>)/g,
    replacement: (_match: string, attrs: string): string => {
      const mode = /\bmode\s*=\s*"(\w+)"/.exec(attrs)?.[1] ?? 'typewriter';
      const tag = mode === 'split' ? 'wr-split-text' : mode === 'scramble' ? 'wr-decrypt-text' : 'wr-typewriter';
      let rest = attrs.replace(/\s*\[?mode\]?\s*=\s*"[^"]*"/, '');
      // Inputs that changed names downstream — `loop` carries over only
      // to the typewriter; elsewhere it had no equivalent and is dropped.
      if (tag === 'wr-typewriter') {
        rest = rest
          .replace(/(\s)speed=/, '$1typingSpeed=')
          .replace(/(\s)\[speed\]=/, '$1[typingSpeed]=')
          .replace(/(\s)startDelay=/, '$1initialDelay=')
          .replace(/(\s)\[startDelay\]=/, '$1[initialDelay]=');
      } else {
        rest = rest.replace(/\s*\[?loop\]?(=\s*"[^"]*")?(?=\s|$)/, '').replace(/\s*\[?startDelay\]?\s*=\s*"[^"]*"/, '');
        if (tag === 'wr-split-text') {
          rest = rest.replace(/(\s)speed=/, '$1delay=').replace(/(\s)\[speed\]=/, '$1[delay]=');
        }
      }
      return `<${tag}${rest.replace(/\s+$/, '')} />`;
    },
  },
];

/** TS imports: module-path rewrites + symbol renames. */
const MODULE_RENAMES: ReadonlyMap<string, string> = new Map([
  ['ngwr/autocomplete', 'ngwr/select'],
  ['ngwr/chips-input', 'ngwr/select'],
  ['ngwr/time-picker', 'ngwr/date-picker'],
  ['ngwr/date-time-picker', 'ngwr/date-picker'],
  ['ngwr/tooltip', 'ngwr/popover'],
  ['ngwr/tree-select', 'ngwr/tree'],
  ['ngwr/bottom-sheet', 'ngwr/drawer'],
  ['ngwr/count-up-text', 'ngwr/counter'],
  ['ngwr/count-up', 'ngwr/counter'],
  ['ngwr/tag', 'ngwr/badge'],
  ['ngwr/image', 'ngwr/lightbox'],
  // Best-effort: typewriter was animated-text's default mode. Scramble /
  // split users need ngwr/decrypt-text / ngwr/split-text instead — the
  // HTML transform above already points the template at the right tag.
  ['ngwr/animated-text', 'ngwr/typewriter'],
]);

const SYMBOL_RENAMES: ReadonlyMap<string, string> = new Map([
  ['WrAutocomplete', 'WrSelect'],
  ['WrChipsInput', 'WrSelect'],
  ['WrTimePicker', 'WrDatePicker'],
  ['WrDateTimePicker', 'WrDatePicker'],
  ['WrTooltip', 'WrPopover'],
  ['WrTreeSelect', 'WrTree'],
  ['WrBottomSheet', 'WrDrawer'],
  ['WrCountUpText', 'WrCountUp'],
  ['WrImage', 'WrLightbox'],
  ['WrAnimatedText', 'WrTypewriter'],
]);

/** SCSS subpath imports — `@use 'ngwr/X';` and `@import 'ngwr/X';` forms. */
const SCSS_RENAMES = MODULE_RENAMES;

const IGNORE_DIRS = new Set(['node_modules', 'dist', '.git', '.cache', '.angular', 'coverage', '.next', '.nuxt']);

function ngUpdateV7(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const summary = { html: 0, ts: 0, scss: 0 };
    visit(tree, '/', filePath => {
      const lower = filePath.toLowerCase();
      const isHtml = lower.endsWith('.html');
      const isTs = lower.endsWith('.ts');
      const isScss = lower.endsWith('.scss') || lower.endsWith('.sass') || lower.endsWith('.css');

      if (!isHtml && !isTs && !isScss) return;

      const original = tree.readText(filePath);
      let next = original;

      if (isHtml) next = applyHtml(next);
      if (isTs) next = applyTs(next);
      if (isScss) next = applyScss(next);

      if (next !== original) {
        tree.overwrite(filePath, next);
        if (isHtml) summary.html += 1;
        if (isTs) summary.ts += 1;
        if (isScss) summary.scss += 1;
      }
    });

    context.logger.info(
      `ngwr v7 migration: rewrote ${summary.html} .html, ${summary.ts} .ts, ${summary.scss} stylesheet file(s).`
    );
    context.logger.info(
      'Verify the result with `git diff` — a few edge cases (e.g. tooltip directives applied via host bindings) may need manual touch-up.'
    );
    return tree;
  };
}

function applyHtml(content: string): string {
  let next = content;
  for (const { pattern, replacement } of HTML_TRANSFORMS) {
    next = typeof replacement === 'string' ? next.replace(pattern, replacement) : next.replace(pattern, replacement);
  }
  return next;
}

function applyTs(content: string): string {
  let next = content;

  // Module path strings — handle both single and double quoted.
  for (const [from, to] of MODULE_RENAMES) {
    next = next
      .replace(new RegExp(`(['"])${escapeRegExp(from)}\\1`, 'g'), `$1${to}$1`)
      .replace(new RegExp(`(\`)${escapeRegExp(from)}(\`)`, 'g'), `\`${to}\``);
  }

  // Symbol renames — word-boundary safe.
  for (const [from, to] of SYMBOL_RENAMES) {
    next = next.replace(new RegExp(`\\b${from}\\b`, 'g'), to);
  }

  return next;
}

function applyScss(content: string): string {
  let next = content;
  for (const [from, to] of SCSS_RENAMES) {
    // Match `@use 'ngwr/X';`, `@use "ngwr/X";`, `@import 'ngwr/X';`, etc.
    const escFrom = escapeRegExp(from);
    next = next.replace(new RegExp(`(@(?:use|import|forward)\\s+)(['"])${escFrom}\\2`, 'g'), `$1$2${to}$2`);
  }
  return next;
}

function visit(tree: Tree, dir: string, visitor: (filePath: string) => void): void {
  const entry = tree.getDir(dir);
  for (const file of entry.subfiles) {
    visitor(`${dir === '/' ? '' : dir}/${file}`);
  }
  for (const sub of entry.subdirs) {
    if (IGNORE_DIRS.has(sub)) continue;
    visit(tree, `${dir === '/' ? '' : dir}/${sub}`, visitor);
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default ngUpdateV7;
