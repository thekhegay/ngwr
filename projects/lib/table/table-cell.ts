/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directive, TemplateRef, inject, input } from '@angular/core';

import type { WrSafeAny } from 'ngwr/utils';

import type { WrTableCellContext, WrTableRow } from './types';

/**
 * Provide a custom template for a specific column's cells.
 *
 * Name the rows through `[wrTableCellOf]` and the template's variables arrive
 * typed: `let-row="item"` is the row and `let-value` is the row's property
 * under the column key. The input is read by the type checker only, the way
 * `*ngFor`'s `of` types its loop variable: the table hands every template the
 * same context whether or not it is set.
 *
 * @example
 * ```html
 * <wr-table [columns]="columns" [items]="users">
 *   <ng-template wrTableCell="role" [wrTableCellOf]="users" let-value let-row="item">
 *     <wr-tag [color]="value === 'admin' ? 'danger' : null">{{ row.name }}</wr-tag>
 *   </ng-template>
 * </wr-table>
 * ```
 */
@Directive({
  selector: '[wrTableCell]',
})
export class WrTableCell<T extends WrTableRow = WrSafeAny, K extends string = string> {
  /** Column key the template applies to. */
  readonly columnKey = input.required<K>({ alias: 'wrTableCell' });

  /**
   * The rows the template draws, for the type checker: nothing reads it at
   * runtime. Bind the same array as the table's `[items]`.
   */
  readonly wrTableCellOf = input<readonly T[] | null | undefined>(undefined);

  readonly template = inject<TemplateRef<WrTableCellContext<T, K>>>(TemplateRef);

  /**
   * Types the template's `let-` variables under `strictTemplates`.
   *
   * `T` defaults to `WrSafeAny` for the reason `WrOptionLeading` gives: a
   * template without `[wrTableCellOf]` has nothing to infer the row from, and
   * narrowed to `unknown` every `row.email` would stop compiling. With the
   * input bound, `K` is the key the attribute names, so `let-value` is that
   * property's type and a key the row does not have reads `unknown`.
   */
  /* eslint-disable @typescript-eslint/no-unused-vars -- a guard's parameters exist to be narrowed, never read */
  static ngTemplateContextGuard<T extends WrTableRow, K extends string>(
    _dir: WrTableCell<T, K>,
    _ctx: unknown
  ): _ctx is WrTableCellContext<T, K> {
    return true;
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */
}
