/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { ConnectedPosition } from '@angular/cdk/overlay';

import { type WrAnchoredPosition, wrAnchoredPositions } from 'ngwr/overlay';

/** Where the popconfirm panel sits relative to its trigger. */
export type WrPopconfirmPosition = WrAnchoredPosition;

/**
 * The list `withPositions()` wants: the shared fallback chain `wr-popover`
 * walks, with its 8px gap, every link tagged with the pane class of the
 * placement it puts the panel on, so the arrow
 * (`.wr-popconfirm-overlay--<placement>`) follows a flip. The CDK applies a
 * position's own `panelClass` when it lands on it and clears it on the next one;
 * the gap is an offset rather than padding, so taking the class off before it
 * measures changes nothing.
 *
 * @internal
 */
export function wrPopconfirmPositions(position: WrPopconfirmPosition): ConnectedPosition[] {
  return wrAnchoredPositions(position, { gap: 8, paneClass: 'wr-popconfirm-overlay' });
}
