/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, TemplateRef, ViewEncapsulation, signal, viewChild } from '@angular/core';

let uid = 0;

/**
 * Holds the menu content rendered when a {@link WrDropdown} opens.
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
  template:
    '<ng-template><div class="wr-dropdown-menu" role="menu" [attr.id]="menuId()" [attr.aria-labelledby]="triggerId() || null"><ng-content /></div></ng-template>',
  exportAs: 'wrDropdownMenu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display:none' },
})
export class WrDropdownMenu {
  /** The internal template the directive portals into the overlay. @internal */
  readonly contentTpl = viewChild.required(TemplateRef);

  /** Stable id used on the menu element and referenced from the trigger's `aria-controls`. */
  readonly menuId = signal(`wr-dropdown-menu-${++uid}`);

  /** Trigger element id, set by the directive for `aria-labelledby` wiring. */
  readonly triggerId = signal<string | null>(null);
}
