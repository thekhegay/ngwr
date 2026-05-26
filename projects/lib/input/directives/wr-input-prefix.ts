/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directive } from '@angular/core';

/**
 * Marks an element as the **left** decoration inside `<wr-input-group>`.
 * Adds the `.wr-input-group__affix` class so the group's layout flexes it
 * to the input's left edge.
 *
 * @example
 * ```html
 * <wr-input-group>
 *   <span wrInputPrefix>$</span>
 *   <input wrInput [(ngModel)]="amount" type="number" />
 * </wr-input-group>
 * ```
 */
@Directive({
  selector: '[wrInputPrefix]',
  host: { class: 'wr-input-group__affix wr-input-group__affix--prefix' },
})
export class WrInputPrefix {}
