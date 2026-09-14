/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * A parent-child link: `from` is the parent, `to` the child. The line is drawn
 * with its arrow at the child.
 *
 * Several edges between one pair and edges that close a cycle are both legal.
 * An edge naming a node that does not exist is skipped (dev mode warns).
 */
export interface WrGraphEdge {
  /** Id of the parent node. */
  readonly from: string;
  /** Id of the child node. */
  readonly to: string;
}
