/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { ConnectedPosition } from '@angular/cdk/overlay';

/**
 * Mirror the horizontal offsets of a connected-position list for RTL.
 *
 * The CDK mirrors `originX` / `overlayX` under `dir="rtl"` — a `start` anchor
 * resolves to the origin's right edge — but it does NOT mirror `offsetX`, which
 * it adds to the final PHYSICAL x (`_getOffset` returns `position.offsetX`
 * verbatim). So a position that meant "sit to the inline-start of the trigger,
 * 8px clear of it" keeps its `-8` under RTL, where the panel is now on the
 * right: the gap becomes an 8px OVERLAP, and the panel sits on top of the thing
 * it is describing.
 *
 * Nothing in the CDK will do this for us, and the amount is per position, so
 * every ngwr overlay that offsets along the inline axis passes its list through
 * here. `offsetY` is untouched: the block axis does not flip.
 *
 * @example
 * ```ts
 * const dir = inject(Directionality, { optional: true });
 *
 * strategy.withPositions(wrMirrorOffsets(WR_POPOVER_POSITIONS[position], dir?.value === 'rtl'));
 * ```
 */
export function wrMirrorOffsets(positions: readonly ConnectedPosition[], isRtl: boolean): ConnectedPosition[] {
  // Copied rather than mutated even when there is nothing to do: the position
  // tables are module-level constants shared by every instance, so handing back
  // the same objects invites a caller to write through them.
  if (!isRtl) return positions.map(position => ({ ...position }));

  return positions.map(position => ({
    ...position,
    ...(position.offsetX == null ? {} : { offsetX: -position.offsetX }),
  }));
}
