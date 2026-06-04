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

import { WrToastHost } from './toast-host';
import { WrToastRef } from './toast-ref';
import { WR_TOAST_CONFIG } from './tokens';
import type { WrToastOptions, WrToastPosition } from './types';

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
 * @see https://ngwr.dev/docs/components/toast
 */
@Service()
export class WrToast {
  private readonly overlay = inject(WR_OVERLAY);
  private readonly config = inject(WR_TOAST_CONFIG);

  private overlayRef: OverlayRef | null = null;
  private hostRef: ComponentRef<WrToastHost> | null = null;
  private currentPosition: WrToastPosition = this.config.position;
  private nextId = 1;
  private active: ActiveEntry[] = [];

  /** Open a toast. Returns a handle you can `dismiss()` early. */
  show(options: WrToastOptions): WrToastRef {
    const resolvedPosition = options.position ?? this.config.position;
    const resolvedDuration = options.duration ?? this.config.duration;

    this.ensureHost(resolvedPosition);

    const entry: ActiveEntry = {
      ...options,
      id: this.nextId++,
      resolvedDuration,
      resolvedPosition,
      remaining: resolvedDuration,
    };

    this.active = [...this.active, entry];
    this.enforceMaxStack();
    this.pushToHost();
    this.startTimer(entry);

    return new WrToastRef(entry.id, options, id => this.dismiss(id));
  }

  /** Dismiss a single toast by id. */
  dismiss(id: number): void {
    const entry = this.active.find(t => t.id === id);
    if (entry?.timer) clearTimeout(entry.timer);
    this.active = this.active.filter(t => t.id !== id);
    this.pushToHost();
    if (this.active.length === 0) this.disposeHost();
  }

  /** Dismiss every visible toast. Wired to the host's "Close all" button. */
  dismissAll(): void {
    for (const entry of this.active) {
      if (entry.timer) clearTimeout(entry.timer);
    }
    this.active = [];
    this.disposeHost();
  }

  /** Change the corner the stack opens in. Affects future toasts. */
  setPosition(position: WrToastPosition): void {
    this.currentPosition = position;
    if (this.hostRef) this.hostRef.setInput('position', position);
  }

  /** Switch the layout mode at runtime. Affects the live host. */
  setMode(mode: 'stack' | 'list'): void {
    if (this.hostRef) this.hostRef.setInput('mode', mode);
  }

  // ──────── Timer ────────

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

  // ──────── Host plumbing ────────

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
    this.hostRef.setInput('mode', this.config.mode);
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
  }

  private enforceMaxStack(): void {
    const max = this.config.maxStack;
    if (max <= 0 || this.active.length <= max) return;
    const overflow = this.active.slice(0, this.active.length - max);
    for (const entry of overflow) {
      if (entry.timer) clearTimeout(entry.timer);
    }
    this.active = this.active.slice(this.active.length - max);
  }

  private pushToHost(): void {
    this.hostRef?.instance.toasts.set([...this.active]);
  }

  private disposeHost(): void {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
      this.hostRef = null;
    }
  }
}
