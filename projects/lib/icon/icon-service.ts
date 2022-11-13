import { Injectable } from '@angular/core';

import { IWrIcon, wrIconSet } from './icons';

@Injectable({
  providedIn: 'root',
})
export class WrIconService {
  public static registry: Readonly<Map<string, string>> = new Map<string, string>();

  get registry(): Readonly<Map<string, string>> {
    return WrIconService.registry;
  }

  static registerIcons(): void {
    wrIconSet.forEach((icon: IWrIcon) => WrIconService.registry.set(icon.name, icon.data));
  }
}
