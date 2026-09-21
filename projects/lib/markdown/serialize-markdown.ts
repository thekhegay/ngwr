/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type {
  WrMarkdownAlign,
  WrMarkdownBlock,
  WrMarkdownCell,
  WrMarkdownInline,
  WrMarkdownListItem,
} from './interfaces';
import {
  AUTOLINK_RE,
  EMAIL_AUTOLINK_RE,
  MAX_DESTINATION_NESTING,
  MAX_LABEL_LENGTH,
  MAX_TABLE_COLUMNS,
  QUOTE_RE,
  RULE_RE,
  TABLE_DELIM_RE,
  codeSpanValue,
  interruptsParagraph,
  isTableStart,
  matchListStart,
  safeMarkdownUrl,
  startsBlock,
} from './parse-markdown';

/**
 * A block tree back to markdown — the inverse of {@link parseMarkdown}.
 *
 * **Written against this library's parser, not against CommonMark.** The two
 * disagree in places (no setext headings, no indented code, no entities, a
 * simplified reading of emphasis), and a serializer that escapes for the wrong
 * dialect writes text that comes back as something else. So every escape here is
 * derived from a question `parseMarkdown` actually asks — several of them by
 * calling the parser's own predicates — and the spec holds the pair to one
 * property: `parseMarkdown(serializeMarkdown(tree))` returns `tree`.
 *
 * **What markdown cannot say is normalised, never guessed at.** The output is the
 * nearest document this dialect can express, and reading it back gives a tree
 * that serializes to the same string. The losses, all of them structural:
 *
 * - Whitespace at the edges of a paragraph, heading or cell is dropped, and so is
 *   whitespace just inside `**` / `*` / `~~` — a delimiter next to a space is not
 *   a delimiter. A soft line break inside a text node becomes a space, and a hard
 *   break at the very end of a block (a trailing `\` stays literal) is dropped;
 *   inside a heading or a table cell every hard break becomes a space.
 * - An empty paragraph, an empty list and a table with no header cell vanish.
 * - Two adjacent lists of the same kind merge on the way back — there is no
 *   raw-HTML comment to put between them. A single-item list with one block
 *   cannot be loose, and a loose list nested in a tight one loosens it. Nesting
 *   deeper than the parser's twelve levels reads back as text.
 * - Inline marks are rewritten in one canonical nesting — link outside strong
 *   outside strikethrough outside emphasis — which is also how a mark SET, the
 *   shape an editor holds, becomes a tree. An image carries no emphasis (none of
 *   it paints on an image); where an emphasis run touches a strong one and
 *   neither can switch to `_`, the emphasis is dropped rather than written as
 *   markup that reads back as literal asterisks.
 * - A link or image whose URL `safeMarkdownUrl` refuses is written as its text,
 *   exactly as the renderer would show it. A destination is percent-encoded
 *   where this parser cannot carry a character (`<`, `>`, an unbalanced
 *   parenthesis, a `\` it would read as an escape — and `[`, `]`, a backtick for
 *   an image inside a link label), loses a tab or line break the way a browser's
 *   URL parser does, a title that cannot be delimited is dropped, and a link
 *   whose label is too long for the parser's label cap is written as plain text.
 * - A fence's info string keeps its first word, lowercased, and `closed` is not
 *   written: a serialized fence is always closed. A tab that indents a line reads
 *   back as four spaces, as the parser expands it. Heading ids are the parser's,
 *   recomputed on the way back.
 *
 * @param blocks a block tree, typically from {@link parseMarkdown} or an editor
 * @returns markdown, with no trailing newline; `''` for an empty tree
 */
function serializeMarkdown(blocks: readonly WrMarkdownBlock[]): string {
  return joinBlocks(blocks.map(renderBlock), false);
}

/** A block and the markdown it rendered to — the join between two needs both. */
interface Rendered {
  readonly block: WrMarkdownBlock;
  readonly text: string;
}

/** The largest number `LIST_RE` reads as an ordinal: `\d{1,9}`. */
const MAX_ORDINAL = 999999999;

const DELIMITER_ROW: Readonly<Record<NonNullable<WrMarkdownAlign> | 'none', string>> = {
  start: ':--',
  center: ':-:',
  end: '--:',
  none: '---',
};

function renderBlock(block: WrMarkdownBlock): Rendered | null {
  const text = blockText(block);

  return text ? { block, text } : null;
}

