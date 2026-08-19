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
  WrMarkdownParseOptions,
} from './interfaces';

/**
 * Markdown to a node tree. No HTML anywhere in the pipeline.
 *
 * **Why a parser in a component library that has one runtime dependency.** The
 * alternative was `marked` or `markdown-it`, and both produce an HTML string —
 * which then has to reach the DOM through `[innerHTML]`, which means Angular's
 * sanitizer on the hot path of the one component whose input is untrusted by
 * definition, and `bypassSecurityTrustHtml` the moment syntax highlighting is
 * wanted. A node tree renders through ordinary Angular bindings instead: every
 * text node is a text node, every `href` goes through `SecurityContext.URL`, and
 * nothing is ever parsed as HTML. That is worth a parser.
 *
 * The second reason is streaming, which no general-purpose parser is built for.
 * See {@link WrMarkdownParseOptions.streaming}: an open fence has to render as a
 * code block, and a half-typed `**` must not flash on screen as literal
 * asterisks.
 *
 * **The subset, stated rather than discovered.** ATX headings, paragraphs,
 * fenced code, blockquotes, bullet / ordered / task lists (nested), GFM tables,
 * thematic breaks; inline code, strong, emphasis, strikethrough, links, images,
 * autolinks (bracketed and bare), hard breaks, backslash escapes.
 *
 * Deliberately absent, each for a reason:
 *
 * - **Raw HTML is escaped, never rendered.** A markdown renderer whose input is
 *   model output or user comments cannot pass `<img onerror>` through and call
 *   it a feature. `<div>` in equals `<div>` on screen, as text.
 * - **Indented (four-space) code blocks.** In a document that also has nested
 *   lists, indentation is structural, and the ambiguity resolves against the
 *   author roughly every time: a wrapped list continuation becomes a code block.
 *   Fences are unambiguous, and fences are what generators emit.
 * - **Setext headings** (`===` / `---` under a line). `---` is a thematic break
 *   here, always. The dual meaning is a well-known trap and the underline form
 *   is essentially unused in generated markdown.
 * - **Reference links, footnotes, definition lists.** They need a second pass
 *   over a document that, mid-stream, is not all there yet.
 *
 * Two known deviations, kept rather than fixed, because the cure looked worse than
 * the disease:
 *
 * - **A blank line inside a NESTED list marks the outer list loose too**, so
 *   `- a` / `  - b` / blank / `  - c` / `- d` double-spaces the outer items.
 *   CommonMark scopes looseness per list; telling the two apart needs to know
 *   which level a blank line belongs to, and the indentation alone does not say —
 *   content at the item's own indent can belong either to the item or to a
 *   sublist's sibling. The visible cost is spacing.
 * - **An unmatched `[` is not linear.** The scan is bounded per opener
 *   ({@link MAX_LABEL_LENGTH}) and short-circuits once the source is known to hold
 *   no `]` at all, which took `'['.repeat(100000)` from 8s to 0.2s — but a
 *   document that is mostly open brackets with a `]` somewhere still pays per
 *   opener. Real prose does not have that shape.
 *
 * @param source markdown text
 * @returns block nodes, ready to render
 */
function parseMarkdown(source: string, options: WrMarkdownParseOptions = {}): readonly WrMarkdownBlock[] {
  if (!source) return [];

  const ctx = newContext(options.streaming ?? false);
  const blocks = parseBlocks(normalize(source).split('\n'), 0, ctx);

  return ctx.streaming ? applyStreamingTail(blocks) : blocks;
}

/**
 * How deep a quote / list nest may go before the parser stops recursing.
 *
 * Not a taste limit: each level is a recursive call over its own slice of the
 * lines, so a pathological input (`> > > > …` a thousand deep, which is four
 * kilobytes of text) is a stack overflow inside a change-detection pass. Past
 * the cap the content renders as paragraphs — visible, harmless, and nothing a
 * real document reaches.
 */
const MAX_DEPTH = 12;

/**
 * How many columns of a table are rendered.
 *
 * The same class of protection as {@link MAX_DEPTH}, for the same reason, and it
 * was measured rather than guessed: every row is padded to the header's width, so
 * cells scale as columns × rows while the input scales as columns + rows. A 38 KB
 * document — a 10,001-pipe header and 2,000 short rows, which is what a truncated
 * table from a model looks like — produced **20 million cells** in 4.5 seconds,
 * inside a `computed` that re-runs on every streamed chunk. No real table is wider
 * than this; a wider one renders its first 128 columns.
 */
const MAX_TABLE_COLUMNS = 128;

/**
 * Threaded down the whole parse rather than applied afterwards.
 *
 * Streaming changes what an UNMATCHED marker means, and only the parser knows it
 * found one. A post-pass over the tree cannot tell `**bold**` from `**bold` —
 * both end up as text and marker characters — so the decision has to be made
 * where the closer was looked for and not found.
 */
