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
 * Works inside any scroll container without configuration — CSS sticky
 * picks the nearest scrollable ancestor automatically.
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

  /** Emits `true` when the element becomes affixed, `false` when it unsticks. */
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

          observer = new IntersectionObserver(
            ([entry]) => {
              const next = !entry.isIntersecting;
              if (next === affixed) return;

              affixed = next;
              el.classList.toggle('wr-affix--active', next);
              this.affixChange.emit(next);
            },
            {
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
