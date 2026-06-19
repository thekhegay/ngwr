/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

/** Configuration for responsive (bottom-sheet) overlay presentation. */
interface WrResponsiveOverlaysConfig {
  /**
   * Viewport width (CSS px) at or below which overlays present as a
   * bottom-sheet instead of a floating panel. @default 640
   */
  readonly breakpoint: number;
}

/**
 * When set, overlay services (dialog, select, dropdown, …) present as a
 * slide-up bottom-sheet on viewports at or below `breakpoint`. `null`
 * (the default) keeps every overlay floating. Configure via
 * {@link provideWrResponsiveOverlays}; override per call with a
 * component's `responsive` option.
 *
 * @internal
 */
const WR_RESPONSIVE_OVERLAYS = new InjectionToken<WrResponsiveOverlaysConfig | null>('WR_RESPONSIVE_OVERLAYS', {
  factory: () => null,
});

/**
 * Decide whether an overlay should present as a bottom-sheet for the
 * current viewport.
 *
 * - `responsive === true` — sheet on small viewports regardless of config.
 * - `responsive === false` — never a sheet.
 * - `responsive === undefined` — follow the global config (sheet when
 *   {@link provideWrResponsiveOverlays} is configured).
 *
 * SSR-safe: returns `false` when there's no `window`.
 *
 * @internal
 */
function wrPresentAsSheet(responsive: boolean | undefined, config: WrResponsiveOverlaysConfig | null): boolean {
  const enabled = responsive ?? config !== null;
  if (!enabled || typeof window === 'undefined') return false;
  return window.innerWidth <= (config?.breakpoint ?? 640);
}

export { WR_RESPONSIVE_OVERLAYS, wrPresentAsSheet };
export type { WrResponsiveOverlaysConfig };
