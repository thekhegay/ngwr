/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Generates a pseudo-random, DOM-safe id.
 *
 * IDs are:
 * - prefixed to avoid collisions with host application ids
 * - limited to `[a-z0-9-]` characters
 *
 * This function is not intended for cryptographic purposes, only
 * for UI element identifiers (e.g. `id`, `aria-*` attributes).
 *
 * @example
 * ```ts
 * const id = generateRandomId();          // "wr-mbeo8x-4k2f9q"
 * const custom = generateRandomId('ng');  // "ng-mbeo8x-1a2b3c"
 * ```
 *
 * @param prefix Optional prefix to namespace the id. Defaults to `"wr"`.
 * @returns A pseudo-random id string like `"wr-mbeo8x-4k2f9q"`.
 */
export function generateRandomId(prefix = 'wr'): string {
  const datePart = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 8); // 6 chars

  return `${prefix}-${datePart}-${randomPart}`;
}
