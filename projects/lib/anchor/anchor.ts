/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceNumberProperty } from '@angular/cdk/coercion';
import {
  Component,
  DestroyRef,
  NgZone,
  ViewEncapsulation,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

import { useI18nText } from 'ngwr/i18n';
import { WrPlatform } from 'ngwr/platform';
import { WrScroll } from 'ngwr/scroll';

import type { WrAnchorLink } from './types';

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
 * @see https://ngwr.dev/reference/components/anchor
 */
@Component({
  selector: 'wr-anchor',
  templateUrl: './anchor.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-anchor', role: 'navigation', '[attr.aria-label]': 'resolvedAriaLabel()' },
})
export class WrAnchor {
  /**
   * The entries, in DOCUMENT ORDER — the scroll spy walks them top to bottom
   * and stops at the first target below the cursor line, so a list in any other
   * order highlights the wrong entry.
   */
  readonly links = input<readonly WrAnchorLink[]>([]);

  /**
   * Accessible name for the navigation landmark. Falls back to `anchor.label`,
   * then `'Table of contents'` — it used to be that English string, hard-coded
   * on the host, in a landmark a screen reader reads out on every page.
   */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = useI18nText(this.ariaLabel, 'anchor.label', 'Table of contents');

  /** Pixel offset subtracted on scroll — for sticky headers. @default 0 */
  readonly offset = input(0, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 0)) });

  /** Highlight an item when its target's top is within this many px of the offset line. @default 80 */
  readonly hitArea = input(80, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 80)) });

  protected readonly activeId = signal<string | null>(null);

  /**
   * Flat list of the ids the template RENDERS — top level plus one level of
   * children, which is the nesting `WrAnchorLink` documents. It used to recurse
   * all the way down, so a third level was spied on and drawn nowhere: scrolling
   * through a grandchild made it active, no rendered link matched the id, and
   * the highlight vanished for that whole region rather than resting on its
   * parent.
   */
  protected readonly flatIds = computed<readonly string[]>(() => {
    const out: string[] = [];
    for (const item of this.links()) {
      out.push(item.id);
      for (const child of item.children ?? []) out.push(child.id);
    }
    return out;
  });

  private readonly scroll = inject(WrScroll);
  private readonly platform = inject(WrPlatform);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  /**
   * The entry a click asked for, and the scroll position that click sends the
   * page to. A target near the end of the page can never reach the cursor line —
   * the page runs out of scroll first — so the spy took the highlight straight
   * back from the entry just clicked and handed it to the one above. While the
   * page is still travelling toward that position, or parked on it, the clicked
   * entry stays lit; the first scroll AWAY from it is the reader's own, and the
   * spy takes over again.
   */
  private pinned: { readonly id: string; readonly y: number } | null = null;
  private lastY = 0;

  constructor() {
    if (!this.platform.isBrowser) return;
    const handler = (): void => {
      const y = window.scrollY;
      const pin = this.pinned;
      if (pin) {
        const distance = Math.abs(pin.y - y);
        if (distance <= 1 || distance < Math.abs(pin.y - this.lastY)) {
          this.lastY = y;
          if (pin.id !== this.activeId()) this.zone.run(() => this.activeId.set(pin.id));
          return;
        }
        this.pinned = null;
      }
      this.lastY = y;
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
    this.destroyRef.onDestroy(() => window.removeEventListener('scroll', handler));
    // The first pass has to wait for a render: the targets are elsewhere on the
    // page and are usually rendered AFTER this list, so a constructor-time pass
    // found nothing by `getElementById` and left the page with no highlight at
    // all until the reader happened to scroll.
    afterNextRender(() => handler());
  }

  protected onClick(id: string, event: MouseEvent): void {
    event.preventDefault();
    const target = document.getElementById(id);
    if (target) {
      // Where `WrScroll` sends the page, clamped the way the browser clamps it.
      const root = document.documentElement;
      const max = Math.max(0, root.scrollHeight - root.clientHeight);
      const y = target.getBoundingClientRect().top + window.scrollY - this.offset();
      this.pinned = { id, y: Math.min(max, Math.max(0, y)) };
      this.lastY = window.scrollY;
    }
    this.scroll.to(`#${id}`, { offset: this.offset() });
    this.activeId.set(id);
  }
}

export type { WrAnchorLink } from './types';
