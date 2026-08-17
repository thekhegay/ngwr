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
 * The row callbacks (`rowKey`, `groupBy`, `childrenKey`) still take this type
 * rather than your own: a parameter is contravariant, so `(row: User) => row.id`
 * cannot satisfy any signature the table could declare short of the whole
 * component becoming generic. Index the row instead —
 * `(row) => (row as User).id`, or pass the string key form.
 */
export type WrTableRow = object;
