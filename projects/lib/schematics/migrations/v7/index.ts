/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';

/**
 * v6 → v7 migration. Replaces the 8 entry-points that were folded into
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
 *   wr-count-up-text      → <wr-count-up>
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
  ['ngwr/count-up-text', 'ngwr/count-up'],
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
