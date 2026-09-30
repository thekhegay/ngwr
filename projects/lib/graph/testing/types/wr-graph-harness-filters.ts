/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-graph>` a harness query matches. */
export interface WrGraphHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the viewport's accessible name — `ariaLabel`, or the catalog's `graph.label`
   * when none is bound. A string is an exact match, a RegExp is tested.
   */
  readonly ariaLabel?: string | RegExp;
  /**
   * Match a graph that draws a node with this text (see `WrGraphNodeHarness.getText`) —
   * the way to tell two graphs apart when neither was given a name of its own. A node
   * of a graph nested inside one of this graph's node templates does not count, for a
   * RegExp as much as for a string: the node text it is tested against leaves the
   * nested graph out.
   */
  readonly nodeLabel?: string | RegExp;
}

/** Narrows which node of a `<wr-graph>` a harness query matches. */
export interface WrGraphNodeHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the node's DRAWN text, as `WrGraphNodeHarness.getText` reads it: the label on
   * the default card, and everything a `wrGraphNode` template drew otherwise — so a
   * RegExp is how to match one part of a template. A string is an exact match. A
   * `<wr-graph>` the template nests inside the node is not part of that text.
   */
  readonly label?: string | RegExp;
}
