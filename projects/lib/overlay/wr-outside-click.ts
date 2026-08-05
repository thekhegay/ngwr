/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { OverlayRef } from '@angular/cdk/overlay';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, Service, inject } from '@angular/core';

import { Observable, type Subscriber } from 'rxjs';

/** One live subscription to `WrOutsideClick.outsidePointerEvents()`. */
interface Watcher {
  readonly overlayRef: OverlayRef;
  readonly subscriber: Subscriber<MouseEvent>;
}

/**
 * Shadow-piercing `event.target` — `composedPath()[0]` is the real originator
 * when the click started inside a shadow root, where `target` is retargeted to
 * the host.
 */
function eventTarget(event: Event): EventTarget | null {
  if (event.composedPath) {
    try {
      return event.composedPath()[0] ?? event.target;
    } catch {
      /* Detached / synthetic events can throw — fall through to `target`. */
    }
  }
  return event.target;
}

/** `parent.contains(child)`, but stepping out of shadow roots through their hosts. */
function containsAcrossShadow(parent: Node, child: EventTarget | null): boolean {
  const hasShadowRoot = typeof ShadowRoot !== 'undefined';
  let current = child as Node | null;
  while (current) {
    if (current === parent) return true;
    current = hasShadowRoot && current instanceof ShadowRoot ? current.host : current.parentNode;
  }
  return false;
}

/**
 * Outside-click source for overlays — a drop-in replacement for
 * `OverlayRef.outsidePointerEvents()`.
 *
 * **Why this exists.** CDK's `OverlayOutsideClickDispatcher` binds its
 * listeners to `document.body`. When page content is shorter than the viewport,
 * a click in the empty space below it targets `<html>` — and `<html>` is
 * `body`'s *parent*, so the event bubbles straight to the document and `body`
 * never sees it. The overlay silently stays open. Listening on the document
 * itself catches both cases, and costs nothing else.
 *
 * Semantics are otherwise identical to the CDK's, deliberately:
 *
 * - Emits on `click` / `auxclick` / `contextmenu`, in the capture phase, and
 *   tracks `pointerdown` so a `click` is judged by where the press *started*
 *   (a drag that ends outside the pane doesn't count as an outside click).
 * - Walks watchers top-most first and stops at the first one that contains the
 *   event, so clicking inside a stacked overlay can't close the ones beneath
 *   it (a `wr-select` opened inside a `wr-popover`, say).
 * - Fires for the very click that opened the overlay, which is why every caller
 *   also ignores events landing on its own trigger.
 *
 * Registration is per subscription: the document listeners go up with the first
 * watcher and come down with the last, so an app with no open overlay has none.
 */
@Service()
export class WrOutsideClick {
  private readonly doc = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** In attach order — last is top-most. */
  private readonly watchers: Watcher[] = [];
  private cleanup: (() => void) | null = null;
  private pressOrigin: EventTarget | null = null;

  /**
   * Emits every `click` / `auxclick` / `contextmenu` that lands outside the
   * given overlay's pane, for as long as the returned observable is subscribed.
   */
  outsidePointerEvents(overlayRef: OverlayRef): Observable<MouseEvent> {
    return new Observable<MouseEvent>(subscriber => {
      if (!this.isBrowser) return;

      const watcher: Watcher = { overlayRef, subscriber };
      this.watchers.push(watcher);
      if (this.watchers.length === 1) this.listen();

      return () => {
        const index = this.watchers.indexOf(watcher);
        if (index > -1) this.watchers.splice(index, 1);
        if (!this.watchers.length) this.unlisten();
      };
    });
  }

  private readonly onPointerDown = (event: Event): void => {
    this.pressOrigin = eventTarget(event);
  };

  private readonly onClick = (event: Event): void => {
    const target = eventTarget(event);
    const origin = event.type === 'click' && this.pressOrigin ? this.pressOrigin : target;
    this.pressOrigin = null;

    // Snapshot: a watcher that closes on this event unsubscribes synchronously,
    // mutating `watchers` while we're walking it.
    const watchers = this.watchers.slice();
    for (let i = watchers.length - 1; i > -1; i--) {
      const { overlayRef, subscriber } = watchers[i];
      if (!overlayRef.hasAttached()) continue;

      const pane = overlayRef.overlayElement;
      if (containsAcrossShadow(pane, target) || containsAcrossShadow(pane, origin)) break;

      subscriber.next(event as MouseEvent);
    }
  };

  private listen(): void {
    const options: AddEventListenerOptions = { capture: true };
    const doc = this.doc;

    doc.addEventListener('pointerdown', this.onPointerDown, options);
    doc.addEventListener('click', this.onClick, options);
    doc.addEventListener('auxclick', this.onClick, options);
    doc.addEventListener('contextmenu', this.onClick, options);

    this.cleanup = () => {
      doc.removeEventListener('pointerdown', this.onPointerDown, options);
      doc.removeEventListener('click', this.onClick, options);
      doc.removeEventListener('auxclick', this.onClick, options);
      doc.removeEventListener('contextmenu', this.onClick, options);
    };
  }

  private unlisten(): void {
    this.cleanup?.();
    this.cleanup = null;
    this.pressOrigin = null;
  }
}
