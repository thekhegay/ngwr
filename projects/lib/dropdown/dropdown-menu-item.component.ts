/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  input,
  HostBinding,
  HostListener,
  booleanAttribute,
} from '@angular/core';

import { WrIconComponent, wrIconName } from 'ngwr/icon';

@Component({
  selector: 'wr-dropdown-menu-item',
  templateUrl: './dropdown-menu-item.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [WrIconComponent],
  host: {
    '[attr.role]': "'menuitem'",
    '[attr.tabindex]': "disabled() ? null : '0'",
  },
})
export class WrDropdownMenuItemComponent {
  icon = input<wrIconName | null>(null);
  disabled = input(false, { transform: booleanAttribute });

  @HostBinding('class')
  get hostClasses(): Record<string, boolean> {
    return {
      'wr-dropdown-item': true,
      'wr-dropdown-item--disabled': this.disabled(),
    };
  }

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    if (this.disabled()) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}
