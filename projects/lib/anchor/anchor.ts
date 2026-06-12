/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceNumberProperty } from '@angular/cdk/coercion';
import { Component, DestroyRef, NgZone, ViewEncapsulation, computed, inject, input, signal } from '@angular/core';

import { WrPlatform } from 'ngwr/platform';
import { WrScroll } from 'ngwr/scroll';

import type { WrAnchorLink } from './interfaces';

/**
 * Scroll-spy in-page navigation. Renders a list of links to elements on
 * the page; clicking a link smooth-scrolls (via {@link WrScroll}),
 * and the closest visible heading auto-highlights as the user scrolls.
 *
 * @example
 * ```html
 * <wr-anchor
 *   [links]="[
 *     { id: 'intro', label: 'Introduction' },
 *     { id: 'usage', label: 'Usage', children: [
 *       { id: 'basic', label: 'Basic' },
 *       { id: 'advanced', label: 'Advanced' },
 *     ]}
 *   ]"
 *   [offset]="80"
 * />
 * ```
 *
 * @see https://ngwr.dev/components/anchor
 */
@Component({
  selector: 'wr-anchor',
  templateUrl: './anchor.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-anchor', role: 'navigation', 'aria-label': 'Table of contents' },
})
export class WrAnchor {
  readonly links = input<readonly WrAnchorLink[]>([]);

  /** Pixel offset subtracted on scroll — for sticky headers. @default 0 */
  readonly offset = input(0, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 0)) });

  /** Highlight an item when its target's top is within this many px of the offset line. @default 80 */
  readonly hitArea = input(80, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 80)) });

  protected readonly activeId = signal<string | null>(null);

  /** Flat list of all ids (top-level + children) — used for scroll spy. */
  protected readonly flatIds = computed<readonly string[]>(() => {
    const out: string[] = [];
    const walk = (list: readonly WrAnchorLink[]): void => {
      for (const item of list) {
        out.push(item.id);
        if (item.children) walk(item.children);
      }
    };
    walk(this.links());
    return out;
  });

  private readonly scroll = inject(WrScroll);
  private readonly platform = inject(WrPlatform);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    if (!this.platform.isBrowser) return;
    const handler = (): void => {
      const cursor = this.offset() + this.hitArea();
      let active: string | null = null;
      for (const id of this.flatIds()) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= cursor) active = id;
        else break;
      }
      if (active !== this.activeId()) this.zone.run(() => this.activeId.set(active));
    };
    this.zone.runOutsideAngular(() => window.addEventListener('scroll', handler, { passive: true }));
    // Initial pass.
    handler();
    this.destroyRef.onDestroy(() => window.removeEventListener('scroll', handler));
  }

  protected onClick(id: string, event: MouseEvent): void {
    event.preventDefault();
    this.scroll.to(`#${id}`, { offset: this.offset() });
    this.activeId.set(id);
  }
}

export type { WrAnchorLink } from './interfaces';
