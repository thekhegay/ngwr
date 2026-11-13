import { describe, expect, it } from 'vitest';

import { COMPILE_TIMEOUT, compileSass } from '../spec-sass';

/**
 * `openOn="overlay"` renders rows in `.wr-tree-panel`, in the CDK overlay
 * container, outside the `.wr-tree` host. A row hook declared on the host alone
 * is unset there and the row loses its padding and depth indent. Read off the
 * COMPILED sheet: jsdom has no cascade.
 */
const css = compileSass(`@use 'tree/styles';`).replace(/\/\*[\s\S]*?\*\//g, '');

const ROW_HOOKS: Record<string, string> = {
  '--wr-tree-indent': '1.25rem',
  '--wr-tree-list-padding-y': 'var(--wr-space-xs)',
  '--wr-tree-row-gap': 'var(--wr-space-sm)',
  '--wr-tree-row-padding-y': 'var(--wr-space-xs)',
  '--wr-tree-row-padding-x': 'var(--wr-space-sm)',
  '--wr-tree-row-radius': 'var(--wr-border-radius-sm)',
  '--wr-tree-row-selected-font-weight': 'var(--wr-font-weight-medium)',
  '--wr-tree-toggle-radius': 'var(--wr-border-radius-sm)',
  '--wr-tree-status-color': 'var(--wr-color-on-surface-muted)',
  '--wr-tree-status-error-color': 'var(--wr-color-danger-ink)',
  '--wr-tree-retry-color': 'var(--wr-color-primary-ink)',
  '--wr-tree-match-bg': 'var(--wr-color-warning-soft)',
  '--wr-tree-match-color': 'var(--wr-color-warning-ink)',
  '--wr-tree-drop-color': 'var(--wr-color-primary)',
};

/** The value the rule matching `selector` declares for `hook`, or `null`. */
function declared(selector: string, hook: string): string | null {
  for (const [, list, decls] of css.matchAll(/(?:^|\n)\s*([^{}@]+)\{([^{}]*)\}/g)) {
    if (!list.split(',').some(part => part.trim() === selector)) continue;
    const match = new RegExp(`(?:^|[\\s;])${hook}:\\s*([^;]+);`).exec(decls);
    if (match) return match[1].trim();
  }
  return null;
}

describe('tree row hooks', () => {
  for (const [hook, value] of Object.entries(ROW_HOOKS)) {
    it(
      `${hook} reaches the overlay panel and keeps its inline value`,
      () => {
        expect(declared('.wr-tree-panel', hook)).toBe(value);
        expect(declared('.wr-tree', hook)).toBe(value);
      },
      COMPILE_TIMEOUT
    );
  }

  it(
    'keeps the panel hooks on the panel',
    () => {
      expect(declared('.wr-tree-panel', '--wr-tree-panel-padding')).toBe('var(--wr-space-sm)');
    },
    COMPILE_TIMEOUT
  );
});
