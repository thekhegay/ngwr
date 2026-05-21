/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * A function that does nothing.
 *
 * Useful as a default callback, placeholder event handler,
 * or to explicitly signal intentional no-ops.
 *
 * @example
 * ```ts
 * @Component({ ... })
 * export class MyComponent {
 *   onTouched: () => void = noop;
 * }
 * ```
 */
export const noop = (): void => undefined;
