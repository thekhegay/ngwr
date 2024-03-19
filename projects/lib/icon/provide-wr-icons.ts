import { Optional, Provider, SkipSelf } from '@angular/core';

import { WR_ICONS } from './icon.token';
import { IWrIcon } from './icons';

export function provideWrIcons(icons: IWrIcon[]): Provider {
  return {
    provide: WR_ICONS,
    useFactory: (parentIcons?: Record<string, string>) => {
      const filler: Record<string, string> = {};
      icons.forEach(icon => (filler[icon.name] = icon.data));
      return {
        ...parentIcons,
        ...filler,
      };
    },
    deps: [[WR_ICONS, new Optional(), new SkipSelf()]],
  };
}
