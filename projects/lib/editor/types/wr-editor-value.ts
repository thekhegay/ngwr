/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrEditorJson } from './wr-editor-json';

/**
 * The `value` model of `<wr-editor>`: the document as a {@link WrEditorJson}
 * tree.
 *
 * An empty document is written as `null`, so a Signal Forms `required()` rule
 * reports an empty editor as empty — a tree holding one empty paragraph would
 * read as filled in. `null` is read as an empty document.
 */
export type WrEditorValue = WrEditorJson | null;
