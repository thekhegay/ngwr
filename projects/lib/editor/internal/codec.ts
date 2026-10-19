/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { Node, Schema } from 'prosemirror-model';

import type { WrEditorJson, WrEditorValue } from '../types';

import { readJson } from './json';
import { isBlankDoc } from './schema';

/**
 * A bound value as a document in `schema`, or a thrown error naming why it was
 * refused. `null` and `undefined` are the empty document.
 *
 * Throwing is the whole contract: the caller keeps the document it already has,
 * which is the rule `wr-input-number` and `wr-date-picker` follow for input they
 * cannot read. Nothing here ever returns a "repaired" document to write back.
 */
export function readValue(value: WrEditorValue | undefined, schema: Schema): Node {
  if (value === null || value === undefined) return schema.topNodeType.createAndFill()!;
  // Named on its own, since it is the one likely mistake: a tree stored as a JSON
  // string and bound without parsing it, or an HTML or markdown string.
  if (typeof value === 'string') throw new RangeError('<wr-editor>: the value is a JSON tree, not a string');
  return readJson(value, schema);
}

/** The document as a value — `null` when nothing is written in it: see {@link isBlankDoc}. */
export function writeValue(doc: Node): WrEditorValue {
  return isBlankDoc(doc) ? null : (doc.toJSON() as WrEditorJson);
}
