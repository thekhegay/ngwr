/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import {
  Component,
  ElementRef,
  EnvironmentInjector,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  isDevMode,
} from '@angular/core';

import type { WrIconDef, WrIconName } from './interfaces';
import { WR_ICONS } from './tokens';

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

  /**
   * Merged view of every `WR_ICONS` multi-provider visible from this
   * injector position — element-level first overlay, environment-level
   * (app/lazy-route bootstrap) as the base.
   *
   * Angular's default `inject(WR_ICONS)` only returns the **closest**
   * injector's contribution; if a component declares its own
   * `provideWrIcons(...)`, the root registration is **shadowed**, not
   * appended. That contradicts the docstring's "each call adds to the
   * registry" promise and silently breaks any page that overrides while
   * still relying on root-registered icons.
   *
   * We work around it by also asking the environment injector directly
   * (`envInjector.get(WR_ICONS, null, …)`). When no element-level
   * provider exists both calls return the same array reference and we
   * skip the redundant pass. Otherwise we lay element on top of env so
   * a page's local icons can override a root-registered name.
   *
   * One known limitation: multiple element-injector levels in between
   * still shadow each other — but the showcase doesn't nest providers
   * that deep, and the env+local merge fixes the dominant case.
   */
  private readonly iconSets: readonly (readonly WrIconDef[])[] = (() => {
    const local = inject(WR_ICONS, { optional: true }) ?? [];
    const env = inject(EnvironmentInjector).get(WR_ICONS, null, { optional: true }) ?? [];
    return local === env ? local : [...env, ...local];
  })();

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
