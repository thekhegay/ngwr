/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation } from '@angular/core';

/**
 * One slide in a {@link WrCarousel}. Holds whatever content you
 * project — image, card, video, anything.
 */
@Component({
  selector: 'wr-carousel-slide',
  template: '<ng-content />',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-carousel-slide', role: 'group', 'aria-roledescription': 'slide' },
})
export class WrCarouselSlide {}
