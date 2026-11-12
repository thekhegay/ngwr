/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

import type { WrDateStampDefaults } from '../types';

/**
 * The app-wide defaults of `wr-date-stamp`: the `stamp` option of
 * `withDates()`. It lives here rather than in `ngwr/date-stamp` so that
 * `withDates()` does not import a component.
 */
export const WR_DATE_STAMP_DEFAULTS = new InjectionToken<WrDateStampDefaults>('WR_DATE_STAMP_DEFAULTS', {
  providedIn: 'root',
  factory: () => ({}),
});
