import { Provider } from '@angular/core';

import { WR_ICONS_PATCH, WrIconPatchService } from './icon.service';
import { IWrIcon } from './icons';

export function provideWrIcons(icons: IWrIcon[]): Provider[] {
  return [
    WrIconPatchService,
    {
      provide: WR_ICONS_PATCH,
      useValue: icons,
    },
  ];
}
