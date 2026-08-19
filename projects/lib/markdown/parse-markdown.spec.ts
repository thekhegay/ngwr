/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { describe, expect, it } from 'vitest';

import type { WrMarkdownBlock, WrMarkdownInline } from './interfaces';
import { parseInlines, parseMarkdown, plainText, safeMarkdownUrl } from './parse-markdown';

/**
 * The parser's own spec. Everything here is pure — no TestBed, no DOM — which is
 * why it can afford to be this thorough: a markdown parser is a pile of edge
 * cases, and the edge cases are the product.
 *
 * Two things this file is deliberately opinionated about.
 *
 * It asserts the SUBSET, including its holes. Raw HTML staying text, `---` never
 * being a setext underline, four-space indentation not making a code block — each
 * is a decision documented in `parseMarkdown`, and a decision nobody wrote a test
 * for is indistinguishable from a bug that has not been noticed yet.
 *
 * And it treats URL handling as security rather than formatting. A renderer whose
 * input is model output or user comments is an XSS sink by default; the cases at
 * the bottom are the ones that would matter if this were wrong.
 */

/** First child block of a quote, or of a list's first item. */
const firstChild = (block: WrMarkdownBlock | undefined): WrMarkdownBlock | undefined => {
  if (block?.kind === 'quote') return block.children[0];
  if (block?.kind === 'list') return block.items[0]?.children[0];
  return undefined;
};

/** Inlines of whichever block kind carries them. `in` narrows; a cast argues. */
const inlinesOf = (block: WrMarkdownBlock | undefined): readonly WrMarkdownInline[] =>
  block && 'inlines' in block ? block.inlines : [];

/** The single block a source is expected to produce. */
const one = (source: string, options?: { streaming: boolean }): WrMarkdownBlock => {
  const blocks = parseMarkdown(source, options);
  expect(blocks).toHaveLength(1);
  return blocks[0];
};

const FENCE = '~~~';
const TICK = String.fromCharCode(96);

describe('parseMarkdown — blocks', () => {
  it('reads an ATX heading with its level and a linkable slug', () => {
    const block = one('## Getting *started* now');

    expect(block).toMatchObject({ kind: 'heading', level: 2, id: 'getting-started-now' });
    // The slug is built from the TEXT, so emphasis markers do not leak into an id
    // that ends up in a URL.
    expect(block.kind === 'heading' && plainText(block.inlines)).toBe('Getting started now');
  });

  it('gives every heading level its own node, up to six', () => {
    const levels = parseMarkdown('# a\n## b\n### c\n#### d\n##### e\n###### f').map(b =>
      b.kind === 'heading' ? b.level : null
    );

    expect(levels).toEqual([1, 2, 3, 4, 5, 6]);
    // Seven hashes is not a heading in any dialect; it is a paragraph.
    expect(one('####### g').kind).toBe('paragraph');
  });

  it('joins wrapped lines into one paragraph and splits on a blank line', () => {
    const blocks = parseMarkdown('one\ntwo\n\nthree');

    expect(blocks).toHaveLength(2);
    expect(blocks[0].kind === 'paragraph' && plainText(blocks[0].inlines)).toBe('one\ntwo');
  });

  it('renders an unterminated fence as code, which is the whole point mid-stream', () => {
    const block = one(`${FENCE}ts\nconst a = 1;`);

    // `closed: false` is the signal a consumer needs to hold back affordances —
    // a copy button on half a snippet is worse than none.
    expect(block).toEqual({ kind: 'code', language: 'ts', code: 'const a = 1;', closed: false });
  });

  it('closes a fence only on a run at least as long as the opener', () => {
    const source = [FENCE + FENCE, 'a', FENCE, 'b', FENCE + FENCE].join('\n');

    // The short run in the middle is content, not a closer — otherwise a snippet
    // that itself contains a fence gets cut in half.
    expect(one(source)).toEqual({ kind: 'code', language: null, code: `a\n${FENCE}\nb`, closed: true });
  });

  it('takes the first word of the info string as the language, lowercased', () => {
    expect(one(`${FENCE}TS title="x"\na\n${FENCE}`)).toMatchObject({ language: 'ts' });
    expect(one(`${FENCE}\na\n${FENCE}`)).toMatchObject({ language: null });
  });

  it('strips the opening fence indentation from the code, and no more', () => {
    const block = one(`  ${FENCE}\n  a\n    b\n  ${FENCE}`);

    // Two spaces come off every line because the fence had two; the deeper
    // indentation of `b` is the author's and survives.
    expect(block).toMatchObject({ code: 'a\n  b' });
  });

  it('treats a rule as a rule, never as a setext underline', () => {
    const blocks = parseMarkdown('Title\n---');

    // The dual meaning of `---` is a documented trap. Here it is always a
    // thematic break, so a heading is never conjured out of a divider.
    expect(blocks.map(b => b.kind)).toEqual(['paragraph', 'rule']);
  });

  it('reads a blockquote, including a block nested inside it', () => {
    const block = one('> intro\n> - a\n> - b');

    expect(block.kind).toBe('quote');
    expect(block.kind === 'quote' && block.children.map(c => c.kind)).toEqual(['paragraph', 'list']);
  });

  it('keeps a lazy continuation line inside the quote it belongs to', () => {
    const block = one('> first\nsecond');

    // Markdown lets a wrapped quote line drop its `>`. Ending the quote there
    // would split one sentence across two blocks.
    expect(plainText(inlinesOf(block.kind === 'quote' ? block.children[0] : undefined))).toBe('first\nsecond');
  });

  it('does not swallow a block that interrupts a quote', () => {
    expect(parseMarkdown('> quoted\n# heading').map(b => b.kind)).toEqual(['quote', 'heading']);
  });

  it('stops recursing at a depth no real document reaches', () => {
    // 40 levels of nesting is four kilobytes of `> `, and unbounded recursion
    // inside change detection is a blank page rather than a slow one.
    const blocks = parseMarkdown(`${'> '.repeat(40)}deep`);

    expect(blocks).toHaveLength(1);
    expect(plainText(parseInlines(JSON.stringify(blocks)))).toContain('deep');
  });
});

