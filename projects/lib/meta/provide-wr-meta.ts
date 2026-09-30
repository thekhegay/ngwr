/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { WR_META_DEFAULTS } from './tokens';
import type { WrMetaConfig } from './types';

/**
 * Register app-wide defaults for {@link WrMeta}. Use to set a
 * consistent baseline `title` / `titleTemplate` / `og` / `twitter` for every
 * route — individual routes / components can override via
 * `metaService.push(...)` or the `[wrMeta]` directive.
 *
 * @example
 * ```ts
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     provideWrMeta({
 *       titleTemplate: '{{ title }} · NGWR',
 *       description: 'Angular UI components library',
 *       og: { siteName: 'NGWR', type: 'website' },
 *       twitter: { card: 'summary_large_image', creator: '@thekhegay' },
 *     }),
 *   ],
 * });
 * ```
 */
export function provideWrMeta(defaults: WrMetaConfig = {}): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: WR_META_DEFAULTS, useValue: defaults }]);
}
