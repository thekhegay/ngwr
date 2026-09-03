/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** Longest value worth composing. A colour is never near this. */
const MAX_LENGTH = 256;

/**
 * Characters that end a declaration, open a string, or start a comment — none
 * of which belong in a value the library is about to wrap its own syntax around.
 */
const FORBIDDEN = /[;{}"'\\@<>!]|\/\*|\*\//;

/** Function name immediately preceding an open paren. */
const FUNCTION_NAME = /([\w-]*)\($/;

/**
 * Functions a composed value may call. Every image-producing function is absent
 * on purpose — `url()`, `image-set()`, `cross-fade()`, `element()`, `paint()` —
 * because fetching is the whole impact of this class.
 */
const ALLOWED_FUNCTIONS = new Set([
  'rgb',
  'rgba',
  'hsl',
  'hsla',
  'hwb',
  'lab',
  'lch',
  'oklab',
  'oklch',
  'color',
  'color-mix',
  'light-dark',
  'var',
  'calc',
  'min',
  'max',
  'clamp',
]);

/**
 * Answers whether a value can be composed **into** a larger CSS expression
 * without escaping the slot it was given — a colour inside a `linear-gradient()`
 * the component builds, an entry the component joins into a custom property a
 * stylesheet then substitutes.
 *
 * It is a containment check, not a colour parser. It says the value cannot
 * terminate the construct the library wrapped around it; it says nothing about
 * whether the value is a colour a browser will accept, and a rejected value
 * should fall back to the component's own default rather than be repaired.
 *
 * **A value bound straight to `[style.background]` needs none of this.** There
 * is nothing to break out of there, and Angular applies style values through
 * CSSOM by design — validating those would amount to refusing style values in a
 * style binding.
 *
 * Rejected, and each one is a way out of the slot:
 *
 * - a `)` the value never opened — `red), url(…), linear-gradient(red` is the
 *   shape that turns a colour into an extra background layer the browser fetches;
 * - a top-level `,` — a `<color>` is one value, so a comma at depth 0 means the
 *   payload has reached the slot next to the one it was handed;
 * - `;` `{` `}` a quote, a backslash, `!`, or a CSS comment delimiter;
 * - any function outside {@link ALLOWED_FUNCTIONS} — `url()` above all.
 *
 * Top-level whitespace is allowed: `red 20%` is a legitimate gradient stop, and
 * without a comma or a bare `)` it cannot reach anything.
 *
 * @example
 * ```ts
 * isSafeCssValue('var(--wr-color-primary)');                        // true
 * isSafeCssValue('color-mix(in srgb, red 50%, blue)');              // true
 * isSafeCssValue('red), url("https://x.test/beacon"), linear-gradient(red'); // false
 * ```
 *
 * @param value Raw value handed to the component.
 * @returns `true` when the value stays inside its slot.
 */
export function isSafeCssValue(value: string): boolean {
  if (typeof value !== 'string') return false;

  const trimmed = value.trim();
  if (trimmed === '' || trimmed.length > MAX_LENGTH) return false;
  if (FORBIDDEN.test(trimmed)) return false;

  let depth = 0;
  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];

    if (char === '(') {
      const name = FUNCTION_NAME.exec(trimmed.slice(0, i + 1));
      if (!name || !ALLOWED_FUNCTIONS.has(name[1].toLowerCase())) return false;
      depth++;
    } else if (char === ')') {
      depth--;
      if (depth < 0) return false;
    } else if (depth === 0 && char === ',') {
      return false;
    }
  }

  return depth === 0;
}
