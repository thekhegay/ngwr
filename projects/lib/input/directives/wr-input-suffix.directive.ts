/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directive } from '@angular/core';

/**
 * Marks an element as the **right** decoration inside `<wr-input-group>`.
 * Adds the `.wr-input-group__affix` class so the group's layout flexes it
 * to the input's right edge.
 *
 * @example
 * ```html
 * <wr-input-group>
 *   <input wrInput [(ngModel)]="amount" type="number" />
 *   <span wrInputSuffix>USD</span>
 * </wr-input-group>
 * ```
 */
@Directive({
  selector: '[wrInputSuffix]',
  host: { class: 'wr-input-group__affix wr-input-group__affix--suffix' },
})
export class WrInputSuffixDirective {}
