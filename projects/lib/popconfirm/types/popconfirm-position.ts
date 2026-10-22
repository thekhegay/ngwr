/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { ConnectedPosition } from '@angular/cdk/overlay';

export type WrPopconfirmPosition = 'top' | 'bottom' | 'left' | 'right';

/**
 * The CDK geometry for each placement — one position each. The 8px offset is
 * the gap between the trigger and the panel, the same one `wr-popover` keeps.
 *
 * @internal
 */
export const WR_POPCONFIRM_POSITIONS: Record<WrPopconfirmPosition, ConnectedPosition> = {
  top: { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: -8 },
  bottom: { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: 8 },
  left: { originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center', offsetX: -8 },
  right: { originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center', offsetX: 8 },
};

/**
 * What each placement may flip to when it does not fit, best first — the chains
 * `wr-popover` uses for the same four sides, for the same reasons. The requested
 * placement leads, so a panel that fits never moves; a side placement may also
 * fall below or above, because on a phone neither side of a mid-page trigger has
 * the room.
 *
 * Each list used to hold ONE position, with `withPush(true)` and nothing to fall
 * back to. A `top` panel opened 60px under the top of a 1440×900 viewport was
 * pushed back down over its own trigger, by 20px, and a `right` panel on a 390px
 * phone ran off the edge with its Confirm button clipped — the panel covering the
 * control it was asking about, while the docs said it flips.
 *
 * @internal
 */
export const WR_POPCONFIRM_FALLBACKS: Record<WrPopconfirmPosition, readonly WrPopconfirmPosition[]> = {
  top: ['top', 'bottom'],
  bottom: ['bottom', 'top'],
  left: ['left', 'right', 'bottom', 'top'],
  right: ['right', 'left', 'bottom', 'top'],
};

/**
 * The list `withPositions()` wants, every link tagged with the pane class of the
 * side it puts the panel on, so the arrow (`.wr-popconfirm-overlay--<side>`)
 * follows a flip. The CDK applies a position's own `panelClass` when it lands on
 * it and clears it on the next one; the gap is an offset rather than padding, so
 * taking the class off before it measures changes nothing.
 *
 * @internal
 */
export function wrPopconfirmPositions(position: WrPopconfirmPosition): ConnectedPosition[] {
  return WR_POPCONFIRM_FALLBACKS[position].map(name => ({
    ...WR_POPCONFIRM_POSITIONS[name],
    panelClass: `wr-popconfirm-overlay--${name}`,
  }));
}
