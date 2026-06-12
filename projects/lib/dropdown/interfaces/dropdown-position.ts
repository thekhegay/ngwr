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
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'right';

/**
 * Maps friendly names to CDK ConnectedPosition fallback lists.
 *
 * @internal
 */
export const WR_DROPDOWN_POSITIONS: Record<WrDropdownPosition, ConnectedPosition[]> = {
  top: [{ originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom' }],
  'top-start': [{ originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' }],
  'top-end': [{ originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom' }],
  bottom: [{ originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top' }],
  'bottom-start': [{ originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' }],
  'bottom-end': [{ originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' }],
  left: [{ originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center' }],
  right: [{ originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center' }],
};
