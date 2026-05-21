/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { ConnectedPosition } from '@angular/cdk/overlay';

export type WrTooltipPosition = 'top' | 'bottom' | 'left' | 'right';

/** @internal */
export const WR_TOOLTIP_POSITIONS: Record<WrTooltipPosition, ConnectedPosition[]> = {
  top: [{ originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: -6 }],
  bottom: [{ originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: 6 }],
  left: [{ originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center', offsetX: -6 }],
  right: [{ originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center', offsetX: 6 }],
};
