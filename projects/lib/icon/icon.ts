/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ElementRef, ViewEncapsulation, computed, effect, inject, input, isDevMode } from '@angular/core';

import { WR_ICONS } from './tokens';
import type { WrIconDef, WrIconName } from './types';

/**
 * Renders a registered SVG icon.
 *
 * Icons must be registered via {@link provideWrIcons} before use —
 * either at the application root or on any ancestor component.
 *
 * @example
 * ```html
 * <wr-icon name="home" />
 * ```
 *
 * @see https://ngwr.dev/docs/components/icon
 */
@Component({
  selector: 'wr-icon',
  template: '',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-icon',
    '[attr.data-icon]': 'name()',
  },
})
export class WrIcon {
  readonly name = input.required<WrIconName>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly iconSets = inject(WR_ICONS, { optional: true }) ?? [];

  private readonly registry = computed(() => {
    const map = new Map<WrIconName, WrIconDef>();
    for (const set of this.iconSets) {
      for (const icon of set) {
        map.set(icon.name, icon);
      }
    }
    return map;
  });

  private readonly icon = computed(() => this.registry().get(this.name()));

  constructor() {
    effect(() => {
      const icon = this.icon();
      const name = this.name();

      if (!icon) {
        if (isDevMode()) {
          throw new Error(`[NGWR] No icon named "${name}" is registered. Did you forget to call provideWrIcons()?`);
        }
        this.host.nativeElement.innerHTML = '';
        return;
      }

      this.host.nativeElement.innerHTML = icon.data;
    });
  }
}
