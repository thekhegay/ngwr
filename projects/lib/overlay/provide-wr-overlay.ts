/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { OverlayContainer } from '@angular/cdk/overlay';
import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { WrOverlayContainer } from './wr-overlay-container';

/**
 * Replaces CDK's default `OverlayContainer` with NGWR's subclass so the
 * overlay root element gains a `.wr-overlay-container` class.
 *
 * Add to your app config to opt in:
 *
 * @example
 * ```ts
 * import { provideWrOverlay } from 'ngwr/overlay';
 *
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     provideWrOverlay(),
 *   ],
 * });
 * ```
 */
export function provideWrOverlay(): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: OverlayContainer, useClass: WrOverlayContainer }]);
}
