/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type EnvironmentProviders, isDevMode, makeEnvironmentProviders } from '@angular/core';

import type { WrFeature } from 'ngwr/utils';

/**
 * App-wide ngwr configuration, in one call: pass the features you want, each
 * from the entry point it configures, so an app bundles only the ones it
 * imports. None of them is required — each changes a default — and an app that
 * wants none leaves the call out.
 *
 * | Feature | From | Configures |
 * | --- | --- | --- |
 * | `withDensity()` | `ngwr/density` | the global density scale, applied at boot |
 * | `withTheme()` | `ngwr/theme` | the default scheme and its storage key, applied at boot |
 * | `withToast()` | `ngwr/toast` | toast defaults |
 * | `withDates()` | `ngwr/date` | the date adapter and the locale dates format in |
 * | `withStorage()` | `ngwr/storage` | the storage engine, key prefix, JSON envelope and TTL |
 * | `withMeta()` | `ngwr/meta` | `<head>` defaults for every route |
 * | `withWindows()` | `ngwr/window` | the work area every floating window keeps inside |
 *
 * Icons and i18n stay calls of their own (`provideWrIcons()`, `provideWrI18n()`
 * and its loaders), because both chain: a route adds icons or catalog keys to
 * what its parent registered.
 *
 * **In a route's `providers` a feature reaches what it scopes.** `withDates()`
 * gives that subtree its own adapter. The rest configure a root service that
 * reads its token once, from the root injector, so they belong at bootstrap —
 * `withToast()` says so in dev mode.
 *
 * In dev mode the same feature passed twice throws: the second would silently
 * replace the first.
 *
 * @example
 * ```ts
 * import { provideWr } from 'ngwr';
 * import { withDates } from 'ngwr/date';
 * import { withDensity } from 'ngwr/density';
 * import { withToast } from 'ngwr/toast';
 *
 * bootstrapApplication(App, {
 *   providers: [
 *     provideWr(
 *       withDensity({ defaultDensity: 'sm' }),
 *       withToast({ duration: 6000 }),
 *       withDates({ locale: 'ru-RU' }),
 *     ),
 *   ],
 * });
 * ```
 */
export function provideWr(...features: readonly WrFeature[]): EnvironmentProviders {
  if (isDevMode()) {
    const seen = new Set<string>();
    for (const { ɵkind: kind } of features) {
      if (seen.has(kind)) {
        throw new Error(
          `[NGWR] provideWr() received the "${kind}" feature twice. Each one provides a single value, so the ` +
            'second would silently replace the first — merge the two option objects into one call.'
        );
      }
      seen.add(kind);
    }
  }

  return makeEnvironmentProviders(features.flatMap(feature => feature.ɵproviders));
}
