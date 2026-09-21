import { describe, expect, it } from 'vitest';

import type { WrEditorJson } from '../interfaces';

import { jsonToMarkdown, markdownToJson } from './markdown';
import { editorSchema } from './schema';

/**
 * The markdown walkers, with no ProseMirror view and no DOM — both directions
 * are plain data, so this is where the mapping is pinned exactly. Every JSON
 * value produced here is also handed to the real schema, because a walker that
 * emits JSON ProseMirror refuses would make every markdown value "unreadable".
 */
const schema = editorSchema('markdown');

const read = (source: string): WrEditorJson => {
  const json = markdownToJson(source);
  schema.nodeFromJSON(json).check();
  return json;
};

describe('markdownToJson', () => {
  it('maps paragraphs, headings and rules', () => {
    expect(read('# Title\n\nSome text\n\n---')).toEqual({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Title' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Some text' }] },
        { type: 'horizontal_rule' },
      ],
    });
  });

  it('clamps h4–h6 to h3 rather than losing the heading', () => {
    expect(read('#### Deep').content?.[0]).toEqual({
      type: 'heading',
      attrs: { level: 3 },
      content: [{ type: 'text', text: 'Deep' }],
    });
  });

  it('gives an empty document one empty paragraph, which ProseMirror requires', () => {
    expect(read('')).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] });
  });

  it('writes an empty fence as a code block with no text node', () => {
    expect(read('```ts\n```').content?.[0]).toEqual({ type: 'code_block', attrs: { language: 'ts' } });
  });

  it('fills an empty quote and an item that does not open with a paragraph', () => {
    const doc = read('>\n\n- ```\n  x\n  ```');
    expect(doc.content?.[0]).toEqual({ type: 'blockquote', content: [{ type: 'paragraph' }] });
    expect(doc.content?.[1].content?.[0].content?.map(child => child.type)).toEqual(['paragraph', 'code_block']);
  });

  it('keeps list kind, start, tightness and task state', () => {
    expect(read('3. one\n4. two').content?.[0].attrs).toEqual({ order: 3, tight: true });
    expect(read('- a\n\n- b').content?.[0].attrs).toEqual({ tight: false });
    const tasks = read('- [x] done\n- [ ] open\n- plain').content?.[0];
    expect(tasks?.content?.map(item => item.attrs?.['checked'])).toEqual([true, false, null]);
  });

  it('flattens inline marks into leaves and adds each mark once', () => {
    const doc = read('__a **b** c__ and [link *em*](https://example.com "T") `code`');
    expect(doc.content?.[0].content).toEqual([
      { type: 'text', text: 'a b c', marks: [{ type: 'strong' }] },
      { type: 'text', text: ' and ' },
      {
        type: 'text',
        text: 'link ',
        marks: [{ type: 'link', attrs: { href: 'https://example.com', title: 'T' } }],
      },
      {
        type: 'text',
        text: 'em',
        marks: [{ type: 'link', attrs: { href: 'https://example.com', title: 'T' } }, { type: 'em' }],
      },
      { type: 'text', text: ' ' },
      { type: 'text', text: 'code', marks: [{ type: 'code' }] },
    ]);
  });

  it('reads a soft break as a space, not as a line break pre-wrap would draw', () => {
    expect(read('one\ntwo').content?.[0].content).toEqual([{ type: 'text', text: 'one two' }]);
  });

  it('reads a hard break and a linked image', () => {
    const inlines = read('a\\\nb [![alt](/i.png)](/to)').content?.[0].content;
    expect(inlines?.[1]).toEqual({ type: 'hard_break' });
    expect(inlines?.[3]).toEqual({
      type: 'image',
      attrs: { src: '/i.png', alt: 'alt', title: null },
      marks: [{ type: 'link', attrs: { href: '/to', title: null } }],
    });
  });

  it('keeps a table, its header row and its alignment', () => {
    const table = read('| a | b |\n| :-: | --: |\n| 1 | 2 |').content?.[0];
    expect(table?.content?.map(row => row.content?.map(cell => [cell.type, cell.attrs?.['align']]))).toEqual([
      [
        ['table_header', 'center'],
        ['table_header', 'end'],
      ],
      [
        ['table_cell', 'center'],
        ['table_cell', 'end'],
      ],
    ]);
  });

  it('has already dropped a URL the policy refuses — the parser applies it', () => {
    expect(read('[x](javascript:alert(1))').content?.[0].content).toEqual([{ type: 'text', text: 'x' }]);
  });

  it('never runs the streaming tail patch, which would eat a trailing `**`', () => {
    expect(read('keep **').content?.[0].content).toEqual([{ type: 'text', text: 'keep **' }]);
  });
});

describe('jsonToMarkdown', () => {
  const roundTrip = (source: string): string => jsonToMarkdown(read(source));

  it.each([
    '# Title\n\nSome **bold** and *em* and ~~gone~~ text.',
    '1. one\n2. two',
    '- [x] done\n- [ ] open',
    '> quoted\n>\n> - item',
    '```ts\nconst a = 1;\n```',
    '| a | b |\n| :-: | --: |\n| 1 | 2 |',
    '[link](https://example.com "T") and ![img](/i.png)',
    'a\\\nb',
    '---',
  ])('writes back exactly what it read: %j', source => {
    expect(roundTrip(source)).toBe(source);
  });

  it('drops the filler paragraph in front of an item that opened with a block', () => {
    expect(roundTrip('- ```\n  x\n  ```')).toBe('- ```\n  x\n  ```');
  });

  it('drops underline, which markdown cannot spell, and keeps its text', () => {
    const doc: WrEditorJson = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'u', marks: [{ type: 'underline' }] }] }],
    };
    expect(jsonToMarkdown(doc)).toBe('u');
  });

  it('joins a table cell holding two paragraphs with a space', () => {
    const cell = (text: string): WrEditorJson => ({ type: 'paragraph', content: [{ type: 'text', text }] });
    const doc: WrEditorJson = {
      type: 'doc',
      content: [
        {
          type: 'table',
          content: [{ type: 'table_row', content: [{ type: 'table_header', content: [cell('a'), cell('b')] }] }],
        },
      ],
    };
    expect(jsonToMarkdown(doc)).toBe('| a b |\n| --- |');
  });

  it('writes an empty document as the empty string', () => {
    expect(jsonToMarkdown({ type: 'doc', content: [{ type: 'paragraph' }] })).toBe('');
  });
});
