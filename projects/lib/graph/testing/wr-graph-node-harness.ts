/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, type ComponentHarnessConstructor, HarnessPredicate } from '@angular/cdk/testing';

import type { WrGraphNodeHarnessFilters } from './interfaces';

/** The visually hidden relation sentence the graph writes into every node that has an edge. */
const SR_ONLY = '.wr-graph__sr-only';

/**
 * The node's OWN sentence. Anchored with `:scope >` because the graph writes it as a
 * direct child, after whatever the template drew — so a `<wr-graph>` nested inside a
 * node template would otherwise hand its first node's sentence to the outer node.
 */
const RELATION = `:scope > ${SR_ONLY}`;

/**
 * What {@link WrGraphNodeHarness.getText} leaves out: the node's own sentence, and any
 * `<wr-graph>` a template drew inside the node. That inner graph is a graph of its own —
 * its cards are its nodes, read through its own harness — so counting its text as the
 * outer node's would let a RegExp label match the outer graph by a node it does not own.
 */
const NOT_DRAWN_BY_NODE = `${SR_ONLY}, wr-graph`;

/**
 * Test harness for one node of a `<wr-graph>` — a `role="listitem"` block.
 *
 * A node answers two questions, and they are kept apart on purpose. {@link getText} is
 * what is DRAWN: the default card, or whatever a `wrGraphNode` template rendered.
 * {@link getRelationText} is what is ANNOUNCED about its place in the graph: the
 * lines are `aria-hidden`, so the visually hidden sentence naming the parents and the
 * children is the only form the structure takes for a screen reader. A spec that read
 * the node's whole text would get both glued together, and would keep passing on a
 * graph whose relation sentences named the wrong neighbours.
 *
 * There is no `getId()`. The component writes a node's id nowhere in the DOM — only
 * an edge carries ids, on its `data-from` / `data-to` — so a node is addressed by what
 * it draws, and {@link WrGraphHarness.getEdges} is where ids are read.
 *
 * @example
 * ```ts
 * const birch = await graph.getNode({ label: 'Birch' });
 *
 * expect(await birch.getText()).toBe('Birch');
 * expect(await birch.getRelationText()).toBe('Parents: Atlas. Children: Dune.');
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrGraphNodeHarness extends ComponentHarness {
  static hostSelector = '.wr-graph__node';

  /**
   * Build a predicate that narrows the query.
   *
   * Typed on `this`, so the predicate is built for whichever node harness it is called
   * on — {@link WrGraphHarness.getNodes} narrows its own, direct-child query through
   * the same options.
   */
  static with<T extends WrGraphNodeHarness>(
    this: ComponentHarnessConstructor<T>,
    options: WrGraphNodeHarnessFilters = {}
  ): HarnessPredicate<T> {
    return new HarnessPredicate(this, options).addOption('label', options.label, (harness, label) =>
      HarnessPredicate.stringMatches(harness.getText(), label)
    );
  }

  /**
   * The text the node DRAWS, trimmed, with the relation sentence left out.
   *
   * The sentence is a real text node inside the block — visually hidden, not removed —
   * so a plain text read would end in `Parents: Atlas. Children: Dune.`. It is excluded
   * rather than subtracted.
   *
   * A `<wr-graph>` a template nests inside the node is left out whole, cards and
   * sentences alike: it is a graph of its own, and its nodes answer to its own harness.
   * So a node drawing `Harbor` above an inner graph of `Kestrel` and `Lark` reads
   * `Harbor`, and a `/Lark/` label does not match it.
   */
  async getText(): Promise<string> {
    return (await this.host()).text({ exclude: NOT_DRAWN_BY_NODE });
  }

  /**
   * The sentence a screen reader hears about the node's place in the graph — its
   * parents, then its children, as the catalog words them — or `null` for a node with
   * no edges, which the graph gives no sentence at all.
   *
   * `null` rather than `''`: the component never writes an empty sentence, so an empty
   * string could only mean the element exists and says nothing, which is a different
   * failure from a node that has nothing to say.
   */
  async getRelationText(): Promise<string | null> {
    const relation = await this.locatorForOptional(RELATION)();
    return relation ? relation.text() : null;
  }
}
