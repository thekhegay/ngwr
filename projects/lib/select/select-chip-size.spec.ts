import { describe, expect, it } from 'vitest';

import { compileSass } from '../spec-sass';

describe('the select chip sizes', () => {
  const css = compileSass(`@use 'select/styles';`).replace(/\/\*[\s\S]*?\*\//g, '');
  const body = (selector: string): string =>
    [...css.matchAll(/(?:^|\n)\s*([^{}]*)\{([^}]*)\}/g)]
      .filter(([, list]) => list.split(',').some(part => part.trim() === selector))
      .map(([, , decls]) => decls)
      .join('\n');

  it('shrinks the chips in a small select', () => {
    const sm = body('.wr-select--sm');
    expect(sm).toMatch(/--wr-select-chip-padding-block: 0;/);
    expect(sm).toMatch(/--wr-select-chip-font-size: var\(--wr-text-xs\)/);
  });

  it('leaves the medium chips alone', () => {
    const base = body('.wr-select');
    expect(base).toMatch(/--wr-select-chip-padding-block: var\(--wr-space-xs\)/);
    expect(base).toMatch(/--wr-select-chip-font-size: var\(--wr-text-sm\)/);
  });

  it('lets the touch chip hooks win over the size', () => {
    expect(body('.wr-select__chip')).toMatch(/--wr-select-chip-padding-block: var\(--wr-space-sm\)/);
  });
});
