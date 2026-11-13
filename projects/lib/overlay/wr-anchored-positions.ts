/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { ConnectedPosition } from '@angular/cdk/overlay';

/**
 * Where an anchored panel sits relative to its trigger: a side, optionally
 * aligned to the trigger's start or end edge. The one set `wr-popover`,
 * `wr-dropdown` and `wr-popconfirm` take as `position`.
 *
 * `left` / `right` and `-start` / `-end` are logical: under `dir="rtl"` they
 * mirror, the name staying as written.
 */
export type WrAnchoredPosition =
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
 * The CDK geometry for each placement: one position, no gap and no fallbacks.
 *
 * Everything anchors on `start` / `end` or `center`, which the CDK resolves
 * against the direction, so the table itself needs no mirroring. A gap added by
 * `wrAnchoredPositions` is an offset in physical pixels and does: see
 * `wrMirrorOffsets`.
 *
 * @internal
 */
export const WR_ANCHORED_POSITIONS: Record<WrAnchoredPosition, ConnectedPosition> = {
  top: { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom' },
  'top-start': { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
  'top-end': { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom' },
  bottom: { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top' },
  'bottom-start': { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
  'bottom-end': { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' },
  left: { originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center' },
  'left-start': { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'top' },
  'left-end': { originX: 'start', originY: 'bottom', overlayX: 'end', overlayY: 'bottom' },
  right: { originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center' },
  'right-start': { originX: 'end', originY: 'top', overlayX: 'start', overlayY: 'top' },
  'right-end': { originX: 'end', originY: 'bottom', overlayX: 'start', overlayY: 'bottom' },
};

/**
 * What each placement is allowed to flip to when it does not fit, best first.
 * The requested placement always leads, so a panel that fits never moves.
 *
 * Alignment is preserved down the whole chain — a `-start` panel stays
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
export const WR_ANCHORED_FALLBACKS: Record<WrAnchoredPosition, readonly WrAnchoredPosition[]> = {
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

/** How a host dresses the links `wrAnchoredPositions` returns. @internal */
export interface WrAnchoredPositionsOptions {
  /**
   * Distance between the trigger and the panel, in px, as a CDK offset pointing
   * away from the trigger. Left out by a host whose gap is padding on the pane.
   *
   * It is the reason a flip list matters rather than being a nicety: the
   * flexible strategy emits `offsetX` as a `transform` on the pane, AFTER
   * `withPush` has already decided the coordinate. Push therefore parks a
   * right-anchored panel flush against the viewport edge and the offset then
   * shoves it back out, so a side placement that does not fit loses its border
   * and corner off-screen no matter how hard push works.
   */
  readonly gap?: number;
  /**
   * The pane's base class. Each link is tagged `<paneClass>--<placement>`, so
   * the pane names the placement it ACTUALLY took: the CDK applies a position's
   * own `panelClass` when it lands on it and clears it on the next one. Left
   * out by a host that writes the class itself.
   */
  readonly paneClass?: string;
}

/**
 * The list `withPositions()` wants for a placement: its fallback chain in
 * order, as fresh objects, so a caller may also tell which link the CDK landed
 * on by the identity of the position it reports back.
 *
 * @internal
 */
export function wrAnchoredPositions(
  position: WrAnchoredPosition,
  options: WrAnchoredPositionsOptions = {}
): ConnectedPosition[] {
  const { gap, paneClass } = options;
  return WR_ANCHORED_FALLBACKS[position].map(name => {
    const link: ConnectedPosition = { ...WR_ANCHORED_POSITIONS[name] };
    if (gap) {
      if (name.startsWith('top')) link.offsetY = -gap;
      else if (name.startsWith('bottom')) link.offsetY = gap;
      else if (name.startsWith('left')) link.offsetX = -gap;
      else link.offsetX = gap;
    }
    if (paneClass) link.panelClass = `${paneClass}--${name}`;
    return link;
  });
}
