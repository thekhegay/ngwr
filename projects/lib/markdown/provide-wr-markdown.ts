/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import type { WrMarkdownHighlighter } from './interfaces';
import { WR_MARKDOWN_HIGHLIGHTER } from './tokens';

/**
 * Give every `<wr-markdown>` in the app a syntax highlighter.
 *
 * The highlighter returns coloured SPANS, not HTML — see
 * {@link WrMarkdownHighlighter} for why that signature is the one worth having.
 * It may be async, and it may return `null` for languages it does not know; both
 * render the block as plain text, which is also what server-side rendering
 * produces, since a highlighter that resolves after prerender has already
 * finished cannot contribute to the HTML.
 *
 * @example
 * ```ts
 * bootstrapApplication(App, {
 *   providers: [provideWrMarkdownHighlighter(shikiSpans)],
 * });
 * ```
 */
export function provideWrMarkdownHighlighter(highlighter: WrMarkdownHighlighter): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: WR_MARKDOWN_HIGHLIGHTER, useValue: highlighter }]);
}
