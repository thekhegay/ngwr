/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { HighlighterCore } from 'shiki/core';
import { createHighlighterCore } from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';

/**
 * Lazily-created shared Shiki highlighter.
 *
 * Shiki loads WASM + grammar data asynchronously, so we keep a single
 * instance for the whole app. Subsequent calls return the same promise.
 */

let instance: Promise<HighlighterCore> | null = null;

export function getHighlighter(): Promise<HighlighterCore> {
  instance ??= createHighlighterCore({
    // The high-contrast pair, not the plain one. Measured against the code
    // block's own background — `rgba(--wr-color-light, 0.2)`, which composites
    // to #f5f7f9 in light and #101727 in dark, NOT the page white — every
    // foreground in `github-light` that renders as text on it failed WCAG AA:
    // variable #e36209 at 3.25, keyword #d73a49 4.26, tag #22863a 4.31, comment
    // #6a737d 4.48. `github-dark` missed on the same comment grey at 3.72. The
    // high-contrast siblings clear it with room: worst token 4.69 and 8.44.
    themes: [
      import('shiki/themes/github-light-high-contrast.mjs'),
      import('shiki/themes/github-dark-high-contrast.mjs'),
    ],
    langs: [
      import('shiki/langs/angular-html.mjs'),
      import('shiki/langs/angular-ts.mjs'),
      import('shiki/langs/angular-template.mjs'),
      import('shiki/langs/angular-expression.mjs'),
      import('shiki/langs/typescript.mjs'),
      import('shiki/langs/html.mjs'),
      import('shiki/langs/scss.mjs'),
      import('shiki/langs/bash.mjs'),
      import('shiki/langs/diff.mjs'),
      // For the `markdown` page, which documents a markdown renderer and so
      // shows markdown SOURCE. Its embedded languages are declared lazily by the
      // grammar, so this is one 65 KB chunk rather than the whole bundle.
      import('shiki/langs/markdown.mjs'),
    ],
    engine: createOnigurumaEngine(import('shiki/wasm')),
  });
  return instance;
}
