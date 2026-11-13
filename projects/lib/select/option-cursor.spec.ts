import { describe, expect, it } from 'vitest';

import { COMPILE_TIMEOUT, compileSass } from '../spec-sass';

/**
 * The keyboard cursor row (`aria-activedescendant`) must read in every panel,
 * not only the virtual one. Read off the COMPILED sheet: jsdom has no cascade.
 */
const css = compileSass(`@use 'select/styles';`).replace(/\/\*[\s\S]*?\*\//g, '');

function body(selector: string): string {
  return [...css.matchAll(/(?:^|\n)\s*([^{}@]+)\{([^{}]*)\}/g)]
    .filter(([, list]) => list.split(',').some(part => part.trim().replace(/\s+/g, ' ') === selector))
    .map(([, , decls]) => decls)
    .join('\n');
}

describe('select option cursor', () => {
  it(
    'tints the active option in a regular panel',
    () => {
      expect(body('.wr-option--active')).toContain('background: var(--wr-color-hover)');
    },
    COMPILE_TIMEOUT
  );

  it(
    'draws the cursor bar on a positioned row',
    () => {
      expect(body('.wr-option')).toContain('position: relative');
      const bar = body('.wr-option--active::before');
      expect(bar).toContain('inset-inline-start: 0');
      expect(bar).toContain('width: 2px');
      expect(bar).toContain('var(--wr-color-primary)');
    },
    COMPILE_TIMEOUT
  );

  it(
    'declares the cursor outside the virtual block',
    () => {
      expect(body('.wr-select-panel--virtual .wr-option--active')).toBe('');
    },
    COMPILE_TIMEOUT
  );
});
