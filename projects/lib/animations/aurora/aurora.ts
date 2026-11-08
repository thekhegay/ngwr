/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';

import { WrPlatform } from 'ngwr/platform';
import { wrCheckStyles } from 'ngwr/utils';

/** The modifier under which the stylesheet lets the drift run. */
const RUN = 'wr-aurora--run';

/** How many bands the stylesheet paints: one element each, in the template. */
const BANDS = 3;

/**
 * A few soft, wide bands of colour drifting slowly behind a section's content,
 * like northern lights, faint enough that the text over them reads as it does
 * on the plain surface.
 *
 * Fills its parent, which must be positioned (`position: relative`) and
 * isolated (`isolation: isolate`): the host is absolute, `inset: 0`, at
 * `z-index: -1`, so it lands at the floor of the parent's own stacking
 * context, under the content and over the page background. The stylesheet
 * owns the paint and the motion: each band is one blurred radial gradient on
 * its own composited layer, moved by `transform` keyframes alone, so nothing
 * is re-rasterised while it drifts. The three durations are mutually prime, so
 * the composition never visibly repeats. The animations are declared paused on
 * the bands; the component's whole job is the one modifier that sets them
 * running, and only while the host is on screen and the document is visible.
 * Pausing keeps the phase, so the drift picks up where it stopped instead of
 * jumping back to its start.
 *
 * Without the modifier the bands already sit in their rest pose, so a server
 * render paints the still picture before any script arrives, and so does
 * `prefers-reduced-motion: reduce`, where the picture stays and nothing moves.
 * Under `forced-colors: active` nothing is drawn. The host is decorative:
 * `aria-hidden`, no pointer events, never focusable. Styles:
 * `@use 'ngwr/animations/aurora'`, which also lists the `--wr-aurora-*` hooks.
 */
@Component({
  selector: 'wr-aurora',
  templateUrl: './aurora.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-aurora',
    'aria-hidden': 'true',
    [`[class.${RUN}]`]: 'running()',
  },
})
export class WrAurora {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platform = inject(WrPlatform);
  private readonly doc = inject(DOCUMENT);
  private readonly intersecting = signal(false);
  private observer: IntersectionObserver | null = null;

  protected readonly bands = Array.from({ length: BANDS }, (_, i) => i + 1);

  /** One place decides whether the drift runs: in view, page visible, motion allowed. */
  protected readonly running = computed(
    () => this.intersecting() && this.platform.pageVisible() && !this.platform.prefersReducedMotion()
  );

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('animations/aurora');
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    afterNextRender(() => {
      if (this.platform.prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return;
      // The stylesheet draws nothing under forced colours: nothing to run.
      if (this.doc.defaultView?.matchMedia?.('(forced-colors: active)').matches) return;

      // Any part of the host on screen counts: this is a loop that should not
      // burn frames off screen, not a reveal that waits for the whole section.
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

export { BANDS as AURORA_BANDS, RUN as AURORA_RUN };