interface ParseContext {
  readonly streaming: boolean;
  /**
   * Heading slugs already handed out, so a document with two `## Fixes` produces
   * two DIFFERENT ids. Duplicate ids are invalid, and `#fixes` would resolve to
   * whichever came first.
   */
  readonly slugs: Map<string, number>;
  /**
   * Per marker character, the earliest index from which a closer search has
   * already come up empty.
   *
   * This is what keeps the inline scanner linear. The closer search is monotone —
   * if no valid closer exists after index `i`, none exists after any index past
   * `i` either, since that window is a subset — so one failure answers every
   * later opener of the same character. Without it, `'*a '.repeat(34000)` is 10.8
   * SECONDS inside a `computed`, on the main thread.
   *
   * Scoped to ONE scan, not to the document: `inlines()` replaces this and
   * {@link ParseContext.noBracket} on entry, because the numbers index into the
   * string that call is walking and mean nothing in any other.
   */
  readonly noCloser: Map<string, number>;
  /** Same idea for `]`: the index from which the source contains none at all. */
  readonly noBracket: { from: number };
  /**
   * True while parsing a link's label. CommonMark forbids links inside links, and
   * a tree built with DOM APIs happily nests the `<a>` an HTML parser would have
   * rejected — which is invalid markup and an axe `nested-interactive` violation.
   */
  readonly inLink: boolean;
}

function newContext(streaming: boolean): ParseContext {
  return {
    streaming,
    slugs: new Map(),
    noCloser: new Map(),
    noBracket: { from: Number.POSITIVE_INFINITY },
    inLink: false,
  };
}

const FENCE_RE = /^( {0,3})(`{3,}|~{3,})[ \t]*(.*)$/;
// The closing `#` run must be PRECEDED by whitespace, or `# C#` loses its sharp
// and `#######` (seven, not a heading in any dialect) matches as an empty h6.
const HEADING_RE = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const RULE_RE = /^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/;
const QUOTE_RE = /^ {0,3}>[ \t]?(.*)$/;
const LIST_RE = /^( *)([-*+]|\d{1,9}[.)])(?:([ \t]+)(.*)|[ \t]*)$/;
const TASK_RE = /^\[([ xX])\](?:[ \t]+(.*)|[ \t]*)$/;
const TABLE_DELIM_RE = /^ {0,3}\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;

/**
 * `\r\n` and lone `\r` out; tabs in the INDENT to four spaces, so indent maths is
 * in one unit.
 *
 * The whole leading whitespace run, not just a line-initial tab: `'  \t- b'` is
 * two spaces and a tab, and `parseList` measures indentation in characters, so a
 * tab counted as one column made mixed indentation parse as literal text.
 */
function normalize(source: string): string {
  return source.replace(/\r\n?/g, '\n').replace(/^[ \t]+/gm, indent => indent.replace(/\t/g, '    '));
}

/** Does this line begin a block that interrupts a paragraph or a list item? */
function startsBlock(line: string): boolean {
  return (
    FENCE_RE.test(line) || HEADING_RE.test(line) || RULE_RE.test(line) || QUOTE_RE.test(line) || LIST_RE.test(line)
  );
}

/**
 * Does this line end the paragraph it follows?
 *
 * Every block start does, except the two lists CommonMark says cannot interrupt
 * one: an ordered item whose number is not 1, and an item with no content. The
 * first rule exists for a single shape, and it is a shape prose actually has —
 * "The year was" / "1986. It was a good year." must not become a list numbered
 * from 1986.
 */
function interruptsParagraph(line: string): boolean {
  const list = matchListStart(line);
  if (list && !RULE_RE.test(line)) {
    return list.content.trim() !== '' && (!list.ordered || list.number === 1);
  }

  return startsBlock(line);
}

interface ListStart {
  readonly indent: number;
  readonly ordered: boolean;
  readonly number: number;
  readonly content: string;
  /** Column the item's own content starts at — the dedent for everything inside it. */
  readonly contentIndent: number;
}

function matchListStart(line: string): ListStart | null {
  const match = LIST_RE.exec(line);
  if (!match) return null;

  const [, indent, marker, spaces, content] = match;
  const ordered = !/^[-*+]$/.test(marker);

  return {
    indent: indent.length,
    ordered,
    number: ordered ? Number.parseInt(marker, 10) : 1,
    content: content ?? '',
    // An empty item (`-` alone) has no run of spaces to measure, so assume one.
    contentIndent: indent.length + marker.length + (spaces?.length ?? 1),
  };
}

