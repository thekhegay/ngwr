/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** A run of anything that is not a letter, a combining mark or a digit. */
const SEPARATORS = /[^\p{L}\p{M}\p{N}]+/gu;

/**
 * A text as a slug, for an anchor, an element id, a URL segment or a file name:
 * lower-cased words joined by one `-`.
 *
 * The text is NFKC-normalised, so a full-width or ligature form folds into the
 * plain one (`ＡＢＣ` gives `abc`), then lower-cased with `toLowerCase()`, the
 * locale-independent mapping, so the output is the same on the server and the
 * client. Every run of characters that are not a letter, a combining mark or a
 * digit becomes one `-`, and a `-` at either end is dropped.
 *
 * Nothing is transliterated and no diacritic is stripped: a letter of any
 * script stays the letter it is, with its marks. `Привет, мир!` gives
 * `привет-мир` and `Café au lait` gives `café-au-lait`. Stripping marks would
 * turn Russian `й` into `и` and break a script that writes its vowels as marks,
 * such as Devanagari. A URL percent-encodes such a slug, and every browser
 * shows it decoded.
 *
 * Slugging is NOT injective: `Data & charts` and `Data / charts` both give
 * `data-charts`. Where two slugs must differ, the caller breaks the tie.
 *
 * `null`, `undefined`, an empty string and a text with no letter or digit give
 * `''`.
 *
 * @example
 * ```ts
 * wrSlug('What it costs to adopt'); // 'what-it-costs-to-adopt'
 * wrSlug('  Data & charts!  ');     // 'data-charts'
 * wrSlug('Привет, мир!');           // 'привет-мир'
 * wrSlug('Café au lait');           // 'café-au-lait'
 * wrSlug('...');                    // ''
 * ```
 *
 * @see https://ngwr.dev/reference/utils/wr-slug
 */
export function wrSlug(text: string | null | undefined): string {
  if (text === null || text === undefined) return '';
  const slug = String(text).normalize('NFKC').toLowerCase().replace(SEPARATORS, '-').replace(/^-|-$/g, '');
  // Marks alone, such as the variation selector of an emoji, are no slug.
  return /[\p{L}\p{N}]/u.test(slug) ? slug : '';
}