describe('parseMarkdown — lists', () => {
  it('marks a list tight when no blank line separates its items', () => {
    const block = one('- a\n- b');

    // Tight is what stops a two-line list from rendering double-spaced: the
    // renderer drops the item paragraphs.
    expect(block).toMatchObject({ kind: 'list', ordered: false, tight: true });
    expect(block.kind === 'list' && block.items).toHaveLength(2);
  });

  it('marks a list loose when a blank line separates its items', () => {
    expect(one('- a\n\n- b')).toMatchObject({ tight: false });
  });

  it('keeps an ordered list on its own numbering', () => {
    const block = one('3. c\n4. d');

    // `start` is the author's first number. Resetting it to 1 renumbers content
    // that was continuing a sequence.
    expect(block).toMatchObject({ kind: 'list', ordered: true, start: 3 });
  });

  it('starts a new list when the marker family changes', () => {
    // One list would renumber the bullet, or bullet the number. Two is the honest
    // reading, and it is what CommonMark says.
    expect(parseMarkdown('- a\n1. b').map(b => b.kind === 'list' && b.ordered)).toEqual([false, true]);
  });

  it('nests a list by indentation, inside the item it belongs to', () => {
    const block = one('- a\n  - b\n- c');

    expect(block.kind === 'list' && block.items).toHaveLength(2);
    expect(block.kind === 'list' && block.items[0].children.map(c => c.kind)).toEqual(['paragraph', 'list']);
  });

  it('reads task items and leaves ordinary items alone', () => {
    const block = one('- [x] done\n- [ ] todo\n- plain');
    const items = block.kind === 'list' ? block.items : [];

    // `null` rather than `false` for a plain item: the renderer draws a checkbox
    // for `false` and nothing for `null`, so conflating them checkboxes the world.
    expect(items.map(i => i.checked)).toEqual([true, false, null]);
    expect(plainText(inlinesOf(items[0].children[0]))).toBe('done');
  });

  it('keeps an indented continuation line with its item', () => {
    const block = one('- first line\n  second line\n- next');

    const items = block.kind === 'list' ? block.items : [];
    expect(items).toHaveLength(2);
    expect(plainText(inlinesOf(items[0]?.children[0]))).toBe('first line\nsecond line');
  });

  it('ends the list at an unindented line that is not an item', () => {
    expect(parseMarkdown('- a\n\nafter').map(b => b.kind)).toEqual(['list', 'paragraph']);
  });

  it('reads an empty item without inventing content for it', () => {
    const block = one('- \n- b');

    expect(block.kind === 'list' && block.items).toHaveLength(2);
    expect(block.kind === 'list' && block.items[0].children).toEqual([]);
  });
});

