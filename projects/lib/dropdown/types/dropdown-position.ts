/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { ConnectedPosition } from '@angular/cdk/overlay';

import { type WrAnchoredPosition, wrAnchoredPositions } from 'ngwr/overlay';

/**
 * Where the dropdown menu opens, relative to the trigger.
 */
export type WrDropdownPosition = WrAnchoredPosition;

/**
 * The list `withPositions()` wants — the shared fallback chain `wr-popover`
 * walks, as fresh objects, so the directive can tell which link the CDK landed
 * on by the IDENTITY of the position it reports back.
 *
 * No gap, unlike `wr-popover`'s list: the distance between the trigger and the
 * menu is PADDING on the pane (`.wr-dropdown-overlay--<placement>`), so the
 * pointer crossing it is still over the overlay and a `trigger="hover"` menu
 * does not close on the way in. It also means nothing here is
 * direction-dependent, which is why the directive needs no `wrMirrorOffsets`.
 *
 * Deliberately untagged too, where `wr-popover` puts each placement's class in
 * the position's own `panelClass`. The CDK takes those classes off the pane
 * BEFORE it measures it for fit, and here the class carries the gap, as padding
 * — so a tagged list is measured without its gap. A menu with less room than
 * that gap was judged to fit and the flexible bounding box squeezed it instead:
 * measured in Chromium at 1280×700 with 2px to spare below the trigger, the
 * menu's box shrank from 74px to 68px and its last row ran through the bottom
 * border. The directive writes the class itself, which the CDK leaves alone, so
 * the pane is measured with the gap it will render with. Once a side placement
 * has fallen below or above, the directive drops the side links for as long as
 * the menu stays open — the gap changes axis with the placement, so a pane is
 * only measured correctly against links on one axis at a time.
 *
 * @internal
 */
export function wrDropdownPositions(position: WrDropdownPosition): ConnectedPosition[] {
  return wrAnchoredPositions(position);
}
