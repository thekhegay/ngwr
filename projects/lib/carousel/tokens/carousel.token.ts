/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken, type Signal } from '@angular/core';

/**
 * Contract a `<wr-carousel-slide>` uses to ask its parent whether it is the one
 * on screen.
 *
 * A token rather than an input, because slides arrive through `<ng-content />`:
 * nothing in `carousel.html` can bind to them, so the child has to reach up.
 * Same shape as {@link WR_TABS}.
 *
 * @internal
 */
export interface WrCarouselContext {
  /** Index of the slide currently on screen. */
  readonly active: Signal<number>;
  /**
   * Position of a slide in projection order, or `-1` before it has registered.
   *
   * Reads the content-children signal, so a `computed()` calling this tracks
   * both the active index and slides being added or removed.
   */
  indexOf(slide: object): number;
}

/** Token a `<wr-carousel-slide>` injects to find its parent `<wr-carousel>`. */
export const WR_CAROUSEL = new InjectionToken<WrCarouselContext>('WR_CAROUSEL');
