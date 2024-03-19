import { inject, Injectable, InjectionToken } from '@angular/core';

import { IWrIcon } from './icons';

export const WR_ICONS_PATCH = new InjectionToken<IWrIcon[]>('wr_icons_patch');

@Injectable({
  providedIn: 'root',
})
export class WrIconService {
  readonly registry = new Map<string, string>();

  addIcon(...icons: IWrIcon[]): void {
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
