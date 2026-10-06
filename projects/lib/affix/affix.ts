/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceNumberProperty } from '@angular/cdk/coercion';
import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  Directive,
  ElementRef,
  Injector,
  PLATFORM_ID,
  afterNextRender,
  effect,
  inject,
  input,
  output,
} from '@angular/core';

/**
 * The element a `position: sticky` host actually pins against.
 *
 * Walks up looking for an ancestor that scrolls — `overflow` anything but
 * `visible` on an axis, and a box that can actually be scrolled. `null` means
 * the document scroller, which is both what the browser uses and what
 * `IntersectionObserver` takes for "the viewport".
 *
 * A `getComputedStyle` read per ancestor, once per observer construction —
 * cheap, and the only way to answer the question: CSS resolves it internally
 * and exposes nothing.
 */
function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let node = el.parentElement; node !== null; node = node.parentElement) {
    if (node === document.body || node === document.documentElement) break;
    const style = getComputedStyle(node);
    const scrolls = /auto|scroll|overlay|hidden/.test(`${style.overflowY} ${style.overflowX}`);
    if (scrolls && node.scrollHeight > node.clientHeight) return node;
  }
  return null;
}

/**
 * Stick-on-scroll directive. Combines native CSS `position: sticky` with
 * an `IntersectionObserver`-driven `wr-affix--active` state class, so consumers
 * can style the element differently while it's pinned (e.g. add a
 * shadow, change the background, shrink the height).
 *
 * The host gets `position: sticky; top: ${offsetTop}px;` inline. A tiny
 * sentinel `<div>` is inserted just before the host — when the sentinel
 * scrolls out of view, the host is "stuck" and gets `wr-affix--active`
 * + an `(wrAffixChange)` emission.
 *
 * Works inside any scroll container without configuration: CSS sticky picks
 * the nearest scrollable ancestor, and the observer watching for the pinned
 * state is given that same element as its root — see `scrollParent`. Without
 * that second half the two measured different lines, and the state never
 * flipped inside a nested scroller.
 *
 * @example
 * ```html
 * <header wrAffix [wrAffixOffsetTop]="0">
 *   <!-- adds a shadow once stuck -->
 * </header>
 * ```
 *
 * ```scss
 * header.wr-affix.wr-affix--active {
 *   box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
 * }
 * ```
 */
@Directive({
  selector: '[wrAffix]',
  host: {
    class: 'wr-affix',
    '[style.position]': '"sticky"',
    '[style.top.px]': 'offsetTop()',
  },
})
export class WrAffix {
  /** Pixels from the top of the scroll container when stuck. @default 0 */
  readonly offsetTop = input(0, {
    alias: 'wrAffixOffsetTop',
    transform: (v: unknown): number => coerceNumberProperty(v, 0),
  });

  /**
   * Fires when the element pins or unpins — `true` once it has stuck, `false`
   * when it returns to the flow. Use it to swap a shadow or a compact layout.
   */
  // eslint-disable-next-line @angular-eslint/no-output-rename -- keep wr-prefixed binding to match `[wrAffix]`
  readonly affixChange = output<boolean>({ alias: 'wrAffixChange' });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  /**
   * `afterNextRender`'s callback is not an injection context, and the observer
   * cannot exist before the sentinel it watches — so the effect that rebuilds it
   * is handed the injector explicitly.
   */
  private readonly injector = inject(Injector);

  constructor() {
    if (!this.isBrowser) return;

    afterNextRender(() => {
      const el = this.host.nativeElement;
      const parent = el.parentElement;
      if (!parent) return;

      // Sentinel: an empty zero-height block placed immediately before
      // the host. When the sentinel scrolls out of view, the host is
      // necessarily "stuck" at the configured offset.
      const sentinel = el.ownerDocument.createElement('div');
      sentinel.className = 'wr-affix__sentinel';
      sentinel.setAttribute('aria-hidden', 'true');
      sentinel.style.cssText = 'height:0;width:100%;margin:0;padding:0;pointer-events:none;';
      parent.insertBefore(sentinel, el);

      // The observer reports STATE, not transitions: it delivers an entry for the
      // sentinel as soon as it starts watching it — before anything has scrolled —
      // and can repeat a state the host is already in (a resize, another crossing of
      // the same threshold). `affixChange` is documented as the transition, so it
      // only fires on one. The starting state is "not affixed", which is what the
      // element already renders as, so that first entry is silent.
      let affixed = false;

      let observer: IntersectionObserver | null = null;

      // `rootMargin` is fixed for an observer's lifetime, so a changed offset means
      // a NEW observer. Without this the two halves of the offset drifted apart:
      // `[style.top.px]` is a live binding, so a header that animates its offset
      // pinned at the new line while still flipping state at the old one.
      // Re-observing re-delivers the current state, which the transition guard
      // above absorbs when nothing has actually changed.
      effect(
        onCleanup => {
          const offset = this.offsetTop();

          // The observer's ROOT has to be the element the host sticks to, not
          // the viewport. `position: sticky` pins against the nearest
          // SCROLLING ancestor, and an observer with no root measures against
          // the viewport — so inside any nested scroller whose top sits below
          // the viewport's, `rootBounds.top` was 0 while the host pinned at
          // the container's own top. The direction guard below then computed
          // `false` at the one crossing it was ever handed, and because
          // `isIntersecting` stays false afterwards no further callback came:
          // `wr-affix--active` was never added and `(wrAffixChange)` never
          // emitted, for the whole scroll. The JSDoc promised the opposite —
          // "works inside any scroll container without configuration" — and
          // the docs page's own demo is exactly that shape.
          const root = scrollParent(el);

          observer = new IntersectionObserver(
            ([entry]) => {
              // NOT `!entry.isIntersecting` on its own. A sentinel is outside
              // the root in TWO directions, and only one of them means the
              // header has stuck: above the line because the page scrolled past
              // it, or below it because the host simply starts further down the
              // page than the first screen. The bare negation called both
              // "affixed", so any sticky element below the fold reported
              // `affixed = true` and painted `.wr-affix--active` on its very
              // first observer callback — before a pixel had scrolled — and
              // emitted a transition that never happened.
              //
              // `rootBounds.top` is the offset line (the negative `rootMargin`
              // above moves it), so a sentinel above it has genuinely gone by.
              const rootTop = entry.rootBounds?.top ?? offset;
              const next = !entry.isIntersecting && entry.boundingClientRect.top < rootTop;
              if (next === affixed) return;

              affixed = next;
              el.classList.toggle('wr-affix--active', next);
              this.affixChange.emit(next);
            },
            {
              // `null` is the document scroller, which is what the browser
              // uses for a host with no scrolling ancestor.
              root,
              // Trigger when the sentinel's top crosses the offset line.
              rootMargin: `-${offset}px 0px 0px 0px`,
              threshold: [0],
            }
          );
          observer.observe(sentinel);

          onCleanup(() => observer?.disconnect());
        },
        { injector: this.injector }
      );

      this.destroyRef.onDestroy(() => {
        observer?.disconnect();
        sentinel.remove();
        el.classList.remove('wr-affix--active');
      });
    });
  }
}
