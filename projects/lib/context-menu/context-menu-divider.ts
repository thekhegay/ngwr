/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation } from '@angular/core';

/**
 * Thin horizontal separator inside a `<wr-context-menu>`. Use it to
 * group related items (e.g., a destructive action below a divider, or
 * a "More" section below the primary items).
 *
 * @example
 * ```html
 * <wr-context-menu #menu>
 *   <wr-context-menu-item (click)="copy()">Copy</wr-context-menu-item>
 *   <wr-context-menu-item (click)="paste()">Paste</wr-context-menu-item>
 *   <wr-context-menu-divider />
 *   <wr-context-menu-item (click)="remove()">Delete</wr-context-menu-item>
 * </wr-context-menu>
 * ```
 */
@Component({
  selector: 'wr-context-menu-divider',
  template: '',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-context-menu-divider',
    role: 'separator',
    'aria-orientation': 'horizontal',
  },
})
export class WrContextMenuDivider {}
