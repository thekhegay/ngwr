/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directive, TemplateRef, inject, input } from '@angular/core';

import type { WrTableCellContext } from './interfaces';

/**
 * Provide a custom template for a specific column's cells.
 *
 * @example
 * ```html
 * <wr-table [columns]="columns" [items]="items">
 *   <ng-template wrTableCell="role" let-value let-row="item">
 *     <wr-tag [color]="value === 'admin' ? 'danger' : 'medium'">{{ value }}</wr-tag>
 *   </ng-template>
 * </wr-table>
 * ```
 */
@Directive({
  selector: '[wrTableCell]',
})
export class WrTableCell {
  /** Column key the template applies to. */
  readonly columnKey = input.required<string>({ alias: 'wrTableCell' });

  readonly template = inject<TemplateRef<WrTableCellContext>>(TemplateRef);
}
