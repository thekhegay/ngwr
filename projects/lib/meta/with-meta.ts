/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type WrFeature, wrFeature } from 'ngwr/utils';

import { WR_META_DEFAULTS } from './tokens';
import type { WrMetaConfig } from './types';

/**
 * Register app-wide defaults for {@link WrMeta}, as a feature of `provideWr()`.
 * Use to set a consistent baseline `title` / `titleTemplate` / `og` /
 * `twitter` for every route — individual routes / components can override via
 * `metaService.push(...)` or the `[wrMeta]` directive.
 *
 * Bootstrap only: {@link WrMeta} is root-provided and reads its defaults once,
 * from the root injector.
 *
 * @example
 * ```ts
 * import { provideWr } from 'ngwr';
 * import { withMeta } from 'ngwr/meta';
 *
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     provideWr(
 *       withMeta({
 *         titleTemplate: '{{ title }} · NGWR',
 *         description: 'Angular UI components library',
 *         og: { siteName: 'NGWR', type: 'website' },
 *         twitter: { card: 'summary_large_image', creator: '@thekhegay' },
 *       }),
 *     ),
 *   ],
 * });
 * ```
 */
export function withMeta(defaults: WrMetaConfig = {}): WrFeature<'meta'> {
  return wrFeature('meta', [{ provide: WR_META_DEFAULTS, useValue: defaults }]);
}
