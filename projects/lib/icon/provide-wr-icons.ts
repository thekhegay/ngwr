/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Provider } from '@angular/core';

import { WR_ICONS_PATCH, WrIconPatchService } from './icon.service';
import { WrIcon } from './icons';

export function provideWrIcons(icons: WrIcon[]): Provider[] {
  return [
    WrIconPatchService,
    {
      provide: WR_ICONS_PATCH,
      useValue: icons,
    },
  ];
}
