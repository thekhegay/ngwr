/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** Options for {@link WrConfetti.fire}. */
export interface WrConfettiOptions {
  /** Number of particles. @default 80 */
  readonly count?: number;
  /** Spread cone in degrees. @default 60 */
  readonly spread?: number;
  /** Initial particle speed (px/frame). @default 12 */
  readonly velocity?: number;
  /** Particle gravity (px/frame²). @default 0.35 */
  readonly gravity?: number;
  /** Air drag coefficient. @default 0.92 */
  readonly drag?: number;
  /**
   * Origin as viewport ratios — `{ x: 0.5, y: 0.5 }` = center.
   * Defaults to bottom-center.
   */
  readonly origin?: { readonly x: number; readonly y: number };
  /** Color palette. @default ngwr brand colors */
  readonly colors?: readonly string[];
  /** Particle frame size in px. @default 8 */
  readonly size?: number;
  /** Lifetime in frames (~60fps). @default 180 */
  readonly ttl?: number;
}
