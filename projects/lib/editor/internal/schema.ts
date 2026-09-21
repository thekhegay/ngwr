/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { safeMarkdownUrl } from 'ngwr/markdown';
import { type Mark, type MarkSpec, type Node, type NodeSpec, Schema } from 'prosemirror-model';

import { languageValue } from './markdown';

/**
 * How deep blockquotes and list items may nest: the deepest document markdown
 * reads back with its structure. `parseMarkdown` parses twelve block levels and
 * keeps whatever sits at the twelfth as literal text, so the CONTENT of a twelfth
 * quote or item would come back flattened — a heading in there reads back as a
 * paragraph saying `## …`. Each quote and each list item is one level, as it is
 * there.
 */
const MAX_NESTING = 11;

/** The `align` values a table cell may carry — `ngwr/markdown`'s own vocabulary. */
const ALIGNS: ReadonlySet<unknown> = new Set([null, 'start', 'center', 'end']);

/** The largest ordinal the markdown parser reads back (`\d{1,9}`). */
const MAX_ORDER = 999999999;

/**
 * The one URL policy of all three formats, as a schema rule.
 *
 * `safeMarkdownUrl` is what `parseMarkdown` already applies, so the markdown path
 * never produces a refused URL. The HTML path asks it in `getAttrs`, where a
 * refusal drops the link and keeps its text. And the JSON path — plus every
 * attribute ProseMirror validates since view 1.42.3, clipboard slice context
 * included — hits these validators, which THROW: a JSON value holding a refused
 * URL is refused as a whole, the same as one holding an unknown node.
 */
function requireUrl(kind: 'link' | 'image') {
  return (value: unknown): void => {
    if (typeof value !== 'string' || safeMarkdownUrl(value, kind) !== value) {
      throw new RangeError(`<wr-editor>: refused ${kind} URL`);
    }
  };
}

function nullableString(value: unknown): void {
  if (value !== null && typeof value !== 'string') throw new RangeError('<wr-editor>: expected a string or null');
}

/**
 * The attributes of an `<a>` a pasted or bound document may keep: the href, and
 * only when the policy allows it. `false` drops the mark and keeps the text —
 * which is why this refuses rather than rewrites.
 */
function linkAttrs(dom: HTMLElement): false | { href: string; title: string | null } {
  const href = safeMarkdownUrl(dom.getAttribute('href') ?? '', 'link');
  return href ? { href, title: dom.getAttribute('title') } : false;
}

function imageAttrs(dom: HTMLElement): false | { src: string; alt: string; title: string | null } {
  const src = safeMarkdownUrl(dom.getAttribute('src') ?? '', 'image');
  return src ? { src, alt: dom.getAttribute('alt') ?? '', title: dom.getAttribute('title') } : false;
}

/**
 * A list item's task state, from this schema's own `data-checked` or from the
 * `<input type="checkbox">` GitHub-style renderers put first in the item.
 */
function checkedOf(dom: HTMLElement): boolean | null {
  const data = dom.getAttribute('data-checked');
  if (data === 'true' || data === 'false') return data === 'true';
  for (let child = dom.firstChild; child; child = child.nextSibling) {
    if (child.nodeType === 3 && !(child.textContent ?? '').trim()) continue;
    if (child.nodeName !== 'INPUT') return null;
    const input = child as HTMLInputElement;
    return (input.getAttribute('type') ?? '').toLowerCase() === 'checkbox' ? input.hasAttribute('checked') : null;
  }
  return null;
}

function alignOf(dom: HTMLElement): 'start' | 'center' | 'end' | null {
  // The first one that says anything: an element with no inline style reports
  // `''` for it, not null, so a nullish fallback would stop there.
  const raw = [dom.getAttribute('data-align'), dom.style?.textAlign, dom.getAttribute('align')].find(Boolean) ?? '';
  const word = raw.toLowerCase();
  if (word === 'center') return 'center';
  if (word === 'start' || word === 'left') return 'start';
  if (word === 'end' || word === 'right') return 'end';
  return null;
}

function languageOf(dom: HTMLElement): string | null {
  const code = dom.querySelector('code');
  const named = dom.getAttribute('data-language') ?? code?.getAttribute('data-language');
  const fromClass = /(?:^|\s)language-(\S+)/.exec(code?.getAttribute('class') ?? '')?.[1];
  return languageValue(named ?? fromClass ?? null);
}

function orderOf(dom: HTMLElement): number {
  const start = Number.parseInt(dom.getAttribute('start') ?? '', 10);
  return Number.isFinite(start) ? Math.min(Math.max(start, 0), MAX_ORDER) : 1;
}

