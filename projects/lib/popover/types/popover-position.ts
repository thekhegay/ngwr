/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { ConnectedPosition } from '@angular/cdk/overlay';

export type WrPopoverPosition =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'left-start'
  | 'left-end'
  | 'right'
  | 'right-start'
  | 'right-end';

/**
 * The CDK geometry for each placement — one position, no fallbacks.
 *
 * The 8px offset is the gap between the trigger and the panel, and it is the
 * reason a flip list matters rather than being a nicety: the flexible strategy
 * emits `offsetX` as a `transform` on the pane, AFTER `withPush` has already
 * decided the coordinate. Push therefore parks a right-anchored panel flush
 * against the viewport edge and the offset then shoves it 8px back out, so a
 * side placement that does not fit loses its border and corner off-screen no
 * matter how hard push works. Flipping to a placement that fits is the only
 * recovery, which is what `WR_POPOVER_FALLBACKS` is for.
 *
 * @internal
 */
export const WR_POPOVER_POSITIONS: Record<WrPopoverPosition, ConnectedPosition> = {
  top: { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: -8 },
  'top-start': { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -8 },
  'top-end': { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -8 },
  bottom: { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: 8 },
  'bottom-start': { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 },
  'bottom-end': { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
  left: { originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center', offsetX: -8 },
  'left-start': { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'top', offsetX: -8 },
  'left-end': { originX: 'start', originY: 'bottom', overlayX: 'end', overlayY: 'bottom', offsetX: -8 },
  right: { originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center', offsetX: 8 },
  'right-start': { originX: 'end', originY: 'top', overlayX: 'start', overlayY: 'top', offsetX: 8 },
  'right-end': { originX: 'end', originY: 'bottom', overlayX: 'start', overlayY: 'bottom', offsetX: 8 },
};

/**
 * What each placement is allowed to flip to when it does not fit, best first.
 * The requested placement always leads, so a panel that fits never moves.
 *
 * Alignment is preserved down the whole chain — a `-start` popover stays
 * `-start` — because the alignment is the author's answer to "which end of the
 * trigger does this belong to", and a flip is about the side, not about that.
 *
 * The two axes are deliberately NOT symmetric. A block-axis placement (`top*` /
 * `bottom*`) flips only to its opposite, the classic behaviour, so a dropdown-ish
 * panel can never surprise anyone by appearing beside its trigger. An inline-axis
 * one (`left*` / `right*`) also gets the two block-axis sides, because on a phone
 * NEITHER side fits: at 375px a 233px panel beside a mid-page trigger overflows
 * by 109px to the right and 97px to the left, and only below/above has room.
 *
 * @internal
 */
export const WR_POPOVER_FALLBACKS: Record<WrPopoverPosition, readonly WrPopoverPosition[]> = {
  top: ['top', 'bottom'],
  'top-start': ['top-start', 'bottom-start'],
  'top-end': ['top-end', 'bottom-end'],
  bottom: ['bottom', 'top'],
  'bottom-start': ['bottom-start', 'top-start'],
  'bottom-end': ['bottom-end', 'top-end'],
  left: ['left', 'right', 'bottom', 'top'],
  'left-start': ['left-start', 'right-start', 'bottom-start', 'top-start'],
  'left-end': ['left-end', 'right-end', 'bottom-end', 'top-end'],
  right: ['right', 'left', 'bottom', 'top'],
  'right-start': ['right-start', 'left-start', 'bottom-start', 'top-start'],
  'right-end': ['right-end', 'left-end', 'bottom-end', 'top-end'],
};

/**
 * The list `withPositions()` wants, with every link tagged so the pane names the
 * placement it ACTUALLY took rather than the one that was asked for.
 *
 * The tag is what keeps the arrow honest. It is drawn by
 * `.wr-popover-overlay--<placement> > *::after`, so a panel that flipped while
 * the class stayed put would point at a side it no longer sits on. CDK applies a
 * position's own `panelClass` in `_applyPosition` and clears it again on the next
 * one, which is exactly the bookkeeping this needs — hence the class rather than
 * a `positionChanges` subscription.
 *
 * @param paneClass The pane's base class: `wr-popover-overlay` or
 *   `wr-tooltip-overlay`. The two modes key their arrows off different
 *   selectors, so the prefix cannot live in the table.
 *
 * @internal
 */
export function wrPopoverPositions(position: WrPopoverPosition, paneClass: string): ConnectedPosition[] {
  return WR_POPOVER_FALLBACKS[position].map(name => ({
    ...WR_POPOVER_POSITIONS[name],
    panelClass: `${paneClass}--${name}`,
  }));
}