describe('parseMarkdown — tables', () => {
  it('reads a GFM table with its alignment row', () => {
    const block = one('| a | b | c |\n| :-- | :-: | --: |\n| 1 | 2 | 3 |');

    expect(block.kind).toBe('table');
    // Logical values, so the rendered `text-align` mirrors under RTL for free.
    expect(block.kind === 'table' && block.align).toEqual(['start', 'center', 'end']);
    expect(block.kind === 'table' && block.rows).toHaveLength(1);
  });

  it('leaves alignment null where the delimiter row said nothing', () => {
    expect(one('| a |\n| --- |\n| 1 |')).toMatchObject({ align: [null] });
  });

  it('pads a short row and truncates a long one to the header width', () => {
    const block = one('| a | b |\n| - | - |\n| 1 |\n| 1 | 2 | 3 |');
    const rows = block.kind === 'table' ? block.rows : [];

    // A ragged table is a broken `<tr>` otherwise, and a broken row is an axe
    // violation rather than a cosmetic one.
    expect(rows.map(r => r.length)).toEqual([2, 2]);
    expect(plainText(rows[0][1].inlines)).toBe('');
  });

  it('respects an escaped pipe inside a cell', () => {
    const block = one('| a | b |\n| - | - |\n| x \\| y | 2 |');

    const rows = block.kind === 'table' ? block.rows : [];
    expect(plainText(rows[0][0].inlines)).toBe('x | y');
  });

  it('ends the table at a blank line', () => {
    expect(parseMarkdown('| a |\n| - |\n| 1 |\n\nafter').map(b => b.kind)).toEqual(['table', 'paragraph']);
  });

  it('turns a paragraph into a table when the delimiter row arrives', () => {
    // The header is indistinguishable from prose until the next line is read, so
    // this is the case a line-at-a-time reader gets wrong.
    expect(parseMarkdown('intro\n\n| a |\n| - |\n| 1 |').map(b => b.kind)).toEqual(['paragraph', 'table']);
  });
});

