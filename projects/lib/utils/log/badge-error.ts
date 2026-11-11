/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { badgeStyle } from './badge-style';

/**
 * Logs a coloured pill followed by a payload at error level.
 *
 * The same pill as `badgeLog`, through `console.error`, so the message keeps
 * its stack trace and the browser's Errors filter still catches it.
 *
 * @example
 * ```ts
 * badgeError('icons', '#fc6c6c', new Error('plus failed to load'));
 * // → [icons] Error: plus failed to load
 * ```
 *
 * @param badgeText Short label shown inside the pill.
 * @param color    CSS colour applied to the pill border and text.
 * @param message  Anything you'd pass to `console.error` as the second argument.
 */
export function badgeError(badgeText: string, color: string, message: unknown): void {
  // eslint-disable-next-line no-console -- this helper exists to log
  console.error(`%c${badgeText}`, badgeStyle(color), message);
}
