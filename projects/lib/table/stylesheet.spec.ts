import { describe, expect, it } from 'vitest';

import { compileSass } from '../spec-sass';

/**
 * What the table's stylesheet promises that no rendered DOM in jsdom can show — no
 * layout, no stacking, no cascade from a sheet — held against the COMPILED CSS, the
 * way `charts/stylesheets.spec.ts` does. That each rule then paints what it says is
 * measured in a browser.
 *
 * `sass` is resolved through `@angular/build`, as `theme/sass-entry.spec.ts` does.
 */
const css = compileSass(`@use 'table/styles';`).replace(/\/\*[\s\S]*?\*\//g, '');

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

describe('column alignment', () => {
  // `align: 'end'` is the numeric column's alignment, so the modifier carries the
  // tabular digits with it: figures line up down the column without a class of
  // the consumer's own. Logical `end`, so the same rule serves RTL.
  it.each(['wr-table__th--align-end', 'wr-table__td--align-end'])('aligns .%s to the end with tabular digits', cls => {
    const body = declarations(`.${cls}`);
    expect(body).toMatch(/text-align: end/);
    expect(body).toMatch(/font-variant-numeric: tabular-nums/);
  });

  it.each(['wr-table__th--align-center', 'wr-table__td--align-center'])('centres .%s', cls => {
    expect(declarations(`.${cls}`)).toMatch(/text-align: center/);
  });
});

describe('the pinned edge shadow', () => {
  const shadow = /box-shadow: -?0\.375rem 0 0\.375rem -0\.25rem var\(--wr-table-pin-shadow-ink\)/;

  // A shadow beside a pinned column says columns are hidden behind it, so a table
  // that fits draws none: the bare edge class carries the fade only.
  it.each([
    'wr-table__th--pin-edge-left',
    'wr-table__td--pin-edge-left',
    'wr-table__th--pin-edge-right',
    'wr-table__td--pin-edge-right',
  ])('is not on the bare .%s', cls => {
    const body = declarations(`.${cls}`);
    expect(body).not.toMatch(/box-shadow:/);
    expect(body).toMatch(/transition: box-shadow var\(--wr-transition-base\)/);
  });

  it.each([
    ['start', 'left'],
    ['end', 'right'],
  ])('waits for the host to overflow at the %s', (side, pin) => {
    for (const cell of ['th', 'td']) {
      expect(declarations(`.wr-table--overflow-${side} .wr-table__${cell}--pin-edge-${pin}`)).toMatch(shadow);
    }
  });

  it('leans the other way under RTL, at the same specificity', () => {
    const ltr = declarations('.wr-table--overflow-start .wr-table__td--pin-edge-left');
    const rtl = declarations(':where([dir=rtl]) .wr-table--overflow-start .wr-table__td--pin-edge-left');
    expect(ltr).toMatch(/box-shadow: 0\.375rem/);
    expect(rtl).toMatch(/box-shadow: -0\.375rem/);
    expect(declarations(':where([dir=rtl]) .wr-table--overflow-end .wr-table__td--pin-edge-right')).toMatch(
      /box-shadow: 0\.375rem/
    );
  });

  it('never crosses the two sides', () => {
    expect(css).not.toMatch(/overflow-start [^{,]*pin-edge-right/);
    expect(css).not.toMatch(/overflow-end [^{,]*pin-edge-left/);
  });
});
