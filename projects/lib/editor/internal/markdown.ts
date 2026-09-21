/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import {
  type WrMarkdownAlign,
  type WrMarkdownBlock,
  type WrMarkdownCell,
  type WrMarkdownInline,
  type WrMarkdownListItem,
  parseMarkdown,
  serializeMarkdown,
} from 'ngwr/markdown';

import type { WrEditorJson, WrEditorMarkJson } from '../interfaces';

/**
 * Markdown to and from the editor's document JSON — both walkers pure, with no
 * ProseMirror import, so they run under SSR and in a spec with no DOM.
 *
 * The reading half never passes `streaming: true`: that mode withholds a
 * trailing `**` or `[` as a half-typed fragment, which in an editor would delete
 * what the user actually wrote.
 */

// ---------------------------------------------------------------------------
// Markdown → document
// ---------------------------------------------------------------------------

/** A markdown string as the editor's document JSON. */
function markdownToJson(source: string): WrEditorJson {
  const content = blocksToJson(parseMarkdown(source));
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] };
}

function blocksToJson(blocks: readonly WrMarkdownBlock[]): WrEditorJson[] {
  return blocks.map(blockToJson);
}

function blockToJson(block: WrMarkdownBlock): WrEditorJson {
  switch (block.kind) {
    case 'paragraph':
      return textblock('paragraph', undefined, block.inlines);
    case 'heading':
      // The schema stops at three; h4–h6 keep being headings rather than turning
      // into paragraphs, the same clamp the HTML path applies.
      return textblock('heading', { level: Math.min(block.level, 3) }, block.inlines);
    case 'code':
      // An empty text node is refused by ProseMirror, so an empty fence has no
      // content. The info word goes through the schema's own rule, as it does on
      // the HTML path: the parser keeps a word of any length, the schema refuses
      // one past 64 characters, and passed on unchanged it refused the whole
      // document over one fence tagged with a URL.
      return {
        type: 'code_block',
        attrs: { language: languageValue(block.language) },
        ...(block.code ? { content: [{ type: 'text', text: block.code }] } : {}),
      };
    case 'quote': {
      const children = blocksToJson(block.children);
      return { type: 'blockquote', content: children.length ? children : [{ type: 'paragraph' }] };
    }
    case 'list':
      return {
        type: block.ordered ? 'ordered_list' : 'bullet_list',
        attrs: block.ordered ? { order: block.start, tight: block.tight } : { tight: block.tight },
        content: block.items.map(itemToJson),
      };
    case 'table':
      return tableToJson(block.head, block.rows, block.align);
    case 'rule':
      return { type: 'horizontal_rule' };
  }
}

/**
 * A list item. Its content has to open with a paragraph — the shape
 * `prosemirror-schema-list`'s commands are written for — so an item that starts
 * with a code block, a quote or a nested list gets an empty paragraph in front,
 * which {@link jsonToMarkdown} drops again on the way out.
 */
function itemToJson(item: WrMarkdownListItem): WrEditorJson {
  const children = blocksToJson(item.children);
  if (children[0]?.type !== 'paragraph') children.unshift({ type: 'paragraph' });
  return { type: 'list_item', attrs: { checked: item.checked }, content: children };
}

function tableToJson(
  head: readonly WrMarkdownCell[],
  rows: readonly (readonly WrMarkdownCell[])[],
  align: readonly WrMarkdownAlign[]
): WrEditorJson {
  const row = (cells: readonly WrMarkdownCell[], type: 'table_header' | 'table_cell'): WrEditorJson => ({
    type: 'table_row',
    content: cells.map((cell, index) => ({
      type,
      attrs: { align: align[index] ?? null },
      content: [textblock('paragraph', undefined, cell.inlines)],
    })),
  });
  return { type: 'table', content: [row(head, 'table_header'), ...rows.map(cells => row(cells, 'table_cell'))] };
}

function textblock(
  type: string,
  attrs: Readonly<Record<string, unknown>> | undefined,
  inlines: readonly WrMarkdownInline[]
): WrEditorJson {
  const content = inlinesToJson(inlines);
  return { type, ...(attrs ? { attrs } : {}), ...(content.length ? { content } : {}) };
}

/**
 * Nested inline nodes flattened into leaves that each carry the marks collected
 * on the way down — the shape ProseMirror holds.
 *
 * A mark is added once however often it nests (`**a **b** c**`): a mark set with
 * the same mark twice is invalid to ProseMirror, and the whole value would be
 * refused over it. Adjacent leaves with the same marks are joined, because
 * `Node.fromJSON` does not join them and ProseMirror assumes it never sees two.
 */
function inlinesToJson(inlines: readonly WrMarkdownInline[]): WrEditorJson[] {
  const out: WrEditorJson[] = [];
  collect(inlines, [], out);
  return out;
}

