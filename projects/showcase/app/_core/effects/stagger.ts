import { numAttr } from 'ngwr/utils';

let segmenter: Intl.Segmenter | undefined;

/** What one animated piece of a text is. */
export type StaggerBy = 'words' | 'letters';

/** How far the start of the last piece may sit from the start of the first, in ms. */
export const SPREAD_MAX = 1200;

/** The gap between two pieces when an effect's `stagger` is not set, in ms. */
export const STAGGER: Readonly<Record<StaggerBy, number>> = { words: 70, letters: 28 };

/**
 * How much of a host has to be in the viewport before an effect plays: most
 * of it, not the first pixel of a heading peeking in at the bottom edge.
 */
export const VISIBLE = 0.6;

/**
 * A run of breaking spaces, captured so `split` keeps it. U+00A0 and the other
 * no-break spaces are not in it: a word pair the author glued together stays one
 * piece, so the lines break exactly where they did before the split.
 */
export const SPACES = /([ \t\n\r\f]+)/;

/** What a reader sees as one character, so an emoji or an accented letter is never cut in two. */
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
 * start by {@link SPREAD_MAX}.
 */
export function staggerGap(by: StaggerBy, count: number, stagger: number | null = null): number {
  return Math.min(Math.max(0, stagger ?? STAGGER[by]), SPREAD_MAX / Math.max(1, count - 1));
}

/** An optional count in ms: `null`, `undefined` or an empty attribute means "the mode's default". */
export const optionalMs = (value: unknown): number | null => (value == null || value === '' ? null : numAttr(0)(value));
