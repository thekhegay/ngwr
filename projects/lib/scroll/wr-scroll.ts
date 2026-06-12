/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DOCUMENT } from '@angular/common';
import { Service, inject } from '@angular/core';

import { WrPlatform } from 'ngwr/platform';

import type { WrScrollOptions, WrScrollTarget } from './interfaces';

/**
 * Smooth-scroll utility. Resolves `id` / selector / element / coords
 * targets; subtracts an `offset` (for sticky headers); respects
 * `prefers-reduced-motion` — automatically falls back to instant
 * scrolling when the user has opted out.
 *
 * SSR-safe — all methods no-op on the server.
 *
 * @example
 * ```ts
 * const scroll = inject(WrScroll);
 * scroll.to('#section-three', { offset: 80 });
 * scroll.toTop({ smooth: false });
 * scroll.intoView(myEl, { offset: 64 });
 * ```
 *
 * @see https://ngwr.dev/services/scroll
 */
@Service()
export class WrScroll {
  private readonly doc = inject(DOCUMENT);
  private readonly platform = inject(WrPlatform);

  /** Scroll to an arbitrary target. */
  to(target: WrScrollTarget, options: WrScrollOptions = {}): void {
    if (!this.platform.isBrowser) return;
    const win = this.doc.defaultView;
    if (!win) return;

    const offset = options.offset ?? 0;
    const behavior = this.behavior(options.smooth);
    const container = options.container ?? win;

    if (typeof target === 'object' && 'top' in target) {
      this.scroll(container, { top: target.top - offset, left: target.left ?? 0, behavior });
      return;
    }

    const el = typeof target === 'string' ? this.resolveSelector(target) : target;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    if (container === win) {
      const top = rect.top + win.scrollY - offset;
      this.scroll(container, { top, left: 0, behavior });
    } else {
      const ctx = container as Element;
      const ctxRect = ctx.getBoundingClientRect();
      const top = rect.top - ctxRect.top + ctx.scrollTop - offset;
      this.scroll(container, { top, left: 0, behavior });
    }
  }

  /** Convenience for an element — accepts the same options. */
  intoView(el: Element, options: WrScrollOptions = {}): void {
    this.to(el, options);
  }

  /** Scroll the page (or container) to the top. */
  toTop(options: WrScrollOptions = {}): void {
    this.to({ top: 0 }, options);
  }

  // Internals

  private resolveSelector(value: string): Element | null {
    if (value.startsWith('#')) {
      return this.doc.getElementById(value.slice(1));
    }
    try {
      return this.doc.querySelector(value);
    } catch {
      return null;
    }
  }

  private behavior(requested: boolean | undefined): ScrollBehavior {
    if (requested === false) return 'auto';
    if (this.platform.prefersReducedMotion()) return 'auto';
    return 'smooth';
  }

  private scroll(container: Window | Element, options: ScrollToOptions): void {
    if (container instanceof Window) container.scrollTo(options);
    else container.scrollTo(options);
  }
}
