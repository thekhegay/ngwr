/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ElementRef, ViewEncapsulation, computed, effect, inject, input, isDevMode } from '@angular/core';

import { WrIconRegistry } from './icon-registry';
import type { WrIconDef, WrIconName } from './interfaces';

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
 * @see https://ngwr.dev/reference/components/icon
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

  /**
   * Every icon visible from this position, walked up the whole chain of
   * registering injector levels.
   *
   * Angular's `inject(WR_ICONS)` returns only the **closest** injector's
   * contribution — `multi` providers are not merged across levels — so a
   * component that registers its own icons used to shadow, not extend, what an
   * ancestor registered. {@link WrIconRegistry} is provided once per
   * registering level and links to its parent, so nesting any number of levels
   * now adds up, with the nearest registration winning a name collision.
   *
   * Optional: with no `provideWrIcons()` anywhere the map is simply empty and
   * every name reports as unregistered.
   */
  private readonly iconRegistry = inject(WrIconRegistry, { optional: true });

  private readonly registry = computed<ReadonlyMap<WrIconName, WrIconDef>>(
    () => (this.iconRegistry?.resolve() ?? new Map()) as ReadonlyMap<WrIconName, WrIconDef>
  );

  private readonly icon = computed(() => this.registry().get(this.name()));

  constructor() {
    effect(() => {
      const icon = this.icon();
      const name = this.name();

      if (!icon) {
        if (isDevMode()) {
          // Reported, never thrown. An exception here escapes into
          // `runEffectsInView`, which abandons the remaining effects of the
          // whole view — one unknown name would blank every `<wr-icon>` after
          // it while the console blamed only the first. Error level (not
          // `badgeLog`) so it survives a console filtered to errors.
          // eslint-disable-next-line no-console -- misconfiguration must be visible, but must not throw
          console.error(
            `[NGWR] No icon named "${name}" is registered. Did you forget to call provideWrIcons()? ` +
              `If the name IS registered, check the injector level: a component-level provideWrIcons() ` +
              `shadows icons registered on an ancestor component.`
          );
        }
        this.host.nativeElement.innerHTML = '';
        return;
      }

      this.host.nativeElement.innerHTML = icon.data;

      // Every hand-written inline SVG in the library carries aria-hidden;
      // registered icons went in without it, so a decorative glyph could be
      // announced — usually as a bare "graphic" beside the label it decorates.
      // Consumers that need a name put it on the interactive host instead.
      this.host.nativeElement.querySelector('svg')?.setAttribute('aria-hidden', 'true');
    });
  }
}
