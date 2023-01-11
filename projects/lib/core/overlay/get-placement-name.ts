import { ConnectedOverlayPositionChange } from '@angular/cdk/overlay';

import { WR_POSITION_MAP } from './position-map';
import { WR_POSITION_TYPE } from './position-type';

export function getPlacementName(position: ConnectedOverlayPositionChange): string | undefined {
  for (const placement in WR_POSITION_MAP) {
    if (
      position.connectionPair.originX === WR_POSITION_MAP[placement as WR_POSITION_TYPE].originX &&
      position.connectionPair.originY === WR_POSITION_MAP[placement as WR_POSITION_TYPE].originY &&
      position.connectionPair.overlayX === WR_POSITION_MAP[placement as WR_POSITION_TYPE].overlayX &&
      position.connectionPair.overlayY === WR_POSITION_MAP[placement as WR_POSITION_TYPE].overlayY
    ) {
      return placement;
    }
  }
  return undefined;
}
