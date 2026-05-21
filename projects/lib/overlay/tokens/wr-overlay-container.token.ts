/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { OverlayContainer } from '@angular/cdk/overlay';
import { InjectionToken, inject } from '@angular/core';

/**
 * Injection token for the overlay container NGWR components should use.
 *
 * Defaults to CDK's `OverlayContainer` — i.e. the same root element every
 * CDK consumer shares. Call `provideWrOverlay()` to replace it with an
 * isolated instance so NGWR overlays don't collide with other libraries.
 *
 * @internal
 */
export const WR_OVERLAY_CONTAINER = new InjectionToken<OverlayContainer>('WR_OVERLAY_CONTAINER', {
  providedIn: 'root',
  factory: () => inject(OverlayContainer),
});
