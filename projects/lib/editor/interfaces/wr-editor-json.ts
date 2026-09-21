/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * One mark on a {@link WrEditorJson} node — `strong`, `em`, `underline`,
 * `strike`, `code`, or `link` with `{ href, title }`.
 */
export interface WrEditorMarkJson {
  readonly type: string;
  readonly attrs?: Readonly<Record<string, unknown>>;
}

/**
 * The editor's document as plain data — the shape ProseMirror's `toJSON()`
 * writes, declared here so no ProseMirror type reaches the public API.
 *
 * Nodes: `doc`, `paragraph`, `heading` (`level` 1–3), `blockquote`,
 * `code_block` (`language`), `horizontal_rule`, `bullet_list` (`tight`),
 * `ordered_list` (`order`, `tight`), `list_item` (`checked`: `true`, `false`
 * or `null` for an ordinary item), `hard_break`, `image` (`src`, `alt`,
 * `title`), `table`, `table_row`, `table_header` / `table_cell` (`align`) and
 * `text`.
 *
 * A value bound in `json` format is VALIDATED, not trusted: an unknown node or
 * mark, an attribute outside its allowed set, a content rule broken, or a link
 * or image whose URL `safeMarkdownUrl` refuses, and the whole value is refused —
 * the editor keeps what it had and warns in dev mode.
 */
export interface WrEditorJson {
  readonly type: string;
  readonly attrs?: Readonly<Record<string, unknown>>;
  readonly content?: readonly WrEditorJson[];
  readonly marks?: readonly WrEditorMarkJson[];
  readonly text?: string;
}
