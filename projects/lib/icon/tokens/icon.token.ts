/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

import type { WrIconDef } from '../types';

/**
 * Multi-provider token for registering icons with the icon registry.
 *
 * Use {@link provideWrIcons} instead of providing this token directly.
 *
 * @internal
 */
export const WR_ICONS = new InjectionToken<readonly WrIconDef[][]>('WR_ICONS');
