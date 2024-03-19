import { inject, Injectable } from '@angular/core';

import { WR_ICONS } from './icon.token';

@Injectable({
  providedIn: 'root',
})
export class WrIconService {
  private readonly wrIcons = inject(WR_ICONS);
  public static registry: Readonly<Map<string, string>> = new Map<string, string>();

  constructor() {
    this.recordToMap(this.wrIcons);
  }

  get registry(): Readonly<Map<string, string>> {
    return WrIconService.registry;
  }

  private recordToMap(data: Record<string, string>): void {
    Object.entries(data).forEach(([key, value]) => {
      WrIconService.registry.set(key, value);
    });
  }
}
