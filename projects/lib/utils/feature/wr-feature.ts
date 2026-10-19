/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { EnvironmentProviders, Provider } from '@angular/core';

/**
 * One piece of app-wide configuration, passed to `provideWr()` from `ngwr` —
 * the shape Angular gives `RouterFeature` for `provideRouter(routes, withX())`.
 *
 * Each feature is exported by the entry point it configures (`withDensity()`
 * from `ngwr/density`, `withToast()` from `ngwr/toast`, …), so an app bundles
 * only the ones it imports. The type lives here rather than beside
 * `provideWr()` so that no secondary entry point has to import the root one.
 *
 * Both members are private API: build a feature with {@link wrFeature} and read
 * it only inside `provideWr()`.
 */
export interface WrFeature<K extends string = string> {
  /** Which feature this is. `provideWr()` refuses the same kind twice in dev mode. */
  readonly ɵkind: K;
  /** What the feature registers, flattened into `provideWr()`'s providers. */
  readonly ɵproviders: readonly (Provider | EnvironmentProviders)[];
}

/**
 * Build a {@link WrFeature} — what every `with*()` function returns.
 *
 * @example
 * ```ts
 * export function withMeta(defaults: WrMetaConfig = {}): WrFeature<'meta'> {
 *   return wrFeature('meta', [{ provide: WR_META_DEFAULTS, useValue: defaults }]);
 * }
 * ```
 */
export function wrFeature<K extends string>(
  kind: K,
  providers: readonly (Provider | EnvironmentProviders)[]
): WrFeature<K> {
  return { ɵkind: kind, ɵproviders: providers };
}
