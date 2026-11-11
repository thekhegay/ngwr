/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { badgeStyle } from './badge-style';

/**
 * Logs a coloured pill followed by a payload at warning level.
 *
 * The same pill as `badgeLog`, through `console.warn`, so the message keeps
 * its stack trace and the browser's Warnings filter still catches it.
 *
 * @example
 * ```ts
 * badgeWarn('icons', '#fac72e', 'plus is registered twice');
 * // → [icons] plus is registered twice
 * ```
 *
 * @param badgeText Short label shown inside the pill.
 * @param color    CSS colour applied to the pill border and text.
 * @param message  Anything you'd pass to `console.warn` as the second argument.
 */
export function badgeWarn(badgeText: string, color: string, message: unknown): void {
  // eslint-disable-next-line no-console -- this helper exists to log
  console.warn(`%c${badgeText}`, badgeStyle(color), message);
}
