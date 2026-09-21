import type { Node } from 'prosemirror-model';
import { describe, expect, it, vi } from 'vitest';

import type { WrEditorFormat, WrEditorJson, WrEditorValue } from '../interfaces';

import { readValue, writeValue } from './codec';
import { readHtml } from './html';
import { MAX_NESTING, editorSchema, nestingOf } from './schema';

/**
 * The three formats both ways, with no view: the document is the pivot, so each
 * case reads a value into a ProseMirror document and writes it back out. jsdom
 * stands in for the browser's inert template and off-DOM serializer.
 *
 * The URL policy is asserted on the OUTPUT and on the document, never on "no
 * handler fired": jsdom never fetches an image, so an `onerror` that did not run
 * proves nothing about a sanitizer.
 */
const read = (value: WrEditorValue, format: WrEditorFormat): Node =>
  readValue(value, format, editorSchema(format), document);
const through = (value: WrEditorValue, format: WrEditorFormat): WrEditorValue =>
  writeValue(read(value, format), format, document);

describe('the empty document', () => {
  it.each(['html', 'markdown', 'json'] as const)('reads null and "" as one empty paragraph in %s', format => {
    expect(read(null, format).toJSON()).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] });
    expect(read('', format).toJSON()).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] });
  });

  it('is written as "" in the string formats and null in json, so `required` sees it as empty', () => {
    expect(through('<p></p>', 'html')).toBe('');
    expect(through('', 'markdown')).toBe('');
    expect(through({ type: 'doc', content: [{ type: 'paragraph' }] }, 'json')).toBeNull();
  });

  it('counts an empty heading as empty too — choosing a block type is not writing', () => {
    expect(through('<h2></h2>', 'html')).toBe('');
  });

  // Enter on an empty editor, a lone Shift-Enter, a few spaces, and a list or a
  // quote chosen on an empty editor: each is still nothing written, and markdown
  // already wrote '' for the first three. Every format has to agree, or
  // `required()` passes in html and json over an editor that looks empty.
  it.each<[string, WrEditorJson[]]>([
    ['two empty paragraphs', [{ type: 'paragraph' }, { type: 'paragraph' }]],
    ['a lone line break', [{ type: 'paragraph', content: [{ type: 'hard_break' }] }]],
    // Built rather than read: the HTML parser collapses `<p>   </p>` on its own,
    // and typed spaces never pass through it.
    ['only spaces', [{ type: 'paragraph', content: [{ type: 'text', text: '   ' }] }]],
    ['an empty list', [{ type: 'bullet_list', content: [{ type: 'list_item', content: [{ type: 'paragraph' }] }] }]],
    ['an empty quote', [{ type: 'blockquote', content: [{ type: 'paragraph' }] }]],
    [
      'an empty task item',
      [
        {
          type: 'bullet_list',
          content: [{ type: 'list_item', attrs: { checked: false }, content: [{ type: 'paragraph' }] }],
        },
      ],
    ],
  ])('writes %s as empty in every format', (_name, content) => {
    for (const format of ['html', 'markdown', 'json'] as const) {
      const doc = editorSchema(format).nodeFromJSON({ type: 'doc', content });
      expect(writeValue(doc, format, document)).toBe(format === 'json' ? null : '');
    }
  });

  it('still counts an image or a rule as written', () => {
    expect(through('<p><img src="/a.png" alt=""></p>', 'html')).toBe('<p><img src="/a.png" alt=""></p>');
    expect(through('<hr><p></p>', 'html')).toBe('<hr><p></p>');
  });
});

