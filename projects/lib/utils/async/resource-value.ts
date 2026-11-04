/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type Resource, type Signal, assertInInjectionContext, effect, linkedSignal } from '@angular/core';

/** The source's answer while the resource has no settled value, distinct from any value it could hold. */
const NONE: unique symbol = Symbol('wrResourceValue.none');

/**
 * A resource's value as a signal that never throws: the value while the
 * resource has one, the last settled value while it loads, reloads or sits in
 * its error state, and `fallback` before anything settled.
 *
 * `resource.value()` throws while the status is `error`, so a template that
 * reads it needs a guard at every read; and a `loading` for new params drops
 * the old value, so a list flickers empty on every page change. This keeps the
 * last `resolved` or `local` value through both.
 *
 * Takes anything that is a `Resource`: `resource()`, `rxResource()` and
 * `httpResource()` alike. Needs an injection context, like the resource it
 * reads: an effect records each settled value as it lands, so the memory does
 * not depend on something having read the signal in time, and ends with the
 * context.
 *
 * @example
 * ```ts
 * readonly users = httpResource<User[]>(() => `/api/users?page=${this.page()}`);
 * readonly rows = wrResourceValue(this.users, []);
 * ```
 * ```html
 * <wr-table [items]="rows()" [loading]="users.isLoading()" />
 * ```
 *
 * @param resource - The resource to read.
 * @param fallback - What to return until the resource first settles with a value.
 * @returns A read-only signal of the value.
 */
export function wrResourceValue<T>(resource: Resource<T | undefined>, fallback: NoInfer<T>): Signal<T> {
  assertInInjectionContext(wrResourceValue);
  const value = linkedSignal<T | typeof NONE, T>({
    source: () => {
      const status = resource.status();
      const settled = (status === 'resolved' || status === 'local') && resource.hasValue();
      return settled ? resource.value() : NONE;
    },
    computation: (next, previous) => (next !== NONE ? next : previous ? previous.value : fallback),
  });
  effect(() => value());
  return value.asReadonly();
}
