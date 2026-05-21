/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Explicitly untyped value.
 *
 * Use in places where `any` is intentional and unavoidable,
 * such as generic wrappers around third-party APIs that do not
 * expose precise types.
 *
 * Prefer narrowing to a concrete type whenever possible.
 *
 * @example
 * ```ts
 * function wrapThirdPartyCallback(fn: (...args: SafeAny[]) => SafeAny): void {
 *   // ...
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SafeAny = any;
