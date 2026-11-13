/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directive, TemplateRef, inject, input } from '@angular/core';

import type { WrSafeAny } from 'ngwr/utils';

import type { WrTableRow, WrTableSelectionContext } from './types';

/**
 * Provide the actions of the selection bar. With it, the table draws a bar
 * over its header while `selection` is not empty: the count, a clear button
 * and this template between them. The selected rows are the template's
 * implicit context, beside `count`, `clear` and `scope`.
 *
 * Name the rows through `[wrTableSelectionBarOf]` and `let-rows` arrives
 * typed, the way `[wrTableCellOf]` types a cell template.
 *
 * @example
 * ```html
 * <wr-table rowKey="id" rowSelection="multiple" [columns]="columns" [items]="users" [(selection)]="selected">
 *   <ng-template wrTableSelectionBar [wrTableSelectionBarOf]="users" let-rows>
 *     <button wr-btn type="button" size="sm" color="danger" (click)="remove(rows)">Delete</button>
 *   </ng-template>
 * </wr-table>
 * ```
 */
@Directive({
  selector: 'ng-template[wrTableSelectionBar]',
})
export class WrTableSelectionBar<T extends WrTableRow = WrSafeAny> {
  /**
   * The rows the template receives, for the type checker: nothing reads it at
   * runtime. Bind the same array as the table's `[items]`.
   */
  readonly wrTableSelectionBarOf = input<readonly T[] | null | undefined>(undefined);

  readonly template = inject<TemplateRef<WrTableSelectionContext<T>>>(TemplateRef);

  /* eslint-disable @typescript-eslint/no-unused-vars -- a guard's parameters exist to be narrowed, never read */
  static ngTemplateContextGuard<T extends WrTableRow>(
    _dir: WrTableSelectionBar<T>,
    _ctx: unknown
  ): _ctx is WrTableSelectionContext<T> {
    return true;
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */
}