function parseBlocks(lines: readonly string[], depth: number, ctx: ParseContext): readonly WrMarkdownBlock[] {
  if (depth >= MAX_DEPTH) {
    const text = lines.join('\n').trim();
    return text ? [{ kind: 'paragraph', inlines: inlines(text, 0, ctx) }] : [];
  }

  const out: WrMarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    const fence = FENCE_RE.exec(line);
    if (fence) {
      const [, indent, marker, info] = fence;
      const body: string[] = [];
      const closer = new RegExp(`^ {0,3}\\${marker[0]}{${marker.length},}[ \\t]*$`);
      let closed = false;
      i++;

      while (i < lines.length) {
        if (closer.test(lines[i])) {
          closed = true;
          i++;
          break;
        }
        // The opening fence's own indentation is not part of the code.
        body.push(stripIndent(lines[i], indent.length));
        i++;
      }

      out.push({
        kind: 'code',
        language: info.trim().split(/\s+/)[0].toLowerCase() || null,
        code: body.join('\n'),
        closed,
      });
      continue;
    }

    const heading = HEADING_RE.exec(line);
    if (heading) {
      const text = (heading[2] ?? '').trim();
      const content = inlines(text, 0, ctx);
      out.push({
        kind: 'heading',
        level: heading[1].length as 1 | 2 | 3 | 4 | 5 | 6,
        inlines: content,
        // Slugged from the rendered TEXT, not from the markdown: `## See [docs](url)`
        // was producing `see-docshttpsxdeva`, an anchor nobody can link to.
        id: uniqueSlug(plainText(content), ctx),
      });
      i++;
      continue;
    }

    if (RULE_RE.test(line)) {
      out.push({ kind: 'rule' });
      i++;
      continue;
    }

    if (QUOTE_RE.test(line)) {
      const body: string[] = [];
      while (i < lines.length) {
        const quoted = QUOTE_RE.exec(lines[i]);
        if (quoted) {
          body.push(quoted[1]);
          i++;
          continue;
        }
        // Lazy continuation: an unmarked, non-blank line still belongs to the
        // quote unless it starts a block of its own.
        if (!lines[i].trim() || startsBlock(lines[i])) break;
        body.push(lines[i].trimStart());
        i++;
      }
      out.push({ kind: 'quote', children: parseBlocks(body, depth + 1, ctx) });
      continue;
    }

    if (matchListStart(line)) {
      const [list, next] = parseList(lines, i, depth, ctx);
      out.push(list);
      i = next;
      continue;
    }

    if (isTableStart(lines, i)) {
      const [table, next] = parseTable(lines, i, ctx);
      out.push(table);
      i = next;
      continue;
    }

    const paragraph: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !interruptsParagraph(lines[i])) {
      // A delimiter row two lines in turns the paragraph into a table header.
      if (isTableStart(lines, i)) break;
      paragraph.push(lines[i]);
      i++;
    }
    out.push({ kind: 'paragraph', inlines: inlines(paragraph.join('\n').trim(), 0, ctx) });
  }

  return out;
}

/**
 * A table header, or a sentence that happens to contain a pipe.
 *
 * GFM's own rule, and the one this used to be missing: "the header row must match
 * the delimiter row in the number of cells. If not, a table will not be
 * recognized." Without the count check, `Use the | character` followed by `---`
 * became a two-column table with an empty body — swallowing both the sentence and
 * the thematic break, and contradicting this file's own decision that `---` is
 * always a rule.
 */
function isTableStart(lines: readonly string[], at: number): boolean {
  const header = lines[at];
  const delimiter = lines[at + 1];

  if (!header?.includes('|') || delimiter === undefined || !TABLE_DELIM_RE.test(delimiter)) return false;

  return splitRow(header).length === splitRow(delimiter).length;
}

/** Remove up to `width` leading spaces — never more, so relative indent survives. */
function stripIndent(line: string, width: number): string {
  let cut = 0;
  while (cut < width && line[cut] === ' ') cut++;
  return line.slice(cut);
}

function parseList(
  lines: readonly string[],
  from: number,
  depth: number,
  ctx: ParseContext
): [WrMarkdownBlock, number] {
  const first = matchListStart(lines[from])!;
  const items: WrMarkdownListItem[] = [];
  let loose = false;
  let i = from;

  while (i < lines.length) {
    // A thematic break wins over a list item, which is CommonMark's rule and not
    // a nicety: `* * *` matches the bullet pattern, so without this `* a`,
    // `* * *`, `* b` is one list with a phantom nesting level where the divider
    // was, and the `<hr>` is gone.
    if (RULE_RE.test(lines[i])) break;

    const start = matchListStart(lines[i]);
    // A different marker family starts a NEW list rather than continuing this
    // one — `- a` then `1. b` is two lists, and rendering it as one silently
    // renumbers the author's content.
    if (start?.ordered !== first.ordered || start.indent > first.indent + 3) break;

    const body: string[] = [start.content];
    let blanks = 0;
    i++;

    while (i < lines.length) {
      const line = lines[i];

      if (!line.trim()) {
        blanks++;
        i++;
        continue;
      }

      const indent = line.length - line.trimStart().length;
      if (indent >= start.contentIndent) {
        // A blank line followed by more of the same item makes the list loose,
        // which is what decides whether items get `<p>` wrappers.
        if (blanks > 0) {
          body.push(...Array<string>(blanks).fill(''));
          loose = true;
          blanks = 0;
        }
        body.push(stripIndent(line, start.contentIndent));
        i++;
        continue;
      }

      // Out-dented: a sibling item, another block, or lazy continuation of this
      // item's paragraph. After a blank line only a sibling can follow.
      if (blanks > 0 || matchListStart(line) || startsBlock(line)) break;
      body.push(line.trimStart());
      i++;
    }

    const nextIsSibling = i < lines.length && matchListStart(lines[i]) !== null;
    if (blanks > 0 && nextIsSibling) loose = true;

    items.push(makeItem(body, depth, ctx));

    if (blanks > 0 && !nextIsSibling) break;
  }

  return [{ kind: 'list', ordered: first.ordered, start: first.number, tight: !loose, items }, i];
}

function makeItem(body: readonly string[], depth: number, ctx: ParseContext): WrMarkdownListItem {
  const task = TASK_RE.exec(body[0] ?? '');
  const lines = task ? [task[2] ?? '', ...body.slice(1)] : body;

  return {
    children: parseBlocks(lines, depth + 1, ctx),
    checked: task ? task[1].toLowerCase() === 'x' : null,
  };
}

