/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Overlay } from '@angular/cdk/overlay';
import { InjectionToken, inject } from '@angular/core';

/**
 * Injection token for the CDK `Overlay` service NGWR components should
 * use to open panels.
 *
 * Defaults to CDK's root `Overlay` (shared with every other CDK consumer
 * in the app). Call `provideWrOverlay()` to bind it to an isolated
 * `Overlay` instance backed by a separate `OverlayContainer` — that way
 * NGWR overlays don't share the same DOM root with other libraries.
 *
 * @internal — directives/services inside the lib inject this instead of
 * CDK's `Overlay` directly.
 */
export const WR_OVERLAY = new InjectionToken<Overlay>('WR_OVERLAY', {
  providedIn: 'root',
  factory: () => inject(Overlay),
});
