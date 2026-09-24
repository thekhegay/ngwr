/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, TemplateRef, ViewEncapsulation, computed, input, viewChild } from '@angular/core';

import { toClassList, type WrClassInput } from 'ngwr/utils';

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
  template: '<ng-template><div role="menu" [class]="menuClasses()"><ng-content /></div></ng-template>',
  exportAs: 'wrContextMenu',
  encapsulation: ViewEncapsulation.None,
  // A BOUND display rather than a static `style` attribute: Angular writes a
  // binding through `style.setProperty`, which no CSP governs, while a real
  // `style="…"` attribute is refused under `style-src 'self'` — and this host
  // would then lay out an empty box in the middle of the content.
  host: { '[style.display]': "'none'" },
})
export class WrContextMenuPanel {
  /**
   * Extra CSS classes for the menu box.
   *
   * It goes on the box rather than on the CDK pane, and that is what makes one
   * input cover a whole cascade: only the inner `<div>` of this template is
   * portalled into the overlay, the host element stays behind at
   * `display: none`, and every submenu is its own `<wr-context-menu>` — so a
   * class written on each one reaches each panel, with nothing to plumb from
   * the trigger down.
   */
  readonly panelClass = input<WrClassInput>(null);

  /**
   * One binding rather than a static `class` beside a `[class]`, which
   * `no-duplicate-attributes` refuses — and the constant is returned untouched
   * when nothing was passed.
   */
  protected readonly menuClasses = computed(() => {
    const extra = this.panelClass();
    return extra ? toClassList('wr-context-menu', extra).join(' ') : 'wr-context-menu';
  });

  /** The internal template the directive portals into the overlay. @internal */
  readonly contentTpl = viewChild.required(TemplateRef);
}