function parseTable(lines: readonly string[], from: number, ctx: ParseContext): [WrMarkdownBlock, number] {
  const head = splitRow(lines[from]).slice(0, MAX_TABLE_COLUMNS);
  const align = splitRow(lines[from + 1]).map((spec): WrMarkdownAlign => {
    const left = spec.startsWith(':');
    const right = spec.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'end';
    if (left) return 'start';
    return null;
  });

  const rows: WrMarkdownCell[][] = [];
  let i = from + 2;

  while (i < lines.length) {
    const line = lines[i];
    // GFM ends a table at a blank line, a line that starts another block, or
    // anything without a cell divider.
    if (!line.trim() || !line.includes('|') || startsBlock(line)) break;
    rows.push(normalizeCells(splitRow(line), head.length, ctx));
    i++;
  }

  return [
    {
      kind: 'table',
      head: head.map(cell => ({ inlines: inlines(cell, 0, ctx) })),
      rows,
      align: normalizeAlign(align, head.length),
    },
    i,
  ];
}

/** Split on unescaped pipes, dropping the optional leading and trailing one. */
function splitRow(line: string): string[] {
  const cells: string[] = [];
  let current = '';

  for (let i = 0; i < line.length; i++) {
    if (line[i] === '\\' && line[i + 1] === '|') {
      current += '|';
      i++;
      continue;
    }
    if (line[i] === '|') {
      cells.push(current);
      current = '';
      continue;
    }
    current += line[i];
  }
  cells.push(current);

  if (cells.length > 1 && !cells[0].trim()) cells.shift();
  if (cells.length > 1 && !cells[cells.length - 1].trim()) cells.pop();

  return cells.map(cell => cell.trim());
}

/** A row shorter than the header gets empty cells; a longer one is truncated. */
function normalizeCells(cells: readonly string[], width: number, ctx: ParseContext): WrMarkdownCell[] {
  return Array.from({ length: width }, (_, index) => ({ inlines: inlines(cells[index] ?? '', 0, ctx) }));
}

function normalizeAlign(align: readonly WrMarkdownAlign[], width: number): WrMarkdownAlign[] {
  return Array.from({ length: width }, (_, index) => align[index] ?? null);
}

/**
 * GitHub-compatible heading slug: lowercase, punctuation dropped, spaces to dashes.
 *
 * `_` and `-` are KEPT, which is what GitHub does — stripping the underscore broke
 * every published `#snake_case` anchor.
 */
function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

/**
 * The slug, with a counter when the document repeats a title.
 *
 * Two `## Fixes` in one changelog produced two `id="fixes"`, which is invalid and
 * makes `#fixes` resolve to whichever came first. GitHub appends `-1`, `-2`; so
 * does this. An empty slug (a heading of pure emoji, or no text at all) stays
 * empty and the renderer binds no `id`.
 */
function uniqueSlug(text: string, ctx: ParseContext): string {
  const base = slug(text);
  if (!base) return '';

  const used = ctx.slugs.get(base) ?? 0;
  ctx.slugs.set(base, used + 1);

  return used === 0 ? base : `${base}-${used}`;
}

// ---------------------------------------------------------------------------
// Inline
// ---------------------------------------------------------------------------

