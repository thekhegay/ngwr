/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation } from '@angular/core';

/**
 * Action bar with three named zones — `[wrToolbarStart]`,
 * `[wrToolbarCenter]`, `[wrToolbarEnd]`. Use any one or all three.
 *
 * @example
 * ```html
 * <wr-toolbar>
 *   <div wrToolbarStart>
 *     <button wrButton>Back</button>
 *     <strong>Items</strong>
 *   </div>
 *   <div wrToolbarCenter>
 *     <wr-segmented [(value)]="view" [options]="['grid', 'list']" />
 *   </div>
 *   <div wrToolbarEnd>
 *     <button wrButton color="primary">New</button>
 *   </div>
 * </wr-toolbar>
 * ```
 *
 * @see https://ngwr.dev/components/toolbar
 */
@Component({
  selector: 'wr-toolbar',
  templateUrl: './toolbar.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-toolbar', role: 'toolbar' },
})
export class WrToolbar {}
