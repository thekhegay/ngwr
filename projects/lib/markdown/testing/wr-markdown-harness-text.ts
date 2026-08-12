/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Collapse the whitespace of a prose read to the line a reader sees.
 *
 * `TestElement.text()` only trims the ends, and markdown prose is never one text
 * node: a paragraph is text spliced with `<strong>`, `<code>` and `<a>`, and a
 * SOFT line break inside it is rendered as a real `\n` — the parser keeps it as
 * whitespace and lets CSS collapse it, which is what CommonMark asks for. Reading
 * `textContent` raw therefore reports a paragraph the author wrote on three lines
 * as three lines, while the browser shows one; every run becomes a single space so
 * a spec can assert what is on screen.
 *
 * Deliberately NOT used on a code block. There the whitespace IS the content —
 * indentation, blank lines, the newlines between highlighted lines — so
 * `WrMarkdownCodeBlockHarness.getCode()` reads it exactly and this function never
 * touches it.
 */
export function wrMarkdownHarnessText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
