/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Observable } from 'rxjs';

import { SafeAny } from 'ngwr/cdk/types';

export function isObservable(obj: SafeAny | Observable<SafeAny>): obj is Observable<SafeAny> {
  return !!obj && typeof obj.subscribe === 'function';
}
