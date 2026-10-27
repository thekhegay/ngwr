/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ElementRef, ViewEncapsulation, computed, inject, input, output, signal } from '@angular/core';

import { toClassList, type WrClassInput } from 'ngwr/utils';

import type { WrToastConfig, WrToastType } from './types';

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
    // See `WrAlert`: a static `title=` feeds the input AND lands on the host.
    '[attr.title]': 'null',
    '[class]': 'classes()',
    '[style.--wr-toast-duration]': 'durationMs()',
    '[style.transform]': 'swipeTransform()',
    '[style.opacity]': 'swipeOpacity()',
    '[style.transition]': 'swiping() ? "none" : null',
    '[attr.role]': 'liveRole()',
    '[attr.aria-live]': 'liveLevel()',
    '(mouseenter)': 'onPointer(true)',
    '(mouseleave)': 'onPointer(false)',
    '(focusin)': 'onFocusIn()',
    '(focusout)': 'onFocusOut($event)',
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
  /** Extra classes from `WrToastOptions.class`, merged into the host's own. */
  readonly extraClass = input<WrClassInput>(null);
  /** Auto-dismiss duration in ms — used to scale the progress bar. `0` hides it. */
  readonly duration = input<number>(0);
  /**
   * Already resolved by the host — strings, not the config's nullable shape.
   * The item renders them and never reaches for the catalog itself.
   */
  readonly labels = input.required<{ [K in keyof WrToastConfig['labels']]: string }>();

  readonly dismissed = output<void>();
  readonly pauseRequested = output<void>();
  readonly resumeRequested = output<void>();

  /**
   * The countdown holds while the pointer rests on the toast OR focus is inside
   * it. Hover alone left a keyboard user's toast running: focus its Close button
   * and it was removed from under the focus four seconds later, which dropped
   * focus on `<body>` — WCAG 2.2.1 asks for a way to hold a time limit, and the
   * pointer was the only one. Two flags, so leaving by one road while still in
   * by the other does not resume it.
   */
  private hovered = false;
  private focused = false;

  /** @internal */
  protected onPointer(over: boolean): void {
    this.syncPause(() => (this.hovered = over));
  }

  /** @internal */
  protected onFocusIn(): void {
    this.syncPause(() => (this.focused = true));
  }

  /** @internal Focus moving between two buttons of this toast is not leaving it. */
  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (next && this.elRef.nativeElement.contains(next)) return;
    this.syncPause(() => (this.focused = false));
  }

  private syncPause(change: () => void): void {
    const wasHeld = this.hovered || this.focused;
    change();
    const held = this.hovered || this.focused;
    if (held === wasHeld) return;
    if (held) this.pauseRequested.emit();
    else this.resumeRequested.emit();
  }

  /** True for ~1.5s after a successful copy; flips the icon to a check. */
  protected readonly justCopied = signal(false);
  private copyResetTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * `--untitled` when the toast opens on its message. The glyph and the
   * actions are centred on the FIRST line, and with no title that line is the
   * message's, whose line height is its own hook — so the stylesheet needs to
   * know which one it is reading.
   */
  protected readonly classes = computed(() =>
    toClassList(
      'wr-toast',
      `wr-toast--${this.type()}`,
      this.title() ? null : 'wr-toast--untitled',
      this.extraClass()
    ).join(' ')
  );

  /** Escalate to `alert`/`assertive` for danger/warning toasts. */
  protected readonly liveRole = computed(() => (this.type() === 'danger' ? 'alert' : 'status'));
  protected readonly liveLevel = computed(() =>
    this.type() === 'danger' || this.type() === 'warning' ? 'assertive' : 'polite'
  );

  /** Inline CSS value for `--wr-toast-duration`. */
  protected readonly durationMs = computed(() => `${this.duration()}ms`);

  protected readonly progressVisible = computed(() => this.showProgress() && this.duration() > 0);

  /**
   * What the copy button puts on the clipboard: the message, or the title when
   * the toast has nothing else. A title-only toast copied an empty string, and
   * still flipped the glyph to the "Copied" check.
   */
  private readonly copyText = computed(() => (this.message() !== '' ? this.message() : (this.title() ?? '')));

  protected async onCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.copyText());
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
