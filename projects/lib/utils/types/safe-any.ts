/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Escapes ESLint `no-explicit-any` in places where `any` is intentional,
 * e.g. public APIs that must accept arbitrary values.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SafeAny = any;