function collect(nodes: readonly WrMarkdownInline[], marks: readonly WrEditorMarkJson[], out: WrEditorJson[]): void {
  for (const node of nodes) {
    switch (node.kind) {
      case 'text':
        // A soft break and the indentation around it render as one space; kept
        // as `\n`, the editor's `pre-wrap` would draw a line break the markdown
        // never had.
        pushText(out, node.value.replace(/\s*\n\s*/g, ' '), marks);
        break;
      case 'code':
        pushText(out, node.value, withMark(marks, { type: 'code' }));
        break;
      case 'break':
        out.push(withMarks({ type: 'hard_break' }, marks));
        break;
      case 'image':
        out.push(
          withMarks(
            { type: 'image', attrs: { src: node.src, alt: node.alt, title: node.title } },
            marks.filter(mark => mark.type === 'link')
          )
        );
        break;
      case 'link':
        collect(node.children, withMark(marks, { type: 'link', attrs: { href: node.href, title: node.title } }), out);
        break;
      case 'strong':
        collect(node.children, withMark(marks, { type: 'strong' }), out);
        break;
      case 'em':
        collect(node.children, withMark(marks, { type: 'em' }), out);
        break;
      case 'del':
        collect(node.children, withMark(marks, { type: 'strike' }), out);
        break;
    }
  }
}

function withMark(marks: readonly WrEditorMarkJson[], mark: WrEditorMarkJson): readonly WrEditorMarkJson[] {
  // The outer one wins — for a link that is the one the reader would follow.
  return marks.some(existing => existing.type === mark.type) ? marks : [...marks, mark];
}

function withMarks(node: WrEditorJson, marks: readonly WrEditorMarkJson[]): WrEditorJson {
  return marks.length ? { ...node, marks } : node;
}

function pushText(out: WrEditorJson[], text: string, marks: readonly WrEditorMarkJson[]): void {
  if (!text) return;
  const last = out[out.length - 1];
  if (last?.type === 'text' && sameMarks(last.marks ?? [], marks)) {
    out[out.length - 1] = { ...last, text: last.text + text };
    return;
  }
  out.push(withMarks({ type: 'text', text }, marks));
}

function sameMarks(a: readonly WrEditorMarkJson[], b: readonly WrEditorMarkJson[]): boolean {
  if (a.length !== b.length) return false;
  const key = (mark: WrEditorMarkJson): string => `${mark.type}:${JSON.stringify(mark.attrs ?? null)}`;
  const left = a.map(key).sort();
  const right = b.map(key).sort();
  return left.every((value, index) => value === right[index]);
}

// ---------------------------------------------------------------------------
// Document → markdown
// ---------------------------------------------------------------------------

/**
 * The editor's document JSON as markdown, through `serializeMarkdown` — so the
 * editor writes exactly the dialect `<wr-markdown>` renders.
 *
 * Underline has no markdown spelling and is dropped (in `markdown` format the
 * schema does not carry it in the first place). Everything else the schema holds
 * has a markdown form; what the serializer normalises is listed on
 * `serializeMarkdown` itself.
 */
function jsonToMarkdown(doc: WrEditorJson): string {
  return serializeMarkdown(childrenToBlocks(doc));
}

function childrenToBlocks(node: WrEditorJson): WrMarkdownBlock[] {
  return (node.content ?? []).flatMap(jsonToBlock);
}

function jsonToBlock(node: WrEditorJson): WrMarkdownBlock[] {
  const attrs = node.attrs ?? {};
  switch (node.type) {
    case 'paragraph':
      return [{ kind: 'paragraph', inlines: jsonToInlines(node.content ?? []) }];
    case 'heading':
      return [
        {
          kind: 'heading',
          level: headingLevel(attrs['level']),
          inlines: jsonToInlines(node.content ?? []),
          id: '',
        },
      ];
    case 'code_block':
      return [
        {
          kind: 'code',
          language: typeof attrs['language'] === 'string' ? attrs['language'] : null,
          code: (node.content ?? []).map(child => child.text ?? '').join(''),
          closed: true,
        },
      ];
    case 'blockquote':
      return [{ kind: 'quote', children: childrenToBlocks(node) }];
    case 'bullet_list':
    case 'ordered_list':
      return [
        {
          kind: 'list',
          ordered: node.type === 'ordered_list',
          start: node.type === 'ordered_list' && typeof attrs['order'] === 'number' ? attrs['order'] : 1,
          tight: attrs['tight'] !== false,
          items: (node.content ?? []).map(jsonToItem),
        },
      ];
    case 'table':
      return tableBlock(node);
    case 'horizontal_rule':
      return [{ kind: 'rule' }];
    default:
      return [];
  }
}

