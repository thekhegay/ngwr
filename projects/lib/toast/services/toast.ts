/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directionality } from '@angular/cdk/bidi';
import { type OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { type ComponentRef, Injector, Service, inject } from '@angular/core';

import { WR_OVERLAY, WrOverlayOrder, wrFollowDirection } from 'ngwr/overlay';

import { WrToastChannel, WrToastChannels, type WrToastEntry } from '../toast-channel';
import { WrToastHost } from '../toast-host';
import { WrToastRef } from '../toast-ref';
import { WR_TOAST_CONFIG } from '../tokens';
import type { WrToastOptions, WrToastPosition } from '../types';

/**
 * Opens toast notifications in a single shared overlay, or in the page
 * through a `<wr-toast-outlet>` when `show()` names one.
 *
 * Global defaults come from {@link WR_TOAST_CONFIG}; register
 * `provideWr(withToast(...))` once at bootstrap to customise. Each
 * `show()` call accepts per-toast overrides via {@link WrToastOptions}.
 *
 * @example
 * ```ts
 * const toast = inject(WrToast);
 *
 * toast.show({ type: 'success', title: 'Saved', message: 'Profile updated.' });
 * toast.show({ type: 'danger', message: 'Network error', duration: 0 });
 * toast.show({ message: 'Permalink copied', position: 'bottom', showCopy: true });
 * toast.show({ message: 'Item deleted', action: { label: 'Undo', run: () => restore() } });
 * toast.show({ type: 'danger', message: 'Door forced', outlet: 'alarms' });
 * ```
 *
 * @see https://ngwr.dev/reference/components/toast
 */
@Service()
export class WrToast {
  private readonly overlay = inject(WR_OVERLAY);
  private readonly order = inject(WrOverlayOrder);
  private readonly config = inject(WR_TOAST_CONFIG);
  private readonly injector = inject(Injector);
  private readonly dir = inject(Directionality, { optional: true });

  private overlayRef: OverlayRef | null = null;
  private hostRef: ComponentRef<WrToastHost> | null = null;
  /** Watches the overlay container for overlays opened after the host. */
  private containerObserver: MutationObserver | null = null;
  /** Set for the rest of the frame in which the host was moved. */
  private raiseFrame: number | null = null;
  private raiseAgain = false;
  private currentPosition: WrToastPosition = this.config.position;
  private currentMode: 'stack' | 'list' = this.config.mode;
  private nextId = 1;
  /** The stack in the overlay. Past `maxStack` the newest waits, so nothing is
   * ever silently dropped. */
  private readonly global = new WrToastChannel(
    id => this.dismiss(id),
    false,
    true,
    this.config.maxStack,
    this.config.duration
  );
  private readonly outlets = inject(WrToastChannels);

  /** Open a toast. Returns a handle you can `dismiss()` early. */
  show(options: WrToastOptions): WrToastRef {
    const id = this.nextId++;
    const ref = new WrToastRef(id, options, toastId => this.dismiss(toastId));

    if (options.outlet != null) {
      const channel = this.outlets.get(options.outlet);
      const resolvedDuration = options.duration ?? channel.duration;
      channel.add({ ...options, id, resolvedDuration, remaining: resolvedDuration });
      return ref;
    }

    // `currentPosition` before the injected default, so `setPosition()` holds
    // across a host that has been disposed. `dismiss()` and `dismissAll()`
    // tear the host down, so "no host alive" is the state before the first
    // toast of a run and after the last one goes — exactly where the stack
    // used to snap back to the configured corner with nothing to say so.
    // `setMode` already persisted this way, and its JSDoc says it does.
    // `currentPosition` is seeded from the config, so the default still wins
    // when nobody has called `setPosition`.
    const resolvedPosition = options.position ?? this.currentPosition;
    const resolvedDuration = options.duration ?? this.config.duration;

    this.ensureHost(resolvedPosition);
    // A toast raised now belongs above everything already on screen, and the host
    // it goes into may be much older than the dialog it has to clear. It moves
    // only if something joined the top layer since. See `raiseHost`.
    this.raiseHost();

    const entry: WrToastEntry = { ...options, id, resolvedDuration, remaining: resolvedDuration };
    this.global.add(entry);
    this.pushToHost();

    return ref;
  }

  /** Dismiss a single toast by id, in whichever stack holds it. */
  dismiss(id: number): void {
    if (!this.global.remove(id)) this.outlets.remove(id);
    this.pushToHost();
    if (this.global.empty) this.disposeHost();
  }

  /**
   * Closes first: a second press finds no entry, so `run` cannot fire twice,
   * and a `run` that throws still leaves the toast closed.
   */
  private runAction(id: number): void {
    const action = this.global.find(id)?.action;
    if (!action) return;
    this.dismiss(id);
    action.run();
  }

  /**
   * Dismiss every toast of one stack: the global one, or the named outlet's.
   * The global "Close all" button calls it with no name, so it leaves the
   * outlets alone.
   */
  dismissAll(outlet?: string): void {
    if (outlet != null) {
      this.outlets.get(outlet).clear();
      return;
    }
    this.global.clear();
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

    // The corner is `inset-inline-start` / `-end` on the host component, so the
    // side the stack sits on is decided entirely by the `dir` the CDK wrote at
    // create. This host outlives every individual toast — it is torn down only
    // when the last one leaves — so without this a stack raised before a flip
    // stays on the reader's old side for the rest of the run. The position
    // strategy is bare, so nothing else moves. Torn down with the ref by
    // `disposeHost()`, and the next `ensureHost()` installs a new follower.
    wrFollowDirection(this.overlayRef, this.dir, this.injector);

    const portal = new ComponentPortal(WrToastHost);
    this.hostRef = this.overlayRef.attach(portal);
    this.hostRef.setInput('position', position);
    this.hostRef.setInput('mode', this.currentMode);
    this.hostRef.setInput('config', this.config);

    const inst = this.hostRef.instance;
    inst.dismissed.subscribe(id => this.dismiss(id));
    inst.actionRequested.subscribe(id => this.runAction(id));
    inst.dismissAllRequested.subscribe(() => this.dismissAll());
    inst.pauseRequested.subscribe(id => this.global.pause(id));
    inst.resumeRequested.subscribe(id => this.global.resume(id));
    inst.holdChange.subscribe(held => this.global.setHeld(held));

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
   *
   * `WrOverlayOrder` does the move, because "on top" has an exception: an
   * overlay opened with `toasts: 'below'` stays over the host, so it leaves the
   * host alone where it already sits under one and promotes those overlays
   * again where it does not. It also knows whether anything joined the top
   * layer since the last move, and moves nothing when nothing did.
   *
   * The move restyles the whole stack, so it runs once a frame at most: a
   * second one asked for in the same frame waits for the next.
   */
  private raiseHost(): void {
    const host = this.overlayRef?.hostElement;
    // `usePopover` is off when the platform has no popover support (and on the
    // server), and then there is no top layer to be at the wrong end of.
    if (!host?.isConnected || !host.hasAttribute('popover')) return;
    if (host.contains(host.ownerDocument.activeElement)) return;
    if (this.raiseFrame !== null) {
      this.raiseAgain = true;
      return;
    }
    if (!this.order.raiseToasts(host)) return;
    this.raiseFrame = requestAnimationFrame(() => {
      this.raiseFrame = null;
      if (!this.raiseAgain) return;
      this.raiseAgain = false;
      this.raiseHost();
    });
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
   * injector keeps this correct even for an app that rebinds `WR_OVERLAY` — the
   * host is in whichever container it was actually appended to. Re-showing a
   * popover moves nothing in the DOM, so this cannot re-trigger itself.
   */
  private watchForNewerOverlays(): void {
    const parent = this.overlayRef?.hostElement.parentElement;
    if (!parent || typeof MutationObserver === 'undefined') return;
    this.containerObserver = new MutationObserver(records => {
      if (!records.some(record => record.addedNodes.length > 0)) return;
      this.order.joined();
      this.raiseHost();
    });
    this.containerObserver.observe(parent, { childList: true });
  }

  private pushToHost(): void {
    this.hostRef?.instance.toasts.set(this.global.toasts());
    this.hostRef?.instance.queued.set(this.global.queued());
  }

  private disposeHost(): void {
    // The next host starts with nobody in it.
    this.global.setHeld(false);
    this.containerObserver?.disconnect();
    this.containerObserver = null;
    if (this.raiseFrame !== null) cancelAnimationFrame(this.raiseFrame);
    this.raiseFrame = null;
    this.raiseAgain = false;
    this.order.dropToasts();
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
      this.hostRef = null;
    }
  }
}