// Every ASCII punctuation character, which is what CommonMark allows. The
// hand-written subset left `\$`, `\&`, `\%` and eight others rendering with their
// backslash — and `\$` is what generators emit to keep a dollar out of math mode.
const ESCAPABLE = /[!-/:-@[-`{-~]/;
const SCHEME_RE = /^([a-z][a-z0-9+.-]*):/i;
const ALLOWED_SCHEMES = new Set(['http', 'https', 'mailto', 'tel', 'ftp']);
const DATA_IMAGE_RE = /^data:image\/(?:png|jpe?g|gif|webp|avif);base64,[a-z0-9+/=]+$/i;
const AUTOLINK_RE = /^<((?:https?|mailto|tel):[^>\s]+)>/i;
/** `<destination>` — markdown's way of putting a space in a URL. */
const ANGLE_DEST_RE = /^<([^<>]*)>(?:\s+["'(](.*)["')])?$/;
/** CommonMark's own cap on a link label, which is also what bounds the scan. */
const MAX_LABEL_LENGTH = 999;
const BARE_URL_RE = /^https?:\/\/[^\s<>[\]()]*(?:\([^\s<>()]*\)[^\s<>[\]()]*)*/i;
const EMAIL_AUTOLINK_RE = /^<([^\s@<>]+@[^\s@<>.]+\.[^\s@<>]+)>/;

/**
 * A URL safe to put in `href` / `src`, or `null` to render the link as plain text.
 *
 * Two layers, and both are wanted. Angular sanitizes `[href]` bindings itself,
 * but its answer to a hostile URL is the string `unsafe:javascript:…` in a live
 * anchor — a link that looks real, is announced as a link, and does nothing.
 * Refusing it here means the label renders as text instead, which is honest.
 *
 * Whitespace and control characters are stripped before the scheme is read,
 * because `java\nscript:` and `java script:` are the same URL to a browser and
 * different strings to a naive check.
 */
function safeMarkdownUrl(raw: string, kind: 'link' | 'image'): string | null {
  const url = raw.trim();
  // Whitespace and control characters only: a hyphen has no business being
  // stripped out of a host name. Written as escapes rather than literal bytes —
  // a raw NUL inside a regex literal makes the file binary to every text tool.
  // Stripping control characters is the entire point here: a browser ignores them
  // before resolving the scheme, so a check that reads the raw string sees a
  // relative path and waves `java\u0000script:` straight through.
  // eslint-disable-next-line no-control-regex
  const bare = url.replace(/[\s\u0000-\u001f\u007f]/g, '');
  const scheme = SCHEME_RE.exec(bare);

  // No scheme at all: relative path, `#anchor`, `//host` — nothing executable.
  if (!scheme) return url;

  const name = scheme[1].toLowerCase();

  // `data:` is an image-only allowance, and only for raster types: an SVG can
  // carry script, and `data:text/html` is a same-origin document.
  if (name === 'data') return kind === 'image' && DATA_IMAGE_RE.test(bare) ? bare : null;

  return ALLOWED_SCHEMES.has(name) ? url : null;
}

/** Inline markdown to nodes. */
function parseInlines(source: string, options: WrMarkdownParseOptions = {}): readonly WrMarkdownInline[] {
  return inlines(source, 0, newContext(options.streaming ?? false));
}

function inlines(source: string, depth: number, outer: ParseContext): readonly WrMarkdownInline[] {
  if (depth >= MAX_DEPTH) return source ? [{ kind: 'text', value: source }] : [];

  // The two failure memos hold INDEXES into `source`, so they are only ever true
  // of the one string this call is scanning — and the context they live on spans
  // the whole document. Shared, an index recorded in one paragraph is compared
  // against a position in the next, and refuses emphasis and links that are
  // perfectly well formed; `matchEmphasis` recursing on a slice (below) does the
  // same thing INSIDE a single paragraph, so restoring on return would not be
  // enough either. A memo per scan is the only keying that means anything, and it
  // costs nothing: the linearity argument in {@link ParseContext.noCloser} is a
  // statement about one string in the first place.
  const ctx: ParseContext = { ...outer, noCloser: new Map(), noBracket: { from: Number.POSITIVE_INFINITY } };

  const out: WrMarkdownInline[] = [];
  let text = '';
  let i = 0;

  const flush = (): void => {
    if (text) {
      out.push({ kind: 'text', value: text });
      text = '';
    }
  };

  while (i < source.length) {
    const char = source[i];

    if (char === '\\') {
      // A backslash before a newline is a hard break; before punctuation, an escape.
      if (source[i + 1] === '\n') {
        flush();
        out.push({ kind: 'break' });
        i += 2;
        continue;
      }
      if (i + 1 < source.length && ESCAPABLE.test(source[i + 1])) {
        text += source[i + 1];
        i += 2;
        continue;
      }
    }

    if (char === '\n') {
      // Two trailing spaces are markdown's hard break. `endsWith`, not
      // `/[ ]{2,}$/.test(text)`: that regex has no start anchor, so it retries
      // from every position of the accumulated paragraph, which made paragraph
      // parsing quadratic. On a 161 KB document a CPU profile put 3306 ms of 3378
      // ms of total self-time in that one test — and it is re-paid on every
      // streamed chunk.
      const hard = text.endsWith('  ');
      if (hard) {
        text = text.replace(/[ ]+$/, '');
        flush();
        out.push({ kind: 'break' });
      } else {
        // A soft break is whitespace; CSS collapses it like any other.
        text += '\n';
      }
      i++;
      continue;
    }

    if (char === '`') {
      const run = /^`+/.exec(source.slice(i))![0];
      const close = findCodeClose(source, i + run.length, run);
      if (close !== -1) {
        flush();
        out.push({ kind: 'code', value: codeSpanValue(source.slice(i + run.length, close)) });
        i = close + run.length;
        continue;
      }
    }

    if (char === '<') {
      const auto = AUTOLINK_RE.exec(source.slice(i));
      if (auto) {
        // `ctx.inLink`: CommonMark forbids a link inside a link, and nothing else
        // stops it here — a tree built with DOM APIs nests the `<a>` an HTML
        // parser would have thrown away, which is invalid markup and an axe
        // `nested-interactive` violation at serious level.
        const href = ctx.inLink ? null : safeMarkdownUrl(auto[1], 'link');
        flush();
        out.push(
          href
            ? { kind: 'link', href, title: null, children: [{ kind: 'text', value: auto[1] }] }
            : { kind: 'text', value: auto[1] }
        );
        i += auto[0].length;
        continue;
      }
      const email = EMAIL_AUTOLINK_RE.exec(source.slice(i));
      if (email) {
        // Through `safeMarkdownUrl` like every other href: built by hand, this was
        // the one destination that skipped the control-character strip, which the
        // component's own JSDoc promises for all of them.
        const href = ctx.inLink ? null : safeMarkdownUrl(`mailto:${email[1]}`, 'link');
        flush();
        out.push(
          href
            ? { kind: 'link', href, title: null, children: [{ kind: 'text', value: email[1] }] }
            : { kind: 'text', value: email[1] }
        );
        i += email[0].length;
        continue;
      }
    }

    if (char === '!' && source[i + 1] === '[') {
      const link = matchLink(source, i + 1, ctx);
      if (link) {
        const src = safeMarkdownUrl(link.href, 'image');
        const alt = plainText(inlines(link.label, depth + 1, { ...ctx, inLink: true }));
        flush();
        // A refused source leaves the alt text, which is the information the
        // author actually wrote.
        out.push(src ? { kind: 'image', src, alt, title: link.title } : { kind: 'text', value: alt });
        i = link.end;
        continue;
      }
    }

    if (char === '[') {
      const link = matchLink(source, i, ctx);
      if (link) {
        const href = ctx.inLink ? null : safeMarkdownUrl(link.href, 'link');
        // The label is parsed with links SUPPRESSED, so an inner one renders as
        // its own text — CommonMark's answer to `[a [b](c)](d)`.
        const children = inlines(link.label, depth + 1, { ...ctx, inLink: true });
        flush();
        if (href) out.push({ kind: 'link', href, title: link.title, children });
        else out.push(...children);
        i = link.end;
        continue;
      }
    }

    if ((char === 'h' || char === 'H') && (i === 0 || !/[\w/]/.test(source[i - 1]))) {
      const bare = ctx.inLink ? null : BARE_URL_RE.exec(source.slice(i));
      if (bare) {
        const url = trimUrlPunctuation(bare[0]);
        const href = safeMarkdownUrl(url, 'link');
        if (href) {
          flush();
          out.push({ kind: 'link', href, title: null, children: [{ kind: 'text', value: url }] });
          i += url.length;
          continue;
        }
      }
    }

    if (char === '*' || char === '_' || char === '~') {
      const emphasis = matchEmphasis(source, i, depth, ctx);
      if (emphasis) {
        flush();
        out.push(emphasis.node);
        i = emphasis.end;
        continue;
      }
    }

    text += char;
    i++;
  }

  flush();

  return out;
}

/** The closing backtick run of exactly the opener's length — a longer run is not it. */
function findCodeClose(source: string, from: number, run: string): number {
  for (let i = from; i < source.length; i++) {
    if (source[i] !== '`') continue;

    let end = i;
    while (source[end] === '`') end++;
    if (end - i === run.length) return i;
    i = end - 1;
  }

  return -1;
}

/** CommonMark strips one space from each end when both are present. */
function codeSpanValue(raw: string): string {
  const value = raw.replace(/\n/g, ' ');
  return value.length > 2 && value.startsWith(' ') && value.endsWith(' ') && value.trim() ? value.slice(1, -1) : value;
}

interface LinkMatch {
  readonly label: string;
  readonly href: string;
  readonly title: string | null;
  /** Index just past the closing paren. */
  readonly end: number;
}

/**
 * `[label](href "title")` starting at `source[at] === '['`.
 *
 * Two bounds, both load-bearing. The label scan stops at
 * {@link MAX_LABEL_LENGTH}, which is CommonMark's own limit, and a scan that
 * reaches the end of the source without meeting a single `]` records the fact in
 * the context — from then on every later `[` answers in constant time. Without
 * that, `'['.repeat(100000)` spent 8 seconds on the main thread, inside a
 * `computed`.
 */
function matchLink(source: string, at: number, ctx: ParseContext): LinkMatch | null {
  if (at >= ctx.noBracket.from) return null;

  let depth = 0;
  let close = -1;
  let sawClose = false;
  let scannedToEnd = true;

  for (let i = at; i < source.length; i++) {
    if (i - at > MAX_LABEL_LENGTH) {
      scannedToEnd = false;
      break;
    }
    const char = source[i];
    if (char === '\\') {
      i++;
      continue;
    }
    // A code span can hold an unbalanced bracket; stepping over it keeps
    // `` [`a]b`](x) `` from ending the label early.
    if (char === '`') {
      const run = /^`+/.exec(source.slice(i))![0];
      const end = findCodeClose(source, i + run.length, run);
      if (end !== -1) {
        i = end + run.length - 1;
        continue;
      }
    }
    if (char === '[') depth++;
    if (char === ']') {
      sawClose = true;
      depth--;
      if (depth === 0) {
        close = i;
        break;
      }
    }
  }

  if (close === -1) {
    // Only when the source truly holds no `]` past here: an unbalanced nest
    // (`[[a](b)`) fails for a different reason, and memoising that would hide the
    // valid link one character to the right.
    if (!sawClose && scannedToEnd) ctx.noBracket.from = Math.min(ctx.noBracket.from, at);
    return null;
  }

  if (source[close + 1] !== '(') return null;

  let parens = 1;
  let end = -1;
  for (let i = close + 2; i < source.length; i++) {
    const char = source[i];
    if (char === '\\') {
      i++;
      continue;
    }
    if (char === '(') parens++;
    if (char === ')') {
      parens--;
      if (parens === 0) {
        end = i;
        break;
      }
    }
    // A newline inside the destination means this was never a link.
    if (char === '\n') return null;
  }

  if (end === -1) return null;

  const target = source.slice(close + 2, end).trim();
  const label = source.slice(at + 1, close);

  // `<…>` around the destination is markdown's way of allowing a space in it, and
  // it has to be unwrapped BEFORE the scheme is read: `[a](<javascript:alert(1)>)`
  // has no scheme while the bracket is still attached, so `safeMarkdownUrl` read
  // it as a relative path and waved it through — leaving Angular's sanitizer, the
  // layer this file calls insufficient, as the only thing standing in the way.
  const angled = ANGLE_DEST_RE.exec(target);
  if (angled) return { label, href: angled[1], title: angled[2] ?? null, end: end + 1 };

  const titled = /^(\S*)\s+["'(](.*)["')]$/.exec(target);

  return {
    label,
    href: titled ? titled[1] : target,
    title: titled ? titled[2] : null,
    end: end + 1,
  };
}

/** Trailing sentence punctuation belongs to the prose, not to the bare URL. */
function trimUrlPunctuation(url: string): string {
  return url.replace(/[.,;:!?'"]+$/, '');
}

interface EmphasisMatch {
  readonly node: WrMarkdownInline;
  readonly end: number;
}

/**
 * Emphasis, strong and strikethrough.
 *
 * A pragmatic reading of CommonMark's flanking rules rather than the full
 * algorithm: an opener may not be followed by whitespace, a closer may not be
 * preceded by it, and `_` additionally may not sit against a word character on
 * the outside. That last clause is the one that matters in practice — without it
 * `snake_case_name` renders as `snake<em>case</em>name`, which is how most
 * lightweight parsers embarrass themselves on code-adjacent prose.
 */
function matchEmphasis(source: string, at: number, depth: number, ctx: ParseContext): EmphasisMatch | null {
  const char = source[at];
  const run = /^(\*+|_+|~+)/.exec(source.slice(at))![0].length;

  // `~` is strikethrough only as a pair: a single one is arithmetic, a path, or
  // LaTeX far more often than it is emphasis.
  if (char === '~' && run < 2) return null;

  const use = char === '~' ? 2 : Math.min(run, 2);
  const after = source[at + run];
  if (after === undefined || /\s/.test(after)) return null;
  if (char === '_' && at > 0 && /[\p{L}\p{N}]/u.test(source[at - 1])) return null;

  // Already known to have no closer from here on. The search is monotone — the
  // window for a later opener is a subset of this one — so one failure answers
  // every subsequent opener of the same character, which is what turns a
  // quadratic scan into a linear one.
  const failedFrom = ctx.noCloser.get(char);
  if (failedFrom !== undefined && at >= failedFrom) return null;

  for (let i = at + run; i < source.length; i++) {
    const current = source[i];

    if (current === '\\') {
      i++;
      continue;
    }

    if (current === '`') {
      const backticks = /^`+/.exec(source.slice(i))![0];
      const end = findCodeClose(source, i + backticks.length, backticks);
      if (end !== -1) {
        i = end + backticks.length - 1;
        continue;
      }
    }

    if (current !== char) continue;

    let end = i;
    while (source[end] === char) end++;
    const length = end - i;

    if (length < use || /\s/.test(source[i - 1])) {
      i = end - 1;
      continue;
    }
    if (char === '_' && end < source.length && /[\p{L}\p{N}]/u.test(source[end])) {
      i = end - 1;
      continue;
    }

    // Take `use` markers from the START of the opener and the END of the closer,
    // so `***x***` leaves `*x*` inside the strong node and nests correctly.
    const children = inlines(source.slice(at + use, end - use), depth + 1, ctx);
    const kind = char === '~' ? 'del' : use === 2 ? 'strong' : 'em';

    return { node: { kind, children }, end };
  }

  // No closer anywhere in this source. Recorded so the next opener of the same
  // character does not repeat the walk.
  //
  // Note what does NOT happen here any more: an optimistic close. Guessing at the
  // scanner level meant a marker 40 characters back swallowed the rest of the
  // block — including markup that had already parsed, so an unclosed backtick ate
  // a finished `[docs](url)` and rendered it as monospaced source. Mid-stream
  // guessing now happens once, on the document's tail, where it can be bounded.
  // See {@link applyStreamingTail}.
  ctx.noCloser.set(char, Math.min(failedFrom ?? Number.POSITIVE_INFINITY, at));

  return null;
}

/** Text content of an inline tree — for `alt` and for heading slugs. */
function plainText(inlines: readonly WrMarkdownInline[]): string {
  return inlines
    .map(node => {
      switch (node.kind) {
        case 'text':
        case 'code':
          return node.value;
        case 'image':
          return node.alt;
        case 'break':
          return ' ';
        default:
          return plainText(node.children);
      }
    })
    .join('');
}

// ---------------------------------------------------------------------------
// Streaming
// ---------------------------------------------------------------------------

/**
 * How far back from the end of the document a marker may sit and still be treated
 * as mid-flight.
 *
 * The optimistic close is a GUESS, and a guess needs a blast radius. Unbounded, a
 * `*` forty characters back turned the rest of a finished sentence into emphasis
 * for the whole stream and then unwrapped it at the end — the exact restyle the
 * feature exists to avoid. Within a chunk's distance of the end, an unmatched
 * marker is nearly always a construct still arriving.
 */
const TAIL_WINDOW = 80;

/**
 * A run that is worth closing optimistically, and its node kind.
 *
 * Deliberately no single `*` or `_`. Those are multiplication signs, file names
 * and `snake_case` far more often than they are emphasis mid-word, and getting it
 * wrong there restyles ordinary prose. `**`, `__`, `~~` and a backtick are
 * unambiguous enough to bet on.
 */
const OPTIMISTIC_RE = /(\*\*|__|~~|`)([^\s*_~`][^*_~`]*)$/;

/**
 * A construct the stream has only begun to type: a trailing marker run, or a link
 * whose destination has not arrived.
 *
 * Anchored, and every alternative bounded. The version this replaced allowed
 * `\][^)]*` to run to the end of the text, so a CLOSED `[docs]` in the middle of a
 * sentence matched from the bracket onwards and deleted the rest of the paragraph
 * — and kept deleting it for the whole stream, because the paragraph stayed the
 * last block. `See the [docs] for details.` rendered as `See the `.
 */
const FRAGMENT_RE = /(?:[*_~`]+|!?\[[^\]\n]*(?:\]\([^)\s]*)?)$/;

/**
 * The mid-stream adjustments, applied once to the document's TAIL.
 *
 * Everything the streaming mode does beyond parsing an open fence lives here, and
 * the reason is scope. The tail is the only part of a streamed document that is
 * still changing, so it is the only part where guessing is defensible; a guess
 * made inside the inline scanner cannot tell whether it is at the end of the
 * document or in the middle of a paragraph that finished two chunks ago.
 *
 * It descends: the last block may be a quote, or the last item of a list, which is
 * where most streamed prose actually lives. The version that only looked at a
 * top-level paragraph left the `**` flicker in place everywhere else while the
 * documentation claimed otherwise.
 */
function applyStreamingTail(blocks: readonly WrMarkdownBlock[]): readonly WrMarkdownBlock[] {
  const last = blocks[blocks.length - 1];
  if (!last) return blocks;

  const patched = patchBlock(last);
  if (patched === last) return blocks;

  const head = blocks.slice(0, -1);

  return patched === null ? head : [...head, patched];
}

/** `null` to drop the block entirely, the same reference to leave it alone. */
function patchBlock(block: WrMarkdownBlock): WrMarkdownBlock | null {
  switch (block.kind) {
    case 'paragraph':
    case 'heading': {
      // `## ` with nothing after it yet: a node that would render as an empty box.
      if (block.inlines.length === 0) return null;

      const inlines = patchInlines(block.inlines);
      if (inlines === block.inlines) return block;

      return inlines.length === 0 ? null : { ...block, inlines };
    }

    case 'quote': {
      const children = applyStreamingTail(block.children);
      if (children === block.children) return block;

      return children.length === 0 ? null : { ...block, children };
    }

    case 'list': {
      const item = block.items[block.items.length - 1];
      if (!item) return block;

      const children = applyStreamingTail(item.children);
      if (children === item.children) return block;

      // The item stays even when its content goes: the bullet is already on
      // screen, and removing it would be a flicker of its own.
      return { ...block, items: [...block.items.slice(0, -1), { ...item, children }] };
    }

    default:
      return block;
  }
}

function patchInlines(nodes: readonly WrMarkdownInline[]): readonly WrMarkdownInline[] {
  const last = nodes[nodes.length - 1];
  if (!last) return nodes;

  // The tail may be inside a wrapper — `**bold and [lin` puts it inside the strong.
  if (last.kind === 'strong' || last.kind === 'em' || last.kind === 'del' || last.kind === 'link') {
    const children = patchInlines(last.children);
    if (children === last.children) return nodes;

    const head = nodes.slice(0, -1);

    return children.length === 0 ? head : [...head, { ...last, children }];
  }

  // A backtick that has only just arrived, already painted as an empty chip.
  if (last.kind === 'code' && last.value === '') return nodes.slice(0, -1);

  if (last.kind !== 'text') return nodes;

  const patched = patchText(last.value);

  return patched === null ? nodes : [...nodes.slice(0, -1), ...patched];
}

/** `null` when the text is not a tail that needs adjusting. */
function patchText(value: string): readonly WrMarkdownInline[] | null {
  let text = value;

  // Repeatedly, because dropping `[lin` from `**bold and [lin` exposes the `**`
  // behind it, which is then a candidate for the optimistic close below.
  for (let pass = 0; pass < 3; pass++) {
    const shorter = text.replace(FRAGMENT_RE, '');
    if (shorter === text) break;
    text = shorter;
  }

  const opening = OPTIMISTIC_RE.exec(text);
  if (opening) {
    const [matched, marker, content] = opening;
    const at = text.length - matched.length;
    const before = text.slice(0, at);
    // `_` may not close against a word character, so mid-word it is not a marker
    // at all — `snake_case` must not italicise as it arrives.
    const wordBefore = marker === '__' && at > 0 && /[\p{L}\p{N}]/u.test(text[at - 1]);

    if (!wordBefore && content.length <= TAIL_WINDOW) {
      const node: WrMarkdownInline =
        marker === '`'
          ? { kind: 'code', value: content }
          : { kind: marker === '~~' ? 'del' : 'strong', children: [{ kind: 'text', value: content }] };

      return before ? [{ kind: 'text', value: before }, node] : [node];
    }
  }

  if (text === value) return null;

  return text ? [{ kind: 'text', value: text }] : [];
}

export { parseInlines, parseMarkdown, plainText, safeMarkdownUrl };
