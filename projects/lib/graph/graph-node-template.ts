/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directive, TemplateRef, inject } from '@angular/core';

import type { WrGraphNodeContext } from './interfaces';

/**
 * Replace the default card. The node is the implicit context; its box — the
 * size the layout reserved, its position and the relation text read to a screen
 * reader — stays with the graph, so a template cannot break the geometry.
 *
 * Render `node.label` somewhere in it: the relation text of every neighbour
 * names this node by its label.
 *
 * @example
 * ```html
 * <wr-graph [nodes]="nodes" [edges]="edges">
 *   <ng-template wrGraphNode let-node>
 *     <strong>{{ node.label }}</strong> {{ node.data.role }}
 *   </ng-template>
 * </wr-graph>
 * ```
 */
@Directive({
  selector: 'ng-template[wrGraphNode]',
})
export class WrGraphNodeTemplate {
  readonly template = inject<TemplateRef<WrGraphNodeContext>>(TemplateRef);
}
