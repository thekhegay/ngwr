/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { graphemes } from './graphemes';

/** A run of anything that is not a letter, a combining mark or a digit. */
const SEPARATORS = /[^\p{L}\p{M}\p{N}]+/u;

/** Marks alone, such as the variation selector of an emoji, are no word. */
const WORD = /[\p{L}\p{N}]/u;

/** The longest run of whole graphemes from the start of `word` that fits in `max`. */
function cut(word: string, max: number): string {
  let head = '';
  for (const grapheme of graphemes(word)) {
    if (head.length + grapheme.length > max) break;
    head += grapheme;
  }
  return WORD.test(head) ? head : '';
}

export interface WrSlugOptions {
  /** What joins the words. `''` runs them together. Default `-`. */
  readonly separator?: string;
  /**
   * The longest slug, in UTF-16 code units, the unit of `String.length`. Words
   * that do not fit are dropped; a first word longer than the limit is cut
   * between two graphemes. No limit by default.
   */
  readonly maxLength?: number;
}

/**
 * A text as a slug, for an anchor, an element id, a URL segment or a file name:
 * lower-cased words joined by one `-`, or by the separator given.
 *
 * The text is NFKC-normalised, so a full-width or ligature form folds into the
 * plain one (`ＡＢＣ` gives `abc`), then lower-cased with `toLowerCase()`, the
 * locale-independent mapping, so the output is the same on the server and the
 * client. Every run of characters that are not a letter, a combining mark or a
 * digit becomes one separator, and none stays at either end.
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
 * `separator` joins the words with another string, such as `_` for a file
 * name. `maxLength` caps the slug at a word boundary, for a URL segment or a
 * column with a limit.
 *
 * @example
 * ```ts
 * wrSlug('What it costs to adopt'); // 'what-it-costs-to-adopt'
 * wrSlug('  Data & charts!  ');     // 'data-charts'
 * wrSlug('Привет, мир!');           // 'привет-мир'
 * wrSlug('Café au lait');           // 'café-au-lait'
 * wrSlug('...');                    // ''
 * wrSlug('Data & charts', { separator: '_' });           // 'data_charts'
 * wrSlug('What it costs to adopt', { maxLength: 14 });   // 'what-it-costs'
 * ```
 *
 * @see https://ngwr.dev/reference/utils/wr-slug
 */
export function wrSlug(text: string | null | undefined, options: WrSlugOptions = {}): string {
  if (text === null || text === undefined) return '';
  const { separator = '-', maxLength = Infinity } = options;
  const words = String(text)
    .normalize('NFKC')
    .toLowerCase()
    .split(SEPARATORS)
    .filter(word => WORD.test(word));

  let slug = '';
  for (const word of words) {
    const next = slug === '' ? word : slug + separator + word;
    if (next.length > maxLength) return slug === '' ? cut(word, maxLength) : slug;
    slug = next;
  }
  return slug;
}