describe('parseInlines', () => {
  it('reads strong, emphasis and strikethrough', () => {
    expect(parseInlines('**a** *b* ~~c~~').map(n => n.kind)).toEqual(['strong', 'text', 'em', 'text', 'del']);
  });

  it('nests emphasis inside strong for a triple marker', () => {
    const node = parseInlines('***both***')[0];

    // `use` markers come off the start of the opener and the end of the closer,
    // which is what leaves `*both*` inside to be parsed again.
    expect(node).toMatchObject({ kind: 'strong' });
    expect(node.kind === 'strong' && node.children[0].kind).toBe('em');
  });

  it('leaves an underscore inside a word alone', () => {
    // The clause most lightweight parsers skip, and the one that turns
    // `snake_case_name` into `snake<em>case</em>name` in code-adjacent prose.
    expect(parseInlines('snake_case_name')).toEqual([{ kind: 'text', value: 'snake_case_name' }]);
  });

  it('needs a non-space after the opener and before the closer', () => {
    expect(parseInlines('2 * 3 * 4')).toEqual([{ kind: 'text', value: '2 * 3 * 4' }]);
  });

  it('treats a lone tilde as text, not as strikethrough', () => {
    // Single `~` is arithmetic, a home directory or LaTeX far more often than it
    // is emphasis.
    expect(parseInlines('~1 and 1~2')).toEqual([{ kind: 'text', value: '~1 and 1~2' }]);
  });

  it('reads a code span and keeps its contents literal', () => {
    const nodes = parseInlines(`use ${TICK}a **b** |${TICK} here`);

    // Nothing inside a code span is markup — the point of a code span.
    expect(nodes[1]).toEqual({ kind: 'code', value: 'a **b** |' });
  });

  it('lets a longer backtick run hold a backtick', () => {
    expect(parseInlines(`${TICK + TICK}a ${TICK} b${TICK}${TICK}`)[0]).toEqual({
      kind: 'code',
      value: `a ${TICK} b`,
    });
  });

  it('drops one space from each end of a code span, as CommonMark says', () => {
    expect(parseInlines(`${TICK} a ${TICK}`)[0]).toEqual({ kind: 'code', value: 'a' });
    // Not when that would empty it: a span of spaces is a span of spaces.
    expect(parseInlines(`${TICK}  ${TICK}`)[0]).toEqual({ kind: 'code', value: '  ' });
  });

  it('reads a link with its title, and an image with its alt text', () => {
    expect(parseInlines('[x](https://a.b "t")')[0]).toEqual({
      kind: 'link',
      href: 'https://a.b',
      title: 't',
      children: [{ kind: 'text', value: 'x' }],
    });
    expect(parseInlines('![face](/a.png)')[0]).toEqual({
      kind: 'image',
      src: '/a.png',
      alt: 'face',
      title: null,
    });
  });

  it('handles balanced parens inside a destination', () => {
    expect(parseInlines('[w](https://x/a_(b))')[0]).toMatchObject({ href: 'https://x/a_(b)' });
  });

  it('reads a bracketed autolink and an email one', () => {
    expect(parseInlines('<https://a.b/c>')[0]).toMatchObject({ kind: 'link', href: 'https://a.b/c' });
    expect(parseInlines('<a@b.co>')[0]).toMatchObject({ kind: 'link', href: 'mailto:a@b.co' });
  });

  it('links a bare URL without eating the sentence around it', () => {
    const nodes = parseInlines('see https://ngwr.dev/x. done');

    // The full stop belongs to the prose. A URL that swallows it 404s.
    expect(nodes[1]).toMatchObject({ kind: 'link', href: 'https://ngwr.dev/x' });
    expect(nodes[2]).toEqual({ kind: 'text', value: '. done' });
  });

  it('reads a hard break from two trailing spaces or a backslash', () => {
    expect(parseInlines('a  \nb').map(n => n.kind)).toEqual(['text', 'break', 'text']);
    expect(parseInlines('a\\\nb').map(n => n.kind)).toEqual(['text', 'break', 'text']);
    // A single newline is a soft break — whitespace, which CSS collapses.
    expect(parseInlines('a\nb')).toEqual([{ kind: 'text', value: 'a\nb' }]);
  });

  it('honours a backslash escape', () => {
    expect(parseInlines('\\*not em\\*')).toEqual([{ kind: 'text', value: '*not em*' }]);
  });
});

describe('parseMarkdown — the subset, including its holes', () => {
  it('escapes raw HTML instead of rendering it', () => {
    const block = one('<img src=x onerror="alert(1)">');

    // The single most important line in this file. The input is untrusted by
    // construction, and this is what makes `[innerHTML]` unnecessary downstream.
    expect(block.kind).toBe('paragraph');
    expect(block.kind === 'paragraph' && plainText(block.inlines)).toBe('<img src=x onerror="alert(1)">');
  });

  it('does not turn four-space indentation into a code block', () => {
    // Documented omission: indentation is structural in a document that also has
    // nested lists, and the ambiguity resolves against the author nearly every
    // time. Fences are unambiguous.
    expect(one('    not code').kind).toBe('paragraph');
  });
});

