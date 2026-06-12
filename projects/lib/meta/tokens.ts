/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

import type { WrMetaConfig } from './interfaces';

/** App-wide defaults registered via {@link provideWrMeta}. */
export const WR_META_DEFAULTS = new InjectionToken<WrMetaConfig>('WR_META_DEFAULTS', {
  factory: (): WrMetaConfig => ({}),
});
