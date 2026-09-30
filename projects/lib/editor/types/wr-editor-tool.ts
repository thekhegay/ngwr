/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * One entry of `<wr-editor>`'s `toolbar` input.
 *
 * - Marks: `bold`, `italic`, `underline` (absent in `markdown` format, which
 *   cannot express it), `strike`, `code`.
 * - Blocks: `paragraph`, `heading1`, `heading2`, `heading3`, `bulletList`,
 *   `orderedList`, `blockquote`, `codeBlock`.
 * - Inserts: `link` (opens the link panel), `horizontalRule`.
 * - History: `undo`, `redo`.
 * - `'|'` draws a separator between two groups.
 */
export type WrEditorTool =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'code'
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bulletList'
  | 'orderedList'
  | 'blockquote'
  | 'codeBlock'
  | 'link'
  | 'horizontalRule'
  | 'undo'
  | 'redo'
  | '|';
