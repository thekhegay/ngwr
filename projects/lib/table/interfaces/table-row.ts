/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * One row handed to `wr-table` through `[items]`.
 *
 * **`object`, not `Record<string, unknown>`, and the difference is the whole
 * reason this type exists.** TypeScript withholds the implicit index signature
 * from an `interface`, because declaration merging can widen one later, so an
 * interface is NOT assignable to `Record<string, unknown>` while a `type` alias
 * describing the same shape IS:
 *
 * ```ts
 * interface UserI { id: number }
 * type UserT = { id: number };
 *
 * declare function take(rows: readonly Record<string, unknown>[]): void;
 * take([] as UserI[]); // Index signature for type 'string' is missing in type 'UserI'
 * take([] as UserT[]); // fine
 * ```
 *
 * The table used to declare `[items]` as the record form, so `[items]="users"`
 * compiled for one declaration of `User` and failed for the other — reported as
 * "the table refuses my data", which is what it looks like from outside. Nothing
 * about the row is read at bind time; the table reads cells by string key and
 * hands back `unknown`, so the wider type costs nothing and accepts both.
 *
 * The row callbacks (`rowKey`, `groupBy`, `childrenKey`) do NOT take this type:
 * their parameter is `Record<string, unknown>`, and it stays that way. A
 * parameter is contravariant, so no signature short of a generic component can
 * accept `(row: User) => row.id` — and widening it to `object` would reject the
 * callbacks that do compile today (an explicit
 * `(row: Record<string, unknown>) => …`) while making the row unindexable.
 *
 * Index the row instead — `(row) => row['id']` needs no cast at all — or, to
 * reach your own type, `(row) => (row as unknown as User).id`. A single
 * `as User` is not enough for an `interface`: TypeScript refuses that
 * conversion outright (TS2352, "neither type sufficiently overlaps"), over the
 * same missing index signature. `rowKey="id"` sidesteps all of it.
 *
 * `childrenKey` is the one callback that also RETURNS rows, and there the type
 * IS this wide one — a return is covariant, so
 * `(row) => (row as unknown as User).reports` needs no second assertion on the
 * array. Declared narrow, it accepted a forest through `[items]` and refused to
 * let the children back out.
 */
export type WrTableRow = object;
