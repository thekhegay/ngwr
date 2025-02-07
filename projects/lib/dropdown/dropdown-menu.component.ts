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
  ViewChild,
  TemplateRef,
  HostBinding,
} from '@angular/core';

@Component({
  selector: 'wr-dropdown-menu',
  templateUrl: './dropdown-menu.component.html',
  exportAs: 'wrDropdownMenu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WrDropdownMenuComponent {
  @HostBinding('style')
  get hostClasses(): Record<string, string> {
    return {
      display: 'none',
    };
  }

  @ViewChild('contentTpl')
  contentTpl!: TemplateRef<void>;
}
