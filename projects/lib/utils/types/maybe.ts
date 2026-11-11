/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Represents a value that may be absent.
 *
 * Preferred over inline `T | null | undefined` unions for consistency
 * across the codebase and to reduce repetition in public API signatures.
 *
 * @example
 * ```ts
 * function findUser(id: string): WrMaybe<User> {
 *   return db.get(id) ?? null;
 * }
 *
 * const user: WrMaybe<User> = findUser('42');
 *
 * if (wrIsDefined(user)) {
 *   // user is User
 * }
 * ```
 *
 * @see {@link wrIsDefined} — type guard that narrows `WrMaybe<T>` to `T`.
 */
export type WrMaybe<T> = T | null | undefined;
