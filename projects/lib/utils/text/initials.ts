/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

let segmenter: Intl.Segmenter | undefined;

/** A grapheme that can stand for a word: it holds a letter, a digit or a pictograph. */
const INITIAL = /[\p{L}\p{N}\p{Extended_Pictographic}]/u;

/** A script whose character is a syllable or a word rather than a letter. */
const SYLLABIC = /^[\p{Script=Han}\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}]/u;

function graphemes(text: string): string[] {
  segmenter ??= new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  return [...segmenter.segment(text)].map(s => s.segment);
}

/**
 * Up to two initials of a name, one grapheme each, upper-cased.
 *
 * A word is a run between whitespace, so a hyphenated name is one word
 * (`Jean-Luc Picard` gives `JP`). The initial is the first grapheme of the word
 * that holds a letter, a digit or an emoji, so `(Ada)` gives `A` and a word of
 * punctuation alone is skipped. The first two words that yield one are taken:
 * `Ada King Lovelace` gives `AK`, a one-word name gives one initial.
 *
 * A grapheme is what a reader sees as one character: an emoji with a skin tone
 * or a ZWJ sequence, a letter with combining marks and a surrogate pair each
 * count as one initial, never half of one.
 *
 * A Han, Hangul, Hiragana or Katakana name gives ONE initial, its first
 * character: in those scripts a character is a syllable or a word, so two of
 * them read as a word rather than as initials.
 *
 * Upper-casing uses `toUpperCase()` by default, the locale-independent mapping,
 * so the output is the same on the server and the client; pass `locale` for a
 * language whose mapping differs (`tr` turns `i` into `İ`). A letter whose
 * upper case is more than one grapheme (`ß` becomes `SS`) is kept as written.
 *
 * `null`, `undefined`, an empty string and a name with no initial give `''`.
 *
 * @example
 * ```ts
 * wrInitials('Roman Khegay');       // 'RK'
 * wrInitials('  ada   lovelace  '); // 'AL'
 * wrInitials('Madonna');            // 'M'
 * wrInitials('王小明');              // '王'
 * wrInitials('👩🏽‍🚀 Valentina');   // '👩🏽‍🚀V'
 * wrInitials('...');                // ''
 * ```
 *
 * @see https://ngwr.dev/reference/utils/wr-initials
 */
export function wrInitials(name: string | null | undefined, locale?: string): string {
  if (name === null || name === undefined) return '';
  const words = String(name).trim().split(/\s+/u);
  let out = '';
  let count = 0;
  for (const word of words) {
    const initial = graphemes(word).find(g => INITIAL.test(g));
    if (initial === undefined) continue;
    const upper = locale === undefined ? initial.toUpperCase() : initial.toLocaleUpperCase(locale);
    out += graphemes(upper).length === 1 ? upper : initial;
    if (++count === 2 || SYLLABIC.test(initial)) break;
  }
  return out;
}
