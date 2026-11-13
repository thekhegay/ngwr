import { describe, expect, it } from 'vitest';

import { compileSass } from '../spec-sass';

/**
 * `@use 'ngwr/grid'` compiled rather than read, the way `theme/sass-entry.spec.ts`
 * compiles the theme: the track list is built from `$columns`, so only the
 * output says what a consumer's `.grid` gets. jsdom lays nothing out, so the
 * overflow itself is not measurable here — the track minimum is what decides it.
 *
 * `sass` is resolved through `@angular/build`, for the reason that file gives.
 */
const css = compileSass(`@use 'styles/grid';`);

describe('ngwr/grid', () => {
  it('gives the twelve columns a zero minimum, so they fit the container', () => {
    // A bare `1fr` has an `auto` minimum: each column held its content's
    // min-content width, and twelve labelled `.col-1` cells overflowed the row.
    const grid = /\.grid \{([^}]*)\}/.exec(css)?.[1] ?? '';

    expect(grid).toContain('grid-template-columns: repeat(12, minmax(0, 1fr));');
  });
});
