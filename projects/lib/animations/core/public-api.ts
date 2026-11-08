/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * The helpers ngwr's animations share: the grapheme splitter, the stagger gap
 * and its cap, the viewport threshold an effect plays at. Every export is
 * `@internal` — an entry point of its own so that the effects can all import it
 * without one effect importing another, and not a public API: nothing here
 * carries a stability promise, and an app imports an effect instead.
 */
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
