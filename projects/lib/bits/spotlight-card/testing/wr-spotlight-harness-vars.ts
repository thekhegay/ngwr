/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Split an inline `style` attribute into its declarations.
 *
 * Read from the attribute rather than through `getCssValue()`, and the difference is not
 * cosmetic. `getCssValue()` is `getComputedStyle()`, which in a browser resolves the
 * stylesheet's own `--wr-spotlight-x: 50%` / `--wr-spotlight-color: rgba(…)` defaults —
 * so "the component has written nothing here yet, and the theme decides" would come back
 * as a concrete value and the assertion would invert. jsdom loads no stylesheet, so the
 * computed read happens to agree today and would start lying the moment these harnesses
 * ran anywhere else. The attribute holds what the component or the directive itself
 * wrote, and nothing else.
 *
 * Shared by both harnesses in this entry point because both read the same three
 * variables off their host — in different units. See each class for which.
 */
export function wrSpotlightInlineVars(style: string): Map<string, string> {
  const declarations = new Map<string, string>();
  for (const declaration of style.split(';')) {
    const colon = declaration.indexOf(':');
    if (colon === -1) continue;
    const name = declaration.slice(0, colon).trim();
    if (name !== '') declarations.set(name, declaration.slice(colon + 1).trim());
  }
  return declarations;
}
