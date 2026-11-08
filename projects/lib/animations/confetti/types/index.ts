/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** Where a burst starts: a `DOMRect` or anything shaped like one, in client coordinates. */
interface WrConfettiRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** Options for `WrConfetti.burst()`. */
interface WrConfettiOptions {
  /** Pieces in the burst. Unset, 84. */
  readonly count?: number;
  /** Seeds the layout, so the same seed gives the same burst. Unset, a random one. */
  readonly seed?: number;
}

export type { WrConfettiOptions, WrConfettiRect };
