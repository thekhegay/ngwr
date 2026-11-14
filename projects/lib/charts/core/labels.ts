/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * The `limit` longest of `labels`, each once, longest first: the strings worth measuring.
 *
 * A chart sizes a gutter or keeps room past a bar from a hidden copy of the text that goes
 * there. Copying every label made ten thousand hidden spans for ten thousand bars, to learn
 * the width of one. The widest label is almost always among the longest few by character
 * count - a proportional font can put `1,111` under `999`, which is why this returns a few
 * and not one - so a chart renders these and reads the widest.
 *
 * @internal
 */
export function wrChartLongest(labels: readonly string[], limit = 3): string[] {
  const longest: string[] = [];
  for (const label of new Set(labels)) {
    if (longest.length === limit && label.length <= longest[longest.length - 1].length) continue;
    let at = longest.findIndex(kept => kept.length < label.length);
    if (at < 0) at = longest.length;
    longest.splice(at, 0, label);
    if (longest.length > limit) longest.pop();
  }
  return longest;
}

/**
 * How many categories each printed label stands for, so no two labels along an axis run
 * into each other: 1 while every label fits its own band, 2 to print every second one,
 * and so on.
 *
 * `extent` is the axis' length and `count` how many bands share it; `labelSize` is the
 * longest label along the axis, and `gap` the least room between two labels. All in the
 * same unit, px in practice. With nothing measured yet - a server render, a chart not
 * laid out - the answer is 1: every label, as the markup had before it was measured.
 *
 * @internal
 */
export function wrChartLabelStep(count: number, extent: number, labelSize: number, gap = 8): number {
  if (!(count > 1) || !(extent > 0) || !(labelSize > 0)) return 1;
  const band = extent / count;
  return Math.max(1, Math.min(count, Math.ceil((labelSize + gap) / band)));
}
