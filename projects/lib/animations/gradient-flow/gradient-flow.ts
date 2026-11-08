/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  Directive,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';

import { WrPlatform } from 'ngwr/platform';
import { wrCheckStyles } from 'ngwr/utils';

/** The modifier under which the stylesheet lets the drift run. */
const RUN = 'wr-gradient-flow--run';

/**
 * A short piece of text, a brand name or one word, filled with a gradient of
 * theme inks that drifts slowly along it, forever, as a seamless loop.
 *
 * The stylesheet owns the paint and the loop: the gradient is a background
 * clipped to the glyphs, twice the host wide and ending on the colour it starts
 * with, so sliding it by one image width lands on the exact same picture and
 * the cycle has no seam. That slide is one CSS animation, declared paused and
 * infinite on the host. The directive's whole job is the one modifier that sets
 * it running, and only while the host is on screen and the document is visible.
 * Pausing keeps the phase, so the drift picks up where it stopped instead of
 * jumping back to its start.
 *
 * Without the directive the text already carries the static gradient, so a
 * server render paints the final colours before any script arrives, and so does
 * `prefers-reduced-motion: reduce`, where the gradient stays and nothing moves:
 * it is colour, not motion. Under `forced-colors: active` the text is plain, in
 * the system colour. The text is never touched: no split, no copy, no
 * pseudo-element, so selection, copy and line breaks are what they were.
 *
 * Put it on an element that shrinks to its text (an inline, an inline-block, a
 * flex item): the gradient spans the host's box, so a block stretched wider than
 * its word shows the word only a slice of it. The `--wr-gradient-flow-*` hooks
 * are the colours, the cycle and its steps.
 */
@Directive({
  selector: '[wrGradientFlow]',
  host: {
    class: 'wr-gradient-flow',
    [`[class.${RUN}]`]: 'running()',
  },
})
export class WrGradientFlow {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platform = inject(WrPlatform);
  private readonly doc = inject(DOCUMENT);
  private readonly intersecting = signal(false);
  private observer: IntersectionObserver | null = null;

  /** One place decides whether the drift runs: in view, page visible, motion allowed. */
  protected readonly running = computed(
    () => this.intersecting() && this.platform.pageVisible() && !this.platform.prefersReducedMotion()
  );

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('animations/gradient-flow');
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    afterNextRender(() => {
      if (this.platform.prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return;
      // The stylesheet paints plain text under forced colours: nothing to run.
      if (this.doc.defaultView?.matchMedia?.('(forced-colors: active)').matches) return;

      // Any part of the host on screen counts: this is a loop that should not
      // burn paint off screen, not a reveal that should wait for the whole word.
      this.observer = new IntersectionObserver(entries =>
        this.intersecting.set(entries[entries.length - 1]?.isIntersecting ?? false)
      );
      this.observer.observe(this.host.nativeElement);
    });

    inject(DestroyRef).onDestroy(() => {
      this.observer?.disconnect();
      this.observer = null;
      // Change detection does not run on a destroyed view, so the binding
      // cannot take the modifier off: do it by hand.
      this.host.nativeElement.classList.remove(RUN);
    });
  }
}

export { RUN as GRADIENT_FLOW_RUN };
