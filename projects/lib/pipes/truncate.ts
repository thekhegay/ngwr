/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Pipe } from '@angular/core';
import type { PipeTransform } from '@angular/core';

let segmenter: Intl.Segmenter | undefined;

/**
 * Clamp a string to `length` characters, appending `ellipsis` when truncated.
 * A character is what a reader sees as one — a grapheme cluster — so an emoji,
 * a flag or a letter with a combining accent is kept whole or dropped whole,
 * never cut into half a surrogate pair that renders as a replacement box.
 *
 * @example
 * ```html
 * {{ 'Hello, world' | wrTruncate: 5 }}           <!-- "Hello…"      -->
 * {{ 'Hello, world' | wrTruncate: 8: '...' }}    <!-- "Hello, w..." -->
 * ```
 */
@Pipe({ name: 'wrTruncate' })
export class WrTruncate implements PipeTransform {
  transform(value: string | null | undefined, length = 80, ellipsis = '…'): string {
    if (value === null || value === undefined) return '';
    const s = String(value);
    // No more graphemes than UTF-16 units, so a string this short is never cut.
    if (s.length <= length) return s;
    // `slice`'s own coercion of the count, which is what this pipe did before it
    // counted graphemes: a fraction truncates, and NaN or a negative keeps nothing.
    const limit = Math.max(0, Math.trunc(length) || 0);
    segmenter ??= new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    let count = 0;
    for (const { index } of segmenter.segment(s)) {
      if (count === limit) return s.slice(0, index) + ellipsis;
      count++;
    }
    return s;
  }
}
