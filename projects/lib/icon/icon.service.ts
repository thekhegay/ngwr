/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { inject, Injectable, InjectionToken } from '@angular/core';

import { WrIcon } from './icons';

export const WR_ICONS_PATCH = new InjectionToken<WrIcon[]>('wr_icons_patch');

@Injectable({
  providedIn: 'root',
})
export class WrIconService {
  readonly registry = new Map<string, string>();

  addIcon(...icons: WrIcon[]): void {
    icons.forEach(i => this.registry.set(i.name, i.data));
  }
}

@Injectable()
export class WrIconPatchService {
  private readonly icons = inject(WR_ICONS_PATCH, { self: true });
  private readonly wrIconService = inject(WrIconService);

  addIcons(): void {
    this.icons.forEach(icon => this.wrIconService.addIcon(icon));
  }
}
