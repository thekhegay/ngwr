/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directive, TemplateRef, inject, input } from '@angular/core';

import type { WrSafeAny } from 'ngwr/utils';

import type { WrTableEditCellContext, WrTableRow } from './types';

/**
 * Provide the editor for a column's cells, and with it make the column
 * editable: a double click, Enter, F2 or a typed character on a cell swaps its
 * content for this template, and the table emits `cellEdit` when the edit
 * commits. A column whose definition says `editable: false` stays read-only.
 *
 * `set` keeps a value while the reader types and `commit` ends the edit with
 * one. Enter, Tab and a click outside commit the value last kept; Escape and
 * `cancel` drop it. `[wrTableEditCellOf]` types the variables, the way
 * `[wrTableCellOf]` does.
 *
 * @example
 * ```html
 * <wr-table [columns]="columns" [items]="products" (cellEdit)="save($event)">
 *   <ng-template wrTableEditCell="price" [wrTableEditCellOf]="products" let-value let-set="set">
 *     <wr-input-number aria-label="Price" [value]="value" (valueChange)="set($event)" />
 *   </ng-template>
 * </wr-table>
 * ```
 */
@Directive({
  selector: '[wrTableEditCell]',
})
export class WrTableEditCell<T extends WrTableRow = WrSafeAny, K extends string = string> {
  /** Column key the editor applies to. */
  readonly columnKey = input.required<K>({ alias: 'wrTableEditCell' });

  /**
   * The rows the table draws, for the type checker: nothing reads it at
   * runtime. Bind the same array as the table's `[items]`.
   */
  readonly wrTableEditCellOf = input<readonly T[] | null | undefined>(undefined);

  readonly template = inject<TemplateRef<WrTableEditCellContext<T, K>>>(TemplateRef);

  /** Types the template's `let-` variables under `strictTemplates`, as `WrTableCell` does. */
  /* eslint-disable @typescript-eslint/no-unused-vars -- a guard's parameters exist to be narrowed, never read */
  static ngTemplateContextGuard<T extends WrTableRow, K extends string>(
    _dir: WrTableEditCell<T, K>,
    _ctx: unknown
  ): _ctx is WrTableEditCellContext<T, K> {
    return true;
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */
}
