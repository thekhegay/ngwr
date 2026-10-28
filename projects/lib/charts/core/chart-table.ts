/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, computed, input } from '@angular/core';

import type { WrChartTableData } from './types';

/**
 * The figures a chart draws, as a table that only assistive technology reaches.
 *
 * A chart's drawing is one named `role="img"`, and `img` makes everything inside it
 * presentational: the name is announced and the numbers are nowhere a screen reader
 * can walk. This renders them as a real `<table>` — a caption, column headers, row
 * headers, and a `<tbody>` per group headed by a `<th scope="rowgroup">` down its rows
 * — so a reader can move cell by cell and hear each value with its row and column.
 *
 * **Beside the image, never inside it.** Inside, `img` would hide it with the rest of
 * the drawing. A chart renders `<wr-chart-table>` as a sibling of the element that
 * carries `role="img"`, and only while its `dataTable` input asks for it. **The chart's
 * host has to be positioned** (`position: relative`): the table is out of flow, and
 * against a static host it resolves to an ancestor outside the chart and keeps its place
 * in an unpositioned scroller's content, which grew one page by 1600px of blank scroll.
 *
 * **Hidden by clipping, not by `display` or `hidden`**, which would take it out of the
 * accessibility tree as well: the host is clipped to nothing and taken out of flow, so
 * it costs the chart no layout and still reads in full. The table inside keeps its own
 * layout, because a `<table>` will not shrink to a clip box of its own — it grows to
 * fit its cells whatever its width says. Nothing in it is focusable, so no tab stop
 * lands on something that cannot be seen.
 *
 * No ids: the headers are tied to their cells by `scope`, which needs none, and an id
 * minted on the server would not match the client's.
 *
 * @example
 * ```html
 * <div class="wr-line-chart__plot" role="img" [attr.aria-label]="label()">…</div>
 * @if (dataTable()) {
 *   <wr-chart-table [data]="table()" />
 * }
 * ```
 *
 * @internal
 */
@Component({
  selector: 'wr-chart-table',
  templateUrl: './chart-table.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-chart-table' },
})
export class WrChartTable {
  /** The caption, the column headings and the rows, every string already written. */
  readonly data = input.required<WrChartTableData>();

  /** Whether any group is headed, which gives every row a leading group column. */
  protected readonly hasGroupHeaders = computed(() => this.data().groups.some(group => !!group.header));
}
