/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const MIN_LENGTH = 4;
const MAX_LENGTH = 64;
const DEFAULT_LENGTH = 12;

/**
 * Returns random bytes using the best available source.
 *
 * @internal
 */
function defaultRandomBytes(count: number): Uint8Array {
  // Covers: all browsers, Node ≥ 18, Deno, Bun, Cloudflare Workers
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    return crypto.getRandomValues(new Uint8Array(count));
  }

  // Fallback: Node < 18 or exotic runtimes
  const buf = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    buf[i] = Math.floor(Math.random() * 256);
  }
  return buf;
}

/**
 * Generates a pseudo-random, DOM-safe identifier.
 *
 * Produced ids:
 * - are prefixed to avoid collisions with host-application ids;
 * - contain only `[a-z0-9-]` characters;
 * - use `crypto.getRandomValues` when available, falling back to `Math.random`.
 *
 * **Not suitable for cryptographic or security-sensitive purposes** —
 * intended only for UI element identifiers (`id`, `for`, `aria-*`, etc.).
 *
 * @example
 * ```ts
 * randomId();
 * // → "wr-a8f2bx1k9q4z"
 *
 * randomId('ng', 8);
 * // → "ng-k2f9mbeo"
 *
 * randomId('wr', 24);
 * // → "wr-a8f2bx1k9q4zmneo73wplr"
 * ```
 *
 * @param prefix - Namespace prefix prepended before the random segment. Defaults to `'wr'`.
 * @param length - Length of the random segment. Clamped to `[4, 64]`. Defaults to `12`.
 * @param random - Custom random byte source `(byteLength) => Uint8Array`.
 *   When omitted, uses `crypto.getRandomValues` with a `Math.random` fallback.
 * @returns A pseudo-random id string matching `/^[a-z]+-[a-z0-9]+$/`.
 */
export function randomId(prefix = 'wr', length = DEFAULT_LENGTH, random?: (byteLength: number) => Uint8Array): string {
  const safeLength = Math.min(Math.max(Math.trunc(length), MIN_LENGTH), MAX_LENGTH);

  const bytes = random ? random(safeLength) : defaultRandomBytes(safeLength);

  let result = '';
  for (let i = 0; i < safeLength; i++) {
    result += ALPHABET[bytes[i] % ALPHABET.length];
  }

  return `${prefix}-${result}`;
}
