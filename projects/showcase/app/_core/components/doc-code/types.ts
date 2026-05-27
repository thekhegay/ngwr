/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { ShikiLang } from '#core/shiki';

/** One file shown as a tab inside `<ngwr-doc-code>` / snippet / playground. */
export interface DocCodeFile {
  /** Tab label — usually `'TS'`, `'HTML'`, `'SCSS'`. */
  readonly label: string;
  /** Shiki language for syntax highlighting. */
  readonly language: ShikiLang;
  /** Source. Empty / whitespace-only files are skipped from the tab strip. */
  readonly code: string;
}
