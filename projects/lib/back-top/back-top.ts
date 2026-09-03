/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceNumberProperty } from '@angular/cdk/coercion';
import { Component, DestroyRef, NgZone, ViewEncapsulation, computed, inject, input, signal } from '@angular/core';

import { useI18nText } from 'ngwr/i18n';
import { WrPlatform } from 'ngwr/platform';
import { WrScroll } from 'ngwr/scroll';

/**
 * Pinned floating button that scrolls the page back to the top. Appears
 * once the user has scrolled past `visibilityThreshold` pixels.
 *
 * @example
 * ```html
 * <wr-back-top />
 *
 * <wr-back-top visibilityThreshold="600" [offset]="80">
 *   <svg>…custom icon…</svg>
 * </wr-back-top>
 * ```
 *
 * @see https://ngwr.dev/reference/components/back-top
 */
@Component({
  selector: 'wr-back-top',
  templateUrl: './back-top.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
    '[attr.aria-hidden]': '!visible()',
    // `aria-hidden` alone left a 44px button that focus still landed on: invisible
    // (opacity 0) but in the tab order, and unannounceable once it got there.
    // `inert` is what actually takes it out of both.
    '[attr.inert]': "visible() ? null : ''",
  },
})
export class WrBackTop {
  /** Show the button once `window.scrollY` exceeds this many pixels. @default 400 */
  readonly visibilityThreshold = input(400, {
    transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 400)),
  });

  /** Pixel offset subtracted from the scroll target — for sticky headers. @default 0 */
  readonly offset = input(0, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 0)) });

  /** Accessible label for the button. Falls back to `backTop.label`, then `'Back to top'`. */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = useI18nText(this.ariaLabel, 'backTop.label', 'Back to top');

  protected readonly visible = signal(false);

  private readonly scroll = inject(WrScroll);
  private readonly platform = inject(WrPlatform);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly classes = computed(() => {
    const parts = ['wr-back-top'];
    if (this.visible()) parts.push('wr-back-top--visible');
    return parts.join(' ');
  });

  constructor() {
    if (!this.platform.isBrowser) return;
    const handler = (): void => {
      const should = window.scrollY > this.visibilityThreshold();
      if (should !== this.visible()) this.zone.run(() => this.visible.set(should));
    };
    this.zone.runOutsideAngular(() => window.addEventListener('scroll', handler, { passive: true }));
    // Initial check (page might already be scrolled), and it is SYNCHRONOUS on
    // purpose. `window.scrollY` forces a style + layout flush, which is what
    // makes constructing N of these quadratic — 1000 instances cost 90ms and
    // 5000 cost 1640ms, of which ~95% is the flush: replacing `scrollY` with a
    // plain property drops 5000 to 83ms with all 5000 scroll listeners still
    // registered, so the per-instance listener is not the cost it looks like.
    // The bulk figure is nobody's bill — a page has one back-to-top button, and
    // one instance measures 0.03ms over an equivalent component. Deferring to
    // `afterNextRender` would land the signal a change-detection pass later, so
    // a page restored part way down would fade the button in from `opacity: 0`
    // instead of painting it in place. That first paint is the contract.
    handler();
    this.destroyRef.onDestroy(() => window.removeEventListener('scroll', handler));
  }

  protected onClick(): void {
    this.scroll.toTop({ offset: this.offset() });
  }
}
