/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * The helpers ngwr's animations share: the grapheme splitter, the stagger gap
 * and its cap, the viewport threshold an effect plays at, the focusable
 * selector hover and focus are read on, the optional-selector transform, the
 * per-frame rounding, the canvas plumbing a backdrop draws through, the
 * seeded noise a field sways with and the pointer tracking the card effects
 * follow. Every export is `@internal` — an entry point of its
 * own so that the effects can all import it without one effect importing
 * another, and not a public API: nothing here carries a stability promise, and
 * an app imports an effect instead.
 */
export {
  FRAME_FLOOR_SLACK,
  MAX_DPR,
  MAX_FRAME_MS,
  MAX_PIXELS,
  type WrCanvasBackdrop,
  type WrCanvasBackdropScene,
  canvasBackdropRatio,
  createCanvasBackdrop,
} from './canvas-backdrop';
export { FOCUSABLE, optionalSelector, roundTo } from './dom';
export { type WrNoise, createNoise, seededRandom } from './noise';
export { type WrPointerFollower, WrPointerTracker } from './pointer-tracker';
export {
  BREAKING_SPACES,
  STAGGER_GAP,
  STAGGER_SPREAD_MAX,
  VIEW_THRESHOLD,
  graphemes,
  optionalMs,
  staggerGap,
} from './stagger';
export type { WrStaggerBy } from './types';
