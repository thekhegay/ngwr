/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

import type { WrEpochUnit, WrZonelessIn } from '../types';

/**
 * How the native adapter reads a backend value before it formats it: the
 * `epochUnit` and `zonelessIn` options of `withDates()`. An adapter of your own
 * injects it and returns it from `parseOptions()` to honour the same options.
 */
export const WR_DATE_INPUT = new InjectionToken<{ readonly epochUnit: WrEpochUnit; readonly zonelessIn: WrZonelessIn }>(
  'WR_DATE_INPUT',
  { providedIn: 'root', factory: () => ({ epochUnit: 'ms', zonelessIn: 'browser' }) }
);