describe('html', () => {
  it('round-trips what the schema carries', () => {
    const html =
      '<h2>Title</h2><p><strong>b</strong> <em>i</em> <u>u</u> <s>s</s> <code>c</code> ' +
      '<a href="https://example.com" title="T" rel="noopener noreferrer nofollow">l</a></p>' +
      '<blockquote><p>q</p></blockquote><ol start="3"><li><p>x</p></li></ol>' +
      '<pre><code class="language-ts" data-language="ts">a  b\n c</code></pre><hr>';
    expect(through(html, 'html')).toBe(html);
  });

  it('normalises what it does not keep, and is stable after one pass', () => {
    const once = through('<b>bold</b><i>it</i><h5>deep</h5><div class="x" onclick="y">text</div>', 'html');
    expect(once).toBe('<p><strong>bold</strong><em>it</em></p><h3>deep</h3><p>text</p>');
    expect(through(once, 'html')).toBe(once);
  });

  it('drops script, handlers and attributes nothing in the schema names', () => {
    const out = through(
      '<p onclick="alert(1)" style="color:red">a<script>alert(1)</script><img src="x" onerror="alert(1)"></p>',
      'html'
    ) as string;
    expect(out).not.toMatch(/script|onclick|onerror|style/);
    expect(out).toBe('<p>a<img src="x" alt=""></p>');
  });

  it('keeps the text of a link whose URL the policy refuses, and loses the URL', () => {
    const out = through(
      '<p><a href="javascript:alert(1)">js</a> <a href="java\tscript:x">tab</a> ' +
        '<a href="data:text/html,x">data</a> <a href="/ok">ok</a></p>',
      'html'
    );
    expect(out).toBe('<p>js tab data <a href="/ok" rel="noopener noreferrer nofollow">ok</a></p>');
  });

  it('drops an image whose URL the policy refuses, and keeps a raster data URL', () => {
    const png = 'data:image/png;base64,iVBORw0KGgo=';
    const out = through(`<p><img src="javascript:x" alt="a"><img src="${png}" alt="b"></p>`, 'html');
    expect(out).toBe(`<p><img src="${png}" alt="b"></p>`);
  });

  it("reads Google Docs' non-bold wrapper as plain text", () => {
    expect(through('<b style="font-weight:normal"><span>plain</span></b>', 'html')).toBe('<p>plain</p>');
  });

  it('keeps task state from its own attribute and from a GitHub-style checkbox', () => {
    expect(through('<ul><li data-checked="true"><p>a</p></li></ul>', 'html')).toBe(
      '<ul><li data-checked="true"><p>a</p></li></ul>'
    );
    expect(through('<ul><li><input type="checkbox" checked> b</li></ul>', 'html')).toBe(
      '<ul><li data-checked="true"><p>b</p></li></ul>'
    );
  });

  it('keeps a table and writes its alignment from the three allowed words only', () => {
    const out = through(
      '<table><tr><th align="center">h</th><td style="text-align: right; color: red">d</td></tr></table>',
      'html'
    );
    expect(out).toBe(
      // The serializer writes `style` through `cssText`, so the engine formats it.
      '<table><tbody><tr><th style="text-align: center;"><p>h</p></th>' +
        '<td style="text-align: end;"><p>d</p></td></tr></tbody></table>'
    );
  });

  // The parser collapses a run of spaces and drops a space at either end of a
  // block, so the editor's own output has to spell those as no-break spaces or
  // it reads back as different text from the text the user typed.
  it('keeps a run of spaces and the spaces at either end of a block across a round trip', () => {
    const doc = editorSchema('html').nodeFromJSON({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'a  b   c' }] },
        { type: 'paragraph', content: [{ type: 'text', text: ' lead' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'tail ' }] },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'x ' },
            { type: 'text', text: ' y', marks: [{ type: 'strong' }] },
            { type: 'hard_break' },
            { type: 'text', text: ' z' },
          ],
        },
      ],
    });
    const html = writeValue(doc, 'html', document) as string;
    expect(html).toBe(
      '<p>a &nbsp;b &nbsp; c</p><p>&nbsp;lead</p><p>tail&nbsp;</p><p>x <strong>&nbsp;y</strong><br>&nbsp;z</p>'
    );
    const back = read(html, 'html');
    expect(back.childCount).toBe(4);
    back.forEach((paragraph, _offset, index) =>
      expect(paragraph.textContent.replace(/\u00a0/g, ' ')).toBe(doc.child(index).textContent)
    );
    // And stable after that one pass: the no-break spaces are written as they are.
    expect(writeValue(back, 'html', document)).toBe(html);
  });

  it('leaves the spaces in a code block alone, which is read with its whitespace', () => {
    expect(through('<pre><code>  a  b </code></pre>', 'html')).toBe('<pre><code>  a  b </code></pre>');
  });

  it('refuses a value nested deeper than the parser can take, rather than overflowing', () => {
    const deep = `${'<blockquote>'.repeat(600)}x${'</blockquote>'.repeat(600)}`;
    expect(() => read(deep, 'html')).toThrow(/nests too deeply/);
  });

  it('refuses a value of the wrong type', () => {
    expect(() => read({ type: 'doc' }, 'html')).toThrow(/takes a string/);
  });

  /**
   * A page whose `trusted-types` allowlist does not name `ngwr-editor` throws
   * from `createPolicy`, and that refused every HTML value on the page. A fake
   * window per case, since the answer is decided once per window.
   */
  describe('on a Trusted Types page', () => {
    const on = (trustedTypes: object): Document =>
      ({
        defaultView: { trustedTypes },
        createElement: (tag: string) => document.createElement(tag),
      }) as unknown as Document;
    const refusing = (): TypeError => new TypeError('Policy "ngwr-editor" disallowed by the trusted-types directive');

    it("goes through the page's default policy", () => {
      const createHTML = vi.fn((input: string) => input);
      const createPolicy = vi.fn(() => {
        throw refusing();
      });
      const page = on({ defaultPolicy: { createHTML }, createPolicy });
      expect(readHtml('<p>Stored content</p>', page, editorSchema('html')).textContent).toBe('Stored content');
      expect(createHTML).toHaveBeenCalledWith('<p>Stored content</p>');
      expect(createPolicy).not.toHaveBeenCalled();
    });

    it('creates its own policy where there is no default, and asks once', () => {
      const createHTML = vi.fn((input: string) => input);
      const createPolicy = vi.fn(() => ({ createHTML }));
      const page = on({ createPolicy });
      readHtml('<p>a</p>', page, editorSchema('html'));
      readHtml('<p>b</p>', page, editorSchema('html'));
      expect(createPolicy).toHaveBeenCalledTimes(1);
      expect(createPolicy).toHaveBeenCalledWith('ngwr-editor', expect.anything());
      expect(createHTML).toHaveBeenCalledTimes(2);
    });

    it('does not throw where its policy name is not allowed, and does not ask again', () => {
      const createPolicy = vi.fn(() => {
        throw refusing();
      });
      const page = on({ createPolicy });
      // jsdom enforces nothing, so the plain string reads; a real page refuses it
      // at the sink, as a value the editor could not read.
      expect(readHtml('<p>Stored content</p>', page, editorSchema('html')).textContent).toBe('Stored content');
      expect(readHtml('<p>Again</p>', page, editorSchema('html')).textContent).toBe('Again');
      expect(createPolicy).toHaveBeenCalledTimes(1);
    });
  });
});