const nodes: Record<string, NodeSpec> = {
  doc: { content: 'block+' },

  paragraph: {
    group: 'block',
    content: 'inline*',
    parseDOM: [{ tag: 'p' }],
    toDOM: () => ['p', 0],
  },

  heading: {
    group: 'block',
    content: 'inline*',
    defining: true,
    attrs: {
      level: {
        default: 1,
        // A FUNCTION, not `'number'`: the level becomes a tag name in `toDOM`,
        // and a type check alone accepts `{ level: 9 }`.
        validate: (value: unknown) => {
          if (value !== 1 && value !== 2 && value !== 3) throw new RangeError('<wr-editor>: heading level is 1–3');
        },
      },
    },
    // h4–h6 clamp to h3 rather than falling through to a paragraph, which would
    // lose the fact that the line was a heading at all.
    parseDOM: [
      { tag: 'h1', attrs: { level: 1 } },
      { tag: 'h2', attrs: { level: 2 } },
      { tag: 'h3', attrs: { level: 3 } },
      { tag: 'h4', attrs: { level: 3 } },
      { tag: 'h5', attrs: { level: 3 } },
      { tag: 'h6', attrs: { level: 3 } },
    ],
    toDOM: node => [`h${Math.min(Math.max(Number(node.attrs['level']) || 1, 1), 3)}`, 0],
  },

  blockquote: {
    group: 'block',
    content: 'block+',
    defining: true,
    parseDOM: [{ tag: 'blockquote' }],
    toDOM: () => ['blockquote', 0],
  },

  code_block: {
    group: 'block',
    content: 'text*',
    marks: '',
    code: true,
    defining: true,
    attrs: {
      language: {
        default: null,
        validate: (value: unknown) => {
          if (value !== null && (typeof value !== 'string' || languageValue(value) !== value)) {
            throw new RangeError('<wr-editor>: a code language is one lowercase word');
          }
        },
      },
    },
    parseDOM: [{ tag: 'pre', preserveWhitespace: 'full', getAttrs: dom => ({ language: languageOf(dom) }) }],
    toDOM: node => {
      const language = node.attrs['language'] as string | null;
      return ['pre', ['code', language ? { class: `language-${language}`, 'data-language': language } : {}, 0]];
    },
  },

  horizontal_rule: {
    group: 'block',
    parseDOM: [{ tag: 'hr' }],
    toDOM: () => ['hr'],
  },

  bullet_list: {
    group: 'block',
    content: 'list_item+',
    attrs: { tight: { default: true, validate: 'boolean' } },
    parseDOM: [{ tag: 'ul' }],
    toDOM: () => ['ul', 0],
  },

  ordered_list: {
    group: 'block',
    content: 'list_item+',
    attrs: {
      order: {
        default: 1,
        validate: (value: unknown) => {
          if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > MAX_ORDER) {
            throw new RangeError('<wr-editor>: a list starts at a whole number');
          }
        },
      },
      tight: { default: true, validate: 'boolean' },
    },
    parseDOM: [{ tag: 'ol', getAttrs: dom => ({ order: orderOf(dom) }) }],
    toDOM: node => (node.attrs['order'] === 1 ? ['ol', 0] : ['ol', { start: String(node.attrs['order']) }, 0]),
  },

  list_item: {
    content: 'paragraph block*',
    defining: true,
    attrs: {
      checked: {
        default: null,
        validate: (value: unknown) => {
          if (value !== null && typeof value !== 'boolean') throw new RangeError('<wr-editor>: checked is a boolean');
        },
      },
    },
    parseDOM: [{ tag: 'li', getAttrs: dom => ({ checked: checkedOf(dom) }) }],
    toDOM: node => {
      const checked = node.attrs['checked'] as boolean | null;
      return checked === null ? ['li', 0] : ['li', { 'data-checked': String(checked) }, 0];
    },
  },

  table: {
    group: 'block',
    content: 'table_row+',
    isolating: true,
    parseDOM: [{ tag: 'table' }],
    toDOM: () => ['table', ['tbody', 0]],
  },

  table_row: {
    content: '(table_header | table_cell)+',
    parseDOM: [{ tag: 'tr' }],
    toDOM: () => ['tr', 0],
  },

  table_header: cell('th'),
  table_cell: cell('td'),

  text: { group: 'inline' },

  image: {
    group: 'inline',
    inline: true,
    draggable: true,
    attrs: {
      src: { validate: requireUrl('image') },
      alt: { default: '', validate: 'string' },
      title: { default: null, validate: nullableString },
    },
    parseDOM: [{ tag: 'img[src]', getAttrs: imageAttrs }],
    toDOM: node => {
      // Re-asked here: validators do not run on `type.create()`, so a node built
      // in code never passed through them.
      const src = safeMarkdownUrl(String(node.attrs['src'] ?? ''), 'image');
      const title = node.attrs['title'] as string | null;
      return ['img', { src: src ?? '', alt: String(node.attrs['alt'] ?? ''), ...(title ? { title } : {}) }];
    },
  },

  hard_break: {
    group: 'inline',
    inline: true,
    selectable: false,
    linebreakReplacement: true,
    parseDOM: [{ tag: 'br' }],
    toDOM: () => ['br'],
  },
};

