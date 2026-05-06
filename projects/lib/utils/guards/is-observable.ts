/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { Observable } from 'rxjs';

/**
 * Type guard that checks whether a value looks like an RxJS `Observable`.
 *
 * Uses duck-typing: verifies that the object has a `subscribe` function.
 * Does not require an actual `Observable` instance.
 *
 * @example
 * ```ts
 * if (isObservable(stream)) {
 *   stream.subscribe(value => console.log(value));
 * }
 * ```
 */
export function isObservable<T = unknown>(value: unknown): value is Observable<T> {
  return !!value && typeof (value as { subscribe?: unknown }).subscribe === 'function';
}
