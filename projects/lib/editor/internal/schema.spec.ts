import { DOMSerializer, type Node, DOMParser as PmDOMParser } from 'prosemirror-model';
import { describe, expect, it } from 'vitest';

import { editorSchema } from './schema';

/**
 * The schema's DOM rules on their own. Its parse rules are what a PASTE goes
 * through — ProseMirror reads the clipboard's HTML with them — and its `toDOM`
 * is what the surface draws and a copy puts on the clipboard. Neither is the
 * value, which is a JSON tree and has the codec's spec.
 *
 * The HTML is parsed into an inert `<template>`, and the URL policy is asserted
 * on the output, never on "no handler fired": jsdom never fetches an image, so
 * an `onerror` that did not run proves nothing about a sanitizer.
 */
const schema = editorSchema();

function parse(html: string): Node {
  const template = document.createElement('template');
  template.innerHTML = html;
  const doc = PmDOMParser.fromSchema(schema).parse(template.content);
  doc.check();
  return doc;
}

function print(doc: Node): string {
  const container = document.createElement('div');
  container.appendChild(DOMSerializer.fromSchema(schema).serializeFragment(doc.content));
  return container.innerHTML;
}

const pasted = (html: string): string => print(parse(html));

describe('the parse rules', () => {
  it('keep what the schema carries, and toDOM draws it back the same way', () => {
    const html =
      '<h2>Title</h2><p><strong>b</strong> <em>i</em> <u>u</u> <s>s</s> <code>c</code> ' +
      '<a href="https://example.com" title="T" rel="noopener noreferrer nofollow">l</a></p>' +
      '<blockquote><p>q</p></blockquote><ol start="3"><li><p>x</p></li></ol>' +
      '<pre><code class="language-ts" data-language="ts">a  b\n c</code></pre><hr>';
    expect(pasted(html)).toBe(html);
  });

  it('normalise what they do not keep, clamping h4–h6 to h3', () => {
    expect(pasted('<b>bold</b><i>it</i><h5>deep</h5><div class="x" onclick="y">text</div>')).toBe(
      '<p><strong>bold</strong><em>it</em></p><h3>deep</h3><p>text</p>'
    );
  });

  it('drop script, handlers and attributes nothing in the schema names', () => {
    const out = pasted(
      '<p onclick="alert(1)" style="color:red">a<script>alert(1)</script><img src="x" onerror="alert(1)"></p>'
    );
    expect(out).not.toMatch(/script|onclick|onerror|style/);
    expect(out).toBe('<p>a<img src="x" alt=""></p>');
  });

  it('keep the text of a link whose URL the policy refuses, and lose the URL', () => {
    const out = pasted(
      '<p><a href="javascript:alert(1)">js</a> <a href="java\tscript:x">tab</a> ' +
        '<a href="data:text/html,x">data</a> <a href="/ok">ok</a></p>'
    );
    expect(out).toBe('<p>js tab data <a href="/ok" rel="noopener noreferrer nofollow">ok</a></p>');
  });

  it('drop an image whose URL the policy refuses, and keep a raster data URL', () => {
    const png = 'data:image/png;base64,iVBORw0KGgo=';
    expect(pasted(`<p><img src="javascript:x" alt="a"><img src="${png}" alt="b"></p>`)).toBe(
      `<p><img src="${png}" alt="b"></p>`
    );
  });

  it("read Google Docs' non-bold wrapper as plain text", () => {
    expect(pasted('<b style="font-weight:normal"><span>plain</span></b>')).toBe('<p>plain</p>');
  });

  it('keep task state from its own attribute and from a GitHub-style checkbox', () => {
    expect(pasted('<ul><li data-checked="true"><p>a</p></li></ul>')).toBe(
      '<ul><li data-checked="true"><p>a</p></li></ul>'
    );
    expect(pasted('<ul><li><input type="checkbox" checked> b</li></ul>')).toBe(
      '<ul><li data-checked="true"><p>b</p></li></ul>'
    );
  });

  it('keep a table, and draw its alignment from the three allowed words only', () => {
    const out = pasted(
      '<table><tr><th align="center">h</th><td style="text-align: right; color: red">d</td></tr></table>'
    );
    expect(out).toBe(
      // The serializer writes `style` through `cssText`, so the engine formats it.
      '<table><tbody><tr><th style="text-align: center;"><p>h</p></th>' +
        '<td style="text-align: end;"><p>d</p></td></tr></tbody></table>'
    );
  });

  it('keep the spaces in a code block, which is read with its whitespace', () => {
    expect(pasted('<pre><code>  a  b </code></pre>')).toBe('<pre><code>  a  b </code></pre>');
  });

  it('read a code language only as one lowercase word', () => {
    expect(pasted('<pre><code class="language-TypeScript extra">x</code></pre>')).toBe(
      '<pre><code class="language-typescript" data-language="typescript">x</code></pre>'
    );
    expect(pasted(`<pre><code class="language-${'a'.repeat(65)}">x</code></pre>`)).toBe('<pre><code>x</code></pre>');
  });
});