describe('markdown', () => {
  it('round-trips through the document', () => {
    const md = '## Title\n\n- **a** [l](https://x.dev)\n- `b`\n\n> q';
    expect(through(md, 'markdown')).toBe(md);
  });

  it('has no underline in its schema, so a pasted `<u>` cannot paint and vanish', () => {
    expect(editorSchema('markdown').marks['underline']).toBeUndefined();
    expect(editorSchema('html').marks['underline']).toBeDefined();
  });

  it('keeps raw HTML as the literal text <wr-markdown> would show', () => {
    expect(read('a <u>b</u>', 'markdown').textContent).toBe('a <u>b</u>');
  });

  it('drops a refused URL and keeps its label, the way the renderer does', () => {
    expect(through('[x](javascript:alert(1)) ![y](javascript:1)', 'markdown')).toBe('x y');
  });

  // The HTML path normalises a language it cannot keep to none; the markdown
  // path refused the whole document over it.
  it('reads a fence whose info word is too long to keep as a code block with no language', () => {
    const md = `# Notes\n\n\`\`\`${'a'.repeat(65)}\ncode\n\`\`\``;
    expect((read(md, 'markdown').toJSON() as WrEditorJson).content).toEqual([
      { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Notes' }] },
      { type: 'code_block', attrs: { language: null }, content: [{ type: 'text', text: 'code' }] },
    ]);
    const url = 'https://gist.github.com/someone/0123456789abcdef0123456789abcdef01234';
    expect(through(`\`\`\`${url}\ncode\n\`\`\``, 'markdown')).toBe('```\ncode\n```');
  });

  // A header narrower than the rows below it — what a merged header pasted
  // from Word or Docs leaves behind, since colspan is not read. The rows used to
  // be cut to the header's width, and the cells past it were never saved.
  it('widens the header of a ragged table rather than losing the cells past it', () => {
    const doc = read('<table><tr><th>Name</th></tr><tr><td>Ann</td><td>ann@example.com</td></tr></table>', 'html');
    expect(writeValue(doc, 'markdown', document)).toBe('| Name |  |\n| --- | --- |\n| Ann | ann@example.com |');
  });

  it('refuses a value of the wrong type', () => {
    expect(() => read({ type: 'doc' }, 'markdown')).toThrow(/takes a string/);
  });
});

describe('json', () => {
  const doc = (content: WrEditorJson[]): WrEditorJson => ({ type: 'doc', content });
  const para = (...content: WrEditorJson[]): WrEditorJson => ({ type: 'paragraph', content });

  it('round-trips a document as ProseMirror writes it', () => {
    const value = doc([
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'T' }] },
      para({ type: 'text', text: 'l', marks: [{ type: 'link', attrs: { href: '/x', title: null } }] }),
    ]);
    expect(through(value, 'json')).toEqual(value);
  });

  it.each<[string, unknown]>([
    ['an unknown node', doc([{ type: 'iframe' }])],
    ['an unknown mark', doc([para({ type: 'text', text: 'a', marks: [{ type: 'font' }] })])],
    ['an empty text node', doc([para({ type: 'text', text: '' })])],
    ['a heading level outside 1–3', doc([{ type: 'heading', attrs: { level: 9 } }])],
    ['a broken content rule', doc([{ type: 'text', text: 'loose' }])],
    [
      'a mark where the node allows none',
      doc([{ type: 'code_block', content: [{ type: 'text', text: 'a', marks: [{ type: 'strong' }] }] }]),
    ],
    ['a root that is not a doc', para({ type: 'text', text: 'a' })],
    ['a node with no type', doc([{} as WrEditorJson])],
    ['a non-string text', doc([para({ type: 'text', text: 1 as unknown as string })])],
    ['a string instead of an object', '{"type":"doc"}'],
  ])('refuses %s', (_name, value) => {
    expect(() => read(value as WrEditorValue, 'json')).toThrow();
  });

  it.each([
    ['a javascript: link', { type: 'link', attrs: { href: 'javascript:alert(1)' } }],
    ['a data: link', { type: 'link', attrs: { href: 'data:text/html,x' } }],
  ])('refuses %s as a whole — JSON is validated, not repaired', (_name, mark) => {
    expect(() => read(doc([para({ type: 'text', text: 'a', marks: [mark] })]), 'json')).toThrow(/refused link URL/);
  });

  it('refuses an image whose URL the policy refuses', () => {
    expect(() => read(doc([para({ type: 'image', attrs: { src: 'javascript:x' } })]), 'json')).toThrow(
      /refused image URL/
    );
  });

  it('drops an attribute the schema does not declare', () => {
    const out = through(
      doc([{ type: 'paragraph', attrs: { onclick: 'x' }, content: [{ type: 'text', text: 'a' }] }]),
      'json'
    );
    expect(out).toEqual(doc([para({ type: 'text', text: 'a' })]));
  });

  it('refuses nesting past the stack limit before ProseMirror recurses into it', () => {
    let node: WrEditorJson = para({ type: 'text', text: 'x' });
    for (let i = 0; i < 400; i++) node = { type: 'blockquote', content: [node] };
    expect(() => read(doc([node]), 'json')).toThrow(/nests too deeply/);
  });
});

