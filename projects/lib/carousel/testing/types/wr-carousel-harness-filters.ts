/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-carousel>` a harness query matches. */
export interface WrCarouselHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the carousel's accessible name — a string is an exact match, a RegExp
   * is tested.
   *
   * This is the RESOLVED name, so it matches whatever the page announces: an
   * `ariaLabel` the consumer passed, the `carousel.label` entry of the active
   * `ngwr/i18n` catalog, or the built-in `'Carousel'` when a consumer named
   * neither. A carousel is never nameless, so this option never excludes
   * everything.
   */
  readonly ariaLabel?: string | RegExp;
  /** Match a carousel holding exactly this many `<wr-carousel-slide>` children. */
  readonly slideCount?: number;
  /** Match a carousel one of whose slides carries this text — exact for a string, tested for a RegExp. */
  readonly slideText?: string | RegExp;
}
