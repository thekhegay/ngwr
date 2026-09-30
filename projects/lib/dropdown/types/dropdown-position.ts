/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { ConnectedPosition } from '@angular/cdk/overlay';

/**
 * Where the dropdown menu opens, relative to the trigger.
 */
export type WrDropdownPosition =
  'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'right';

/**
 * The CDK geometry for each placement — one position, no fallbacks.
 *
 * No `offsetX` / `offsetY`, unlike `wr-popover`'s table: the gap between the
 * trigger and the menu is PADDING on the pane (`.wr-dropdown-overlay--<placement>`),
 * so the pointer crossing it is still over the overlay and a `trigger="hover"`
 * menu does not close on the way in. It also means nothing here is
 * direction-dependent, which is why the directive needs no `wrMirrorOffsets`.
 *
 * @internal
 */
export const WR_DROPDOWN_POSITIONS: Record<WrDropdownPosition, ConnectedPosition> = {
  top: { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom' },
  'top-start': { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
  'top-end': { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom' },
  bottom: { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top' },
  'bottom-start': { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
  'bottom-end': { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' },
  left: { originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center' },
  right: { originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center' },
};

/**
 * What each placement is allowed to flip to when it does not fit, best first.
 * The requested placement always leads, so a menu that fits never moves.
 *
 * The same chains as `wr-popover`'s, restricted to the eight placements a
 * dropdown offers — which needs no editing, since every link in those eight
 * chains is itself one of the eight. Alignment is kept down the chain, a
 * block-axis placement only flips to its opposite, and a side placement may
 * also fall below or above, because on a phone neither side of a mid-page
 * trigger has the room. Once it has, the directive drops the side links for as
 * long as the menu stays open — the gap changes axis with the placement, so a
 * pane is only measured correctly against links on one axis at a time.
 *
 * Each list used to hold ONE position. With `withPush(true)` and nothing to
 * fall back to, a menu that did not fit below its trigger was pushed back up
 * over it instead — measured in Chromium at 1280×700 with a `bottom-start`
 * trigger 40px above the fold: the menu's top landed at 626, inside the
 * trigger's 630–660 box, covering the control that opened it.
 *
 * @internal
 */
export const WR_DROPDOWN_FALLBACKS: Record<WrDropdownPosition, readonly WrDropdownPosition[]> = {
  top: ['top', 'bottom'],
  'top-start': ['top-start', 'bottom-start'],
  'top-end': ['top-end', 'bottom-end'],
  bottom: ['bottom', 'top'],
  'bottom-start': ['bottom-start', 'top-start'],
  'bottom-end': ['bottom-end', 'top-end'],
  left: ['left', 'right', 'bottom', 'top'],
  right: ['right', 'left', 'bottom', 'top'],
};

/**
 * The list `withPositions()` wants — the chain in `WR_DROPDOWN_FALLBACKS` order,
 * as fresh objects, so the directive can tell which link the CDK landed on by
 * the IDENTITY of the position it reports back.
 *
 * Deliberately untagged, and this is where the dropdown parts from `wr-popover`,
 * which puts each placement's class in the position's own `panelClass`. The CDK
 * takes those classes off the pane BEFORE it measures it for fit, and here the
 * class carries the gap, as padding — so a tagged list is measured without its
 * gap. A menu with less room than that gap was judged to fit and the flexible
 * bounding box squeezed it instead: measured in Chromium at 1280×700 with 2px to
 * spare below the trigger, the menu's box shrank from 74px to 68px and its last
 * row ran through the bottom border. The directive writes the class itself, which
 * the CDK leaves alone, so the pane is measured with the gap it will render with.
 *
 * @internal
 */
export function wrDropdownPositions(position: WrDropdownPosition): ConnectedPosition[] {
  return WR_DROPDOWN_FALLBACKS[position].map(name => ({ ...WR_DROPDOWN_POSITIONS[name] }));
}
