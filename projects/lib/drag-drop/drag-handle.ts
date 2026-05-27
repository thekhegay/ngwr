/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { CdkDragHandle } from '@angular/cdk/drag-drop';
import { Directive } from '@angular/core';

/**
 * Drag handle for {@link WrSortableList} (and any nested `cdkDrag`).
 * Composes CDK's `cdkDragHandle` via `hostDirectives` so consumers don't
 * need to import the CDK selector directly.
 *
 * @example
 * ```html
 * <wr-sortable-list [(items)]="rows">
 *   <ng-template let-row>
 *     <div class="row">
 *       <span wrDragHandle class="grip">≡</span>
 *       <span>{{ row.label }}</span>
 *     </div>
 *   </ng-template>
 * </wr-sortable-list>
 * ```
 */
@Directive({
  selector: '[wrDragHandle]',
  hostDirectives: [CdkDragHandle],
  host: { class: 'wr-drag-handle' },
})
export class WrDragHandle {}
