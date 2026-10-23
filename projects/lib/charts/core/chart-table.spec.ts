import { createRequire } from 'node:module';
import { join } from 'node:path';

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { beforeEach, describe, expect, it } from 'vitest';

import { WrChartTable } from './chart-table';
import type { WrChartTableData } from './types';

/** A line chart's table: x labels down, series across, one group with no heading. */
const LINE: WrChartTableData = {
  caption: 'Visits and signups',
  corner: 'Day',
  columns: ['Visits', 'Signups'],
  groups: [
    {
      rows: [
        { header: 'Mon', cells: ['12', '3'] },
        { header: 'Tue', cells: ['18', ''] },
      ],
    },
  ],
};

/** A scatter's table: a group per series, headed by its name, and no corner heading. */
const SCATTER: WrChartTableData = {
  caption: 'Height and weight',
  columns: ['x', 'y', 'Size'],
  groups: [
    { header: 'Group A', rows: [{ header: 'Ann', cells: ['160', '55', '2'] }] },
    {
      header: 'Group B',
      rows: [
        { header: 'Ben', cells: ['182', '80', '4'] },
        { header: 'Cy', cells: ['175', '72', '1'] },
      ],
    },
  ],
};

/**
 * A chart as it would render the table: beside its `role="img"`, never inside it.
 */
@Component({
  imports: [WrChartTable],
  template: `
    <div class="plot" role="img" aria-label="Chart"></div>
    <wr-chart-table [data]="data()" />
  `,
})
class Host {
  readonly data = signal<WrChartTableData>(LINE);
}

describe('WrChartTable', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-chart-table')!;
  const table = (): HTMLTableElement => host().querySelector('table')!;
  const texts = (selector: string): string[] =>
    [...table().querySelectorAll(selector)].map(cell => cell.textContent.trim());

  const render = (data: WrChartTableData): void => {
    fixture.componentInstance.data.set(data);
    fixture.detectChanges();
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  it('wears its block class and renders one real table', () => {
    expect(host().classList).toContain('wr-chart-table');
    expect(host().querySelectorAll('table')).toHaveLength(1);
    expect(table().classList).toContain('wr-chart-table__table');
  });

  it('names the table with the caption it is given', () => {
    expect(table().caption?.textContent.trim()).toBe('Visits and signups');
    // First, where a caption has to be.
    expect(table().firstElementChild?.tagName).toBe('CAPTION');
  });

  it('heads every column, the row headers first', () => {
    const head = table().tHead!;
    expect([...head.querySelectorAll('th')].map(th => [th.textContent.trim(), th.getAttribute('scope')])).toEqual([
      ['Day', 'col'],
      ['Visits', 'col'],
      ['Signups', 'col'],
    ]);
  });

  it('leaves the corner an empty cell rather than a header with no name', () => {
    render({ ...LINE, corner: undefined });

    const corner = table().tHead!.rows[0].cells[0];
    expect(corner.tagName).toBe('TD');
    expect(corner.textContent).toBe('');
    expect(texts('thead th')).toEqual(['Visits', 'Signups']);
  });

  it('spans the empty corner over the group column too, or heads only the row headers', () => {
    render(SCATTER);
    expect([...table().tHead!.rows[0].cells].map(cell => [cell.tagName, cell.colSpan, cell.textContent])).toEqual([
      ['TD', 2, ''],
      ['TH', 1, 'x'],
      ['TH', 1, 'y'],
      ['TH', 1, 'Size'],
    ]);

    render({ ...SCATTER, corner: 'Person' });
    expect([...table().tHead!.rows[0].cells].map(cell => [cell.tagName, cell.colSpan, cell.textContent])).toEqual([
      ['TD', 1, ''],
      ['TH', 1, 'Person'],
      ['TH', 1, 'x'],
      ['TH', 1, 'y'],
      ['TH', 1, 'Size'],
    ]);
  });

  it('heads each row with a row-scoped header, followed by one cell per column', () => {
    const rows = [...table().tBodies[0].rows];
    expect(rows.map(row => [row.cells[0].tagName, row.cells[0].getAttribute('scope')])).toEqual([
      ['TH', 'row'],
      ['TH', 'row'],
    ]);
    expect(rows.map(row => [...row.cells].map(cell => cell.textContent.trim()))).toEqual([
      ['Mon', '12', '3'],
      ['Tue', '18', ''],
    ]);
    // A gap in a series is an empty data cell, not a missing one: the row stays as
    // wide as the header, so a reader moving across hears every column.
    expect(rows[1].querySelectorAll('td')).toHaveLength(2);
  });

  it('adds no group column while no group is headed', () => {
    expect(table().querySelector('[scope="rowgroup"], [rowspan]')).toBeNull();
    expect([...table().tBodies[0].rows].map(row => row.cells.length)).toEqual([3, 3]);
  });

  it('puts each group in a tbody of its own, headed by a rowgroup header down its rows', () => {
    render(SCATTER);

    const bodies = [...table().tBodies];
    expect(bodies).toHaveLength(2);
    // In a leading column and spanning the group's rows, the shape the table algorithm
    // and axe both read as heading every cell beside it; a full-width row above the
    // group heads nothing by axe's reading.
    expect(
      bodies.map(body => {
        const th = body.rows[0].cells[0];
        return [th.tagName, th.getAttribute('scope'), th.rowSpan, th.textContent.trim()];
      })
    ).toEqual([
      ['TH', 'rowgroup', 1, 'Group A'],
      ['TH', 'rowgroup', 2, 'Group B'],
    ]);
    // Each row is then a row header and its cells; the first carries the group's cell too.
    const own = (row: HTMLTableRowElement): string[] =>
      [...row.cells].filter(cell => cell.getAttribute('scope') !== 'rowgroup').map(cell => cell.textContent.trim());
    expect(bodies.map(body => [...body.rows].map(own))).toEqual([
      [['Ann', '160', '55', '2']],
      [
        ['Ben', '182', '80', '4'],
        ['Cy', '175', '72', '1'],
      ],
    ]);
    expect(texts('tbody th[scope="row"]')).toEqual(['Ann', 'Ben', 'Cy']);
  });

  it('leaves the group cell empty for a group with no header beside one that has', () => {
    render({ ...SCATTER, groups: [SCATTER.groups[0], { rows: SCATTER.groups[1].rows }] });

    const first = table().tBodies[1].rows[0].cells[0];
    expect([first.tagName, first.rowSpan, first.textContent]).toEqual(['TD', 2, '']);
    expect(table().querySelectorAll('[scope="rowgroup"]')).toHaveLength(1);
  });

  it('renders nothing for a group with no rows, since a header there would head no cell', () => {
    render({ ...SCATTER, groups: [{ header: 'Empty', rows: [] }, ...SCATTER.groups] });

    expect(table().tBodies).toHaveLength(2);
    expect(texts('[scope="rowgroup"]')).toEqual(['Group A', 'Group B']);
  });

  it('follows the data it is given', () => {
    render({ ...LINE, caption: 'Visits', columns: ['Visits'], groups: [{ rows: [{ header: 'Wed', cells: ['9'] }] }] });

    expect(table().caption?.textContent.trim()).toBe('Visits');
    expect(texts('thead th')).toEqual(['Day', 'Visits']);
    expect(texts('tbody th, tbody td')).toEqual(['Wed', '9']);

    render({ ...LINE, groups: [] });

    expect(table().tBodies).toHaveLength(0);
  });

  it('stays in the accessibility tree, outside the image, with nothing to tab to and no ids', () => {
    render(SCATTER);

    // An `img` makes its children presentational, so a table inside it would be read
    // as nothing; and every way of hiding that is not a clip hides it from a reader too.
    expect(host().closest('[role="img"]')).toBeNull();
    expect(host().closest('[aria-hidden="true"]')).toBeNull();
    expect(host().hasAttribute('hidden')).toBe(false);
    expect(host().getAttribute('style')).toBeNull();
    expect(host().querySelector('[tabindex], a, button, input')).toBeNull();
    // A server-minted id would not match the client's; `scope` ties headers to cells without one.
    expect(host().querySelector('[id], [headers]')).toBeNull();
  });

  it('renders a tree the HTML parser reads back unchanged, so hydration meets what was rendered', () => {
    // The parser inserts a `<tbody>` a template leaves out and moves misplaced rows
    // and text out of a table; either would leave the server's markup and the client's
    // tree disagreeing, which Angular's hydration refuses. Round-tripped in both shapes.
    for (const data of [LINE, SCATTER]) {
      render(data);
      const rendered = host().innerHTML;
      const parsed = new DOMParser().parseFromString(`<body>${rendered}</body>`, 'text/html').body.innerHTML;

      expect(parsed).toBe(rendered);
    }
  });
});

