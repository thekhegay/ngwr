/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { WR_RESPONSIVE_OVERLAYS, type WrResponsiveOverlaysConfig } from './tokens/wr-responsive-overlays.token';

/**
 * Opt every NGWR overlay into responsive presentation — on viewports at or
 * below `breakpoint`, dialogs / selects / dropdowns and friends slide up as
 * a full-width bottom-sheet instead of a floating panel. Built on the same
 * overlay plumbing, so focus-trap, backdrop and scroll-blocking carry over.
 *
 * Individual components can still opt out (or in) per instance via their
 * `responsive` option.
 *
 * @example
 * ```ts
 * bootstrapApplication(AppComponent, {
 *   providers: [provideWrOverlay(), provideWrResponsiveOverlays()],
 * });
 *
 * // Custom breakpoint:
 * provideWrResponsiveOverlays({ breakpoint: 768 });
 * ```
 */
export function provideWrResponsiveOverlays(config?: Partial<WrResponsiveOverlaysConfig>): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: WR_RESPONSIVE_OVERLAYS, useValue: { breakpoint: config?.breakpoint ?? 640 } },
  ]);
}
