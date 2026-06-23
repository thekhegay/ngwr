/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ElementRef, ViewEncapsulation, computed, inject, input, output, signal } from '@angular/core';

import type { WrToastConfig, WrToastType } from './interfaces';

/**
 * One toast row inside the toast host. Not used directly — see
 * `WrToast.show()`.
 *
 * @internal
 */
@Component({
  selector: 'wr-toast',
  templateUrl: './toast-item.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
    '[style.--wr-toast-duration]': 'durationMs()',
    '[style.transform]': 'swipeTransform()',
    '[style.opacity]': 'swipeOpacity()',
    '[style.transition]': 'swiping() ? "none" : null',
    '[attr.role]': 'liveRole()',
    '[attr.aria-live]': 'liveLevel()',
    '(mouseenter)': 'pauseRequested.emit()',
    '(mouseleave)': 'resumeRequested.emit()',
    '(touchstart)': 'onSwipeStart($event)',
    '(touchmove)': 'onSwipeMove($event)',
    '(touchend)': 'onSwipeEnd()',
    '(touchcancel)': 'onSwipeEnd()',
  },
})
export class WrToastItem {
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

  /** Escalate to `alert`/`assertive` for danger/warning toasts. */
  protected readonly liveRole = computed(() => (this.type() === 'danger' ? 'alert' : 'status'));
  protected readonly liveLevel = computed(() =>
    this.type() === 'danger' || this.type() === 'warning' ? 'assertive' : 'polite'
  );

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

  // Swipe-sideways-to-dismiss. The toast follows the finger and fades; releasing
  // past 40% of its width emits `dismissed`, otherwise it snaps back.
  private readonly elRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private swipeStartX = 0;
  private swipeWidth = 0;
  protected readonly swipeX = signal(0);
  protected readonly swiping = signal(false);

  protected readonly swipeTransform = computed(() => (this.swipeX() === 0 ? null : `translateX(${this.swipeX()}px)`));
  protected readonly swipeOpacity = computed(() => {
    const dist = Math.abs(this.swipeX());
    return dist === 0 ? null : Math.max(0, 1 - dist / (this.swipeWidth || 1));
  });

  protected onSwipeStart(event: TouchEvent): void {
    if (!this.dismissible()) return;
    const touch = event.touches[0];
    if (!touch) return;
    this.swipeStartX = touch.clientX;
    this.swipeWidth = this.elRef.nativeElement.offsetWidth;
    this.swiping.set(true);
  }

  protected onSwipeMove(event: TouchEvent): void {
    if (!this.swiping()) return;
    const touch = event.touches[0];
    if (!touch) return;
    this.swipeX.set(touch.clientX - this.swipeStartX);
  }

  protected onSwipeEnd(): void {
    if (!this.swiping()) return;
    this.swiping.set(false);
    if (Math.abs(this.swipeX()) > (this.swipeWidth || 0) * 0.4) {
      this.dismissed.emit();
    } else {
      this.swipeX.set(0);
    }
  }
}
