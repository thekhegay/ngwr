/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Maybe } from 'ngwr/cdk/types';

export function isNotEmptyArray<T>(val: Maybe<T>): val is T {
  return !Array.isArray(val) || val.length !== 0;
}
