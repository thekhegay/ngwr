/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, TemplateRef, ViewEncapsulation, viewChild } from '@angular/core';

/**
 * Holds the menu content rendered when a {@link WrDropdownDirective} opens.
 *
 * The component itself doesn't render anywhere — the directive grabs its
 * internal `<ng-template>` and portals it into an overlay.
 *
 * @example
 * ```html
 * <button [wrDropdown]="menu">Actions</button>
 * <wr-dropdown-menu #menu>
 *   <wr-dropdown-item icon="copy">Copy</wr-dropdown-item>
 *   <wr-dropdown-item icon="trash">Delete</wr-dropdown-item>
 * </wr-dropdown-menu>
 * ```
 *
 * @see https://ngwr.dev/docs/components/dropdown
 */
@Component({
  selector: 'wr-dropdown-menu',
  template: '<ng-template><div class="wr-dropdown-menu"><ng-content /></div></ng-template>',
  exportAs: 'wrDropdownMenu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display:none' },
})
export class WrDropdownMenuComponent {
  /** The internal template the directive portals into the overlay. @internal */
  readonly contentTpl = viewChild.required(TemplateRef);
}
