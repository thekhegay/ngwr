/**
 * The helpers ngwr's animations share: the grapheme splitter, the stagger gap
 * and its cap, the viewport threshold an effect plays at, the focusable
 * selector hover and focus are read on, the optional-selector transform, the
 * per-frame rounding, the canvas plumbing a backdrop draws through, the
 * seeded noise a field sways with and the pointer tracking the card effects
 * follow. Not an entry point: this folder has no
 * `public-api.ts`, so the package exports nothing from it and an app imports an
 * effect instead. The effects reach it by a relative path, and the builder
 * emits what two of them share once, as a chunk beside their bundles.
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
