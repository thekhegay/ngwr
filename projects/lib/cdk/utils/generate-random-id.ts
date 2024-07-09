/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Generates random ID
 *
 * @return {string}
 */
export function generateRandomId(): string {
  const dateRandomizer = Date.now().toString(36);
  const mathRandomizer = Math.random().toString(36).substring(2);
  return `${dateRandomizer}${mathRandomizer}`;
}
