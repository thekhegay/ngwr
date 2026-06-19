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

/** @internal */
export const WR_POPOVER_POSITIONS: Record<WrPopoverPosition, ConnectedPosition[]> = {
  top: [{ originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: -8 }],
  'top-start': [{ originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -8 }],
  'top-end': [{ originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -8 }],
  bottom: [{ originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: 8 }],
  'bottom-start': [{ originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 }],
  'bottom-end': [{ originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 }],
  left: [{ originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center', offsetX: -8 }],
  'left-start': [{ originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'top', offsetX: -8 }],
  'left-end': [{ originX: 'start', originY: 'bottom', overlayX: 'end', overlayY: 'bottom', offsetX: -8 }],
  right: [{ originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center', offsetX: 8 }],
  'right-start': [{ originX: 'end', originY: 'top', overlayX: 'start', overlayY: 'top', offsetX: 8 }],
  'right-end': [{ originX: 'end', originY: 'bottom', overlayX: 'start', overlayY: 'bottom', offsetX: 8 }],
};
