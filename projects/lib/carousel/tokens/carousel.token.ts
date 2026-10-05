/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

import type { WrCarouselContext } from '../types';

/** Token a `<wr-carousel-slide>` injects to find its parent `<wr-carousel>`. */
export const WR_CAROUSEL = new InjectionToken<WrCarouselContext>('WR_CAROUSEL');
