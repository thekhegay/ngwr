/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, Directive, ElementRef, PLATFORM_ID, afterNextRender, inject } from '@angular/core';

import { wrCheckStyles } from 'ngwr/utils';

import { type WrPointerFollower, WrPointerTracker } from '../internal';

/** The modifier the directive puts on the host while a pointer is over it. */
const ON = 'wr-spotlight--on';

/** The custom properties the directive writes on the host: the pointer, in px from the host's top left corner. */
const X = '--wr-spotlight-x';
const Y = '--wr-spotlight-y';

/**
 * A soft circle of light sits under the pointer on a card's surface and
 * follows it, and the card's border brightens a little near it. When the
 * pointer leaves, the light fades out where it was.
 *
 * The directive feeds two numbers and one state; the stylesheet paints. The
 * pointer plumbing is the shared {@link WrPointerTracker}: one frame per burst
 * of moves, the host's rect read at enter and on scroll or resize, a touch
 * pointer ignored. Each frame writes the point as `--wr-spotlight-x` / `-y`,
 * in px from the host's border box. The `--on` modifier goes on at enter and
 * off at leave; the point stays, so the stylesheet's opacity fade plays where
 * the light was.
 *
 * Keyboard focus inside the card is the stylesheet's own `:focus-within`
 * rule, a calm glow at the centre, with no script. Under
 * `forced-colors: active` nothing listens, since the stylesheet paints
 * nothing. Reduced motion changes nothing here: the light is a pointer
 * response, not motion, and the stylesheet drops only the fade. Nothing runs
 * on the server. Styles: `@use 'ngwr/animations/spotlight'`, which also lists
 * the `--wr-spotlight-*` hooks.
 */
@Directive({
  selector: '[wrSpotlight]',
  host: { class: 'wr-spotlight' },
})
export class WrSpotlight implements WrPointerFollower {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly doc = inject(DOCUMENT);
  private tracker: WrPointerTracker | null = null;

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('animations/spotlight');
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    afterNextRender(() => {
      const view = this.doc.defaultView;
      if (!view) return;
      // The stylesheet paints no light under forced colours: nothing to listen for.
      if (view.matchMedia?.('(forced-colors: active)').matches) return;
      this.tracker = new WrPointerTracker(this.host.nativeElement, view, this);
      this.tracker.start();
    });

    inject(DestroyRef).onDestroy(() => {
      this.tracker?.stop();
      this.tracker = null;
      const style = this.host.nativeElement.style;
      style.removeProperty(X);
      style.removeProperty(Y);
    });
  }

  enter(): void {
    this.host.nativeElement.classList.add(ON);
  }

  /** The point, relative to the host's border box, so the stylesheet's `inset` layers can place it. */
  frame(): void {
    const tracker = this.tracker;
    if (!tracker?.rect) return;
    const style = this.host.nativeElement.style;
    style.setProperty(X, `${tracker.clientX - tracker.rect.left}px`);
    style.setProperty(Y, `${tracker.clientY - tracker.rect.top}px`);
  }

  /** The pointer left: leave the point where it is and let the stylesheet fade. */
  leave(): void {
    this.host.nativeElement.classList.remove(ON);
  }
}

export { ON as SPOTLIGHT_ON, X as SPOTLIGHT_X, Y as SPOTLIGHT_Y };
