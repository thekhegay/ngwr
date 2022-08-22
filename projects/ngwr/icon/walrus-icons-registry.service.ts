import { Injectable } from '@angular/core';
import { allIcons, WalrusIcon } from './icons';

@Injectable({
  providedIn: 'root'
})
export class WalrusIconsRegistry {
  private registry = new Map<string, string>();

  public registerIcons(): void {
    allIcons.forEach((icon: WalrusIcon) => this.registry.set(icon.name, icon.data));
  }

  public getIcon(iconName: string): string | undefined {
    if (!this.registry.has(iconName)) {
      console.warn(`We could not find the Walrus Icon with the name ${iconName}, did you add it to the Icon registry?`);
    }
    return this.registry.get(iconName);
  }
}