describe('nestingOf', () => {
  it('counts quotes and list items, not the lists around them', () => {
    const doc = read('> - a\n>   - b', 'markdown');
    expect(nestingOf(doc)).toBe(3);
  });

  // The editing limit is only honest if the deepest document it allows keeps
  // its structure in markdown — past it the parser reads the rest as text, and
  // a heading comes back as a paragraph reading `## Deep`.
  it.each([
    ['quotes', (inner: WrEditorJson): WrEditorJson => ({ type: 'blockquote', content: [inner] })],
    [
      'list items',
      (inner: WrEditorJson): WrEditorJson => ({
        type: 'bullet_list',
        content: [
          { type: 'list_item', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'L' }] }, inner] },
        ],
      }),
    ],
  ])(`keeps ${MAX_NESTING} levels of %s intact through markdown`, (_name, wrap) => {
    let node: WrEditorJson = { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Deep' }] };
    for (let i = 0; i < MAX_NESTING; i++) node = wrap(node);
    const schema = editorSchema('markdown');
    const doc = schema.nodeFromJSON({ type: 'doc', content: [node] });
    expect(nestingOf(doc)).toBe(MAX_NESTING);
    const back = readValue(writeValue(doc, 'markdown', document), 'markdown', schema, document);
    expect(back.eq(doc)).toBe(true);
  });
});
