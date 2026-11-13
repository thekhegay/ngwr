/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { ConnectedPosition } from '@angular/cdk/overlay';

import { type WrAnchoredPosition, wrAnchoredPositions } from 'ngwr/overlay';

/** Where the popover sits relative to its trigger. */
export type WrPopoverPosition = WrAnchoredPosition;

/**
 * The list `withPositions()` wants: the shared fallback chain, 8px clear of the
 * trigger, with every link tagged so the pane names the placement it ACTUALLY
 * took rather than the one that was asked for.
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
  return wrAnchoredPositions(position, { gap: 8, paneClass });
}