describe('parseMarkdown — streaming', () => {
  it('renders a half-typed bold in its final style rather than as asterisks', () => {
    const block = one('bold **partial', { streaming: true });

    // Optimistic close. The alternative shows `**` on screen and then restyles
    // the word one chunk later — two visible changes instead of none.
    expect(block.kind === 'paragraph' && block.inlines[1]).toMatchObject({ kind: 'strong' });
  });

  it('does the same for a half-typed code span', () => {
    expect(one(`run ${TICK}npm ins`, { streaming: true })).toMatchObject({
      kind: 'paragraph',
      inlines: [
        { kind: 'text', value: 'run ' },
        { kind: 'code', value: 'npm ins' },
      ],
    });
  });

  it('withholds a marker that has nothing after it yet', () => {
    // Nothing to style, so the markers are simply dropped — a run of asterisks is
    // punctuation the author never wrote.
    expect(one('bold **', { streaming: true })).toMatchObject({
      kind: 'paragraph',
      inlines: [{ kind: 'text', value: 'bold ' }],
    });
  });

  it('withholds a link that is still being typed', () => {
    expect(one('see [label](htt', { streaming: true })).toMatchObject({
      inlines: [{ kind: 'text', value: 'see ' }],
    });
  });

  it('drops a heading with no text yet instead of rendering an empty one', () => {
    expect(parseMarkdown('text\n\n## ', { streaming: true }).map(b => b.kind)).toEqual(['paragraph']);
  });

  it('leaves finished markup exactly as the static parse does', () => {
    const source = `# t\n\na **b** and ${TICK}c${TICK}\n\n- x\n- y`;

    // The property that makes streaming safe to leave on: at the end of a stream
    // the tree must equal the tree of the same text parsed normally, or the
    // document rearranges itself the moment the request completes.
    expect(parseMarkdown(source, { streaming: true })).toEqual(parseMarkdown(source));
  });

  it('does not close an unmatched marker when streaming is off', () => {
    // The static reading is the literal one, which is what a finished document
    // deserves.
    expect(one('a *part')).toMatchObject({ inlines: [{ kind: 'text', value: 'a *part' }] });
  });
});

describe('safeMarkdownUrl', () => {
  it('allows the schemes a document legitimately links to', () => {
    for (const url of ['https://a.b', 'http://a.b', 'mailto:a@b.co', 'tel:+123', 'ftp://a.b']) {
      expect(safeMarkdownUrl(url, 'link')).toBe(url);
    }
  });

  it('allows relative destinations, which have no scheme to check', () => {
    for (const url of ['/a/b', './a', '#anchor', '?q=1', '//cdn.example/a.png']) {
      expect(safeMarkdownUrl(url, 'link')).toBe(url);
    }
  });

  it('refuses a script URL', () => {
    expect(safeMarkdownUrl('javascript:alert(1)', 'link')).toBeNull();
    expect(safeMarkdownUrl('JaVaScRiPt:alert(1)', 'link')).toBeNull();
    expect(safeMarkdownUrl('vbscript:msgbox', 'link')).toBeNull();
  });

  it('refuses a script URL hidden behind whitespace or a control character', () => {
    // A browser strips these before resolving the scheme, so a check that reads
    // the raw string sees a relative path and waves it through.
    expect(safeMarkdownUrl('java\tscript:alert(1)', 'link')).toBeNull();
    expect(safeMarkdownUrl('java\nscript:alert(1)', 'link')).toBeNull();
    expect(safeMarkdownUrl(' javascript:alert(1)', 'link')).toBeNull();
  });

  it('keeps hyphens in a host name', () => {
    // The character class doing the stripping is easy to get wrong in a way that
    // silently rewrites real URLs rather than failing loudly.
    expect(safeMarkdownUrl('https://my-site.co.uk/a-b', 'link')).toBe('https://my-site.co.uk/a-b');
  });

  it('allows a raster data image and refuses everything else data can carry', () => {
    const png = 'data:image/png;base64,iVBORw0KGgo=';

    expect(safeMarkdownUrl(png, 'image')).toBe(png);
    // SVG can carry script, `text/html` is a document, and neither belongs in an
    // image a stranger wrote. A data URL is never a link destination.
    expect(safeMarkdownUrl('data:image/svg+xml;base64,PHN2Zz4=', 'image')).toBeNull();
    expect(safeMarkdownUrl('data:text/html;base64,PHNjcmlwdD4=', 'image')).toBeNull();
    expect(safeMarkdownUrl(png, 'link')).toBeNull();
  });

  it('renders a refused link as its own text, not as a dead anchor', () => {
    // Angular would sanitize the href to `unsafe:javascript:…` and leave a live
    // anchor that announces as a link and does nothing. Text is the honest answer.
    expect(parseInlines('[click me](javascript:alert(1))')).toEqual([{ kind: 'text', value: 'click me' }]);
    expect(parseInlines('![alt text](data:text/html;base64,x)')).toEqual([{ kind: 'text', value: 'alt text' }]);
  });
});

