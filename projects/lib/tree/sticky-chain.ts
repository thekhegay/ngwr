/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** A row within a pixel of its slot counts as in it: scroll offsets round, and a sliver is noise. */
const SNAP_PX = 1;

/** One row of the flattened tree, as the sticky stack needs it. */
export interface TreeRowSpan {
  readonly depth: number;
  /** Index of the parent row, `-1` for a root. */
  readonly parent: number;
  /** Index of the last row of this row's open subtree, its own when it shows none. */
  readonly end: number;
}

/** A pinned row: which row it copies and where its top edge sits, in px from the viewport's top. */
export interface TreeStickyRow {
  readonly index: number;
  readonly top: number;
}

/** Parent and subtree end of every row of a depth-first list, in one pass. */
export function treeRowSpans(rows: readonly { readonly depth: number }[]): readonly TreeRowSpan[] {
  const spans: { depth: number; parent: number; end: number }[] = [];
  const open: number[] = [];
  rows.forEach((row, i) => {
    while (open.length && spans[open[open.length - 1]].depth >= row.depth) open.pop();
    spans.push({ depth: row.depth, parent: open.length ? open[open.length - 1] : -1, end: i });
    for (const ancestor of open) spans[ancestor].end = i;
    open.push(i);
  });
  return spans;
}

/**
 * The rows to pin at a scroll offset, outermost first, `max` at most.
 *
 * Slot `d` (the d-th row height from the top) holds the depth-`d` ancestor of
 * the row scrolling through that slot, or that row itself once it is an open
 * branch scrolled more than a pixel past the slot. A pinned row never leaves its
 * own subtree: when the subtree's last row comes up, `top` drops below the slot
 * and the row rides out with it.
 *
 * `offset` is the scroll offset measured from the first row's top edge.
 */
export function treeStickyChain(
  spans: readonly TreeRowSpan[],
  offset: number,
  rowHeight: number,
  max: number
): readonly TreeStickyRow[] {
  const chain: TreeStickyRow[] = [];
  if (offset <= 0 || rowHeight <= 0) return chain;
  const first = Math.floor((offset + SNAP_PX) / rowHeight);
  for (let d = 0; d < max; d++) {
    const under = first + d;
    const span = spans[under];
    if (!span || span.depth < d) break;
    let index = under;
    while (spans[index].depth > d) index = spans[index].parent;
    // The row in the slot itself: only an open branch that has scrolled under.
    if (index === under && (span.end === under || first * rowHeight + SNAP_PX >= offset)) break;
    chain.push({ index, top: Math.min(d * rowHeight, spans[index].end * rowHeight - offset) });
  }
  return chain;
}
