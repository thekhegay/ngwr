/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Injectable, inject } from '@angular/core';

import { WR_ICONS } from './tokens';
import type { WrIconDef } from './types';

/**
 * One link in the icon-registry chain. {@link provideWrIcons} provides an
 * instance alongside its icons, so every injector level that registers icons
 * gets its own link whose parent is the next registering level above it.
 *
 * This exists because Angular does not merge `multi: true` providers across
 * injector levels — an element-level `provideWrIcons()` *replaces* the visible
 * `WR_ICONS` collection rather than adding to it. Reading only the closest
 * contribution silently hid every icon registered further up, which contradicts
 * the "each call adds to the registry" contract. Walking the chain restores it
 * for any number of levels.
 *
 * @internal
 */
@Injectable()
export class WrIconRegistry {
  /** The next registering level up, if any. */
  private readonly parent = inject(WrIconRegistry, { skipSelf: true, optional: true });

  /** Icons registered at *this* level only. */
  private readonly own = inject(WR_ICONS, { self: true, optional: true }) ?? [];

  private resolved?: Map<string, WrIconDef>;
  private resolvedFrom?: Map<string, WrIconDef>;
  private resolvedSets: (readonly [WrIconDef, string])[][] = [];

  /**
   * Every icon visible from this level, nearest last so a local registration
   * wins over an identically named one further up. The map is shared, so
   * callers read it and never write to it. `provideWrIcons()` keeps the
   * caller's array and an app may fill or edit it later, so the map is built
   * again when the parent's map, a registered entry or its name changed;
   * comparing those is far cheaper than building the map for every `<wr-icon>`.
   */
  resolve(): Map<string, WrIconDef> {
    const from = this.parent?.resolve();
    if (this.resolved && from === this.resolvedFrom && this.sameSets()) return this.resolved;
    const map = new Map<string, WrIconDef>(from);
    for (const set of this.own) {
      for (const icon of set) map.set(icon.name, icon);
    }
    this.resolvedFrom = from;
    this.resolvedSets = this.own.map(set => set.map(icon => [icon, icon.name] as const));
    return (this.resolved = map);
  }

  private sameSets(): boolean {
    return this.own.every((set, i) => {
      const seen = this.resolvedSets[i];
      return set.length === seen.length && set.every((icon, j) => icon === seen[j][0] && icon.name === seen[j][1]);
    });
  }
}
