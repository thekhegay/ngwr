/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input, output } from '@angular/core';

import { provideWrIcons, WrIconComponent, close } from 'ngwr/icon';

import type { WrToastType } from './types';

/**
 * One toast row inside the toast host. Not used directly — see
 * `WrToastService.show()`.
 *
 * @internal
 */
@Component({
  selector: 'wr-toast',
  templateUrl: './toast.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()', role: 'status', 'aria-live': 'polite' },
  imports: [WrIconComponent],
  providers: [provideWrIcons([close])],
})
export class WrToastComponent {
  readonly type = input<WrToastType>('info');
  readonly title = input<string | null>(null);
  readonly message = input.required<string>();
  readonly dismissible = input<boolean>(true);

  readonly dismissed = output<void>();

  protected readonly classes = computed(() => `wr-toast wr-toast--${this.type()}`);
}
