/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Collapse the whitespace inside a table cell to what a user reads on one line.
 *
 * `TestElement.text()` only trims the ends, and a `<td>` is rarely one text node:
 * the tree column puts a toggle in front of the value, a `[wrTableExpand]` detail
 * cell holds whatever the consumer projected. The template's own indentation is
 * NOT the problem — Angular's default `preserveWhitespaces: false` drops
 * whitespace-only text nodes at compile time, so `'\n  Ada\n'` never reaches
 * `textContent`. What does reach it is whitespace inside a VALUE (`'first\n\n
 * programmer'` out of a textarea or an API) and, in a consumer app compiled with
 * `preserveWhitespaces: true`, the indentation after all. Every run becomes one
 * space so a spec can assert the rendered line either way.
 */
export function wrTableHarnessText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
