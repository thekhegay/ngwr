/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

import type { WrMarkdownHighlighter } from './interfaces';

/**
 * The app's syntax highlighter, or `null` for none.
 *
 * Defaults to `null` on purpose: highlighting means a grammar engine, and one of
 * those in the library's dependency tree would be paid for by every consumer who
 * renders a paragraph of text. Provide it with `provideWrMarkdownHighlighter()`.
 */
export const WR_MARKDOWN_HIGHLIGHTER = new InjectionToken<WrMarkdownHighlighter | null>('WR_MARKDOWN_HIGHLIGHTER', {
  factory: () => null,
});