function blockText(block: WrMarkdownBlock): string {
  switch (block.kind) {
    case 'paragraph':
      return inlineMarkdown(block.inlines, 'paragraph').split('\n').map(escapeLineStart).join('\n');
    case 'heading':
      return headingText(block.level, block.inlines);
    case 'code':
      return codeBlock(block.language, block.code);
    case 'quote': {
      const body = joinBlocks(block.children.map(renderBlock), false);
      // A lone `>` is how an empty quote is written, and it reads back as one.
      return body
        .split('\n')
        .map(line => (line ? `> ${line}` : '>'))
        .join('\n');
    }
    case 'list':
      return listText(block.ordered, block.start, block.tight, block.items);
    case 'table':
      return tableText(block.head, block.rows, block.align);
    case 'rule':
      return '---';
  }
}

/**
 * Blocks joined the way the parser will split them again.
 *
 * A blank line is the safe separator, and between two siblings at one level it is
 * always correct but for one case: a blank line followed by ANY list marker marks
 * the list before it loose, even when the marker starts a list of the other kind.
 * So a tight list that is followed by a list is joined by a single newline. Inside
 * a tight list item a single newline is wanted everywhere, and is used wherever
 * the parser would still end the first block there.
 */
function joinBlocks(parts: readonly (Rendered | null)[], tight: boolean): string {
  let out = '';
  let previous: Rendered | null = null;

  for (const part of parts) {
    if (!part) continue;
    if (previous) out += separator(previous, part, tight);
    out += part.text;
    previous = part;
  }

  return out;
}

function separator(previous: Rendered, next: Rendered, tight: boolean): string {
  const tightList = previous.block.kind === 'list' && !previous.text.includes('\n\n');
  if (tightList && next.block.kind === 'list') return '\n';

  return tight && endsBefore(previous, next) ? '\n' : '\n\n';
}

/**
 * Does `previous` end where `next` begins, with no blank line between them?
 *
 * Each case is the parser's own stopping rule, asked through its own predicates: a
 * paragraph runs until a line interrupts it, a quote swallows any line that does
 * not start a block (lazy continuation), a list swallows the same and continues on
 * a marker of its own kind, and a table runs while a line has a pipe. A heading, a
 * rule and a closed fence end themselves.
 */
function endsBefore(previous: Rendered, next: Rendered): boolean {
  const lines = next.text.split('\n');
  const first = lines[0];

  switch (previous.block.kind) {
    case 'paragraph': {
      // A last line holding a pipe, over a `---`, is a table header and its
      // delimiter row — which is the parser's answer before it asks anything else.
      const last = previous.text.slice(previous.text.lastIndexOf('\n') + 1);
      return (interruptsParagraph(first) || isTableStart(lines, 0)) && !isTableStart([last, first], 0);
    }
    case 'quote':
      return startsBlock(first) && !QUOTE_RE.test(first);
    case 'list': {
      const start = matchListStart(first);
      return startsBlock(first) && (!start || RULE_RE.test(first) || start.ordered !== previous.block.ordered);
    }
    case 'table':
      return !first.includes('|') || startsBlock(first);
    default:
      return true;
  }
}

