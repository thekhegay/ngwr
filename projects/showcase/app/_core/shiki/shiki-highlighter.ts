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
    themes: [import('shiki/themes/github-light.mjs'), import('shiki/themes/github-dark.mjs')],
    langs: [
      import('shiki/langs/angular-html.mjs'),
      import('shiki/langs/angular-ts.mjs'),
      import('shiki/langs/angular-template.mjs'),
      import('shiki/langs/angular-expression.mjs'),
      import('shiki/langs/typescript.mjs'),
      import('shiki/langs/html.mjs'),
      import('shiki/langs/scss.mjs'),
      import('shiki/langs/bash.mjs'),
    ],
    engine: createOnigurumaEngine(import('shiki/wasm')),
  });
  return instance;
}
