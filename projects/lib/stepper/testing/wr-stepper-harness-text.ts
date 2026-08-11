/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Collapse the whitespace inside a header or a step body to the line a user reads.
 *
 * `TestElement.text()` only trims the ends, and neither of the two things read here
 * is one text node: a header's label span holds the label, the "optional" badge and
 * the description as siblings, and a step body is whatever the consumer projected.
 * The template's own indentation is not the problem — Angular's default
 * `preserveWhitespaces: false` drops whitespace-only text nodes at compile time —
 * but a value carrying a newline is, and so is a consumer app compiled with
 * `preserveWhitespaces: true`. Every run becomes one space so a spec can assert the
 * rendered line either way.
 */
export function wrStepperHarnessText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
