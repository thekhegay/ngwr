import { describe, expect, it } from 'vitest';

import { COMPILE_TIMEOUT, compileSass } from '../spec-sass';

const css = compileSass(`@use 'tree/styles';`).replace(/\/\*[\s\S]*?\*\//g, '');

describe('tree row hover', () => {
  it(
    'paints a hovered row from --wr-tree-row-hover-bg, declared for inline and panel',
    () => {
      expect(css).toMatch(/\.wr-tree__row:hover:not\([^)]*\)\s*\{\s*background:\s*var\(--wr-tree-row-hover-bg\)/);
      expect(css).toMatch(/\.wr-tree,\s*\.wr-tree-panel\s*\{[^}]*--wr-tree-row-hover-bg:\s*var\(--wr-color-hover\)/);
    },
    COMPILE_TIMEOUT
  );
});
