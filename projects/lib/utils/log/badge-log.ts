/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Logs a coloured pill to the browser console followed by a payload.
 *
 * Useful when you need to scan a noisy console for a specific subsystem's
 * messages. The pill is rendered with the CSS `%c` console formatting trick.
 *
 * @example
 * ```ts
 * badgeLog('icons', '#3969e2', { name: 'plus', registered: true });
 * // → [icons] { name: 'plus', registered: true }
 * ```
 *
 * @param badgeText Short label shown inside the pill.
 * @param color    CSS colour applied to the pill border and text.
 * @param message  Anything you'd pass to `console.log` as the second argument.
 *
 * @internal
 */
export function badgeLog(badgeText: string, color: string, message: unknown): void {
  const style = `
    display: inline-block;
    border: 1px solid ${color};
    color: ${color};
    padding: 1px 3px;
    border-radius: 4px;
    margin-right: 0
  `;
  // eslint-disable-next-line no-console -- this helper exists to log
  console.log(`%c${badgeText}`, style, message);
}
