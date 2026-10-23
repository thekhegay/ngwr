import type { Node } from 'prosemirror-model';
import { describe, expect, it } from 'vitest';

import type { WrEditorJson, WrEditorMarkJson, WrEditorValue } from '../types';

import { readValue, writeValue } from './codec';
import { MAX_NESTING, editorSchema, nestingOf } from './schema';

/**
 * The value both ways, with no view: each case reads a tree into a ProseMirror
 * document and writes it back out. A bound value is untrusted, so most of this
 * file is what gets refused — always WHOLE, never repaired.
 */
const schema = editorSchema();
const read = (value: WrEditorValue): Node => readValue(value, schema);
const through = (value: WrEditorValue): WrEditorValue => writeValue(read(value));

const doc = (...content: WrEditorJson[]): WrEditorJson => ({ type: 'doc', content });
// ProseMirror writes no `content` for an empty node, so neither does this.
const para = (...content: WrEditorJson[]): WrEditorJson =>
  content.length ? { type: 'paragraph', content } : { type: 'paragraph' };
const text = (value: string, ...marks: WrEditorMarkJson[]): WrEditorJson =>
  marks.length ? { type: 'text', text: value, marks } : { type: 'text', text: value };

describe('the empty document', () => {
  it('reads null as one empty paragraph', () => {
    expect(read(null).toJSON()).toEqual(doc(para()));
  });

  it('is written as null, so `required` sees it as empty', () => {
    expect(through(doc(para()))).toBeNull();
  });

  it('counts an empty heading as empty too — choosing a block type is not writing', () => {
    expect(through(doc({ type: 'heading', attrs: { level: 2 } }))).toBeNull();
  });

  // Enter on an empty editor, a lone Shift-Enter, a few spaces, and a list or a
  // quote chosen on an empty editor: each is still nothing written, or
  // `required()` passes over an editor that looks empty.
  it.each<[string, WrEditorJson[]]>([
    ['two empty paragraphs', [para(), para()]],
    ['a lone line break', [para({ type: 'hard_break' })]],
    ['only spaces', [para(text('   '))]],
    ['an empty list', [{ type: 'bullet_list', content: [{ type: 'list_item', content: [para()] }] }]],
    ['an empty quote', [{ type: 'blockquote', content: [para()] }]],
    [
      'an empty task item',
      [{ type: 'bullet_list', content: [{ type: 'list_item', attrs: { checked: false }, content: [para()] }] }],
    ],
  ])('writes %s as null', (_name, content) => {
    expect(writeValue(schema.nodeFromJSON(doc(...content)))).toBeNull();
  });

  it('still counts an image or a rule as written', () => {
    const image = doc(para({ type: 'image', attrs: { src: '/a.png', alt: '', title: null } }));
    expect(through(image)).toEqual(image);
    const rule = doc({ type: 'horizontal_rule' }, para());
    expect(through(rule)).toEqual(rule);
  });
});

