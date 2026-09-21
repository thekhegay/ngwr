/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrEditorTool } from './interfaces';

/**
 * The toolbar `<wr-editor>` draws when `toolbar` is not bound — every tool, in
 * five groups. Exported so a toolbar can be built from it rather than retyped:
 *
 * ```ts
 * readonly tools = WR_EDITOR_TOOLBAR.filter(tool => tool !== 'code');
 * ```
 *
 * `underline` is dropped in `markdown` format whether it is listed or not.
 */
export const WR_EDITOR_TOOLBAR: readonly WrEditorTool[] = [
  'bold',
  'italic',
  'underline',
  'strike',
  'code',
  '|',
  'paragraph',
  'heading1',
  'heading2',
  'heading3',
  '|',
  'bulletList',
  'orderedList',
  'blockquote',
  'codeBlock',
  '|',
  'link',
  'horizontalRule',
  '|',
  'undo',
  'redo',
];
