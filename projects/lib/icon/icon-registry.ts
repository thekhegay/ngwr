/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Injectable, inject } from '@angular/core';

import type { WrIconDef } from './interfaces';
import { WR_ICONS } from './tokens';

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

  /**
   * Every icon visible from this level, nearest last so a local registration
   * wins over an identically named one further up.
   */
  resolve(): Map<string, WrIconDef> {
    const map = this.parent?.resolve() ?? new Map<string, WrIconDef>();
    for (const set of this.own) {
      for (const icon of set) map.set(icon.name, icon);
    }
    return map;
  }
}
