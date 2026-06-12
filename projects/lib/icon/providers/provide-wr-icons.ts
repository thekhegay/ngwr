/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type Provider, isDevMode } from '@angular/core';

import type { WrIconDef } from '../interfaces';
import { WR_ICONS } from '../tokens';
import { validateIcon } from '../utils';

/**
 * Registers a set of icons for use by `<wr-icon>`.
 *
 * Can be called multiple times — each call adds to the registry.
 * Works at both the application root and at the component level,
 * so a feature module or a single component can bring its own icons
 * without polluting the global config.
 *
 * In dev mode, each icon is validated for common issues (missing
 * `viewBox`, malformed root). Validation is dropped from production
 * builds via `isDevMode()` tree-shaking.
 *
 * @example
 * ```ts
 * // App-level registration
 * import { home, user, cog, provideWrIcons } from 'ngwr/icon';
 *
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideWrIcons([home, user, cog]),
 *   ],
 * };
 * ```
 *
 * @example
 * ```ts
 * // Component-level registration
 * import { logoGithub, logoNpm, provideWrIcons, WrIconDef } from 'ngwr/icon';
 *
 * @Component({
 *   selector: 'ngwr-header',
 *   imports: [WrIcon],
 *   providers: [provideWrIcons([logoGithub, logoNpm])],
 *   template: `<wr-icon name="logo-github" />`,
 * })
 * export class HeaderComponent {}
 * ```
 */
export function provideWrIcons(icons: WrIconDef[]): Provider[] {
  if (isDevMode()) {
    for (const icon of icons) validateIcon(icon);
  }
  return [{ provide: WR_ICONS, useValue: icons, multi: true }];
}
