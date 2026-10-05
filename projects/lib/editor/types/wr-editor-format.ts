/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * What `<wr-editor>` reads from and writes into its `value` model.
 *
 * - `html` — an HTML string, parsed without executing anything and rebuilt from
 *   the editor's own schema on the way out, so only what the schema allows comes
 *   back. `''` for an empty document.
 * - `markdown` — the dialect `ngwr/markdown` reads and `<wr-markdown>` renders,
 *   written back by `serializeMarkdown`. Markdown has no underline, so the
 *   underline tool and its shortcut are absent in this format. `''` for an empty
 *   document.
 * - `json` — the document as a {@link WrEditorJson} tree. `null` for an empty
 *   document.
 */
export type WrEditorFormat = 'html' | 'markdown' | 'json';