describe('reading', () => {
  it('round-trips a document as ProseMirror writes it, every mark included', () => {
    const value = doc(
      { type: 'heading', attrs: { level: 2 }, content: [text('T')] },
      para(
        text('b', { type: 'strong' }),
        text(' '),
        text('i', { type: 'em' }),
        text(' '),
        text('u', { type: 'underline' }),
        text(' '),
        text('s', { type: 'strike' }),
        text(' '),
        text('c', { type: 'code' }),
        text(' '),
        text('l', { type: 'link', attrs: { href: '/x', title: 'T' } })
      ),
      { type: 'code_block', attrs: { language: 'ts' }, content: [text('a  b\n c')] }
    );
    expect(through(value)).toEqual(value);
  });

  it('writes a fresh tree and leaves the bound one alone', () => {
    const value = doc(para(text('a')));
    const out = through(value);
    expect(out).toEqual(value);
    expect(out).not.toBe(value);
  });

  it('drops an attribute the schema does not declare', () => {
    const out = through(doc({ type: 'paragraph', attrs: { onclick: 'x' }, content: [text('a')] }));
    expect(out).toEqual(doc(para(text('a'))));
  });

  it('fills in an attribute left at its default', () => {
    expect(through(doc({ type: 'heading', content: [text('a')] }))).toEqual(
      doc({ type: 'heading', attrs: { level: 1 }, content: [text('a')] })
    );
  });

  it.each<[string, unknown]>([
    ['an unknown node', doc({ type: 'iframe' })],
    ['an unknown mark', doc(para(text('a', { type: 'font' })))],
    ['an empty text node', doc(para({ type: 'text', text: '' }))],
    ['a heading level outside 1–3', doc({ type: 'heading', attrs: { level: 9 } })],
    ['a broken content rule', doc(text('loose'))],
    ['a mark where the node allows none', doc({ type: 'code_block', content: [text('a', { type: 'strong' })] })],
    ['a root that is not a doc', para(text('a'))],
    ['a node with no type', doc({} as WrEditorJson)],
    ['a non-string text', doc(para({ type: 'text', text: 1 as unknown as string }))],
  ])('refuses %s', (_name, value) => {
    expect(() => read(value as WrEditorValue)).toThrow();
  });

  // The one mistake worth a sentence of its own: a tree stored as JSON text and
  // bound unparsed, or an HTML or markdown string.
  it('refuses a string, and says that is what it is', () => {
    for (const value of ['{"type":"doc"}', '<p>Hello</p>', '# Hello', '']) {
      expect(() => read(value as unknown as WrEditorValue)).toThrow(/not a string/);
    }
  });

  it.each([
    ['a javascript: link', 'javascript:alert(1)'],
    ['a data: link', 'data:text/html,x'],
    ['a link whose colon is a character reference', 'javascript&colon;alert(1)'],
  ])('refuses %s as a whole — the value is validated, not repaired', (_name, href) => {
    expect(() => read(doc(para(text('a', { type: 'link', attrs: { href } }))))).toThrow(/refused link URL/);
  });

  it('refuses an image whose URL the policy refuses, and keeps a raster data URL', () => {
    expect(() => read(doc(para({ type: 'image', attrs: { src: 'javascript:x' } })))).toThrow(/refused image URL/);
    const src = 'data:image/png;base64,iVBORw0KGgo=';
    const png = doc(para({ type: 'image', attrs: { src, alt: '', title: null } }));
    expect(through(png)).toEqual(png);
  });

  it('keeps a code language that is one lowercase word, and refuses any other', () => {
    const block = (language: unknown): WrEditorJson =>
      doc({ type: 'code_block', attrs: { language }, content: [text('x')] });
    expect(through(block('ts'))).toEqual(block('ts'));
    for (const language of ['Ts', 'a b', 'x'.repeat(65), 1]) {
      expect(() => read(block(language))).toThrow(/code language/);
    }
  });

  it('refuses nesting past the stack limit before ProseMirror recurses into it', () => {
    let node: WrEditorJson = para(text('x'));
    for (let i = 0; i < 400; i++) node = { type: 'blockquote', content: [node] };
    expect(() => read(doc(node))).toThrow(/nests too deeply/);
  });
});

describe('nestingOf', () => {
  const list = (...items: WrEditorJson[]): WrEditorJson => ({ type: 'bullet_list', content: items });
  const item = (...content: WrEditorJson[]): WrEditorJson => ({ type: 'list_item', content });

  it('counts quotes and list items, not the lists around them', () => {
    const value = doc({ type: 'blockquote', content: [list(item(para(text('a')), list(item(para(text('b'))))))] });
    expect(nestingOf(read(value))).toBe(3);
  });

  // The editing limit exists so that whatever an edit can make is a value the
  // editor reads back; the deepest such document has to survive the trip.
  it.each([
    ['quotes', (inner: WrEditorJson): WrEditorJson => ({ type: 'blockquote', content: [inner] })],
    ['list items', (inner: WrEditorJson): WrEditorJson => list(item(para(text('L')), inner))],
  ])(`reads back a document ${MAX_NESTING} levels of %s deep, the deepest an edit makes`, (_name, wrap) => {
    let node: WrEditorJson = { type: 'heading', attrs: { level: 2 }, content: [text('Deep')] };
    for (let i = 0; i < MAX_NESTING; i++) node = wrap(node);
    const deep = schema.nodeFromJSON(doc(node));
    expect(nestingOf(deep)).toBe(MAX_NESTING);
    expect(read(writeValue(deep)).eq(deep)).toBe(true);
  });
});
