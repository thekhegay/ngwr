/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { OverlayContainer } from '@angular/cdk/overlay';
import { InjectionToken, inject } from '@angular/core';

import { WrOverlayContainer } from '../wr-overlay-container';

/**
 * Injection token for the overlay container NGWR components render into.
 *
 * Isolated by default: a `WrOverlayContainer`, tagged `.wr-overlay-container`,
 * and never CDK's root `OverlayContainer`. Every CDK consumer that shares the
 * root one (Angular Material, NG-ZORRO) shares its element too, and with it
 * the z-index stacking, the `.cdk-overlay-pane` rules and the lifecycle — so
 * one library's overlays end up under, restyled by or torn down with
 * another's. CDK's root container is left untouched for them.
 *
 * @internal
 */
export const WR_OVERLAY_CONTAINER = new InjectionToken<OverlayContainer>('WR_OVERLAY_CONTAINER', {
  providedIn: 'root',
  factory: () => inject(WrOverlayContainer),
});
