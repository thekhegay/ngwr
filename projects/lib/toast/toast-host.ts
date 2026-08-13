/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, DestroyRef, ViewEncapsulation, computed, inject, input, output, signal } from '@angular/core';

import { useI18nText } from 'ngwr/i18n';

import type { WrToastConfig, WrToastMode, WrToastOptions, WrToastPosition } from './interfaces';
import { WrToastItem } from './toast-item';

/** ms before the pointer or focus leaving actually collapses the stack. Buffers
 * the cursor briefly leaving the host as toasts reflow underneath it, and focus
 * hopping between two buttons inside the host. */
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
    '[attr.aria-label]': 'regionLabel()',
    '(mouseenter)': 'onMouseEnter()',
    '(mouseleave)': 'onMouseLeave()',
    '(focusin)': 'onFocusIn()',
    '(focusout)': 'onFocusOut()',
  },
  imports: [WrToastItem],
})
export class WrToastHost {
  readonly position = input<WrToastPosition>('top-end');
  readonly config = input.required<WrToastConfig>();
  /** Layout mode. @default 'stack' (Sonner-style; hover to fan out) */
  readonly mode = input<WrToastMode>('stack');

  /**
   * Every string this host and its items render, resolved through the catalog.
   *
   * The config value WINS when the consumer sets one, and its default is now
   * `null` — until v11 those defaults were English literals, so the four
   * `toast.*` keys in the shipped catalogs were dead and a Russian app got an
   * English close button. `region` had no key at all: the live region's name
   * was the literal `'Notifications'` in a host binding.
   */
  protected readonly regionLabel = useI18nText(signal(null), 'toast.region', 'Notifications');

  private readonly closeLabel = useI18nText(
    computed(() => this.config().labels.close),
    'toast.close',
    'Close'
  );
  private readonly copyLabel = useI18nText(
    computed(() => this.config().labels.copy),
    'toast.copy',
    'Copy'
  );
  private readonly copiedLabel = useI18nText(
    computed(() => this.config().labels.copied),
    'toast.copied',
    'Copied'
  );
  protected readonly closeAllLabel = useI18nText(
    computed(() => this.config().labels.closeAll),
    'toast.closeAll',
    'Close all'
  );

  /** What `wr-toast-item` receives — resolved, so the item stays presentational. */
  protected readonly labels = computed(() => ({
    close: this.closeLabel(),
    copy: this.copyLabel(),
    copied: this.copiedLabel(),
    closeAll: this.closeAllLabel(),
  }));

  /** @internal — hovering or focusing the stack toggles this in stack mode. */
  protected readonly expanded = signal(false);

  /** Pointer is over the host. */
  private readonly hovered = signal(false);
  /** Focus is somewhere inside the host — keyboard equivalent of hovering, and
   * the only way a keyboard user can reach the "Close all" button. */
  private readonly focusWithin = signal(false);

  private readonly destroyRef = inject(DestroyRef);
  private collapseTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.clearCollapseTimer());
  }

  /** @internal */
  protected onMouseEnter(): void {
    this.hovered.set(true);
    this.syncExpanded();
  }

  /** @internal */
  protected onMouseLeave(): void {
    this.hovered.set(false);
    this.syncExpanded();
  }

  /** @internal */
  protected onFocusIn(): void {
    this.focusWithin.set(true);
    this.syncExpanded();
  }

  /** @internal */
  protected onFocusOut(): void {
    this.focusWithin.set(false);
    this.syncExpanded();
  }

  /** Expand immediately while the pointer or focus is inside, and delay the
   * collapse so a cursor briefly slipping off the host during a layout reflow
   * — or focus moving between two buttons inside it — doesn't cause a flicker. */
  private syncExpanded(): void {
    if (this.hovered() || this.focusWithin()) {
      this.clearCollapseTimer();
      this.expanded.set(true);
      return;
    }
    if (this.collapseTimer !== null) return;
    this.collapseTimer = setTimeout(() => {
      this.collapseTimer = null;
      if (!this.hovered() && !this.focusWithin()) this.expanded.set(false);
    }, COLLAPSE_DELAY_MS);
  }

  private clearCollapseTimer(): void {
    if (this.collapseTimer !== null) {
      clearTimeout(this.collapseTimer);
      this.collapseTimer = null;
    }
  }

  /** @internal — pushed by the service: the rendered (capped) stack. */
  readonly toasts = signal<readonly ActiveToast[]>([]);

  /** @internal — pushed by the service: count still queued behind the cap. */
  readonly queued = signal(0);

  /** Total outstanding toasts (visible + queued) — what "Close all" clears. */
  protected readonly totalCount = computed(() => this.toasts().length + this.queued());

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
    // Only show it once the stack is expanded — by hover OR by focus entering
    // it, so it stays reachable from the keyboard — or always in list mode.
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
