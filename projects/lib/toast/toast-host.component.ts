/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input, output, signal } from '@angular/core';

import { WrToastComponent } from './toast.component';
import type { WrToastConfig, WrToastOptions, WrToastPosition } from './types';

/** Active entry pushed by the service — adds the bookkeeping fields the host renders. */
type ActiveToast = WrToastOptions & {
  readonly id: number;
  readonly resolvedDuration: number;
};

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
  readonly config = input.required<WrToastConfig>();

  /** @internal — pushed by the service. */
  readonly toasts = signal<readonly ActiveToast[]>([]);

  /** @internal — service listens to update its internal state. */
  readonly dismissed = output<number>();
  readonly pauseRequested = output<number>();
  readonly resumeRequested = output<number>();
  readonly dismissAllRequested = output<void>();

  protected readonly classes = computed(() => `wr-toast-host wr-toast-host--${this.position()}`);

  protected readonly closeAllVisible = computed(() => {
    const cfg = this.config();
    return cfg.showCloseAll && this.toasts().length >= cfg.closeAllThreshold;
  });

  protected showProgressFor(t: WrToastOptions): boolean {
    return t.showProgress ?? this.config().showProgress;
  }

  protected showCopyFor(t: WrToastOptions): boolean {
    return t.showCopy ?? this.config().showCopy;
  }
}
