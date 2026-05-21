/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input, output, signal } from '@angular/core';

import { provideWrIcons, WrIconComponent, checkmark, close, copy } from 'ngwr/icon';

import type { WrToastConfig, WrToastType } from './types';

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
  host: {
    '[class]': 'classes()',
    '[style.--wr-toast-duration]': 'durationMs()',
    role: 'status',
    'aria-live': 'polite',
    '(mouseenter)': 'pauseRequested.emit()',
    '(mouseleave)': 'resumeRequested.emit()',
  },
  imports: [WrIconComponent],
  providers: [provideWrIcons([checkmark, close, copy])],
})
export class WrToastComponent {
  readonly type = input<WrToastType>('info');
  readonly title = input<string | null>(null);
  readonly message = input.required<string>();
  readonly dismissible = input<boolean>(true);
  readonly showProgress = input<boolean>(false);
  readonly showCopy = input<boolean>(false);
  /** Auto-dismiss duration in ms — used to scale the progress bar. `0` hides it. */
  readonly duration = input<number>(0);
  readonly labels = input.required<WrToastConfig['labels']>();

  readonly dismissed = output<void>();
  readonly pauseRequested = output<void>();
  readonly resumeRequested = output<void>();

  /** True for ~1.5s after a successful copy; flips the icon to a check. */
  protected readonly justCopied = signal(false);
  private copyResetTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly classes = computed(() => `wr-toast wr-toast--${this.type()}`);

  /** Inline CSS value for `--wr-toast-duration`. */
  protected readonly durationMs = computed(() => `${this.duration()}ms`);

  protected readonly progressVisible = computed(() => this.showProgress() && this.duration() > 0);

  protected async onCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.message());
      this.justCopied.set(true);
      if (this.copyResetTimer) clearTimeout(this.copyResetTimer);
      this.copyResetTimer = setTimeout(() => this.justCopied.set(false), 1500);
    } catch {
      // Clipboard unavailable (insecure context / permission denied) — silent.
    }
  }
}
