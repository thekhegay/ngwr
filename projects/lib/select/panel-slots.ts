/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directive } from '@angular/core';

import { wrCheckStyles } from 'ngwr/utils';

/**
 * Marks content of `<wr-select>` drawn at the top of the open panel, above the
 * options and outside their scroll box: a hint, a filter of the app's own.
 *
 * It sits beside the listbox, not in it, so it may hold real controls. A click
 * in it neither picks an option nor closes the panel: close with the select's
 * `close()`. Tab from the open trigger moves into its first control, and
 * Shift+Tab from there goes back.
 *
 * Declare it as a DIRECT child of `<wr-select>`. It is created with the page,
 * like a `<wr-option>`, and drawn while the panel is open.
 *
 * @example
 * ```html
 * <wr-select [(value)]="owner">
 *   <div wrSelectHeader>People in this project</div>
 *   <wr-option value="ada">Ada</wr-option>
 * </wr-select>
 * ```
 */
@Directive({
  selector: '[wrSelectHeader]',
})
export class WrSelectHeader {
  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('select');
  }
}

/**
 * Marks content of `<wr-select>` drawn at the bottom of the open panel, below
 * the options and outside their scroll box: "Add new…", "Manage list".
 *
 * The rules are `wrSelectHeader`'s: beside the listbox, real controls allowed, a
 * click keeps the panel open, Tab from the open trigger reaches it. Tab past its
 * last control closes the panel and returns to the trigger.
 *
 * @example
 * ```html
 * <wr-select #people [(value)]="owner">
 *   <wr-option value="ada">Ada</wr-option>
 *   <div wrSelectFooter>
 *     <button wr-btn size="sm" (click)="people.close(); invite()">Invite someone</button>
 *   </div>
 * </wr-select>
 * ```
 */
@Directive({
  selector: '[wrSelectFooter]',
})
export class WrSelectFooter {
  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('select');
  }
}
