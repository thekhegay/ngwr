/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Directive, ElementRef, PLATFORM_ID, afterNextRender, inject, input, signal } from '@angular/core';

/**
 * Reveal-on-scroll directive. Adds the `wr-reveal` host class
 * immediately and flips it to `wr-reveal--visible` once the element
 * enters the viewport — pair with the `.wr-reveal` styles in
 * `ngwr/animations` for a fade-and-slide-up enter.
 *
 * SSR-safe: on the server, the host renders in the visible state so
 * the page isn't blank.
 *
 * @example
 * ```html
 * <h2 wrReveal>Animates in once visible</h2>
 * <div wrReveal threshold="0.5" rootMargin="-100px 0px">…</div>
 * <p wrReveal [once]="false">Re-runs every time it enters the viewport</p>
 * <div #box style="overflow:auto"><h2 wrReveal [root]="box">Observes inside a scroll box</h2></div>
 * ```
 */
@Directive({
  selector: '[wrReveal]',
  host: {
    class: 'wr-reveal',
    '[class.wr-reveal--visible]': 'visible()',
  },
})
export class WrReveal {
  /** Visibility threshold passed to IntersectionObserver. @default 0.1 */
  readonly threshold = input(0.1, {
    transform: (v: unknown): number => Math.min(1, Math.max(0, coerceNumberProperty(v, 0.1))),
  });

  /** `rootMargin` passed to IntersectionObserver. @default '0px' */
  readonly rootMargin = input<string>('0px');

  /**
   * Scroll container to observe against. Defaults to `null` (the
   * browser viewport). Pass an element to detect reveals while
   * scrolling inside a nested scroll box.
   * @default null
   */
  readonly root = input<Element | null>(null);

  /** Stop observing after the first reveal. @default true */
  readonly once = input(true, { transform: coerceBooleanProperty });

  protected readonly visible = signal(false);

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    if (!this.isBrowser) {
      // SSR: render in the visible state so nothing pops in on hydration.
      this.visible.set(true);
      return;
    }

    afterNextRender(() => {
      const observer = new IntersectionObserver(
        entries => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              this.visible.set(true);
              if (this.once()) observer.disconnect();
            } else if (!this.once()) {
              this.visible.set(false);
            }
          }
        },
        { root: this.root(), threshold: this.threshold(), rootMargin: this.rootMargin() }
      );
      observer.observe(this.el.nativeElement);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
