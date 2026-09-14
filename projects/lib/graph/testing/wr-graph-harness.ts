/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrGraphHarnessFilters, WrGraphNodeHarnessFilters } from './interfaces';
import { WrGraphNodeHarness } from './wr-graph-node-harness';

/**
 * Every part of the graph is reached down one fixed chain of direct children. A node
 * template may draw anything, including another `<wr-graph>`, and a descendant query
 * from the outer host would count the inner graph's nodes and edges as its own.
 */
const VIEWPORT = ':scope > .wr-graph__viewport';
const STAGE = `${VIEWPORT} > .wr-graph__stage`;
const EDGE = `${STAGE} > .wr-graph__edges > .wr-graph__edge`;
const NODE = `${STAGE} > .wr-graph__nodes > .wr-graph__node`;

/**
 * The same node harness, anchored to one graph. Not exported: queried from any other
 * root the `:scope` would be the wrong element, so a consumer loads
 * {@link WrGraphNodeHarness} and this class only ever comes back from
 * {@link WrGraphHarness.getNodes}.
 */
class WrGraphOwnNodeHarness extends WrGraphNodeHarness {
  static override hostSelector = NODE;
}

/**
 * The filters as a failure message should show them. Not `JSON.stringify`: it prints a
 * RegExp as `{}`, so a caller who had already passed one was shown nothing and then told
 * to use a RegExp. A RegExp reads as its literal, `/source/flags`; everything else as JSON.
 */
function describeFilters(filters: WrGraphNodeHarnessFilters): string {
  const entries: [string, unknown][] = Object.entries(filters);
  const shown = entries
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}: ${value instanceof RegExp ? String(value) : JSON.stringify(value)}`);
  return shown.length ? `{ ${shown.join(', ')} }` : '{}';
}

/**
 * Test harness for `<wr-graph>` — blocks joined by parent-child lines, laid out in
 * layers, display only.
 *
 * The graph is read the way assistive technology reads it: the viewport's name, the
 * nodes as a list in READING order (layer, then inline position — which is DOM order),
 * each node's drawn text and its relation sentence, and the edges as the `from` / `to`
 * ids the component writes on each line. Those are what break when the data wiring
 * does.
 *
 * Three methods are deliberately absent, and each would answer the same for a working
 * graph and a broken one:
 *
 * - **No edge path `d`.** A path is a rendering detail: rounded to two decimals, mirrored
 *   under RTL, and moved by every node size and gap. The same rule as
 *   `WrLineChartHarness`.
 * - **No node positions.** jsdom lays nothing out, so every measured box is 0×0. The
 *   inline `transform` IS the component's own write and would be readable, but its
 *   numbers belong to a layout that is internal in this release — a harness method
 *   returning them would make every layout improvement a breaking change to consumer
 *   specs. Coordinates are pinned in the layout's own pure spec, where the arithmetic is.
 * - **No "is scrollable".** Overflow is layout: in jsdom `scrollWidth` and `clientWidth`
 *   are both 0 for a graph that fits and for one ten times wider. The viewport's
 *   `tabindex` is no proxy either — it is always `0`, precisely so the tab stop never
 *   depends on a measurement.
 *
 * An empty graph and a graph whose layout drew nothing render the same DOM, so the
 * harness cannot tell them apart. {@link getNodes} answers `[]` for both, which is the
 * honest way to assert emptiness; {@link getEdges} refuses instead, because "no edges"
 * would be vacuously true of a graph that drew nothing at all.
 *
 * @example
 * ```ts
 * const graph = await loader.getHarness(WrGraphHarness.with({ ariaLabel: 'Team structure' }));
 *
 * expect(await graph.getEdges()).toEqual([{ from: 'atlas', to: 'birch' }]);
 * const birch = await graph.getNode({ label: 'Birch' });
 * expect(await birch.getRelationText()).toBe('Parents: Atlas.');
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrGraphHarness extends ComponentHarness {
  static hostSelector = 'wr-graph';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrGraphHarnessFilters = {}): HarnessPredicate<WrGraphHarness> {
    return new HarnessPredicate(WrGraphHarness, options)
      .addOption('ariaLabel', options.ariaLabel, (harness, label) =>
        HarnessPredicate.stringMatches(harness.getAccessibleName(), label)
      )
      .addOption(
        'nodeLabel',
        options.nodeLabel,
        async (harness, label) => (await harness.getNodes({ label })).length > 0
      );
  }

  /**
   * The viewport's accessible name — the scroller is the graph's one tab stop and the
   * element that carries it, never the host.
   */
  async getAccessibleName(): Promise<string | null> {
    return (await this.locatorFor(VIEWPORT)()).getAttribute('aria-label');
  }

  /**
   * This graph's nodes, in reading order, narrowed by the filters.
   *
   * Only the graph's own: a graph drawn inside one of its node templates has nodes of
   * its own, and they are not this graph's. `[]` for a graph that draws no node — see
   * the class note for why that answer cannot tell empty data from a layout that drew
   * nothing.
   */
  async getNodes(filters: WrGraphNodeHarnessFilters = {}): Promise<WrGraphNodeHarness[]> {
    return this.locatorForAll(WrGraphOwnNodeHarness.with(filters))();
  }

  /** The first node matching the filters, or a failure that says what the graph draws. */
  async getNode(filters: WrGraphNodeHarnessFilters): Promise<WrGraphNodeHarness> {
    const [node] = await this.getNodes(filters);
    if (node) return node;

    const nodes = await this.getNodes();
    if (!nodes.length) {
      throw new Error(
        `WrGraphHarness.getNode(): no node matched ${describeFilters(filters)} because the graph draws no nodes ` +
          'at all — its nodes are empty, or its layout returned nothing it could draw.'
      );
    }
    const texts = await Promise.all(nodes.map(each => each.getText()));
    throw new Error(
      `WrGraphHarness.getNode(): no node matched ${describeFilters(filters)}. The graph draws ` +
        `[${texts.join(', ')}] — a label is matched against the DRAWN text, so a template that renders more ` +
        'than the label needs a RegExp.'
    );
  }

  /**
   * One `{ from, to }` per line drawn, read off the path's `data-from` / `data-to` —
   * node ids, the only place the DOM writes one — in the order the edges were given,
   * with the edges the graph skipped left out. Parallel edges each appear, since each is
   * its own line.
   *
   * Throws on a graph that draws no nodes, rather than answering `[]`: that answer would
   * be the same for empty data and for a layout that drew nothing, and a spec asserting
   * "no edges" would pass on both.
   */
  async getEdges(): Promise<{ from: string; to: string }[]> {
    if (!(await this.locatorForAll(NODE)()).length) {
      throw new Error(
        'WrGraphHarness.getEdges(): the graph draws no nodes, so an empty edge list would be vacuously true — ' +
          'it reads the same for empty data and for a layout that drew nothing. Assert getNodes() is empty ' +
          'when an empty graph is what the spec means.'
      );
    }

    const paths = await this.locatorForAll(EDGE)();
    return Promise.all(
      paths.map(async (path, index) => {
        const [from, to] = await Promise.all([path.getAttribute('data-from'), path.getAttribute('data-to')]);
        if (from === null || to === null) {
          throw new Error(
            `WrGraphHarness.getEdges(): line #${index} carries no data-from / data-to, so which nodes it joins ` +
              'is not written anywhere a test can read.'
          );
        }
        return { from, to };
      })
    );
  }
}
