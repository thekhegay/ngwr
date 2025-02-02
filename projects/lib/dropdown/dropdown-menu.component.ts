/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ChangeDetectionStrategy, ViewEncapsulation, ViewChild, TemplateRef } from '@angular/core';

@Component({
  selector: 'wr-dropdown-menu',
  templateUrl: './dropdown-menu.component.html',
  exportAs: 'wrDropdownMenu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  host: {
    '[style.display]': '"none"',
  },
})
export class WrDropdownMenuComponent {
  @ViewChild('contentTpl')
  contentTpl!: TemplateRef<void>;
}