/**
 * Hidden from sight and read in full. Held against the COMPILED sheet, since jsdom has
 * no layout to measure; `sass` is resolved through `@angular/build`, as
 * `charts/stylesheets.spec.ts` does. That the clip leaves nothing painted and no
 * scroll is measured in a browser.
 */
describe('WrChartTable stylesheet', () => {
  const sass = createRequire(createRequire(import.meta.url).resolve('@angular/build/package.json'))('sass') as {
    compileString(source: string, options: { loadPaths: string[]; style: 'expanded' }): { css: string };
  };
  const css = sass.compileString(`@use 'charts/core/styles';`, {
    loadPaths: [join(process.cwd(), 'projects/lib')],
    style: 'expanded',
  }).css;
  const rule = /(?:^|\n)\.wr-chart-table\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';

  it('clips the host to nothing, out of flow', () => {
    expect(rule).toMatch(/position: absolute/);
    expect(rule).toMatch(/width: 1px/);
    expect(rule).toMatch(/height: 1px/);
    expect(rule).toMatch(/overflow: hidden/);
    expect(rule).toMatch(/clip: rect\(0, 0, 0, 0\)/);
    expect(rule).toMatch(/white-space: nowrap/);
  });

  it('never hides it in a way that takes it from a reader as well', () => {
    expect(rule).not.toBe('');
    expect(css).not.toMatch(/display:\s*none|visibility:\s*hidden|content-visibility/);
  });

  it('emits nothing but its own rule, and no token layer', () => {
    // Every chart that renders the table loads this sheet; a theme load here would
    // add a second copy of the token layer to nothing.
    expect(css).not.toMatch(/:root/);
    expect(css.match(/\{/g)).toHaveLength(1);
  });
});
