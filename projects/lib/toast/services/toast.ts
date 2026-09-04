/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { type ComponentRef, Service, inject } from '@angular/core';

import { WR_OVERLAY } from 'ngwr/overlay';

import type { WrToastOptions, WrToastPosition } from '../interfaces';
import { WrToastHost } from '../toast-host';
import { WrToastRef } from '../toast-ref';
import { WR_TOAST_CONFIG } from '../tokens';

type ActiveEntry = WrToastOptions & {
  readonly id: number;
  /** Resolved auto-dismiss duration in ms after merging with global config. */
  readonly resolvedDuration: number;
  /** Resolved corner for this stack. */
  readonly resolvedPosition: WrToastPosition;
  /** Pending timeout handle. */
  timer?: ReturnType<typeof setTimeout>;
  /** Timestamp of the last timer (re)start, used to compute remaining on pause. */
  startedAt?: number;
  /** Milliseconds left when paused. */
  remaining: number;
};

/**
 * Opens toast notifications in a single shared overlay.
 *
 * Global defaults come from {@link WR_TOAST_CONFIG}; register
 * {@link provideWrToastConfig} once at bootstrap to customise. Each
 * `show()` call accepts per-toast overrides via {@link WrToastOptions}.
 *
 * @example
 * ```ts
 * const toast = inject(WrToast);
 *
 * toast.show({ type: 'success', title: 'Saved', message: 'Profile updated.' });
 * toast.show({ type: 'danger', message: 'Network error', duration: 0 });
 * toast.show({ message: 'Permalink copied', position: 'bottom', showCopy: true });
 * ```
 *
 * @see https://ngwr.dev/reference/components/toast
 */
@Service()
export class WrToast {
  private readonly overlay = inject(WR_OVERLAY);
  private readonly config = inject(WR_TOAST_CONFIG);

  private overlayRef: OverlayRef | null = null;
  private hostRef: ComponentRef<WrToastHost> | null = null;
  /** Watches the overlay container for overlays opened after the host. */
  private containerObserver: MutationObserver | null = null;
  private currentPosition: WrToastPosition = this.config.position;
  private currentMode: 'stack' | 'list' = this.config.mode;
  private nextId = 1;
  /** Currently rendered toasts (capped at `config.maxStack`). */
  private active: ActiveEntry[] = [];
  /** Overflow waiting for a free slot — promoted FIFO as actives dismiss, so
   * nothing is ever silently dropped. */
  private queue: ActiveEntry[] = [];

  /** Open a toast. Returns a handle you can `dismiss()` early. */
  show(options: WrToastOptions): WrToastRef {
    const resolvedPosition = options.position ?? this.config.position;
    const resolvedDuration = options.duration ?? this.config.duration;

    this.ensureHost(resolvedPosition);
    // A toast raised now belongs above everything already on screen, and the host
    // it goes into may be much older than the dialog it has to clear. See
    // `raiseHost`.
    this.raiseHost();

    const entry: ActiveEntry = {
      ...options,
      id: this.nextId++,
      resolvedDuration,
      resolvedPosition,
      remaining: resolvedDuration,
    };

    const max = this.config.maxStack;
    if (max > 0 && this.active.length >= max) {
      // Stack is full — hold this one in the queue (no timer until it's shown).
      this.queue = [...this.queue, entry];
      this.pushToHost();
    } else {
      this.active = [...this.active, entry];
      this.pushToHost();
      this.startTimer(entry);
    }

    return new WrToastRef(entry.id, options, id => this.dismiss(id));
  }

  /** Dismiss a single toast by id. */
  dismiss(id: number): void {
    const entry = this.active.find(t => t.id === id);
    if (entry?.timer) clearTimeout(entry.timer);
    this.active = this.active.filter(t => t.id !== id);
    // A dismiss can also target a still-queued toast.
    this.queue = this.queue.filter(t => t.id !== id);
    this.promoteFromQueue();
    this.pushToHost();
    if (this.active.length === 0 && this.queue.length === 0) this.disposeHost();
  }

  /** Dismiss every visible toast. Wired to the host's "Close all" button. */
  dismissAll(): void {
    for (const entry of this.active) {
      if (entry.timer) clearTimeout(entry.timer);
    }
    this.active = [];
    this.queue = [];
    this.disposeHost();
  }

  /** Change the corner the stack opens in. Affects future toasts. */
  setPosition(position: WrToastPosition): void {
    this.currentPosition = position;
    if (this.hostRef) this.hostRef.setInput('position', position);
  }

  /** Switch the layout mode at runtime. Persists across host re-creation. */
  setMode(mode: 'stack' | 'list'): void {
    this.currentMode = mode;
    if (this.hostRef) this.hostRef.setInput('mode', mode);
  }

  // Timer

  private startTimer(entry: ActiveEntry): void {
    if (entry.remaining <= 0) return;
    entry.startedAt = Date.now();
    entry.timer = setTimeout(() => this.dismiss(entry.id), entry.remaining);
  }

