/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directive, TemplateRef, inject } from '@angular/core';

import type { WrTableExpandContext } from './interfaces';

/**
 * Provide the detail template revealed when a row is expanded. Adding it turns
 * on the leading expand column; the row object is the template's implicit
 * context.
 *
 * @example
 * ```html
 * <wr-table [columns]="columns" [items]="items" [(expanded)]="expanded" rowKey="id">
 *   <ng-template wrTableExpand let-row>
 *     <p>{{ row.bio }}</p>
 *   </ng-template>
 * </wr-table>
 * ```
 */
@Directive({
  selector: 'ng-template[wrTableExpand]',
})
export class WrTableExpand {
  readonly template = inject<TemplateRef<WrTableExpandContext>>(TemplateRef);
}
