/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Directive, ElementRef, PLATFORM_ID, afterNextRender, inject, input, signal } from '@angular/core';

import { WrPlatform } from 'ngwr/platform';
import { numAttr, wrCheckStyles } from 'ngwr/utils';

/**
 * One-shot accent for a phrase: the first time the host scrolls into view a
 * band of light passes once across its text and a wire draws itself beneath
 * it, then both leave and the phrase is exactly the static text it was. The
 * text node is untouched, so layout and what a screen reader reads do not
 * change. Does nothing under `prefers-reduced-motion: reduce` or on the
 * server. Styles: `@use 'ngwr/animations/signal-sweep'`, which also lists the
 * `--wr-signal-sweep-*` hooks.
 */
@Directive({
  selector: '[wrSignalSweep]',
  host: {
    class: 'wr-signal-sweep',
    '[class.wr-signal-sweep--run]': 'running()',
    '(animationend)': 'settle()',
  },
})
export class WrSignalSweep {
  /** Pause between the host entering the viewport and the sweep, in ms. @default 250 */
  readonly delay = input(250, { transform: numAttr(250) });

  protected readonly running = signal(false);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platform = inject(WrPlatform);
  private observer: IntersectionObserver | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('animations/signal-sweep');
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    afterNextRender(() => {
      if (this.platform.prefersReducedMotion()) return;
      this.observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        this.observer?.disconnect();
        this.observer = null;
        this.timer = setTimeout(() => {
          this.timer = null;
          if (!this.platform.prefersReducedMotion()) this.running.set(true);
        }, this.delay());
      });
      this.observer.observe(this.host.nativeElement);
    });

    inject(DestroyRef).onDestroy(() => {
      this.observer?.disconnect();
      if (this.timer !== null) clearTimeout(this.timer);
    });
  }

  protected settle(): void {
    this.running.set(false);
  }
}
