/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, computed, inject, input } from '@angular/core';

import { useI18nText } from 'ngwr/i18n';

import { WR_CAROUSEL } from './tokens';

/**
 * One slide in a {@link WrCarousel}. Holds whatever content you
 * project — image, card, video, anything.
 *
 * **An off-screen slide is `inert`.** Only one slide is visible, but the track
 * merely translates the others out of view: without this they stay in the tab
 * order and in the accessibility tree, so a keyboard user tabs into a link they
 * cannot see and a screen reader announces every slide as if they were all on
 * screen. `inert` takes the whole subtree out of both at once, which is why it
 * is preferred here over `tabindex="-1"` (which reaches only the host) — the
 * same answer `wr-collapse` and `wr-marquee` use.
 *
 * `aria-hidden` rides along for the same reason it does on the marquee's
 * duplicate copies: it states the intent for anything reading the attribute
 * rather than honouring `inert`.
 */
@Component({
  selector: 'wr-carousel-slide',
  template: '<ng-content />',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-carousel-slide',
    role: 'group',
    '[attr.aria-roledescription]': 'resolvedRoledescription()',
    '[attr.inert]': 'offScreen() ? "" : null',
    '[attr.aria-hidden]': 'offScreen() ? "true" : null',
  },
})
export class WrCarouselSlide {
  private readonly carousel = inject(WR_CAROUSEL, { optional: true });

  /**
   * Word a screen reader speaks IN PLACE OF the `group` role. Falls back to
   * `carousel.slideRoledescription`, then `'slide'`.
   */
  readonly roledescription = input<string | null>(null);

  // Spoken verbatim, and only the off-screen slides are `inert` — so the visible
  // one announced an English "slide" inside an otherwise localized carousel.
  protected readonly resolvedRoledescription = useI18nText(
    this.roledescription,
    'carousel.slideRoledescription',
    'slide'
  );

  /**
   * Whether this slide is one of the ones translated out of view.
   *
   * `false` while the index is `-1`: content children resolve after the first
   * render, and a slide that hid itself in that window would make the carousel
   * open with everything inert. `false` too when there is no parent — the
   * component is exported, so it can be used on its own.
   */
  protected readonly offScreen = computed(() => {
    if (!this.carousel) return false;
    const index = this.carousel.indexOf(this);
    return index >= 0 && index !== this.carousel.active();
  });
}