  private pauseTimer(entry: ActiveEntry): void {
    if (!entry.timer) return;
    clearTimeout(entry.timer);
    entry.timer = undefined;
    if (entry.startedAt) {
      entry.remaining = Math.max(0, entry.remaining - (Date.now() - entry.startedAt));
    }
  }

  // Host plumbing

  private ensureHost(position: WrToastPosition): void {
    if (this.overlayRef) {
      if (position !== this.currentPosition) this.setPosition(position);
      return;
    }

    this.currentPosition = position;

    this.overlayRef = this.overlay.create({
      positionStrategy: this.overlay.position().global(),
      scrollStrategy: this.overlay.scrollStrategies.noop(),
      hasBackdrop: false,
      panelClass: ['wr-toast-overlay'],
    });

    const portal = new ComponentPortal(WrToastHost);
    this.hostRef = this.overlayRef.attach(portal);
    this.hostRef.setInput('position', position);
    this.hostRef.setInput('mode', this.currentMode);
    this.hostRef.setInput('config', this.config);

    const inst = this.hostRef.instance;
    inst.dismissed.subscribe(id => this.dismiss(id));
    inst.dismissAllRequested.subscribe(() => this.dismissAll());
    inst.pauseRequested.subscribe(id => {
      const entry = this.active.find(t => t.id === id);
      if (entry) this.pauseTimer(entry);
    });
    inst.resumeRequested.subscribe(id => {
      const entry = this.active.find(t => t.id === id);
      if (entry) this.startTimer(entry);
    });

    this.watchForNewerOverlays();
  }

  /**
   * Put the host back on top of the browser's top layer.
   *
   * The stacking rule here is not a z-index and cannot be fixed with one. CDK 22
   * promotes every overlay by calling `showPopover()` on its host element, and
   * the top layer is ordered by the MOMENT of promotion — a popover shown later
   * paints over one shown earlier no matter what either element's z-index, DOM
   * order or containing block says. The toast host is created once and kept
   * alive until the last toast leaves, so its place in that order is frozen at
   * whenever the first toast of the run appeared. Every dialog and drawer opened
   * after that sits above it.
   *
   * The symptom was as bad as the mechanism is quiet: a toast raised from inside
   * an open dialog rendered UNDER the dialog's backdrop, dimmed by it and
   * hit-tested as it — so the close button was unreachable and clicking where it
   * appeared closed the dialog instead. Nothing threw, and a toast with
   * `duration: 0` never went away on its own.
   *
   * Hiding and re-showing moves the host to the end of the top layer. Both calls
   * happen in one task, so there is no frame in which the host is `display:
   * none` and nothing re-runs a toast's enter animation.
   *
   * Skipped while focus is inside the host: Chromium keeps focus across this
   * pair, but the hide-popover algorithm is specified to restore focus to the
   * previously focused element, and a host the user is already tabbing through
   * is by definition reachable. In practice the two never coincide — a modal
   * traps focus, so focus inside the host means nothing is above it to escape.
   */
  private raiseHost(): void {
    const host = this.overlayRef?.hostElement;
    // `usePopover` is off when the platform has no popover support (and on the
    // server), and then there is no top layer to be at the wrong end of.
    if (!host?.isConnected || !host.hasAttribute('popover')) return;
    if (host.contains(host.ownerDocument.activeElement)) return;
    try {
      host.hidePopover();
      host.showPopover();
    } catch {
      // `hidePopover` throws if the host is not showing — nothing to raise.
    }
  }

  /**
   * Re-raise the host whenever another overlay joins the container.
   *
   * `show()` covers the reported order (toast raised while a dialog is up). This
   * covers the mirror image, which is the same defect seen from the other side:
   * a toast already on screen when the dialog opens is left under it, unclickable
   * for the rest of its duration, and no further `show()` is coming to fix it.
   *
   * Observing the host's own parent rather than a container resolved from the
   * injector keeps this correct whether or not `provideWrOverlay()` is installed
   * — the host is in whichever container it was actually appended to. Re-showing
   * a popover moves nothing in the DOM, so this cannot re-trigger itself.
   */
  private watchForNewerOverlays(): void {
    const parent = this.overlayRef?.hostElement.parentElement;
    if (!parent || typeof MutationObserver === 'undefined') return;
    this.containerObserver = new MutationObserver(() => this.raiseHost());
    this.containerObserver.observe(parent, { childList: true });
  }

  /** Fill any free stack slots from the queue (FIFO), starting each promoted
   * toast's auto-dismiss timer only as it becomes visible. */
  private promoteFromQueue(): void {
    const max = this.config.maxStack;
    while ((max <= 0 || this.active.length < max) && this.queue.length > 0) {
      const [next, ...rest] = this.queue;
      this.queue = rest;
      this.active = [...this.active, next];
      this.startTimer(next);
    }
  }

  private pushToHost(): void {
    this.hostRef?.instance.toasts.set([...this.active]);
    this.hostRef?.instance.queued.set(this.queue.length);
  }

  private disposeHost(): void {
    this.containerObserver?.disconnect();
    this.containerObserver = null;
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
      this.hostRef = null;
    }
  }
}
