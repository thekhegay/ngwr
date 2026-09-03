/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, TemplateRef, ViewEncapsulation, viewChild } from '@angular/core';

/**
 * Container for the rows shown when a {@link WrContextMenu} opens.
 * The component itself doesn't render; the directive portals the inner
 * template into an overlay positioned at the pointer.
 *
 * @example
 * ```html
 * <div [wrContextMenu]="menu">Right-click me</div>
 * <wr-context-menu #menu>
 *   <wr-context-menu-item icon="copy" (click)="copy()">Copy</wr-context-menu-item>
 *   <wr-context-menu-item icon="trash" (click)="remove()">Delete</wr-context-menu-item>
 * </wr-context-menu>
 * ```
 */
@Component({
  selector: 'wr-context-menu',
  template: '<ng-template><div class="wr-context-menu" role="menu"><ng-content /></div></ng-template>',
  exportAs: 'wrContextMenu',
  encapsulation: ViewEncapsulation.None,
  // A BOUND display rather than a static `style` attribute: Angular writes a
  // binding through `style.setProperty`, which no CSP governs, while a real
  // `style="…"` attribute is refused under `style-src 'self'` — and this host
  // would then lay out an empty box in the middle of the content.
  host: { '[style.display]': "'none'" },
})
export class WrContextMenuPanel {
  /** The internal template the directive portals into the overlay. @internal */
  readonly contentTpl = viewChild.required(TemplateRef);
}
