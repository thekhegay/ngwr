import { Injectable } from '@angular/core';
import { WrIcon, wrIconSet } from './wr-icons';

@Injectable({
  providedIn: 'root'
})
export class WrIconService {
  /**
   * Icons registry
   */
  public static registry: Readonly<Map<string, string>> = new Map<string, string>();

  /**
   * Access icons registry
   */
  get registry(): Readonly<Map<string, string>> {
    return WrIconService.registry;
  }

  /**
   * Register all icons
   */
  static registerIcons(): void {
    wrIconSet.forEach((icon: WrIcon) => WrIconService.registry.set(icon.name, icon.data));
  }
}