/**
 * Every case in this block guards a defect that shipped in the first draft of the
 * parser and was found by reading it adversarially rather than by any gate. They
 * are grouped deliberately: each is cheap to reintroduce, and the comment is the
 * only thing that explains why the line it guards is written the way it is.
 */
describe('parseMarkdown — regressions', () => {
  it('lets a thematic break outrank a list item', () => {
    // CommonMark's own example. `* * *` matches the bullet pattern, so a list that
    // does not check for a rule first swallows the divider, invents two nesting
    // levels and an empty item, and renders no `<hr>` at all.
    expect(parseMarkdown('* a\n* * *\n* b').map(b => b.kind)).toEqual(['list', 'rule', 'list']);
    expect(parseMarkdown('- a\n- - -\n- b').map(b => b.kind)).toEqual(['list', 'rule', 'list']);
  });

  it('does not turn a sentence containing a pipe into a table', () => {
    // GFM: "the header row must match the delimiter row in the number of cells. If
    // not, a table will not be recognized." Without the count check this sentence
    // became two table headers with an empty body and the rule vanished — which
    // also contradicted this file's decision that `---` is always a rule.
    expect(parseMarkdown('Use the | character\n---').map(b => b.kind)).toEqual(['paragraph', 'rule']);
  });

  it('refuses a table whose delimiter row is a different width', () => {
    expect(parseMarkdown('| a | b |\n| --- |\n| 1 | 2 |').every(b => b.kind !== 'table')).toBe(true);
  });

  it('caps how wide a table can get', () => {
    // Every row is padded to the header's width, so cells scale as columns × rows
    // while the input scales as columns + rows. A 38 KB document — a 10,001-pipe
    // header and 2,000 short rows, which is what a truncated table from a model
    // looks like — produced 20 MILLION cells in 4.5s, inside a `computed` that
    // re-runs on every streamed chunk.
    const wide = `|${' a |'.repeat(400)}\n|${' - |'.repeat(400)}\n|${' 1 |'.repeat(400)}`;
    const table = one(wide);

    expect(table.kind === 'table' && table.head.length).toBe(128);
    expect(table.kind === 'table' && table.rows[0].length).toBe(128);
  });

  it('never nests a link inside a link', () => {
    // CommonMark forbids it "at any level of nesting", and nothing else here would
    // stop it: a tree built with DOM APIs happily nests the `<a>` an HTML parser
    // would have discarded. Nested interactive elements are an axe violation at
    // serious level, which is the severity `check:a11y` fails the build on.
    const nodes = parseInlines('[https://example.com](https://example.com)');

    expect(nodes).toHaveLength(1);
    expect(nodes[0].kind === 'link' && nodes[0].children.every(child => child.kind === 'text')).toBe(true);
    // An inner link renders as its own text, which is CommonMark's answer.
    expect(plainText(parseInlines('[a [b](c) d](e)'))).toBe('a b d');
  });

  it('slugs a heading from its text, not from its markdown', () => {
    // `plainText` existed for exactly this and was only wired to `alt`, so any
    // heading containing a link produced an anchor nobody could link to.
    expect(one('## See [docs](https://x.dev/a)')).toMatchObject({ id: 'see-docs' });
    // `_` is kept, as GitHub keeps it — stripping it broke every published
    // `#snake_case` anchor.
    expect(one('# snake_case_name')).toMatchObject({ id: 'snake_case_name' });
    // A heading that slugs to nothing gets an empty id, which the renderer then
    // declines to bind at all.
    expect(one('# !!!')).toMatchObject({ id: '' });
  });

  it('numbers a repeated slug', () => {
    const ids = parseMarkdown('# Setup\n\n# Setup\n\n# Setup').map(b => (b.kind === 'heading' ? b.id : null));

    // Duplicate ids are invalid, and `#setup` would resolve to whichever came
    // first. Changelogs repeat section names constantly.
    expect(ids).toEqual(['setup', 'setup-1', 'setup-2']);
  });

  it('keeps a trailing sharp that belongs to the heading', () => {
    // CommonMark: the optional closing run of `#` "must be preceded by spaces or
    // tabs". Without that clause `# C#` renders as `C`.
    expect(plainText(inlinesOf(one('# C#')))).toBe('C#');
    expect(plainText(inlinesOf(one('# heading ###')))).toBe('heading');
  });

  it('treats a bare run of seven hashes as a paragraph', () => {
    // The rule is stated further up this file but only tested with text after the
    // hashes, so the no-text case slipped through as an empty `<h6>`.
    expect(one('#######').kind).toBe('paragraph');
  });

  it('lets an ordered list interrupt a paragraph only when it starts at 1', () => {
    // The rule exists for exactly one shape, and prose has that shape.
    expect(parseMarkdown('The year was\n1986. It was a good year.').map(b => b.kind)).toEqual(['paragraph']);
    expect(parseMarkdown('Steps below\n1. first').map(b => b.kind)).toEqual(['paragraph', 'list']);
    // An empty item cannot interrupt one either.
    expect(parseMarkdown('text\n- ').map(b => b.kind)).toEqual(['paragraph']);
  });

  it('escapes every ASCII punctuation character', () => {
    // The hand-written subset left eleven of them rendering with their backslash,
    // and \$ is what generators emit to keep a dollar sign out of math mode.
    expect(parseInlines('\\$100 \\& \\% \\@ \\^')).toEqual([{ kind: 'text', value: '$100 & % @ ^' }]);
  });

  it('unwraps an angle-bracket destination before checking its scheme', () => {
    // The bracket hid the scheme, so this read as a relative path and went
    // through — leaving Angular's sanitizer, which this file documents as
    // insufficient, as the only thing standing in the way.
    expect(parseInlines('[a](<javascript:alert(1)>)')).toEqual([{ kind: 'text', value: 'a' }]);
    // And the form exists for a reason: a destination with a space in it.
    expect(parseInlines('[docs](<https://ex.com/a b>)')[0]).toMatchObject({ href: 'https://ex.com/a b' });
  });

  it('routes an email autolink through the same URL check as every other href', () => {
    // Built by hand, this was the one destination that skipped the
    // control-character strip the component's JSDoc promises for all of them.
    expect(parseInlines('<ab@y.z>')[0]).toMatchObject({ href: 'mailto:ab@y.z' });
  });

  it('reads an indent of spaces followed by a tab', () => {
    // `normalize` claimed to unify tab indentation but rewrote only a line-initial
    // tab, so a nested bullet indented with a mix rendered as literal text.
    const nested = parseMarkdown('- a\n  \t- b');

    expect(nested).toHaveLength(1);
    expect(JSON.stringify(nested).split('"list"')).toHaveLength(3);
  });

  it('scans a hostile document in linear time', () => {
    // Three separate quadratic paths lived here: the closer search restarted for
    // every unmatched marker, `matchLink` rescanned to the end of the source for
    // every `[`, and the hard-break test was an unanchored `$` regex retried from
    // every position of the accumulated paragraph. Measured before the fix: 10.8s,
    // 8.2s and 14.9s, on the main thread inside a `computed`.
    //
    // The bound is deliberately loose. This asserts "not quadratic", not a
    // throughput figure, and CI machines vary; each of these took seconds.
    const started = performance.now();

    parseMarkdown('*a '.repeat(34000));
    parseMarkdown(Array.from({ length: 800 }, (_, i) => `${' '.repeat(i)}x`).join('\n'));
    parseMarkdown(Array.from({ length: 2500 }, (_, i) => 'x'.padEnd(40) + i).join('\n'));

    expect(performance.now() - started).toBeLessThan(2000);
  });

  it('does not let one block’s failed marker refuse a later block’s good one', () => {
    // The memo that buys the linear scan above stores an INDEX, and the context
    // it lived on spanned the whole document — so a stray `*` at offset 0 of one
    // paragraph refused every `*` at or past offset 0 of every paragraph after
    // it, and the same for `[`. Both render as literal markers, and which pairs
    // collide depends only on their relative offsets, which is why parsing one
    // block at a time never showed it.
    const bold = parseMarkdown('*Note: prices are estimates.\n\nThe total is **$42** including tax.');
    const link = parseMarkdown(
      'Use the [ character to open a group.\n\nFull details live in the [guide](https://x.dev/s).'
    );

    expect(inlinesOf(bold[1])[1]).toMatchObject({ kind: 'strong' });
    expect(inlinesOf(link[1])[1]).toMatchObject({ kind: 'link', href: 'https://x.dev/s' });
    expect(plainText(inlinesOf(firstChild(parseMarkdown('Use 5*6 total\n\n- item with **bold**')[1])))).toBe(
      'item with bold'
    );
  });

  it('does not let a marker inside an emphasis label refuse the next one beside it', () => {
    // Same memo, one paragraph: `matchEmphasis` recurses on the slice `a *b`,
    // whose stray `*` sits at local index 2 — which then refused the well-formed
    // `*c*` at outer index 13. So restoring the memo after the recursion is not
    // enough; it has to be keyed to the string being scanned.
    const nodes = inlinesOf(parseMarkdown('**a *b** and *c* here')[0]);

    expect(nodes.map(node => node.kind)).toEqual(['strong', 'text', 'em', 'text']);
  });
});

