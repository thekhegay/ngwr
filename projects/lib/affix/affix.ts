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
 * Whether a parent lays its children out as flex or grid items, where a flow
 * sentinel is not inert: a flex container puts a `gap` on each side of it, and
 * a grid container gives it a cell of its own, shifting every item after it. A
 * computed value, so `inline-flex` and `inline-grid` answer the same.
 */
function laysOutItems(parent: HTMLElement): boolean {
  return /\b(?:inline-)?(?:flex|grid)\b/.test(getComputedStyle(parent).display);
}

/**
 * Every out-of-flow affix in one parent shares that parent's containing-block
 * claim, so only the last one to leave gives it back — sticky group headers in
 * one filtered list come and go in any order. `inline` is the parent's own
 * inline `position`, kept only when the fallback in `claimContainer` wrote one.
 */
const containers = new WeakMap<HTMLElement, { count: number; inline: string | null }>();

/**
 * Makes `parent` the containing block of the absolutely positioned sentinels
 * inside it, and returns the release.
 *
 * An absolute box scrolls with a scroller's content only when its containing
 * block sits inside that scroller, and the nearest positioned ancestor may well
 * be outside it — so inside a nested scroller the sentinel would hold still while
 * the host scrolled away, and the state would never flip.
 *
 * The parent is TAGGED rather than styled: `ngwr/affix` gives
 * `.wr-affix__container` its `position: relative` under `:where()`, at zero
 * specificity, so any position the author gives the parent still wins, a media
 * query included. An inline `position` would beat all of them for the
 * directive's whole lifetime. Only when nothing positions the parent once it is
 * tagged — the stylesheet is not loaded — is `relative` written inline, and the
 * last release puts the inline value back.
 */
function claimContainer(parent: HTMLElement): () => void {
  let claim = containers.get(parent);
  if (!claim) {
    parent.classList.add('wr-affix__container');
    const positioned = /relative|absolute|fixed|sticky/.test(getComputedStyle(parent).position);
    claim = { count: 0, inline: positioned ? null : parent.style.position };
    if (!positioned) parent.style.position = 'relative';
    containers.set(parent, claim);
  }
  claim.count++;

  const held = claim;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--held.count > 0) return;
    containers.delete(parent);
    parent.classList.remove('wr-affix__container');
    if (held.inline !== null && parent.style.position === 'relative') parent.style.position = held.inline;
  };
}

/**
 * Takes the sentinel out of a flex or grid parent's layout and keeps it on the
 * host's natural top edge. Returns the teardown.
 *
 * Absolutely positioned and zero-sized, so neither a gap nor a track is made
 * for it — which leaves its place to be measured. Two choices follow:
 *
 *   - **The parent becomes the containing block** — see `claimContainer`.
 *   - **The host is measured with sticky switched off.** A stuck element's
 *     `offsetTop` already includes the sticky shift, and the sentinel marks the
 *     line the host leaves its natural place at. Static and sticky lay out
 *     identically in flow, so nothing else moves, and both writes land before
 *     the next paint.
 *
 * Re-measured whenever the parent, the host or anything laid out before the host
 * changes size — those are what move the host's top — and whenever the parent's
 * children change: an element inserted above the host moves it without resizing
 * a fixed-height scroll panel, and becomes one more thing to watch.
 */
function pinOutOfFlow(host: HTMLElement, parent: HTMLElement, sentinel: HTMLElement): () => void {
  const release = claimContainer(parent);

  const measure = (): void => {
    const position = host.style.position;
    host.style.position = 'static';
    const top = host.offsetTop;
    const left = host.offsetLeft;
    host.style.position = position;
    sentinel.style.top = `${top}px`;
    // Physical on purpose: `offsetLeft` is physical too, so the pair lines up in either direction.
    sentinel.style.left = `${left}px`;
  };
  measure();

  const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => measure());
  const watchLayout = (): void => {
    if (!resize) return;
    resize.disconnect();
    resize.observe(parent);
    for (let node: Element | null = host; node; node = node.previousElementSibling) {
      if (node !== sentinel) resize.observe(node);
    }
  };
  watchLayout();

  const children =
    typeof MutationObserver === 'undefined'
      ? null
      : new MutationObserver(() => {
          watchLayout();
          measure();
        });
  children?.observe(parent, { childList: true });

  return () => {
    resize?.disconnect();
    children?.disconnect();
    release();
  };
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
 * In block layout the sentinel is a zero-height flow element. In a flex or grid
 * parent (read once, after the first render) it is absolutely positioned and
 * zero-sized instead, so it adds no gap and takes no grid cell. It is placed on
 * the host's natural top edge and re-placed when the parent, the host or an
 * element before the host resizes, or when the parent's children change. That
 * needs the parent as its containing block: the parent is tagged
 * `wr-affix__container`, which `ngwr/affix` makes `position: relative` at zero
 * specificity, so a position the author gives it still wins. The tag comes off
 * when the last affix in that parent is destroyed.
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
      // In a flex or grid parent a flow element is an item with a gap or a cell
      // of its own, so there it leaves the flow — see `pinOutOfFlow`.
      const outOfFlow = laysOutItems(parent);
      sentinel.style.cssText = outOfFlow
        ? 'position:absolute;width:0;height:0;margin:0;padding:0;pointer-events:none;'
        : 'height:0;width:100%;margin:0;padding:0;pointer-events:none;';
      parent.insertBefore(sentinel, el);
      const unpin = outOfFlow ? pinOutOfFlow(el, parent, sentinel) : null;

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
              // Trigger when the sentinel's top crosses the offset line. NEGATED
              // rather than prefixed with a minus: a negative offset is valid sticky
              // CSS (the host pins partly above the edge), and the prefix turned
              // `-10` into `--10px`, which the constructor refuses with a
              // SyntaxError — so the state never flipped at all. Negated, a
              // negative offset GROWS the root above its edge, which is where the
              // host pins.
              rootMargin: `${-offset}px 0px 0px 0px`,
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
        unpin?.();
        sentinel.remove();
        el.classList.remove('wr-affix--active');
      });
    });
  }
}
