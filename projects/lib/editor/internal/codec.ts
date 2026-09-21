/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { Node, Schema } from 'prosemirror-model';

import type { WrEditorFormat, WrEditorJson, WrEditorValue } from '../interfaces';

import { readHtml, writeHtml } from './html';
import { readJson } from './json';
import { jsonToMarkdown, markdownToJson } from './markdown';
import { isBlankDoc } from './schema';

/**
 * The three formats meeting in one place. JSON is the pivot: markdown is walked
 * into it, HTML is parsed by the schema's own rules, and a bound JSON value is
 * validated like any other untrusted input.
 */

/**
 * A bound value as a document in `schema`, or a thrown error naming why it was
 * refused. `null`, `undefined` and `''` are the empty document in every format.
 *
 * Throwing is the whole contract: the caller keeps the document it already has,
 * which is the rule `wr-input-number` and `wr-date-picker` follow for input they
 * cannot read. Nothing here ever returns a "repaired" document to write back.
 */
export function readValue(
  value: WrEditorValue | undefined,
  format: WrEditorFormat,
  schema: Schema,
  document: Document
): Node {
  if (value === null || value === undefined || value === '') return schema.topNodeType.createAndFill()!;

  switch (format) {
    case 'json':
      if (typeof value === 'string') throw new RangeError('<wr-editor>: `format="json"` takes an object, not a string');
      return readJson(value, schema);
    case 'markdown':
      if (typeof value !== 'string') throw new RangeError('<wr-editor>: `format="markdown"` takes a string');
      return readJson(markdownToJson(value), schema);
    case 'html':
      if (typeof value !== 'string') throw new RangeError('<wr-editor>: `format="html"` takes a string');
      return readHtml(value, document, schema);
  }
}

/**
 * A document in the bound format — `''` or `null` when nothing is written in it,
 * the same in all three: see {@link isBlankDoc}.
 */
export function writeValue(doc: Node, format: WrEditorFormat, document: Document): WrEditorValue {
  if (isBlankDoc(doc)) return format === 'json' ? null : '';

  switch (format) {
    case 'json':
      return doc.toJSON() as WrEditorJson;
    case 'markdown':
      return jsonToMarkdown(doc.toJSON() as WrEditorJson);
    case 'html':
      return writeHtml(doc, document);
  }
}