function cell(tag: 'th' | 'td'): NodeSpec {
  return {
    content: 'paragraph+',
    isolating: true,
    attrs: {
      align: {
        default: null,
        validate: (value: unknown) => {
          if (!ALIGNS.has(value)) throw new RangeError('<wr-editor>: align is start, center or end');
        },
      },
    },
    parseDOM: [{ tag, getAttrs: dom => ({ align: alignOf(dom) }) }],
    // The value is one of three words — checked by the validator, and again
    // here — so writing it into `style` cannot carry anything the input chose.
    toDOM: node => {
      const align = node.attrs['align'] as string | null;
      return ALIGNS.has(align) && align ? [tag, { style: `text-align: ${align}` }, 0] : [tag, 0];
    },
  };
}

/**
 * Marks in nesting order, outermost first — which is also how `toDOM` nests
 * them in the HTML this writes.
 */
function marks(underline: boolean): Record<string, MarkSpec> {
  return {
    link: {
      inclusive: false,
      attrs: {
        href: { validate: requireUrl('link') },
        title: { default: null, validate: nullableString },
      },
      parseDOM: [{ tag: 'a[href]', getAttrs: linkAttrs }],
      toDOM: (mark: Mark) => {
        const href = safeMarkdownUrl(String(mark.attrs['href'] ?? ''), 'link');
        if (!href) return ['span', 0];
        const title = mark.attrs['title'] as string | null;
        return ['a', { href, ...(title ? { title } : {}), rel: 'noopener noreferrer nofollow' }, 0];
      },
    },
    strong: {
      parseDOM: [
        { tag: 'strong' },
        // Google Docs wraps a whole paste in `<b style="font-weight: normal">`.
        { tag: 'b', getAttrs: dom => dom.style.fontWeight !== 'normal' && null },
        { style: 'font-weight=400', clearMark: mark => mark.type.name === 'strong' },
        { style: 'font-weight', getAttrs: value => /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null },
      ],
      toDOM: () => ['strong', 0],
    },
    em: {
      parseDOM: [
        { tag: 'i' },
        { tag: 'em' },
        { style: 'font-style=italic' },
        { style: 'font-style=normal', clearMark: mark => mark.type.name === 'em' },
      ],
      toDOM: () => ['em', 0],
    },
    ...(underline
      ? {
          underline: {
            parseDOM: [
              { tag: 'u' },
              { style: 'text-decoration=underline' },
              { style: 'text-decoration-line=underline' },
            ],
            toDOM: () => ['u', 0],
          } satisfies MarkSpec,
        }
      : {}),
    strike: {
      parseDOM: [
        { tag: 's' },
        { tag: 'del' },
        { tag: 'strike' },
        { style: 'text-decoration=line-through' },
        { style: 'text-decoration-line=line-through' },
      ],
      toDOM: () => ['s', 0],
    },
    code: {
      code: true,
      parseDOM: [{ tag: 'code' }],
      toDOM: () => ['code', 0],
    },
  };
}

let full: Schema | null = null;
let markdown: Schema | null = null;

/**
 * The schema for a format, built on first use and shared after that.
 *
 * Markdown gets its own, one mark short: it has no underline, and a mark the
 * value cannot carry would paint on screen and vanish on save — from a paste,
 * where no toolbar button could have kept it out.
 */
function editorSchema(format: 'html' | 'markdown' | 'json'): Schema {
  if (format === 'markdown') return (markdown ??= new Schema({ nodes, marks: marks(false) }));
  return (full ??= new Schema({ nodes, marks: marks(true) }));
}

/** How many blockquotes and list items deep the document's deepest block sits. */
function nestingOf(doc: Node): number {
  let deepest = 0;
  const walk = (node: Node, depth: number): void => {
    node.forEach(child => {
      if (child.isTextblock || child.isLeaf) return;
      const next = child.type.name === 'blockquote' || child.type.name === 'list_item' ? depth + 1 : depth;
      if (next > deepest) deepest = next;
      walk(child, next);
    });
  };
  walk(doc, 0);
  return deepest;
}

/**
 * A document that is one empty textblock — the shape the placeholder is drawn
 * on. Which textblock is open: an empty heading shows the hint as well.
 *
 * Not the test for "nothing written"; that is {@link isBlankDoc}.
 */
function isEmptyDoc(doc: Node): boolean {
  if (doc.childCount !== 1) return false;
  const only = doc.firstChild!;
  return only.isTextblock && only.childCount === 0;
}

/**
 * A document with nothing written in it: no text but whitespace, and no leaf
 * but line breaks. An image or a rule is content in its own right; structure
 * alone is not.
 *
 * Decided by content rather than by shape, because every one of these looks
 * empty and markdown already wrote them as `''`: Enter on an empty editor (two
 * empty paragraphs), a lone Shift-Enter, a few spaces, and a list, a quote or a
 * heading chosen on an empty editor. Written as anything else, `required()`
 * passed in `html` and `json` over an editor with nothing in it.
 */
function isBlankDoc(doc: Node): boolean {
  let written = false;
  doc.descendants(node => {
    if (node.isText ? /\S/.test(node.text!) : node.isLeaf && node.type.name !== 'hard_break') written = true;
    return !written;
  });
  return !written;
}

export { MAX_NESTING, editorSchema, nestingOf, isEmptyDoc, isBlankDoc };
