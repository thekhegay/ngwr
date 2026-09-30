/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrEditorJson } from './wr-editor-json';

/**
 * The `value` model of `<wr-editor>`: a string in `html` and `markdown` format,
 * a {@link WrEditorJson} tree in `json` format.
 *
 * An empty document is written as `''` in the two string formats and as `null`
 * in `json`, so a Signal Forms `required()` rule reports an empty editor as
 * empty — `'<p></p>'` would be a non-empty string. `null` and `''` are both
 * read as an empty document in every format.
 */
export type WrEditorValue = string | WrEditorJson | null;
