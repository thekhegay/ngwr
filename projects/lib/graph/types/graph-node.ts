/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * One block in a `wr-graph`.
 *
 * The component knows nothing about what a node stands for — anything the
 * picture needs beyond `label` travels in `data` and is drawn by the consumer's
 * `ng-template[wrGraphNode]`.
 */
export interface WrGraphNode<TData = unknown> {
  /** Unique within the graph. A repeated id is skipped after its first occurrence (dev mode warns). */
  readonly id: string;
  /**
   * The node's name. The default card shows it, and every neighbour's relation
   * text reads it out — so a custom template should render it too, or a screen
   * reader hears a name no node announces.
   */
  readonly label: string;
  /** Width in pixels. Falls back to the graph's `nodeWidth` when absent, non-finite or not positive. */
  readonly width?: number;
  /** Height in pixels. Falls back to the graph's `nodeHeight` when absent, non-finite or not positive. */
  readonly height?: number;
  /** Anything the node template needs. Never read by the component or the layout. */
  readonly data?: TData;
}

/** The context an `ng-template[wrGraphNode]` receives: the node as `let-node`. */
export interface WrGraphNodeContext<TData = unknown> {
  readonly $implicit: WrGraphNode<TData>;
}
