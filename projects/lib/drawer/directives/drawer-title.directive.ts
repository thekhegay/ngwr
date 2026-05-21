/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directive } from '@angular/core';

/**
 * Marks an element as the drawer's title row. Applies the `wr-drawer__title`
 * class so the drawer's stylesheet can lay it out alongside content and
 * footer slots.
 *
 * @example
 * ```html
 * <wr-drawer [(open)]="open">
 *   <h2 wrDrawerTitle>Settings</h2>
 *   <div wrDrawerContent>…</div>
 * </wr-drawer>
 * ```
 */
@Directive({
  selector: '[wrDrawerTitle]',
  host: { class: 'wr-drawer__title' },
})
export class WrDrawerTitleDirective {}