function headingLevel(value: unknown): 1 | 2 | 3 {
  return value === 2 || value === 3 ? value : 1;
}

function jsonToItem(item: WrEditorJson): WrMarkdownListItem {
  const content = item.content ?? [];
  // The filler paragraph `itemToJson` put in front of a non-paragraph block.
  const filler = content.length > 1 && content[0].type === 'paragraph' && !(content[0].content ?? []).length;
  const checked = item.attrs?.['checked'];
  return {
    children: (filler ? content.slice(1) : content).flatMap(jsonToBlock),
    checked: typeof checked === 'boolean' ? checked : null,
  };
}

/**
 * A table as markdown, every row as wide as the widest one.
 *
 * A markdown table is as wide as its header, and `serializeMarkdown` fits every
 * row to it — but a document can hold a header narrower than the rows below it:
 * a paste whose merged header came across one cell short, since `colspan` is not
 * read. Fitted to that header, the cells past it were on screen and never saved.
 * So the header grows empty cells instead, which markdown can carry.
 */
function tableBlock(table: WrEditorJson): WrMarkdownBlock[] {
  const rows = (table.content ?? []).map(row => row.content ?? []);
  const width = rows.reduce((widest, cells) => Math.max(widest, cells.length), 0);
  const [first, ...body] = rows;
  if (!first?.length) return [];
  const head = Array.from({ length: width }, (_, index) => first[index]);

  const cellOf = (cell: WrEditorJson | undefined): WrMarkdownCell => ({
    // Markdown has one line per cell: a cell's paragraphs join with a space.
    inlines: (cell?.content ?? []).flatMap((paragraph, index) => [
      ...(index ? [{ kind: 'text', value: ' ' } as const] : []),
      ...jsonToInlines(paragraph.content ?? []),
    ]),
  });
  const align = head.map(cell => {
    const value = cell?.attrs?.['align'];
    return value === 'start' || value === 'center' || value === 'end' ? value : null;
  });

  return [
    {
      kind: 'table',
      head: head.map(cellOf),
      rows: body.map(cells => head.map((_, index) => cellOf(cells[index]))),
      align,
    },
  ];
}

/**
 * Leaves back into an inline tree, each wrapped in its own marks.
 *
 * Deliberately naive: `serializeMarkdown` flattens whatever tree it is given to
 * the same leaves-with-mark-sets and regroups them in its one canonical nesting,
 * so wrapping every leaf separately writes exactly what a hand-merged tree would.
 */
function jsonToInlines(nodes: readonly WrEditorJson[]): WrMarkdownInline[] {
  return nodes.flatMap((node): WrMarkdownInline[] => {
    const marks = node.marks ?? [];
    switch (node.type) {
      case 'text': {
        const code = marks.some(mark => mark.type === 'code');
        const text = node.text ?? '';
        return text ? [wrap(code ? { kind: 'code', value: text } : { kind: 'text', value: text }, marks)] : [];
      }
      case 'hard_break':
        return [wrap({ kind: 'break' }, marks)];
      case 'image': {
        const attrs = node.attrs ?? {};
        return [
          wrap(
            {
              kind: 'image',
              src: stringOf(attrs['src']),
              alt: stringOf(attrs['alt']),
              title: typeof attrs['title'] === 'string' ? attrs['title'] : null,
            },
            marks
          ),
        ];
      }
      default:
        return [];
    }
  });
}

function stringOf(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

// ---------------------------------------------------------------------------
// Shared with the schema
// ---------------------------------------------------------------------------

/**
 * A fence's info word: what markdown keeps, and nothing that could break out of
 * it — or `null`. The one rule for a code block's language on every path in,
 * which is why it lives here, where the markdown walker needs it without
 * importing ProseMirror.
 */
function languageValue(raw: string | null): string | null {
  const word = (raw ?? '').trim().split(/\s+/)[0].toLowerCase();
  return word && word.length <= 64 ? word : null;
}

function wrap(leaf: WrMarkdownInline, marks: readonly WrEditorMarkJson[]): WrMarkdownInline {
  let node = leaf;
  for (const mark of marks) {
    switch (mark.type) {
      case 'strong':
        node = { kind: 'strong', children: [node] };
        break;
      case 'em':
        node = { kind: 'em', children: [node] };
        break;
      case 'strike':
        node = { kind: 'del', children: [node] };
        break;
      case 'link': {
        const attrs = mark.attrs ?? {};
        node = {
          kind: 'link',
          href: stringOf(attrs['href']),
          title: typeof attrs['title'] === 'string' ? attrs['title'] : null,
          children: [node],
        };
        break;
      }
      // `code` is the leaf itself, and `underline` has no markdown form.
    }
  }
  return node;
}

export { markdownToJson, jsonToMarkdown, languageValue };
