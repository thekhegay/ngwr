/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, DestroyRef, ViewEncapsulation, computed, inject, input, output, signal } from '@angular/core';

import type { WrToastConfig, WrToastMode, WrToastOptions, WrToastPosition } from './interfaces';
import { WrToastItem } from './toast-item';

/** ms before a mouseleave actually collapses the stack. Buffers the cursor
 * briefly leaving the host as toasts reflow underneath it. */
const COLLAPSE_DELAY_MS = 120;

/** Active entry pushed by the service — adds the bookkeeping fields the host renders. */
type ActiveToast = WrToastOptions & {
  readonly id: number;
  readonly resolvedDuration: number;
};

/**
 * Internal host that lives inside the toast overlay and renders the
 * active stack. Owned by `WrToast`.
 *
 * @internal
 */
@Component({
  selector: 'wr-toast-host',
  templateUrl: './toast-host.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
    role: 'region',
    'aria-label': 'Notifications',
    '(mouseenter)': 'onMouseEnter()',
    '(mouseleave)': 'onMouseLeave()',
  },
  imports: [WrToastItem],
})
export class WrToastHost {
  readonly position = input<WrToastPosition>('top-end');
  readonly config = input.required<WrToastConfig>();
  /** Layout mode. @default 'stack' (Sonner-style; hover to fan out) */
  readonly mode = input<WrToastMode>('stack');

  /** @internal — hover toggles this in stack mode. */
  protected readonly expanded = signal(false);

  private readonly destroyRef = inject(DestroyRef);
  private collapseTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.clearCollapseTimer());
  }

  /** @internal */
  protected onMouseEnter(): void {
    this.clearCollapseTimer();
    this.expanded.set(true);
  }

  /** @internal — delay the collapse so cursor briefly slipping off the host
   * during a layout reflow doesn't cause a flicker. */
  protected onMouseLeave(): void {
    this.clearCollapseTimer();
    this.collapseTimer = setTimeout(() => {
      this.expanded.set(false);
      this.collapseTimer = null;
    }, COLLAPSE_DELAY_MS);
  }

  private clearCollapseTimer(): void {
    if (this.collapseTimer !== null) {
      clearTimeout(this.collapseTimer);
      this.collapseTimer = null;
    }
  }

  /** @internal — pushed by the service. */
  readonly toasts = signal<readonly ActiveToast[]>([]);

  /** @internal — service listens to update its internal state. */
  readonly dismissed = output<number>();
  readonly pauseRequested = output<number>();
  readonly resumeRequested = output<number>();
  readonly dismissAllRequested = output<void>();

  protected readonly classes = computed(() => {
    const parts = ['wr-toast-host', `wr-toast-host--${this.position()}`, `wr-toast-host--${this.mode()}`];
    if (this.mode() === 'stack' && this.expanded()) parts.push('wr-toast-host--expanded');
    return parts.join(' ');
  });

  /** Distance from the front of the stack (0 = newest / fully visible). */
  protected stackIndex(i: number): number {
    return this.toasts().length - 1 - i;
  }

  protected readonly closeAllVisible = computed(() => {
    const cfg = this.config();
    // In stack mode the toasts cascade absolutely while collapsed, which
    // makes the close-all button jump between layout positions on hover
    // (button moves → cursor leaves → host collapses → cycle = blink).
    // Only show it once the stack is expanded, or always in list mode.
    if (this.mode() === 'stack' && !this.expanded()) return false;
    return cfg.showCloseAll && this.toasts().length >= cfg.closeAllThreshold;
  });

  protected showProgressFor(t: WrToastOptions): boolean {
    return t.showProgress ?? this.config().showProgress;
  }

  protected showCopyFor(t: WrToastOptions): boolean {
    return t.showCopy ?? this.config().showCopy;
  }
}
