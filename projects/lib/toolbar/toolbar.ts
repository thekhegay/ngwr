/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, input } from '@angular/core';

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
  host: { class: 'wr-toolbar', role: 'toolbar', '[class.wr-toolbar--responsive]': 'responsive()' },
})
export class WrToolbar {
  /**
   * Stack the zones vertically when the toolbar's own box is too narrow to fit
   * them in a row (a container query on its own width, not the viewport — so it
   * adapts inside a narrow column or split pane). @default false
   */
  readonly responsive = input(false, { transform: coerceBooleanProperty });
}
