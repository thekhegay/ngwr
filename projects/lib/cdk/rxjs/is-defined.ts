/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Maybe } from 'ngwr/cdk/types';

export function isDefined<T>(value: Maybe<T>): value is T {
  return value != null;
}