describe('parseMarkdown — streaming regressions', () => {
  const streamed = (source: string): readonly WrMarkdownBlock[] => parseMarkdown(source, { streaming: true });

  it('keeps prose that merely contains a bracket pair', () => {
    // The worst defect in the first draft. The fragment pattern let the segment
    // after `]` run to the end of the text, so a CLOSED `[docs]` matched from the
    // bracket onwards and deleted the rest of the paragraph — and kept deleting it
    // for the whole stream, because the paragraph stayed the last block.
    const text = 'Install the package. See the [docs] for the full option list.';

    expect(plainText(inlinesOf(streamed(text)[0]))).toBe(text);
    expect(plainText(inlinesOf(streamed('[1] The first citation.')[0]))).toBe('[1] The first citation.');
    expect(plainText(inlinesOf(streamed('x[i] = 3')[0]))).toBe('x[i] = 3');
  });

  it('withholds a half-typed marker inside a list item or a quote', () => {
    // The guard looked only at a top-level paragraph, so the flicker it exists to
    // prevent still happened in the two places streamed prose actually lives.
    expect(plainText(inlinesOf(firstChild(streamed('- almost **')[0])))).toBe('almost ');
    expect(plainText(inlinesOf(firstChild(streamed('> bold **')[0])))).toBe('bold ');
  });

  it('closes a marker inside a list item optimistically', () => {
    expect(inlinesOf(firstChild(streamed('- almost **there')[0]))[1]).toMatchObject({ kind: 'strong' });
  });

  it('does not close a single asterisk, which is usually arithmetic', () => {
    // The optimistic close is a guess, and a single `*` or `_` is a multiplication
    // sign or a file name far more often than emphasis mid-word. Guessing there
    // restyled ordinary prose for the length of the stream.
    const text = 'The total is 5*3 plus the base rate for every extra unit.';

    expect(streamed(text)).toEqual(parseMarkdown(text));
  });

  it('does not let an unclosed backtick swallow markup that already parsed', () => {
    // The old scanner-level guess closed a code span at the end of the BLOCK, so a
    // stray backtick ate a finished link and rendered it as monospaced source.
    const nodes = inlinesOf(streamed('Set the `config option and see [docs](https://a.b) for more.')[0]);

    expect(nodes.some(node => node.kind === 'link')).toBe(true);
  });

  it('holds back a code chip that has no content yet', () => {
    // A lone backtick painted an empty monospace box that vanished a chunk later.
    expect(inlinesOf(streamed('run `')[0])).toEqual([{ kind: 'text', value: 'run ' }]);
  });

  it('guesses only near the end of the document', () => {
    // Bounded blast radius: a marker further back than the window is treated as
    // literal, because at that distance it is far more likely to be punctuation
    // than a construct still on its way.
    const far = `**${'x'.repeat(200)}`;

    expect(streamed(far)).toEqual(parseMarkdown(far));
  });
});
