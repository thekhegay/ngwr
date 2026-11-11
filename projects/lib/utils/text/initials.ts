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

function initialOf(word: string): string | undefined {
  return graphemes(word).find(g => INITIAL.test(g));
}

function upperCase(initial: string, locale: string | undefined): string {
  const upper = locale === undefined ? initial.toUpperCase() : initial.toLocaleUpperCase(locale);
  return graphemes(upper).length === 1 ? upper : initial;
}

function surname(words: readonly string[], locale: string | undefined, order: WrInitialsOrder): string {
  const parts = words.flatMap(word => {
    const initial = initialOf(word);
    return initial === undefined ? [] : [{ word, initial }];
  });
  const family = order === 'family-first' ? parts.shift() : parts.pop();
  if (family === undefined) return '';
  return [family.word, ...parts.map(part => `${upperCase(part.initial, locale)}.`)].join(' ');
}

/** How `wrInitials` writes a name: its letters (`RK`), or the family name with initials (`Khegay R.`). */
export type WrInitialsStyle = 'letters' | 'surname';

/** The order of the parts in the name given: `Roman Khegay`, or `Хегай Роман`. */
export type WrInitialsOrder = 'given-first' | 'family-first';

export interface WrInitialsOptions {
  /** `'letters'` gives up to two initials; `'surname'` the family name and an initial for each other part. */
  readonly style?: WrInitialsStyle;
  /** Where the family name sits in the input. Read by `'surname'` only. */
  readonly order?: WrInitialsOrder;
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
 * `options.style: 'surname'` writes the family name whole, then each other part
 * as its initial and a dot: `Roman Khegay` gives `Khegay R.`. `options.order`
 * says where the family name sits in the input: last for `'given-first'` (the
 * default), so `Ada King Lovelace` gives `Lovelace A. K.`, and first for
 * `'family-first'`, so `Иванов Иван Иванович` gives `Иванов И. И.`. The family
 * name is kept as written, hyphen and case included, and a one-part name comes
 * back as it is. Every part gives an initial, not the first two, each taken and
 * upper-cased as above: a hyphenated given name gives one (`Jean-Luc Picard`
 * gives `Picard J.`) and a part of punctuation alone is dropped before the
 * family name is chosen. The one-initial rule for Han, Hangul and kana does not
 * apply: it keeps two characters from reading as a word, and here the dot
 * already marks an initial, so `王 小明` with `'family-first'` gives `王 小.`.
 *
 * `order` does nothing for `'letters'`, which reads the first two words in the
 * order written.
 *
 * @example
 * ```ts
 * wrInitials('Roman Khegay');       // 'RK'
 * wrInitials('  ada   lovelace  '); // 'AL'
 * wrInitials('Madonna');            // 'M'
 * wrInitials('王小明');              // '王'
 * wrInitials('👩🏽‍🚀 Valentina');   // '👩🏽‍🚀V'
 * wrInitials('...');                // ''
 *
 * wrInitials('Roman Khegay', undefined, { style: 'surname' }); // 'Khegay R.'
 * wrInitials('Хегай Роман', undefined, { style: 'surname', order: 'family-first' }); // 'Хегай Р.'
 * ```
 *
 * @see https://ngwr.dev/reference/utils/wr-initials
 */
export function wrInitials(name: string | null | undefined, locale?: string, options?: WrInitialsOptions): string {
  if (name === null || name === undefined) return '';
  const words = String(name).trim().split(/\s+/u);
  if (options?.style === 'surname') return surname(words, locale, options.order ?? 'given-first');
  let out = '';
  let count = 0;
  for (const word of words) {
    const initial = initialOf(word);
    if (initial === undefined) continue;
    out += upperCase(initial, locale);
    if (++count === 2 || SYLLABIC.test(initial)) break;
  }
  return out;
}
