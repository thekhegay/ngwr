/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, ViewEncapsulation, input, output } from '@angular/core';

import { WrButtonComponent } from 'ngwr/button';
import type { WrColor } from 'ngwr/theme';

/**
 * Confirmation panel rendered inside the popconfirm overlay. Not part
 * of the public template API — use `[wrPopconfirm]` instead.
 *
 * @internal
 */
@Component({
  selector: 'wr-popconfirm',
  templateUrl: './popconfirm.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-popconfirm' },
  imports: [WrButtonComponent],
})
export class WrPopconfirmComponent {
  readonly message = input.required<string>();
  readonly confirmText = input<string>('Confirm');
  readonly cancelText = input<string>('Cancel');
  readonly confirmColor = input<WrColor>('primary');

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
