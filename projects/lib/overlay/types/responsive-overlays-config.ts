/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** Configuration for responsive (bottom-sheet) overlay presentation. */
export interface WrResponsiveOverlaysConfig {
  /**
   * Viewport width (CSS px) at or below which overlays present as a
   * bottom-sheet instead of a floating panel. @default 640
   */
  readonly breakpoint: number;
}
