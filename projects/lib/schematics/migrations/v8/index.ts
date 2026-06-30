/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';

/**
 * v7 → v8 migration. Two kinds of change:
 *
 * Auto-fixed (safe, scoped regexes):
 *   density:    compact | default | comfortable  →  sm | md | lg   (`touch` unchanged)
 *               — `wrDensity="…"`, `[wrDensity]="'…'"`, `provideWrDensity({ defaultDensity })`,
 *                 and the `[data-wr-density='…']` selector in templates + stylesheets.
 *   pagination: `<wr-pagination size="xs|xl">`  →  `size="sm|lg"`
 *
 * Warned only — removed with no 1:1 replacement, so the migration NEVER
 * silently drops your markup; it lists the files for you to handle by hand:
 *   - `WrReveal` directive (`wrReveal`, `ngwr/directives`) — deleted. Remove the
 *     directive + its `[threshold]`/`[rootMargin]`/`[once]`/`[root]` inputs.
 *   - `WrScrambleText` (`<wr-scramble-text>`, `ngwr/scramble-text`) — deleted.
 *     Swap to another motion-text component (e.g. `<wr-decrypt-text>`) or plain text.
 *
 * Regex-based + dependency-free, matching the v7 migration. Verify with
 * `git diff` afterwards.
 */

interface Transform {
  readonly pattern: RegExp;
  readonly replacement: string;
}

/** compact|default|comfortable → sm|md|lg. `touch` is unchanged. */
const DENSITY_MAP: readonly (readonly [string, string])[] = [
  ['compact', 'sm'],
  ['default', 'md'],
  ['comfortable', 'lg'],
];

const HTML_TRANSFORMS: readonly Transform[] = [
  // density — directive attribute, string form: wrDensity="compact" → "sm"
  ...DENSITY_MAP.map(([from, to]): Transform => ({
    pattern: new RegExp(`(\\bwrDensity=")${from}(")`, 'g'),
    replacement: `$1${to}$2`,
  })),
  // density — directive attribute, bound literal: [wrDensity]="'compact'" → "'sm'"
  ...DENSITY_MAP.map(([from, to]): Transform => ({
    pattern: new RegExp(`(\\[wrDensity\\]=")'${from}'(")`, 'g'),
    replacement: `$1'${to}'$2`,
  })),
  // density — selector form in templates: [data-wr-density='compact'] → 'sm'
  ...DENSITY_MAP.map(([from, to]): Transform => ({
    pattern: new RegExp(`(data-wr-density=')${from}(')`, 'g'),
    replacement: `$1${to}$2`,
  })),
  // pagination size — scoped to the element so other `size="xs"` attrs are untouched
  { pattern: /(<wr-pagination\b[^>]*?\ssize=")xs(")/g, replacement: '$1sm$2' },
  { pattern: /(<wr-pagination\b[^>]*?\ssize=")xl(")/g, replacement: '$1lg$2' },
];

const TS_TRANSFORMS: readonly Transform[] = [
  // density — provideWrDensity({ defaultDensity: 'compact' }) → 'sm'
  ...DENSITY_MAP.map(([from, to]): Transform => ({
    pattern: new RegExp(`(defaultDensity:\\s*['"])${from}(['"])`, 'g'),
    replacement: `$1${to}$2`,
  })),
];

const SCSS_TRANSFORMS: readonly Transform[] = [
  // density — [data-wr-density='compact'] selector in stylesheets → 'sm'
  ...DENSITY_MAP.map(([from, to]): Transform => ({
    pattern: new RegExp(`(data-wr-density=')${from}(')`, 'g'),
    replacement: `$1${to}$2`,
  })),
];

/** Removed APIs to flag for manual migration (no safe automatic rewrite). */
const REMOVED_MARKERS: readonly { readonly probe: RegExp; readonly note: string }[] = [
  {
    probe: /\bwrReveal\b/,
    note: 'WrReveal directive removed — drop `wrReveal` + its [threshold]/[rootMargin]/[once]/[root] inputs',
  },
  {
    probe: /<wr-scramble-text\b|\bWrScrambleText\b|ngwr\/scramble-text/,
    note: 'WrScrambleText removed — use <wr-decrypt-text> or plain text',
  },
];

const IGNORE_DIRS = new Set(['node_modules', 'dist', '.git', '.cache', '.angular', 'coverage', '.next', '.nuxt']);

function ngUpdateV8(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const summary = { html: 0, ts: 0, scss: 0 };
    const warnings: string[] = [];

    visit(tree, '/', filePath => {
      const lower = filePath.toLowerCase();
      const isHtml = lower.endsWith('.html');
      const isTs = lower.endsWith('.ts');
      const isScss = lower.endsWith('.scss') || lower.endsWith('.sass') || lower.endsWith('.css');

      if (!isHtml && !isTs && !isScss) return;

      const original = tree.readText(filePath);
      let next = original;

      if (isHtml) next = apply(next, HTML_TRANSFORMS);
      if (isTs) next = apply(next, TS_TRANSFORMS);
      if (isScss) next = apply(next, SCSS_TRANSFORMS);

      if (next !== original) {
        tree.overwrite(filePath, next);
        if (isHtml) summary.html += 1;
        if (isTs) summary.ts += 1;
        if (isScss) summary.scss += 1;
      }

      // Flag removed APIs (against the original — auto-fixes above don't touch them).
      for (const { probe, note } of REMOVED_MARKERS) {
        if (probe.test(original)) warnings.push(`  ${filePath} — ${note}`);
      }
    });

    context.logger.info(
      `ngwr v8 migration: rewrote ${summary.html} .html, ${summary.ts} .ts, ${summary.scss} stylesheet file(s) ` +
        '(density compact/default/comfortable → sm/md/lg; pagination size xs/xl → sm/lg).'
    );

    if (warnings.length > 0) {
      context.logger.warn(
        `\nngwr v8: ${warnings.length} usage(s) of REMOVED APIs need manual migration:\n${warnings.join('\n')}\n`
      );
    }

    context.logger.info('Verify the result with `git diff` — a few edge cases may need manual touch-up.');
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

export default ngUpdateV8;
