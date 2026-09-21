/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { Node, Schema } from 'prosemirror-model';

import type { WrEditorJson } from '../interfaces';

/**
 * How deep a JSON value may nest before it is refused unread.
 *
 * Not the editing limit — that is `MAX_NESTING`, counted in quotes and list
 * items. This one is the stack's: `Node.fromJSON` and `check()` both recurse,
 * and about three thousand nested blocks overflow them. A document the editor
 * itself can produce is nowhere near it (eleven levels of list is under forty
 * JSON levels), so anything past it was not written by an editor.
 */
const MAX_JSON_DEPTH = 256;

/**
 * An untrusted JSON value as a checked document, or a thrown `RangeError`.
 *
 * Both steps are needed. `nodeFromJSON` refuses an unknown node or mark, an
 * empty text node and an attribute its validator rejects — the URL policy
 * among them — but does NOT check content expressions; `check()` does, and
 * re-runs the validators besides. The shape pass in front keeps a malformed or
 * hostile value from reaching either: a non-object, a `text` that is not a
 * string, or nesting past {@link MAX_JSON_DEPTH}.
 */
function readJson(value: unknown, schema: Schema): Node {
  assertShape(value, 0);
  const doc = schema.nodeFromJSON(value);
  if (doc.type !== schema.topNodeType) throw new RangeError('<wr-editor>: a JSON value is a `doc` node');
  doc.check();
  return doc;
}

function assertShape(value: unknown, depth: number): asserts value is WrEditorJson {
  if (depth > MAX_JSON_DEPTH) throw new RangeError('<wr-editor>: the JSON value nests too deeply');
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new RangeError('<wr-editor>: every JSON node is an object');
  }
  const node = value as Record<string, unknown>;
  if (typeof node['type'] !== 'string') throw new RangeError('<wr-editor>: every JSON node has a string `type`');
  if (node['text'] !== undefined && typeof node['text'] !== 'string') {
    throw new RangeError('<wr-editor>: `text` is a string');
  }
  for (const key of ['attrs', 'marks', 'content'] as const) {
    const child = node[key];
    if (child === undefined) continue;
    if (key === 'attrs') {
      if (typeof child !== 'object' || child === null || Array.isArray(child)) {
        throw new RangeError('<wr-editor>: `attrs` is an object');
      }
      continue;
    }
    if (!Array.isArray(child)) throw new RangeError(`<wr-editor>: \`${key}\` is an array`);
    for (const item of child) assertShape(item, depth + 1);
  }
}

export { readJson };
