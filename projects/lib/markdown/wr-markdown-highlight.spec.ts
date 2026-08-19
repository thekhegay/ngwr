/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { TestBed } from '@angular/core/testing';

import { describe, expect, it } from 'vitest';

import { provideWrMarkdownHighlighter } from './provide-wr-markdown';
import { LANGUAGE_LIMIT, WrMarkdownHighlight } from './wr-markdown-highlight';

/**
 * The store has two dimensions, and `wr-markdown.spec.ts` only reaches one.
 *
 * Its 300-block regression drives 300 blocks in ONE language, so it exercises the
 * per-language bound. The other dimension is the one a DOCUMENT controls:
 * `language` is the code fence's info string, arbitrary text from an input the
 * component treats as untrusted, and every distinct one used to add a bucket that
 * only `invalidate()` removed.
 *
 * Asserted against the service directly rather than through the component,
 * because what is pinned here is what the cache RETAINS. A bucket that is gone
 * shows up as `linesFor` answering `null`, and through the component that is
 * indistinguishable from a block whose answer has not landed yet.
 *
 * What that leaves uncovered, deliberately: a language whose highlighter DECLINED
 * or threw holds a bucket with no lines, so `linesFor` answers `null` whether the
 * bucket survives or not. The eviction is the same loop for both, but nothing in
 * the public surface can tell those two apart, and a test that reads the private
 * `cache` would pass on a service that had stopped rendering entirely.
 */
describe('WrMarkdownHighlight — language bound', () => {
  const mount = (): WrMarkdownHighlight => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideWrMarkdownHighlighter(() => [[{ text: 'coloured' }]])],
    });
    return TestBed.inject(WrMarkdownHighlight);
  };

  const code = (i: number): string => `const v${i} = ${i};`;
  const language = (i: number): string => `lang${i}`;

  it('forgets the oldest language rather than keeping one bucket per fence', () => {
    const highlight = mount();
    const overflow = 5;
    const total = LANGUAGE_LIMIT + overflow;

    for (let i = 0; i < total; i++) highlight.request(code(i), language(i));

    // `linesFor` re-inserts the inner ENTRY on read and leaves the outer map alone,
    // so probing every language does not reorder what is being measured.
    const kept: string[] = [];
    for (let i = 0; i < total; i++) {
      if (highlight.linesFor(code(i), language(i)) !== null) kept.push(language(i));
    }

    // Without the outer bound every one of the 69 answers, and keeps answering for
    // the life of the app: nothing but `invalidate()` ever deleted from the outer
    // map, and this service is `providedIn: 'root'`.
    expect(kept).toHaveLength(LANGUAGE_LIMIT);
    expect(kept[0]).toBe(language(overflow));
    expect(kept.at(-1)).toBe(language(total - 1));
  });

  it('keeps a re-requested language and drops the one nobody asked for again', () => {
    const highlight = mount();

    for (let i = 0; i < LANGUAGE_LIMIT; i++) highlight.request(code(i), language(i));

    // Already cached, so this request returns early — but only AFTER the bucket has
    // moved to the back. `Map.set` on a key it already holds leaves that key where
    // it was, so without the delete the outer map is in first-sighting order and
    // the eviction below takes `lang0` instead of `lang1`.
    highlight.request(code(0), language(0));
    highlight.request(code(LANGUAGE_LIMIT), language(LANGUAGE_LIMIT));

    expect(highlight.linesFor(code(0), language(0))).not.toBeNull();
    expect(highlight.linesFor(code(1), language(1))).toBeNull();
  });
});
