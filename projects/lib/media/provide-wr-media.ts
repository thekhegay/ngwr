/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { DEFAULT_WR_BREAKPOINTS, WR_BREAKPOINTS, type WrBreakpointMap } from './wr-breakpoints';

/**
 * Override the breakpoint map used by {@link WrMediaService}. Partial maps
 * are merged with {@link DEFAULT_WR_BREAKPOINTS}, so you only need to list
 * the breakpoints you want to change.
 *
 * @example
 * ```ts
 * bootstrapApplication(AppComponent, {
 *   providers: [provideWrMedia({ md: 720, lg: 1024 })],
 * });
 * ```
 */
export function provideWrMedia(breakpoints: Partial<WrBreakpointMap> = {}): EnvironmentProviders {
  const merged: WrBreakpointMap = { ...DEFAULT_WR_BREAKPOINTS, ...breakpoints };
  return makeEnvironmentProviders([{ provide: WR_BREAKPOINTS, useValue: merged }]);
}
