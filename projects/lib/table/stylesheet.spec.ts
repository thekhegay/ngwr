import { createRequire } from 'node:module';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * What the table's stylesheet promises that no rendered DOM in jsdom can show — no
 * layout, no stacking, no cascade from a sheet — held against the COMPILED CSS, the
 * way `charts/stylesheets.spec.ts` does. That each rule then paints what it says is
 * measured in a browser.
 *
 * `sass` is resolved through `@angular/build`, as `theme/sass-entry.spec.ts` does.
 */
interface Sass {
  compileString(source: string, options: { loadPaths: string[]; style: 'expanded' }): { css: string };
}

const sass = createRequire(createRequire(import.meta.url).resolve('@angular/build/package.json'))('sass') as Sass;

const css = sass
  .compileString(`@use 'table/styles';`, { loadPaths: [join(process.cwd(), 'projects/lib')], style: 'expanded' })
  .css.replace(/\/\*[\s\S]*?\*\//g, '');

/** The declarations of every rule whose selector list contains `selector`, joined. */
function declarations(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...css.matchAll(new RegExp(`(?:^|\\n)\\s*([^{}]*${escaped}[^{}]*)\\{([^}]*)\\}`, 'g'))]
    .filter(([, list]) => list.split(',').some(part => part.trim() === selector))
    .map(([, , body]) => body)
    .join('\n');
}

describe('the focused tree row over pinned cells', () => {
  // A pinned cell is `position: sticky; z-index: 1` with an opaque background, so it
  // paints over the row's own outline: the ring of a focused tree row stopped at every
  // pinned column.
  it.each(['wr-table__td--pin-left', 'wr-table__td--pin-right'])('draws the block edges of the ring on .%s', cls => {
    const body = declarations(`.wr-table__tr:focus-visible .${cls}::after`);
    expect(body).toMatch(/content: ""/);
    expect(body).toMatch(/position: absolute/);
    expect(body).toMatch(/border-block: var\(--wr-focus-ring-width\) solid var\(--wr-focus-ring-color\)/);
  });

  it('draws an inline edge only where the pinned cell ends the row', () => {
    expect(declarations('.wr-table__tr:focus-visible .wr-table__td--pin-left:first-child::after')).toMatch(
      /border-inline-start: var\(--wr-focus-ring-width\) solid var\(--wr-focus-ring-color\)/
    );
    expect(declarations('.wr-table__tr:focus-visible .wr-table__td--pin-right:last-child::after')).toMatch(
      /border-inline-end: var\(--wr-focus-ring-width\) solid var\(--wr-focus-ring-color\)/
    );
  });

  it('draws none once a responsive table unfreezes its pinned cells into cards', () => {
    expect(declarations('.wr-table--responsive .wr-table__tr:focus-visible .wr-table__td--pin-left::after')).toMatch(
      /content: none/
    );
  });
});
