/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input, output, signal } from '@angular/core';

import { WrToastComponent } from './toast.component';
import type { WrToastConfig, WrToastPosition } from './types';

/**
 * Internal host that lives inside the toast overlay and renders the
 * active stack. Owned by `WrToastService`.
 *
 * @internal
 */
@Component({
  selector: 'wr-toast-host',
  templateUrl: './toast-host.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
  imports: [WrToastComponent],
})
export class WrToastHostComponent {
  readonly position = input<WrToastPosition>('top-end');

  /** @internal — pushed by the service. */
  readonly toasts = signal<readonly (WrToastConfig & { readonly id: number })[]>([]);

  /** @internal — service listens to remove the underlying ref. */
  readonly dismissed = output<number>();

  protected readonly classes = computed(() => `wr-toast-host wr-toast-host--${this.position()}`);

  protected trackById(_: number, t: { readonly id: number }): number {
    return t.id;
  }
}
