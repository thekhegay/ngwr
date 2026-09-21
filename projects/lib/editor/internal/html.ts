/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DOMParser as PmDOMParser, DOMSerializer, Fragment, type Node, type Schema } from 'prosemirror-model';

/** Past this many nested elements the value is refused unread — see {@link readHtml}. */
const MAX_DOM_DEPTH = 512;

/** What the HTML parser collapses and strips, written where a space has to survive it. */
const NBSP = '\u00a0';

/** The part of the Trusted Types API this file touches. */
interface WrTrustedTypePolicy {
  createHTML(input: string): unknown;
}

interface WrTrustedTypes {
  readonly defaultPolicy?: WrTrustedTypePolicy | null;
  createPolicy(name: string, rules: { createHTML: (input: string) => string }): WrTrustedTypePolicy;
}

/** One answer per window, `null` where there is no policy to use. */
const policies = new WeakMap<object, WrTrustedTypePolicy | null>();

/**
 * An HTML string wrapped for a `trusted-types` page, decided once per window and
 * only where the API exists.
 *
 * A template's `innerHTML` is a Trusted Types sink like any other, and under
 * `require-trusted-types-for 'script'` a plain string throws. Pass-through is
 * sound HERE and nowhere else: the string lands in an inert template, and what
 * leaves it is rebuilt node by node from the schema's allowlist — the same
 * argument ProseMirror makes for its own clipboard policy.
 *
 * The page's default policy comes first, as it does in ProseMirror's clipboard
 * code; then one named `ngwr-editor`. Creating that one THROWS on a page whose
 * `trusted-types` allowlist does not name it, and uncaught that refused every
 * HTML value on the page — so a refusal falls back to the plain string, which
 * such a page refuses at the sink instead, as a value the editor could not read.
 * An app with an allowlist and no default policy adds `ngwr-editor` (and
 * ProseMirror's own `ProseMirrorClipboard`, for paste).
 */
function trusted(html: string, view: (Window & typeof globalThis) | null): string {
  const types = (view as unknown as { trustedTypes?: WrTrustedTypes } | null)?.trustedTypes;
  if (!view || !types) return html;
  let policy = policies.get(view);
  if (policy === undefined) {
    policy = types.defaultPolicy ?? null;
    if (!policy) {
      try {
        policy = types.createPolicy('ngwr-editor', { createHTML: input => input });
      } catch {
        policy = null;
      }
    }
    policies.set(view, policy);
  }
  return (policy ? policy.createHTML(html) : html) as string;
}

/**
 * An untrusted HTML string as a checked document, or a thrown `RangeError`.
 *
 * Parsed into a `<template>` of the INJECTED document, never into a live node:
 * a template's content has no browsing context, so a `<script>` does not run, an
 * `<img onerror>` never loads and no handler fires. It is also the one inert
 * parser the server has — domino ships no `DOMParser`. From there the schema's
 * parse rules rebuild the document from an allowlist, so an attribute they do
 * not name never reaches it, and a link or image the URL policy refuses keeps its
 * text and loses the URL.
 *
 * Depth is checked before ProseMirror sees the tree: its parser recurses, a
 * browser's HTML parser caps nesting on its own and neither jsdom nor domino
 * does.
 */
function readHtml(html: string, document: Document, schema: Schema): Node {
  const template = document.createElement('template');
  template.innerHTML = trusted(html, document.defaultView);
  if (depthOf(template.content) > MAX_DOM_DEPTH) throw new RangeError('<wr-editor>: the HTML value nests too deeply');
  const doc = PmDOMParser.fromSchema(schema).parse(template.content);
  doc.check();
  return doc;
}

function depthOf(root: ParentNode): number {
  let deepest = 0;
  const stack: [Element, number][] = [];
  for (let child = root.firstElementChild; child; child = child.nextElementSibling) stack.push([child, 1]);
  while (stack.length) {
    const [element, depth] = stack.pop()!;
    if (depth > deepest) deepest = depth;
    if (deepest > MAX_DOM_DEPTH) return deepest;
    for (let child = element.firstElementChild; child; child = child.nextElementSibling) stack.push([child, depth + 1]);
  }
  return deepest;
}

/**
 * A document as HTML, serialized in a document of its own.
 *
 * Never the live one: an `<img>` created by the page's document starts loading
 * the moment its `src` is set, attached or not. On the server the injected
 * document is domino's and loads nothing, which is also why the fallback is safe
 * where `createHTMLDocument` is missing.
 *
 * Spaces are written the way {@link keepSpaces} says, so the editor's own output
 * reads back as the text it was written from.
 */
function writeHtml(doc: Node, document: Document): string {
  const off = document.implementation?.createHTMLDocument?.('') ?? document;
  const container = off.createElement('div');
  const content = withKeptSpaces(doc).content;
  container.appendChild(DOMSerializer.fromSchema(doc.type.schema).serializeFragment(content, { document: off }));
  return container.innerHTML;
}

function withKeptSpaces(node: Node): Node {
  if (node.isTextblock) return keepSpaces(node);
  if (node.isLeaf) return node;
  const children: Node[] = [];
  let changed = false;
  node.forEach(child => {
    const next = withKeptSpaces(child);
    changed ||= next !== child;
    children.push(next);
  });
  return changed ? node.copy(Fragment.from(children)) : node;
}

/**
 * A textblock whose spaces survive the HTML parser: every space it would collapse
 * or strip is written as a no-break space.
 *
 * The surface draws spaces as typed (`white-space: break-spaces`), but the parser
 * that reads a value back — ProseMirror's, and a browser's rendering of the same
 * HTML — collapses a run into one and drops one at the start of a block, after a
 * line break and at the end. So a space stays a space only where a character
 * other than a space comes before it and anything but the block's end comes
 * after; the rest alternate as no-break spaces, the way CKEditor writes them. A
 * run that crosses a mark boundary is still one run. A code block is read with
 * its whitespace kept, and left alone.
 */
function keepSpaces(block: Node): Node {
  if (block.type.spec.code || !block.textContent.includes(' ')) return block;
  const children: Node[] = [];
  let before: 'start' | 'space' | 'other' = 'start';
  let changed = false;
  block.forEach((child, _offset, index) => {
    if (!child.isText) {
      children.push(child);
      before = child.type.name === 'hard_break' ? 'start' : 'other';
      return;
    }
    const text = child.text!;
    const last = index === block.childCount - 1;
    let out = '';
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char !== ' ') {
        out += char;
        before = 'other';
      } else if (before === 'other' && !(last && i === text.length - 1)) {
        out += ' ';
        before = 'space';
      } else {
        out += NBSP;
        before = 'other';
      }
    }
    changed ||= out !== text;
    children.push(out === text ? child : block.type.schema.text(out, child.marks));
  });
  return changed ? block.copy(Fragment.from(children)) : block;
}

export { readHtml, writeHtml };
