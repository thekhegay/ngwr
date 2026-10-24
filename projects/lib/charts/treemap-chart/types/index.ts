/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * One node of a `<wr-treemap-chart>`: a leaf with a value, or a group of nodes drawn
 * inside its own rectangle.
 */
interface WrTreemapNode {
  /** The node's name: on its tile, in the tooltip's path and in the data table's row header. */
  readonly label: string;
  /**
   * What the node measures. A leaf's tile is drawn with an area in proportion to it; a
   * leaf with no value, or one that is not a finite number above zero, has no area and
   * draws no tile, and the data table still lists it with its own figure.
   *
   * On a group it may be left out, and the group's value is then the sum of its
   * children's. Given, it is the group's own total: a value above that sum leaves the
   * rest of the group's rectangle empty — an "everything else" the children do not
   * account for — and one below it is ignored for the area, since the children have to
   * fit, and still shown as the group's figure.
   */
  readonly value?: number;
  /** The nodes inside this one. A node with none is a leaf. */
  readonly children?: readonly WrTreemapNode[];
  /**
   * Any CSS colour, `var(--wr-…)` included, for this node and every node inside it that
   * has none of its own. Left out, a top-level node takes the next palette colour and a
   * nested one its parent's.
   */
  readonly color?: string;
}

export type { WrTreemapNode };
