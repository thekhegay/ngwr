/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceNumberProperty } from '@angular/cdk/coercion';
import { DOCUMENT } from '@angular/common';
import {
  Component,
  DestroyRef,
  NgZone,
  ViewEncapsulation,
  afterNextRender,
  Injector,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';

import { useI18nText } from 'ngwr/i18n';
import { WrPlatform } from 'ngwr/platform';
import { WrScroll } from 'ngwr/scroll';
import { wrCheckStyles } from 'ngwr/utils';

import type { WrAnchorLink } from './types';

/** The viewport top of a container's padding edge, where its scrolling starts. */
function paddingTop(box: HTMLElement): number {
  return box.getBoundingClientRect().top + box.clientTop;
}

/**
 * Scroll-spy in-page navigation. Renders a list of links to elements on
 * the page; clicking a link smooth-scrolls (via {@link WrScroll}),
 * and the closest visible heading auto-highlights as the user scrolls.
 * Follows the window, or the element passed as `container`.
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

  /**
   * The element whose scroll the links follow, for targets inside a pane with
   * its own scroll: a docs panel, a dialog body, a drawer. A click scrolls it
   * and leaves the page alone. `null` follows the window. @default null
   */
  readonly container = input<HTMLElement | null>(null);

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
  private readonly doc = inject(DOCUMENT);
  private readonly zone = inject(NgZone);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  /**
   * The entry a click asked for, and the scroll position that click sends the
   * page (or the `container`) to. A target near the end of the page can never reach the cursor line —
   * the page runs out of scroll first — so the spy took the highlight straight
   * back from the entry just clicked and handed it to the one above. While the
   * page is still travelling toward that position, or parked on it, the clicked
   * entry stays lit; the first scroll AWAY from it is the reader's own, and the
   * spy takes over again.
   */
  private pinned: { readonly id: string; readonly y: number } | null = null;
  private lastY = 0;

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('anchor');
    if (!this.platform.isBrowser) return;
    const measure = (): void => {
      const box = this.container();
      const y = box ? box.scrollTop : window.scrollY;
      if (this.pinned && !this.flatIds().includes(this.pinned.id)) this.pinned = null;
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
      // Measured from the container's padding edge, the way `WrScroll` lands a click.
      const cursor = (box ? paddingTop(box) : 0) + this.offset() + this.hitArea();
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
    let frame = 0;
    const handler = (): void => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };
    effect(onCleanup => {
      const source: HTMLElement | Window = this.container() ?? window;
      // A pin is a position in the scroll box it was taken in.
      this.pinned = null;
      this.zone.runOutsideAngular(() => source.addEventListener('scroll', handler, { passive: true }));
      onCleanup(() => source.removeEventListener('scroll', handler));
    });
    this.destroyRef.onDestroy(() => {
      if (frame) cancelAnimationFrame(frame);
    });
    // The first pass has to wait for a render: the targets are elsewhere on the
    // page and are usually rendered AFTER this list, so a constructor-time pass
    // found nothing by `getElementById` and left the page with no highlight at
    // all until the reader happened to scroll.
    afterNextRender(() => measure());
    // The entries, the cursor line, its height or the scroll container changing at
    // rest moves the answer with no scroll to ask for it.
    effect(() => {
      this.container();
      this.flatIds();
      this.offset();
      this.hitArea();
      afterNextRender(() => measure(), { injector: this.injector });
    });
  }

  /** Carries the current path, so a `<base href>` cannot send copy link or a new tab to the site root. */
  protected hrefFor(id: string): string {
    const location = this.doc.location;
    return `${location?.pathname ?? ''}${location?.search ?? ''}#${id}`;
  }

  protected onClick(id: string, event: MouseEvent): void {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const box = this.container();
    const target = document.getElementById(id);
    if (target) {
      // Where `WrScroll` sends the page or the container, clamped the way the browser clamps it.
      const root = box ?? document.documentElement;
      const max = Math.max(0, root.scrollHeight - root.clientHeight);
      const from = box ? box.scrollTop : window.scrollY;
      const top = target.getBoundingClientRect().top - (box ? paddingTop(box) : 0);
      this.pinned = { id, y: Math.min(max, Math.max(0, top + from - this.offset())) };
      this.lastY = from;
    }
    this.scroll.to(`#${id}`, { offset: this.offset(), ...(box ? { container: box } : {}) });
    this.activeId.set(id);
  }
}

export type { WrAnchorLink } from './types';
