/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { Observable } from 'rxjs';

/**
 * Checks whether a given value looks like an RxJS `Observable`.
 *
 * This is a duck-typing check: it only verifies that the object has a
 * `subscribe` function and does not strictly require an actual `Observable`
 * instance.
 *
 * @example
 * ```ts
 * if (isObservable(stream)) {
 *   stream.subscribe(...);
 * }
 * ```
 */
export function isObservable<T = unknown>(value: unknown): value is Observable<T> {
  return !!value && typeof (value as { subscribe?: unknown }).subscribe === 'function';
}
