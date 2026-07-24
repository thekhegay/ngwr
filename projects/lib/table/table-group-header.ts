/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directive, TemplateRef, inject } from '@angular/core';

import type { WrTableGroupContext } from './interfaces';

/**
 * Provide a custom template for a group band's label area. The collapse chevron
 * and the optional group checkbox are still rendered by the table around it, so
 * the template may safely contain its own interactive content. Projecting it
 * does NOT enable grouping — set `[groupBy]` for that.
 *
 * @example
 * ```html
 * <wr-table [columns]="columns" [items]="rows" groupBy="department">
 *   <ng-template wrTableGroupHeader let-value let-count="count" let-toggle="toggle">
 *     <wr-tag color="primary" (click)="toggle()">{{ value }}</wr-tag>
 *     <small>{{ count }} people</small>
 *   </ng-template>
 * </wr-table>
 * ```
 */
@Directive({ selector: 'ng-template[wrTableGroupHeader]' })
export class WrTableGroupHeader {
  readonly template = inject<TemplateRef<WrTableGroupContext>>(TemplateRef);
}