function headingText(level: number, inlines: readonly WrMarkdownInline[]): string {
  const hashes = '#'.repeat(Math.min(Math.max(Math.trunc(level) || 1, 1), 6));
  // A `#` run at the end, after whitespace, is a closing sequence and the parser
  // strips it — `# Issue #` would come back as "Issue". `# C#` keeps its sharp.
  const text = inlineMarkdown(inlines, 'heading').replace(/(^|[ \t])(#*)#$/, '$1$2\\#');

  return text ? `${hashes} ${text}` : hashes;
}

function codeBlock(language: string | null, raw: string): string {
  const info = (language ?? '').trim().split(/\s+/)[0].toLowerCase();
  // A backtick fence absorbs an info string that starts with a backtick into its
  // own run, so that one info string takes a tilde fence instead.
  const char = info.startsWith('`') ? '~' : '`';
  const code = raw.replace(/\r\n?/g, '\n');
  // Longer than any run of the fence character anywhere in the code, so no line
  // of it can close the fence early.
  const longest = (code.match(char === '`' ? /`+/g : /~+/g) ?? []).reduce((max, run) => Math.max(max, run.length), 0);
  const fence = char.repeat(Math.max(3, longest + 1));

  return code ? `${fence}${info}\n${code}\n${fence}` : `${fence}${info}\n${fence}`;
}

function listText(ordered: boolean, start: number, tight: boolean, items: readonly WrMarkdownListItem[]): string {
  const first = Math.min(Math.max(Math.trunc(start) || 0, 0), MAX_ORDINAL);

  return items
    .map((item, index) => listItem(item, ordered ? `${Math.min(first + index, MAX_ORDINAL)}. ` : '- ', tight))
    .join(tight ? '\n' : '\n\n');
}

function listItem(item: WrMarkdownListItem, marker: string, tight: boolean): string {
  const task = item.checked === null ? '' : item.checked ? '[x] ' : '[ ] ';
  const bare = (marker + task).trimEnd();
  const body = joinBlocks(item.children.map(renderBlock), tight);

  if (!body) return bare;

  // Continuation lines sit at the item's content column, which for `- ` is 2 and
  // for `10. ` is 4 — the parser dedents by exactly the marker's width.
  const pad = ' '.repeat(marker.length);
  const lines = body.split('\n');
  const head = marker + task + lines[0];
  const indented = (rest: readonly string[]): string[] => rest.map(line => (line ? pad + line : line));

  // `- ---` is a thematic break, not an item holding one, so a first line that
  // would read that way moves under a bare marker.
  return RULE_RE.test(head) ? [bare, ...indented(lines)].join('\n') : [head, ...indented(lines.slice(1))].join('\n');
}

function tableText(
  head: readonly WrMarkdownCell[],
  rows: readonly (readonly WrMarkdownCell[])[],
  align: readonly WrMarkdownAlign[]
): string {
  const width = Math.min(head.length, MAX_TABLE_COLUMNS);
  if (!width) return '';

  const columns = Array.from({ length: width }, (_, index) => index);
  const row = (cells: readonly WrMarkdownCell[]): string =>
    `| ${columns.map(index => cellText(cells[index]?.inlines ?? [])).join(' | ')} |`;
  const delimiter = `| ${columns.map(index => DELIMITER_ROW[align[index] ?? 'none']).join(' | ')} |`;

  return [row(head), delimiter, ...rows.map(row)].join('\n');
}

/**
 * A cell's inline markdown with every pipe escaped — inside code spans, URLs and
 * titles too. The row is split on pipes BEFORE any inline parsing, and the split
 * turns `\|` into `|` and touches nothing else, so escaping every pipe is its
 * exact inverse.
 */
function cellText(inlines: readonly WrMarkdownInline[]): string {
  return inlineMarkdown(inlines, 'cell').replace(/\|/g, '\\|');
}

/**
 * A backslash before the first character of a line that would otherwise start a
 * block, or turn the line above it into a table header.
 *
 * Every such character is ASCII punctuation, which the parser unescapes, except
 * the digits of an ordered marker — there the delimiter is escaped instead,
 * `1986\.`. The test runs on the line as the parser will see it, with indent tabs
 * expanded, because the parser expands them before it looks.
 */
function escapeLineStart(line: string): string {
  const indent = /^[ \t]*/.exec(line)![0];
  const probe = indent.replace(/\t/g, '    ') + line.slice(indent.length);

  if (!startsBlock(probe) && !TABLE_DELIM_RE.test(probe)) return line;

  const ordinal = /^\d{1,9}(?=[.)])/.exec(line.slice(indent.length));
  const at = indent.length + (ordinal ? ordinal[0].length : 0);

  return `${line.slice(0, at)}\\${line.slice(at)}`;
}

// ---------------------------------------------------------------------------
// Inline
// ---------------------------------------------------------------------------

/** Where a run of inline content is written; only a paragraph can hold a line break. */
type InlineContext = 'paragraph' | 'heading' | 'cell';

interface LinkMark {
  readonly href: string;
  readonly title: string | null;
}

/**
 * The marks on one leaf — the shape an editor holds. Nesting is decided later, in
 * one canonical order, which is what makes two trees that paint the same text
 * serialize to the same string.
 */
interface Marks {
  readonly link: LinkMark | null;
  readonly strong: boolean;
  readonly del: boolean;
  readonly em: boolean;
}

type Leaf =
  | { readonly kind: 'text' | 'code'; readonly value: string; readonly marks: Marks }
  | {
      readonly kind: 'image';
      readonly src: string;
      readonly alt: string;
      readonly title: string | null;
      readonly marks: Marks;
    }
  | { readonly kind: 'break'; readonly marks: Marks };

type Emphasis = 'strong' | 'del' | 'em';

type Tree =
  | Leaf
  | {
      readonly kind: 'link';
      readonly link: LinkMark;
      /** The leaves it wraps, by index — what to unwrap if the label is too long. */
      readonly from: number;
      readonly to: number;
      readonly children: readonly Tree[];
    }
  | { readonly kind: Emphasis; readonly children: readonly Tree[] };

/** Outermost first. Emphasis never contains strong, which is the nesting `*x **y** z*` breaks on. */
const LEVELS = ['link', 'strong', 'del', 'em'] as const;
const EMPHASIS: readonly Emphasis[] = ['strong', 'del', 'em'];
const NO_MARKS: Marks = { link: null, strong: false, del: false, em: false };
/** The parser's own "word character" for `_` flanking. */
const WORD_CHAR = /[\p{L}\p{N}]/u;
/** A soft break and the indentation around it: whitespace once rendered. */
const SOFT_BREAK_RE = /\s*[\r\n]\s*/g;
/** What another renderer would decode as an entity; this one does not, so `\&` keeps it literal everywhere. */
const ENTITY_RE = /^&(?:#\d+|#x[\da-f]+|[a-z][a-z\d]*);/i;

function inlineMarkdown(nodes: readonly WrMarkdownInline[], context: InlineContext): string {
  let leaves = settle(flatten(nodes, NO_MARKS, context, []), context);

  // A link whose label is past the parser's cap is not a link on the way back.
  // Its leaves lose the mark and the run is laid out again, since unwrapping it
  // can put two emphasis runs next to each other.
  for (;;) {
    const state: RenderState = { tooLong: null };
    const out = renderNodes(group(leaves, 0, 0), state);
    if (!state.tooLong) return out;

    const [from, to] = state.tooLong;
    leaves = settle(
      leaves.map((leaf, index) =>
        index >= from && index < to ? { ...leaf, marks: { ...leaf.marks, link: null } } : leaf
      ),
      context
    );
  }
}

function flatten(nodes: readonly WrMarkdownInline[], marks: Marks, context: InlineContext, out: Leaf[]): Leaf[] {
  for (const node of nodes) {
    switch (node.kind) {
      case 'text':
        out.push({ kind: 'text', value: node.value.replace(SOFT_BREAK_RE, ' '), marks });
        break;
      case 'code':
        // The parser reads a newline inside a code span as a space.
        out.push({ kind: 'code', value: node.value.replace(/\r\n?|\n/g, ' '), marks });
        break;
      case 'break':
        out.push(context === 'paragraph' ? { kind: 'break', marks } : { kind: 'text', value: ' ', marks });
        break;
      case 'image': {
        const src = safeMarkdownUrl(node.src, 'image');
        const alt = node.alt.replace(SOFT_BREAK_RE, ' ');
        const inLabel = marks.link !== null;
        // A refused source renders its alt as text, so that is what is written.
        out.push(
          src
            ? {
                kind: 'image',
                src: encodeUrl(src, inLabel),
                alt,
                title: writableTitle(node.title, inLabel),
                marks: { ...NO_MARKS, link: marks.link },
              }
            : { kind: 'text', value: alt, marks }
        );
        break;
      }
      case 'link': {
        // No link inside a link, and no link the reader would refuse anyway. The
        // attributes are stored as they will be WRITTEN, so two links that differ
        // only in what cannot be written are one link here, as they will be on the
        // way back.
        const href = marks.link ? null : safeMarkdownUrl(node.href, 'link');
        const next = href
          ? { ...marks, link: { href: encodeUrl(href, false), title: writableTitle(node.title, false) } }
          : marks;
        flatten(node.children, next, context, out);
        break;
      }
      default:
        flatten(node.children, { ...marks, [node.kind]: true }, context, out);
    }
  }

  return out;
}

/**
 * The leaves in canonical form: merged, with whitespace outside emphasis, trimmed
 * at the block's edges, and no code span that would open a line as a fence.
 */
function settle(leaves: readonly Leaf[], context: InlineContext): Leaf[] {
  let current = leaves;

  // A code span turned into text can bring a space to the edge of a node, so the
  // pass runs again until nothing more is unfenced.
  for (;;) {
    const out = trimBlock(merge(moveEdgesOut(merge(current))));
    if (context !== 'paragraph') return out;

    const unfenced = unfence(out);
    if (unfenced.every((leaf, index) => leaf === out[index])) return out;
    current = unfenced;
  }
}

function sameLink(a: LinkMark | null, b: LinkMark | null): boolean {
  return a === b || (!!a && !!b && a.href === b.href && a.title === b.title);
}

function sameMarks(a: Marks, b: Marks): boolean {
  return a.strong === b.strong && a.del === b.del && a.em === b.em && sameLink(a.link, b.link);
}

/** Adjacent text (or code) with the same marks is one node; an empty one is none. */
function merge(leaves: readonly Leaf[]): Leaf[] {
  const out: Leaf[] = [];

  for (const leaf of leaves) {
    if ((leaf.kind === 'text' || leaf.kind === 'code') && !leaf.value) continue;

    const last = out[out.length - 1];
    if (
      last &&
      (last.kind === 'text' || last.kind === 'code') &&
      last.kind === leaf.kind &&
      sameMarks(last.marks, leaf.marks)
    ) {
      out[out.length - 1] = { ...last, value: last.value + leaf.value };
    } else {
      out.push(leaf);
    }
  }

  return out;
}

/**
 * Whitespace and hard breaks at the edge of an emphasis run lose that mark.
 *
 * The parser refuses an opener followed by whitespace and a closer preceded by it,
 * so `** bold **` is literal asterisks; the same text written `**bold**` with the
 * spaces outside is what was meant. A link keeps its edges — `[` and `]` have no
 * flanking rule.
 *
 * The unit is the NODE the mark will become, not the run of leaves carrying it:
 * the canonical nesting cuts a strong run wherever a link begins or ends, and an
 * emphasis run wherever strong or strikethrough changes, and each piece gets
 * delimiters of its own. Outer marks go first, so an inner node is measured
 * against leaves that are already final.
 */
function moveEdgesOut(leaves: readonly Leaf[]): Leaf[] {
  let out = [...leaves];

  for (const mark of EMPHASIS) {
    const outer = EMPHASIS.slice(0, EMPHASIS.indexOf(mark));
    const sameNode = (a: Leaf, b: Leaf): boolean =>
      b.marks[mark] && sameLink(a.marks.link, b.marks.link) && outer.every(name => a.marks[name] === b.marks[name]);
    const next: Leaf[] = [];
    let i = 0;

    while (i < out.length) {
      if (!out[i].marks[mark]) {
        next.push(out[i]);
        i++;
        continue;
      }

      let j = i;
      while (j < out.length && sameNode(out[i], out[j])) j++;
      next.push(...trimRun(out.slice(i, j), mark));
      i = j;
    }

    out = next;
  }

  return out;
}

function trimRun(run: readonly Leaf[], mark: Emphasis): Leaf[] {
  const body = [...run];
  const head: Leaf[] = [];
  const tail: Leaf[] = [];
  const unmark = <T extends Leaf>(leaf: T): T => ({ ...leaf, marks: { ...leaf.marks, [mark]: false } });

  while (body.length) {
    const leaf = body[0];
    if (leaf.kind === 'break') {
      head.push(unmark(leaf));
      body.shift();
      continue;
    }
    if (leaf.kind !== 'text') break;

    const space = /^\s*/.exec(leaf.value)![0];
    if (!space) break;
    head.push(unmark({ ...leaf, value: space }));
    if (space.length < leaf.value.length) {
      body[0] = { ...leaf, value: leaf.value.slice(space.length) };
      break;
    }
    body.shift();
  }

  while (body.length) {
    const leaf = body[body.length - 1];
    if (leaf.kind === 'break') {
      tail.unshift(unmark(leaf));
      body.pop();
      continue;
    }
    if (leaf.kind !== 'text') break;

    const space = /\s*$/.exec(leaf.value)![0];
    if (!space) break;
    tail.unshift(unmark({ ...leaf, value: space }));
    if (space.length < leaf.value.length) {
      body[body.length - 1] = { ...leaf, value: leaf.value.slice(0, -space.length) };
      break;
    }
    body.pop();
  }

  return [...head, ...body, ...tail];
}

/**
 * What the parser's trim would take anyway: leading whitespace, and trailing
 * whitespace and hard breaks (a `\` at the end of a block stays a literal
 * backslash). Content inside a link label is past its reach and stays.
 */
function trimBlock(leaves: readonly Leaf[]): Leaf[] {
  const out = [...leaves];
  let start = 0;
  let end = out.length;

  while (start < end) {
    const leaf = out[start];
    if (leaf.kind !== 'text' || leaf.marks.link) break;

    const value = leaf.value.replace(/^\s+/, '');
    if (value) {
      out[start] = { ...leaf, value };
      break;
    }
    start++;
  }

  while (end > start) {
    const leaf = out[end - 1];
    if (leaf.marks.link || (leaf.kind !== 'text' && leaf.kind !== 'break')) break;
    if (leaf.kind === 'break') {
      end--;
      continue;
    }

    const value = leaf.value.replace(/\s+$/, '');
    if (value) {
      out[end - 1] = { ...leaf, value };
      break;
    }
    end--;
  }

  return out.slice(start, end);
}

/**
 * A code span that opens a paragraph line and needs three or more backticks would
 * read back as a fence. Nothing can be put in front of it, so it keeps its text
 * and loses the code mark. It takes a value holding both a single and a double
 * backtick run to get here.
 */
function unfence(leaves: readonly Leaf[]): Leaf[] {
  const blank = (leaf: Leaf): boolean => leaf.kind === 'text' && !leaf.value.trim();

  return leaves.map((leaf, index) => {
    if (leaf.kind !== 'code' || ticks(leaf.value) < 3) return leaf;

    let k = index - 1;
    while (k >= 0 && blank(leaves[k])) {
      if (!sameMarks(leaves[k].marks, leaf.marks)) return leaf;
      k--;
    }

    const opensLine =
      k < 0 ? sameMarks(leaf.marks, NO_MARKS) : leaves[k].kind === 'break' && sameMarks(leaves[k].marks, leaf.marks);

    return opensLine ? { kind: 'text', value: leaf.value, marks: leaf.marks } : leaf;
  });
}

/**
 * Leaves to a tree, one mark level at a time in {@link LEVELS} order: a maximal
 * run sharing the mark becomes one node, and what is inside it is grouped by the
 * next level. Two leaves painted the same way always land in the same shape.
 */
function group(leaves: readonly Leaf[], level: number, offset: number): Tree[] {
  if (level === LEVELS.length) return [...leaves];

  const mark = LEVELS[level];
  const key = (leaf: Leaf): LinkMark | boolean | null => (mark === 'link' ? leaf.marks.link : leaf.marks[mark]);
  const same = (a: Leaf, b: Leaf): boolean =>
    mark === 'link' ? sameLink(a.marks.link, b.marks.link) : a.marks[mark] === b.marks[mark];
  const out: Tree[] = [];
  let i = 0;

  while (i < leaves.length) {
    let j = i + 1;
    while (j < leaves.length && same(leaves[i], leaves[j])) j++;

    const children = group(leaves.slice(i, j), level + 1, offset + i);
    const on = key(leaves[i]);
    if (!on) {
      out.push(...children);
    } else if (mark === 'link') {
      out.push({ kind: 'link', link: on as LinkMark, from: offset + i, to: offset + j, children });
    } else {
      out.push({ kind: mark, children });
    }
    i = j;
  }

  return out;
}

interface RenderState {
  /** Leaf range of the first link found with a label past the parser's cap. */
  tooLong: readonly [number, number] | null;
}

function renderNodes(nodes: readonly Tree[], state: RenderState): string {
  const [list, chars] = delimiters(nodes);
  let out = '';

  list.forEach((node, index) => {
    out += renderNode(node, chars[index], list[index + 1], state);
  });

  return out;
}

function renderNode(node: Tree, char: string | null, next: Tree | undefined, state: RenderState): string {
  switch (node.kind) {
    case 'text':
      return escapeText(node.value, next?.kind === 'link');
    case 'code':
      return codeSpan(node.value);
    case 'break':
      return '\\\n';
    case 'image':
      return `![${escapeText(node.alt, false)}](${destination(node.src, node.title)})`;
    case 'link': {
      const auto = autolink(node.link, node.children);
      if (auto) return auto;

      const label = renderNodes(node.children, state);
      if (label.length >= MAX_LABEL_LENGTH) {
        state.tooLong ??= [node.from, node.to];
        return label;
      }
      return `[${label}](${destination(node.link.href, node.link.title)})`;
    }
    case 'del':
      return `~~${renderNodes(node.children, state)}~~`;
    default: {
      const delimiter = node.kind === 'strong' ? char!.repeat(2) : char!;
      return delimiter + renderNodes(node.children, state) + delimiter;
    }
  }
}

/**
 * The delimiter character of every strong and emphasis node in a sibling list.
 *
 * `*` unless it would touch another `*` run: `*a***b**` reads as one run of three
 * and parses wrong. The canonical nesting means the only neighbours that can clash
 * are an emphasis and a strong, so one of them switches to `_` — the emphasis
 * first — where `_` flanking allows it: no letter or digit against it from
 * outside, and no `_` neighbour to clash with in turn. Where neither can switch,
 * the emphasis is dropped and the list is laid out again; its children are
 * leaves, so the drop cannot create a clash of its own.
 */
function delimiters(nodes: readonly Tree[]): [readonly Tree[], readonly (string | null)[]] {
  let list = nodes;

  for (;;) {
    const chars = list.map(node => (node.kind === 'strong' || node.kind === 'em' ? '*' : null));
    const drop = settleClashes(list, chars);
    if (drop < 0) return [list, chars];

    const dropped = list[drop] as { readonly children: readonly Tree[] };
    list = [...list.slice(0, drop), ...dropped.children, ...list.slice(drop + 1)];
  }
}

/** Index of an emphasis node to drop, or -1 once every clash is settled. */
function settleClashes(list: readonly Tree[], chars: (string | null)[]): number {
  for (let i = 0; i + 1 < list.length; i++) {
    if (!chars[i] || chars[i] !== chars[i + 1]) continue;

    const emFirst = list[i].kind === 'em';
    const switched = (emFirst ? [i, i + 1] : [i + 1, i]).find(k => canUnderscore(list, chars, k));
    if (switched === undefined) return emFirst ? i : i + 1;
    chars[switched] = '_';
  }

  return -1;
}

function canUnderscore(list: readonly Tree[], chars: readonly (string | null)[], k: number): boolean {
  const before = k > 0 ? edgeChar(list[k - 1], chars[k - 1], 'end') : '';
  const after = k + 1 < list.length ? edgeChar(list[k + 1], chars[k + 1], 'start') : '';

  return chars[k - 1] !== '_' && chars[k + 1] !== '_' && !WORD_CHAR.test(before) && !WORD_CHAR.test(after);
}

/**
 * The character a node puts next to its neighbour — only ever asked whether it is
 * a letter or a digit. Escaping inserts a backslash before punctuation and never
 * before a word character, so the raw text answers that question for text.
 */
function edgeChar(node: Tree, char: string | null, side: 'start' | 'end'): string {
  switch (node.kind) {
    case 'text':
      return side === 'start' ? node.value[0] : node.value[node.value.length - 1];
    case 'strong':
    case 'em':
      return char ?? '';
    default:
      return '';
  }
}

/**
 * Text with every character the parser would read as syntax escaped — and no
 * more, so prose stays prose. `snake_case` keeps its underscores, `2 * 3` its
 * star, `a < b` its bracket: in those positions the parser can never read them as
 * markup. The ends of the string are treated as the worst case, since whatever is
 * written next to it is not known here.
 */
function escapeText(value: string, beforeLink: boolean): string {
  let out = '';

  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (mustEscape(value, i, beforeLink)) out += '\\';
    out += char;
  }

  // A bare URL in plain text would come back as a link. The escaped colon is
  // invisible once parsed, and it stops `BARE_URL_RE` from matching.
  return out.replace(/(https?):(?=\/\/)/gi, '$1\\:');
}

function mustEscape(value: string, i: number, beforeLink: boolean): boolean {
  const prev = value[i - 1] as string | undefined;
  const next = value[i + 1] as string | undefined;
  const space = (c: string | undefined): boolean => c !== undefined && /\s/.test(c);
  const word = (c: string | undefined): boolean => c !== undefined && WORD_CHAR.test(c);

  switch (value[i]) {
    case '\\':
    case '`':
    case '[':
    case ']':
      return true;
    // Between two spaces a star can neither open (followed by whitespace) nor
    // close (preceded by it).
    case '*':
      return !(space(prev) && space(next));
    // Between two word characters an underscore is never a delimiter.
    case '_':
      return !(word(prev) && word(next));
    // Strikethrough needs a pair; a single tilde between other characters is text.
    case '~':
      return prev === undefined || prev === '~' || next === undefined || next === '~';
    // An autolink needs a scheme or an address right after the bracket.
    case '<':
      return !space(next);
    // `!` followed by a link's `[` would turn the link into an image.
    case '!':
      return beforeLink && next === undefined;
    case '&':
      return ENTITY_RE.test(value.slice(i));
    default:
      return false;
  }
}

/** The shortest backtick run that does not occur inside the value. */
function ticks(value: string): number {
  const runs = new Set((value.match(/`+/g) ?? []).map(run => run.length));
  let length = 1;
  while (runs.has(length)) length++;

  return length;
}

/**
 * A code span, padded where the parser would otherwise eat a character: it strips
 * one space from each end when both are present, and a backtick at either end
 * would merge into the fence.
 */
function codeSpan(value: string): string {
  const fence = '`'.repeat(ticks(value));
  const pad = codeSpanValue(value) !== value || value.startsWith('`') || value.endsWith('`');

  return pad ? `${fence} ${value} ${fence}` : `${fence}${value}${fence}`;
}

/** `<https://…>` or `<name@host>` when the label IS the address — the form the parser reads back identically. */
function autolink(link: LinkMark, children: readonly Tree[]): string | null {
  const only = children.length === 1 ? children[0] : null;
  if (link.title !== null || only?.kind !== 'text') return null;

  const whole = (re: RegExp, value: string): boolean => re.exec(`<${value}>`)?.[0].length === value.length + 2;

  if (only.value === link.href && whole(AUTOLINK_RE, link.href)) return `<${link.href}>`;
  if (`mailto:${only.value}` === link.href && whole(EMAIL_AUTOLINK_RE, only.value)) return `<${only.value}>`;

  return null;
}

/**
 * A URL as this parser will read it back, and as a browser resolves it.
 *
 * The destination scan counts parentheses and ends at a line break, so an angle
 * bracket and an unbalanced parenthesis are percent-encoded — to a browser the
 * same address. A tab or a line break is removed rather than encoded: the URL
 * parser strips them, so the address never had them, and `%0A` would be a
 * different one. A backslash is kept as it is — the parser keeps it, and in an
 * http(s) URL a browser reads it as `/`, which `%5C` is not — except where the
 * scan would take it for an escape and skip what follows: before a parenthesis,
 * and at the very end, where it would swallow the closing one. Inside a link label
 * the label scan also runs over an image's destination, so its brackets and
 * backticks are encoded too. Spaces are not encoded: {@link destination} carries
 * them in the `<…>` form.
 */
function encodeUrl(url: string, inLabel: boolean): string {
  const out = url
    .replace(/[\t\r\n]/g, '')
    .replace(/\\(?=[()]|$)/g, percent)
    .replace(inLabel ? /[<>[\]`]/g : /[<>]/g, percent);

  return balanced(out) ? out : out.replace(/[()]/g, percent);
}

function percent(char: string): string {
  return `%${char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`;
}

/** Parentheses the destination scan accepts: balanced, never closing early, and under its nesting cap. */
function balanced(url: string): boolean {
  let depth = 0;

  for (const char of url) {
    if (char === '(' && ++depth >= MAX_DESTINATION_NESTING) return false;
    if (char === ')' && --depth < 0) return false;
  }

  return depth === 0;
}

/**
 * The title as it can be written, or `null` when it cannot: a line break becomes a
 * space, and the destination scan runs through the title counting parentheses (a
 * backslash skipping the next character), so one that would close the scan early
 * or leave it open is dropped. Inside a link label the label scan runs through it
 * as well, so a bracket, a backtick or a backslash drops it there.
 */
function writableTitle(raw: string | null, inLabel: boolean): string | null {
  if (raw === null) return null;

  const title = raw.replace(SOFT_BREAK_RE, ' ');
  if (inLabel && /[[\]`\\]/.test(title)) return null;

  let depth = 1;
  for (let i = 0; i < title.length; i++) {
    const char = title[i];
    if (char === '\\') {
      i++;
      continue;
    }
    if (char === '(' && ++depth > MAX_DESTINATION_NESTING) return null;
    if (char === ')' && --depth === 0) return null;
  }

  return depth === 1 ? title : null;
}

/** An encoded URL and a writable title, inside the parentheses. */
function destination(url: string, title: string | null): string {
  const target = /\s/.test(url) ? `<${url}>` : url;

  return title === null ? target : `${target} "${title}"`;
}

export { serializeMarkdown };
