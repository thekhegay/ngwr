/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type ScrollStrategy, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { isPlatformBrowser } from '@angular/common';
import { DOCUMENT, DestroyRef, PLATFORM_ID, Service, inject } from '@angular/core';

/** What stays reachable beside a modal: overlay containers, whatever holds one, and live regions. */
const KEEP = '.cdk-overlay-container, [aria-live], [role="status"], [role="alert"], [role="log"]';

/**
 * Page lock shared by every modal NGWR overlay: the scroll, and the content
 * behind the modal, which is `inert` while any holder is enabled. That is what
 * `aria-modal="true"` promises, and a screen reader in browse mode does not
 * take the attribute's word for it.
 *
 * Every child of `<body>` goes inert except the overlay containers (toasts
 * and other overlays live there) and live regions, which an inert subtree
 * would silence. Only the elements made inert here are released: one that was
 * inert already stays so.
 *
 * CDK's `block()` strategy has no counter: a second one refuses to engage while
 * the first holds the page, and its `disable()` is then a no-op, so closing the
 * first of two stacked modals released the page under the one still open. Here
 * every strategy is a holder, the page stays blocked while any holder is
 * enabled and is released when the last one disables, in whatever order.
 *
 * @internal
 */
@Service()
export class WrScrollBlock {
  private readonly block = inject(ScrollStrategyOptions).block();
  private readonly doc = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly inerted = new Set<Element>();
  private observer: MutationObserver | null = null;
  private holders = 0;
  private isolating = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.release());
  }

  /**
   * A scroll strategy for one overlay (or one component) that blocks the page while it is enabled.
   *
   * @param inert `false` for a modal that renders inside the page rather than
   * in the overlay container: an inert page would take it along.
   */
  strategy(inert = true): ScrollStrategy {
    let held = false;
    return {
      attach: () => undefined,
      enable: () => {
        if (!held) {
          held = true;
          this.holders++;
          if (inert) this.isolating++;
        }
        // CDK ignores an enable while the page is already blocked, and one that
        // found nothing to block at the first holder may find it at a later one.
        this.block.enable();
        if (inert) this.isolate();
      },
      disable: () => {
        if (!held) return;
        held = false;
        if (--this.holders === 0) this.block.disable();
        if (inert && --this.isolating === 0) this.release();
      },
    };
  }

  /**
   * Whether the node sits in a part of the page this lock made inert. A modal
   * that renders in the page asks, to step out of it.
   */
  isolates(node: Node): boolean {
    for (const el of this.inerted) if (el.contains(node)) return true;
    return false;
  }

  private isolate(): void {
    if (!this.isBrowser) return;
    const { body } = this.doc;
    for (const el of Array.from(body.children)) this.inertChild(el);
    if (this.observer || typeof MutationObserver === 'undefined') return;
    // A sibling appended while a modal is open is behind it too.
    this.observer = new MutationObserver(records => {
      for (const record of records) {
        for (const node of Array.from(record.addedNodes)) {
          if (node.nodeType === 1 && node.parentNode === body) this.inertChild(node as Element);
        }
      }
    });
    this.observer.observe(body, { childList: true });
  }

  private inertChild(el: Element): void {
    if (el.hasAttribute('inert') || el.matches(KEEP) || el.querySelector('.cdk-overlay-container')) return;
    el.setAttribute('inert', '');
    this.inerted.add(el);
  }

  private release(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.inerted.forEach(el => el.removeAttribute('inert'));
    this.inerted.clear();
  }
}
