/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { wrNumAttr } from 'ngwr/utils';

import type { WrStaggerBy } from './types';

let segmenter: Intl.Segmenter | undefined;

/**
 * How far the start of the last piece may sit from the start of the first, in ms.
 *
 * @internal
 */
export const STAGGER_SPREAD_MAX = 1200;

/**
 * The gap between two pieces when an effect's `stagger` is not set, in ms.
 *
 * @internal
 */
export const STAGGER_GAP: Readonly<Record<WrStaggerBy, number>> = { words: 70, letters: 28 };

/**
 * How much of a host has to be in the viewport before an effect plays: most
 * of it, not the first pixel of a heading peeking in at the bottom edge.
 *
 * @internal
 */
export const VIEW_THRESHOLD = 0.6;

/**
 * A run of breaking spaces, captured so `split` keeps it. U+00A0 and the other
 * no-break spaces are not in it: a word pair the author glued together stays one
 * piece, so the lines break exactly where they did before the split.
 *
 * @internal
 */
export const BREAKING_SPACES = /([ \t\n\r\f]+)/;

/**
 * What a reader sees as one character, so an emoji or an accented letter is never cut in two.
 *
 * @internal
 */
export function graphemes(text: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    segmenter ??= new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return [...segmenter.segment(text)].map(s => s.segment);
  }
  // Code points: a surrogate pair stays whole, a combining mark becomes its own piece.
  return [...text];
}

/**
 * The gap between the start of one piece and the next, in ms: `stagger` when
 * set, else the mode's, and never more than lets the last of `count` pieces
 * start by {@link STAGGER_SPREAD_MAX}.
 *
 * @internal
 */
export function staggerGap(by: WrStaggerBy, count: number, stagger: number | null = null): number {
  return Math.min(Math.max(0, stagger ?? STAGGER_GAP[by]), STAGGER_SPREAD_MAX / Math.max(1, count - 1));
}

/**
 * An optional count in ms: `null`, `undefined` or an empty attribute means "the mode's default".
 *
 * @internal
 */
export const optionalMs = (value: unknown): number | null =>
  value == null || value === '' ? null : wrNumAttr(0)(value);
