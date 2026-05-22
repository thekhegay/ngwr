/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

/** Named breakpoint identifiers — match the SCSS `_breakpoints.scss` keys. */
export type WrBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

/** Map of breakpoint → minimum viewport width in pixels. */
export type WrBreakpointMap = Readonly<Record<WrBreakpoint, number>>;

/** Defaults mirror `projects/lib/styles/_breakpoints.scss`. */
export const DEFAULT_WR_BREAKPOINTS: WrBreakpointMap = Object.freeze({
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1400,
});

/** DI token for the breakpoint map — override via {@link provideWrMedia}. */
export const WR_BREAKPOINTS = new InjectionToken<WrBreakpointMap>('WR_BREAKPOINTS', {
  factory: () => DEFAULT_WR_BREAKPOINTS,
});
