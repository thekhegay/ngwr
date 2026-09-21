/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { describe, expect, it } from 'vitest';

import type { WrMarkdownAlign, WrMarkdownBlock, WrMarkdownInline, WrMarkdownListItem } from './interfaces';
import { parseMarkdown } from './parse-markdown';
import { serializeMarkdown } from './serialize-markdown';

/**
 * The serializer's spec, and the one property it exists for:
 * `parseMarkdown(serializeMarkdown(tree))` gives `tree` back.
 *
 * Three layers, because each catches what the others cannot.
 *
 * The targeted cases pin the OUTPUT — what an escaped `*`, a nested list or an
 * aligned table actually looks like — since a round trip alone would pass a
 * serializer that escapes every character in sight.
 *
 * The generated round trip is the proof. One generator builds the trees an editor
 * can produce (text runs carrying a mark SET, grouped in the canonical nesting),
 * and for those the tree must come back exactly. A second builds hostile trees —
 * emphasis inside strong, links inside links, whitespace just inside a delimiter,
 * refused URLs — which cannot all come back as written; for those the output must
 * be a fixed point (what is written reads back as a tree that writes the same
 * string again) and no character of text may be lost or invented. Both are seeded,
 * so a failure names the seed and the document.
 *
 * The normalisations are listed last, one case each: a loss nobody wrote a test
 * for is indistinguishable from a bug.
 */

const text = (value: string): WrMarkdownInline => ({ kind: 'text', value });
const code = (value: string): WrMarkdownInline => ({ kind: 'code', value });
const strong = (...children: WrMarkdownInline[]): WrMarkdownInline => ({ kind: 'strong', children });
const em = (...children: WrMarkdownInline[]): WrMarkdownInline => ({ kind: 'em', children });
const del = (...children: WrMarkdownInline[]): WrMarkdownInline => ({ kind: 'del', children });
const link = (href: string, title: string | null, ...children: WrMarkdownInline[]): WrMarkdownInline => ({
  kind: 'link',
  href,
  title,
  children,
});
const image = (src: string, alt: string, title: string | null = null): WrMarkdownInline => ({
  kind: 'image',
  src,
  alt,
  title,
});
const hardBreak: WrMarkdownInline = { kind: 'break' };

const para = (...inlines: WrMarkdownInline[]): WrMarkdownBlock => ({ kind: 'paragraph', inlines });
const heading = (level: 1 | 2 | 3 | 4 | 5 | 6, ...inlines: WrMarkdownInline[]): WrMarkdownBlock => ({
  kind: 'heading',
  level,
  inlines,
  id: '',
});
const fence = (source: string, language: string | null = null): WrMarkdownBlock => ({
  kind: 'code',
  language,
  code: source,
  closed: true,
});
const quote = (...children: WrMarkdownBlock[]): WrMarkdownBlock => ({ kind: 'quote', children });
const item = (children: WrMarkdownBlock[], checked: boolean | null = null): WrMarkdownListItem => ({
  children,
  checked,
});
const bullets = (tight: boolean, ...items: WrMarkdownListItem[]): WrMarkdownBlock => ({
  kind: 'list',
  ordered: false,
  start: 1,
  tight,
  items,
});
const numbered = (start: number, tight: boolean, ...items: WrMarkdownListItem[]): WrMarkdownBlock => ({
  kind: 'list',
  ordered: true,
  start,
  tight,
  items,
});
const table = (
  align: WrMarkdownAlign[],
  head: WrMarkdownInline[][],
  ...rows: WrMarkdownInline[][][]
): WrMarkdownBlock => ({
  kind: 'table',
  head: head.map(inlines => ({ inlines })),
  rows: rows.map(row => row.map(inlines => ({ inlines }))),
  align,
});
const rule: WrMarkdownBlock = { kind: 'rule' };

/** Heading ids are the parser's to compute; the trees under test carry `''`. */
function withoutIds(blocks: readonly WrMarkdownBlock[]): WrMarkdownBlock[] {
  return blocks.map(block => {
    switch (block.kind) {
      case 'heading':
        return { ...block, id: '' };
      case 'quote':
        return { ...block, children: withoutIds(block.children) };
      case 'list':
        return { ...block, items: block.items.map(entry => ({ ...entry, children: withoutIds(entry.children) })) };
      default:
        return block;
    }
  });
}

const reread = (blocks: readonly WrMarkdownBlock[]): WrMarkdownBlock[] =>
  withoutIds(parseMarkdown(serializeMarkdown(blocks)));

/** The markdown a tree serializes to, asserted to read back as the same tree. */
function expectRoundTrip(blocks: readonly WrMarkdownBlock[], markdown: string): void {
  expect(serializeMarkdown(blocks)).toBe(markdown);
  expect(reread(blocks)).toEqual(blocks);
}

describe('serializeMarkdown — escaping', () => {
  it('escapes what the parser would read as markup, and says nothing else', () => {
    expectRoundTrip(
      [para(text('a *b* `c` [d] <e> \\ ~~f~~ &amp; g_ _h'))],
      'a \\*b\\* \\`c\\` \\[d\\] \\<e> \\\\ \\~\\~f\\~\\~ \\&amp; g\\_ \\_h'
    );
  });

  it('leaves prose alone where no character can be read as markup', () => {
    // An underscore between two word characters, a star or a bracket between two
    // spaces, a single tilde, a bang with no link after it: none of them can open
    // or close anything, so none of them is escaped.
    expectRoundTrip(
      [para(text('snake_case_name, 2 * 3, a < b, ~/path, R&D and "wow"!'))],
      'snake_case_name, 2 * 3, a < b, ~/path, R&D and "wow"!'
    );
  });

  it('escapes the start of a line that would open a block', () => {
    const lines = ['# not a heading', '> not a quote', '- not a list', '+ nor this', '1986. a year', '3) three', '---'];
    const inlines = lines.flatMap((line, index) => (index ? [hardBreak, text(line)] : [text(line)]));

    expectRoundTrip(
      [para(...inlines)],
      [
        '\\# not a heading',
        '\\> not a quote',
        '\\- not a list',
        '\\+ nor this',
        // A digit cannot be escaped, so the delimiter is.
        '1986\\. a year',
        '3\\) three',
        '\\---',
      ].join('\\\n')
    );
  });

  it('keeps a pipe sentence from turning into a table header', () => {
    // `a | b` followed by a line that reads as a delimiter row is a table; the
    // second line is escaped, so it is not.
    expectRoundTrip([para(text('a | b'), hardBreak, text('--|--'))], 'a | b\\\n\\--|--');
  });

  it('keeps a bare URL in plain text from becoming a link', () => {
    expectRoundTrip([para(text('see https://x.dev now'))], 'see https\\://x.dev now');
  });

  it('escapes a bang only where it would turn the link after it into an image', () => {
    expectRoundTrip([para(text('wow!'), link('/x', null, text('a')), text(' yes!'))], 'wow\\![a](/x) yes!');
  });

  it('turns a link whose label is its own address into an autolink', () => {
    expectRoundTrip(
      [
        para(
          link('https://x.dev', null, text('https://x.dev')),
          text(' '),
          link('mailto:a@b.dev', null, text('a@b.dev'))
        ),
      ],
      '<https://x.dev> <a@b.dev>'
    );
  });

  it('pads a code span that starts or ends with a backtick or a space pair', () => {
    expectRoundTrip(
      [para(code('a`b'), text(' '), code('`x'), text(' '), code(' y '), text(' '), code(' '))],
      '``a`b`` `` `x `` `  y  ` ` `'
    );
  });
});

describe('serializeMarkdown — inline marks', () => {
  it('writes strong, emphasis, strikethrough and code', () => {
    expectRoundTrip(
      [para(strong(text('b')), text(' '), em(text('i')), text(' '), del(text('s')), text(' '), code('c'))],
      '**b** *i* ~~s~~ `c`'
    );
  });

  it('nests in one order: strong outside emphasis', () => {
    expectRoundTrip([para(strong(em(text('both'))))], '***both***');
    expectRoundTrip([para(strong(text('a '), em(text('b')), text(' c')))], '**a *b* c**');
  });

  it('switches an emphasis to `_` where it would touch a strong run', () => {
    // `*a***b**` is one run of three stars and reads as something else entirely.
    expectRoundTrip([para(em(text('a')), strong(text('b')))], '_a_**b**');
    expectRoundTrip([para(strong(em(text('a'))), em(text('b')))], '***a***_b_');
  });

  it('switches the strong instead when a word character pins the emphasis', () => {
    expectRoundTrip([para(text('x'), em(text('a')), strong(text('b')), text(','))], 'x*a*__b__,');
  });

  it('writes a link with a title, and one whose address needs angle brackets', () => {
    expectRoundTrip(
      [para(link('/x', 'The "title"', text('a')), text(' '), link('a b', null, strong(text('b'))))],
      '[a](/x "The "title"") [**b**](<a b>)'
    );
  });

  it('keeps balanced parentheses in an address, as written', () => {
    expectRoundTrip(
      [para(link('https://en.wikipedia.org/wiki/Foo_(bar)', null, text('Foo')))],
      '[Foo](https://en.wikipedia.org/wiki/Foo_(bar))'
    );
  });

  it('writes an image with its title, and an image inside a link', () => {
    expectRoundTrip(
      [para(image('/i.png', 'An *alt*', 'T'), text(' '), link('/l', null, image('/i.png', 'badge')))],
      '![An \\*alt\\*](/i.png "T") [![badge](/i.png)](/l)'
    );
  });

  it('writes a hard break as a backslash, inside marks and before a block-like line', () => {
    expectRoundTrip([para(strong(text('a'), hardBreak, text('b')))], '**a\\\nb**');
    expectRoundTrip([para(text('a'), hardBreak, text('# b'))], 'a\\\n\\# b');
  });
});

describe('serializeMarkdown — blocks', () => {
  it('escapes a trailing `#` run that would close a heading', () => {
    expectRoundTrip([heading(2, text('Issue #'))], '## Issue \\#');
    // `C#` has no whitespace before its sharp, which is not a closing sequence.
    expectRoundTrip([heading(1, text('C#'))], '# C#');
    expectRoundTrip([heading(6)], '######');
  });

  it('fences code with a run longer than any inside it', () => {
    expectRoundTrip([fence('a\n```\nb', 'ts')], '````ts\na\n```\nb\n````');
    expectRoundTrip([fence('')], '```\n```');
    expectRoundTrip([fence('\n')], '```\n\n\n```');
  });

  it('uses a tilde fence for an info string that starts with a backtick', () => {
    expectRoundTrip([fence('x', '`odd')], '~~~`odd\nx\n~~~');
  });

  it('keeps an ordered list on its own numbering', () => {
    expectRoundTrip(
      [numbered(9, true, item([para(text('nine'))]), item([para(text('ten'), hardBreak, text('wrapped'))]))],
      '9. nine\n10. ten\\\n    wrapped'
    );
  });

  it('writes a tight list tight and a loose one loose', () => {
    expectRoundTrip([bullets(true, item([para(text('a'))]), item([para(text('b'))]))], '- a\n- b');
    expectRoundTrip([bullets(false, item([para(text('a'))]), item([para(text('b'))]))], '- a\n\n- b');
    expectRoundTrip([bullets(false, item([para(text('a')), para(text('more'))]))], '- a\n\n  more');
  });

  it('nests lists by indentation, tight all the way down', () => {
    expectRoundTrip(
      [
        bullets(
          true,
          item([para(text('a')), numbered(1, true, item([para(text('one'))]), item([para(text('two'))]))]),
          item([para(text('b'))])
        ),
      ],
      '- a\n  1. one\n  2. two\n- b'
    );
  });

  it('puts a blank line before a nested list that does not start at 1', () => {
    // `a` / `3. b` would be one paragraph. The blank line that prevents it makes
    // the outer list loose, which is why the tree says so.
    expectRoundTrip(
      [bullets(false, item([para(text('a')), numbered(3, true, item([para(text('b'))]))]))],
      '- a\n\n  3. b'
    );
  });

  it('writes task items, an empty item, and escapes a checkbox that is only text', () => {
    expectRoundTrip(
      [bullets(true, item([para(text('done'))], true), item([], false), item([para(text('[ ] literal'))]), item([]))],
      '- [x] done\n- [ ]\n- \\[ \\] literal\n-'
    );
  });

  it('moves an item that holds only a rule under a bare marker', () => {
    // `- ---` is a thematic break, not an item containing one.
    expectRoundTrip([bullets(true, item([rule]))], '-\n  ---');
  });

  it('keeps a list of the other kind right after a tight list tight', () => {
    // A blank line followed by any list marker loosens the list before it.
    expectRoundTrip([bullets(true, item([para(text('a'))])), numbered(1, true, item([para(text('b'))]))], '- a\n1. b');
  });

  it('writes nested blockquotes, and an empty one', () => {
    expectRoundTrip(
      [quote(para(text('outer')), quote(para(text('inner'))), bullets(true, item([para(text('x'))]))), quote()],
      '> outer\n>\n> > inner\n>\n> - x\n\n>'
    );
  });

  it('writes code inside a quote and inside a list item, indented with its container', () => {
    expectRoundTrip([quote(fence('a\n\n  b', 'js'))], '> ```js\n> a\n>\n>   b\n> ```');
    expectRoundTrip([bullets(true, item([para(text('run')), fence('npm i')]))], '- run\n  ```\n  npm i\n  ```');
  });

  it('writes a table with its alignment row, escaping pipes everywhere in a cell', () => {
    expectRoundTrip(
      [
        table(
          ['start', 'center', 'end', null],
          [[text('a')], [text('b')], [text('c')], [text('d')]],
          [[text('x | y')], [code('p|q')], [], [link('/a|b', null, text('l'))]]
        ),
      ],
      '| a | b | c | d |\n| :-- | :-: | --: | --- |\n| x \\| y | `p\\|q` |  | [l](/a\\|b) |'
    );
  });

  it('separates blocks with a blank line and ends without a newline', () => {
    expectRoundTrip([heading(1, text('T')), para(text('p')), rule, fence('x')], '# T\n\np\n\n---\n\n```\nx\n```');
    expect(serializeMarkdown([])).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Generated trees
// ---------------------------------------------------------------------------

type Random = () => number;

/** Park-Miller: deterministic, exact in doubles, and free of the bitwise operators lint forbids. */
function seeded(seed: number): Random {
  let state = seed % 2147483647 || 1;
  return () => {
    state = (state * 48271) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

const int = (random: Random, n: number): number => Math.floor(random() * n);
const pick = <T>(random: Random, options: readonly T[]): T => options[int(random, options.length)];
const chance = (random: Random, p: number): boolean => random() < p;

/** Words chosen to be syntax: every one is a character the escaper has to think about somewhere. */
const WORDS = [
  'a',
  'word',
  'x_y',
  'snake_case_name',
  '__init__',
  '*',
  '**',
  'a*b',
  '~',
  '~~',
  '`',
  '#',
  'C#',
  '1.',
  '1986.',
  '2)',
  '-',
  '---',
  '+',
  '>',
  '[',
  ']',
  '!',
  'wow!',
  '|',
  ':-',
  '<div>',
  'a<b',
  'https://x.dev',
  '\\',
  '&amp;',
  '_',
  'é',
  '日本',
  '$5',
  '(x)',
  '"q"',
  "it's",
];
const CODES = ['a', 'a`b', '`x', ' y ', 'x y', '``', 'a | b', ' ', '*x*', '[x]'];
const HREFS = ['/x', 'https://y.dev/a_(b)', 'a b', 'mailto:a@b.dev', '#frag', '/p?q=1&r=2', 'https://x.dev'];
const TITLES = [null, null, 'T', 'with "q"', '', 'a (b)'];
const SRCS = ['/i.png', 'a b.png', '/p(1).png', 'data:image/png;base64,AAAA'];
const CODE_BLOCKS = ['x', 'a\n```\nb', '', '  indented\n~~~', 'a\n\nb', 'tab\there', '\n', ' lead', 'a\n    deeper'];

interface LinkSpec {
  readonly href: string;
  readonly title: string | null;
}

interface MarkSet {
  readonly link: LinkSpec | null;
  readonly strong: boolean;
  readonly del: boolean;
  readonly em: boolean;
}

/** One leaf and the marks on it — the shape an editor holds, before any nesting. */
interface Run {
  readonly node: WrMarkdownInline;
  readonly marks: MarkSet;
}

const PLAIN: MarkSet = { link: null, strong: false, del: false, em: false };
const sameLink = (a: LinkSpec | null, b: LinkSpec | null): boolean =>
  a === b || (!!a && !!b && a.href === b.href && a.title === b.title);
const sameMarks = (a: MarkSet, b: MarkSet): boolean =>
  sameLink(a.link, b.link) && a.strong === b.strong && a.del === b.del && a.em === b.em;
const emphasis = (marks: MarkSet): string[] =>
  (['strong', 'del', 'em'] as const).filter(name => marks[name]).map(String);
const within = (a: readonly string[], b: readonly string[]): boolean => a.every(name => b.includes(name));

/**
 * Runs to the tree the parser gives back: adjacent text with equal marks merged,
 * then one mark level at a time — link outside strong outside strikethrough
 * outside emphasis. Written here rather than borrowed, so the expectation does not
 * come from the code under test.
 */
function nest(runs: readonly Run[], level = 0): WrMarkdownInline[] {
  const merged: Run[] = [];
  for (const run of runs) {
    const last = merged[merged.length - 1];
    if (
      last &&
      (run.node.kind === 'text' || run.node.kind === 'code') &&
      last.node.kind === run.node.kind &&
      sameMarks(last.marks, run.marks)
    ) {
      merged[merged.length - 1] = { ...last, node: { ...last.node, value: last.node.value + run.node.value } };
    } else {
      merged.push(run);
    }
  }

  const name = (['link', 'strong', 'del', 'em'] as const)[level];
  if (!name) return merged.map(run => run.node);

  const same = (a: Run, b: Run): boolean =>
    name === 'link' ? sameLink(a.marks.link, b.marks.link) : a.marks[name] === b.marks[name];
  const out: WrMarkdownInline[] = [];
  let i = 0;

  while (i < merged.length) {
    let j = i + 1;
    while (j < merged.length && same(merged[i], merged[j])) j++;

    const children = nest(merged.slice(i, j), level + 1);
    const on = name === 'link' ? merged[i].marks.link : merged[i].marks[name];
    if (!on) out.push(...children);
    else if (name === 'link') out.push(link(merged[i].marks.link!.href, merged[i].marks.link!.title, ...children));
    else out.push({ kind: name, children });
    i = j;
  }

  return out;
}

/**
 * May two runs sit side by side with nothing between them?
 *
 * Mid-word marks are what an editor produces all the time, so the answer is
 * mostly yes. The exceptions are the two shapes markdown cannot write without a
 * separator: emphasis sets that are not nested (`*a***b**`), and an emphasis-only
 * run pinned against a word character — that one may have to switch to `_`, and
 * `_` does not flank a letter. Two code runs with the same marks would merge.
 */
function mayTouch(a: Run, b: Run): boolean {
  if (a.node.kind === 'break' || b.node.kind === 'break') return true;
  if (!sameLink(a.marks.link, b.marks.link)) return true;
  if (a.node.kind === 'code' && b.node.kind === 'code' && sameMarks(a.marks, b.marks)) return false;

  const ea = emphasis(a.marks);
  const eb = emphasis(b.marks);
  if (!ea.length && !eb.length) return true;
  if (ea.length && eb.length) return within(ea, eb) || within(eb, ea);

  const [plain, marked, side] = ea.length ? [b, a, 'start'] : [a, b, 'end'];
  if (emphasis(marked.marks).join() !== 'em' || plain.node.kind !== 'text') return true;

  const edge = side === 'start' ? plain.node.value[0] : plain.node.value[plain.node.value.length - 1];
  return !/[\p{L}\p{N}]/u.test(edge);
}

function editorRun(
  random: Random,
  link: LinkSpec | null,
  context: 'paragraph' | 'heading' | 'cell',
  edge: boolean
): Run {
  const kinds =
    context === 'paragraph' && !edge
      ? ['text', 'text', 'text', 'code', 'image', 'break']
      : ['text', 'text', 'code', 'image'];
  const kind = pick(random, kinds);
  const marks: MarkSet = {
    link,
    strong: chance(random, 0.3),
    del: chance(random, 0.15),
    em: chance(random, 0.3),
  };

  switch (kind) {
    case 'code':
      return { node: code(pick(random, CODES)), marks };
    case 'image':
      return {
        node: image(pick(random, SRCS), chance(random, 0.2) ? '' : pick(random, WORDS), pick(random, TITLES)),
        marks: { ...PLAIN, link },
      };
    case 'break':
      return { node: hardBreak, marks: { ...PLAIN, link } };
    default: {
      // Now and then, a link labelled with its own address.
      const autolink = link?.href === 'https://x.dev' && link.title === null && chance(random, 0.5);
      return autolink
        ? { node: text(link.href), marks: { ...PLAIN, link } }
        : { node: text(pick(random, WORDS)), marks };
    }
  }
}

function editorInlines(random: Random, context: 'paragraph' | 'heading' | 'cell'): WrMarkdownInline[] {
  const count = 1 + int(random, 5);
  const runs: Run[] = [];
  let link: LinkSpec | null = null;
  let linkLeft = 0;

  for (let i = 0; i < count; i++) {
    if (linkLeft === 0) {
      link = chance(random, 0.25) ? { href: pick(random, HREFS), title: pick(random, TITLES) } : null;
      linkLeft = link ? 1 + int(random, 3) : 1;
    }
    linkLeft--;

    const run = editorRun(random, link, context, i === 0 || i === count - 1);
    const previous = runs[runs.length - 1];
    if (previous && !(mayTouch(previous, run) && chance(random, 0.5))) {
      // A separator inside a link belongs to it, or it would cut the link in two.
      const shared = sameLink(previous.marks.link, run.marks.link) ? run.marks.link : null;
      runs.push({ node: text(pick(random, [' ', ' ', ', '])), marks: { ...PLAIN, link: shared } });
    }
    runs.push(run);
  }

  return nest(runs);
}

function editorBlocks(random: Random, depth: number, count: number): WrMarkdownBlock[] {
  const out: WrMarkdownBlock[] = [];

  for (let i = 0; i < count; i++) {
    const block = editorBlock(random, depth);
    const last = out[out.length - 1];
    // Two lists of one kind side by side merge; no markdown can keep them apart.
    out.push(
      block.kind === 'list' && last?.kind === 'list' && last.ordered === block.ordered ? para(text('p')) : block
    );
  }

  return out;
}

function editorBlock(random: Random, depth: number): WrMarkdownBlock {
  const kinds =
    depth < 2
      ? ['paragraph', 'paragraph', 'heading', 'code', 'quote', 'list', 'list', 'table', 'rule']
      : ['paragraph', 'paragraph', 'heading', 'code', 'rule'];

  switch (pick(random, kinds)) {
    case 'heading': {
      const level = (1 + int(random, 6)) as 1 | 2 | 3 | 4 | 5 | 6;
      return chance(random, 0.1) ? heading(level) : heading(level, ...editorInlines(random, 'heading'));
    }
    case 'code':
      return fence(pick(random, CODE_BLOCKS), pick(random, [null, 'ts', 'c++']));
    case 'quote':
      return chance(random, 0.1) ? quote() : quote(...editorBlocks(random, depth + 1, 1 + int(random, 2)));
    case 'list':
      return editorList(random, depth, chance(random, 0.5), false);
    case 'table': {
      const width = 1 + int(random, 3);
      const cells = (): WrMarkdownInline[][] =>
        Array.from({ length: width }, () => (chance(random, 0.15) ? [] : editorInlines(random, 'cell')));
      const align = Array.from({ length: width }, () =>
        pick<WrMarkdownAlign>(random, [null, 'start', 'center', 'end'])
      );
      return table(align, cells(), ...Array.from({ length: int(random, 3) }, cells));
    }
    case 'rule':
      return rule;
    default:
      return para(...editorInlines(random, 'paragraph'));
  }
}

/**
 * A list the way an editor can hold one. A loose list needs two items to say so,
 * and a tight item holds only what can follow a paragraph with no blank line — a
 * nested tight list (starting at 1 and with a first item, or it would not
 * interrupt the paragraph), a code block with no empty line, a quote.
 */
function editorList(random: Random, depth: number, tight: boolean, nested: boolean): WrMarkdownBlock {
  const ordered = chance(random, 0.5);
  const start = ordered && !nested ? pick(random, [1, 1, 0, 3, 10, 99]) : 1;
  const count = tight ? 1 + int(random, 3) : 2 + int(random, 2);
  const items = Array.from({ length: count }, (_, index) =>
    item(
      tight ? tightItem(random, depth, nested && index === 0) : editorBlocks(random, depth + 1, int(random, 3)),
      pick(random, [null, null, true, false])
    )
  );

  return ordered ? numbered(start, tight, ...items) : bullets(tight, ...items);
}

function tightItem(random: Random, depth: number, needsContent: boolean): WrMarkdownBlock[] {
  const paragraph = (): WrMarkdownBlock => para(...editorInlines(random, 'paragraph'));
  const block = (): WrMarkdownBlock =>
    fence(
      pick(
        random,
        CODE_BLOCKS.filter(source => !/^\n|\n\n|\n$/.test(source))
      ),
      pick(random, [null, 'ts'])
    );
  const shapes: (() => WrMarkdownBlock[])[] = [
    () => (needsContent ? [paragraph()] : []),
    () => [paragraph()],
    () => [paragraph()],
    () => (depth < 2 ? [paragraph(), editorList(random, depth + 1, true, true)] : [paragraph()]),
    () => [block()],
    () => [paragraph(), block()],
    () => [heading(3, ...editorInlines(random, 'heading'))],
    () => (depth < 2 ? [paragraph(), quote(paragraph())] : [paragraph()]),
  ];

  return pick(random, shapes)();
}

describe('serializeMarkdown — the round trip', () => {
  it.each([1, 7, 42, 2026])('reads back every editor-shaped tree exactly (seed %i)', seed => {
    const random = seeded(seed);

    for (let n = 0; n < 250; n++) {
      const tree = editorBlocks(random, 0, 1 + int(random, 4));
      const markdown = serializeMarkdown(tree);

      expect(withoutIds(parseMarkdown(markdown)), `seed ${seed}, tree ${n}:\n${markdown}`).toEqual(tree);
    }
  });
});

const WILD_TEXT = [
  ...WORDS,
  '',
  ' ',
  '  lead',
  'trail  ',
  'soft\nbreak',
  ' \n ',
  'a\tb',
  '\tlead',
  '*a*',
  '_x_',
  'x__y__',
  '<https://x.dev>',
  '<a@b.dev>',
  '[a](b)',
  '![a](b)',
  'end\\',
  '# h',
  '> q',
  '- l',
  '1. n',
  '```',
  '~~~',
  'https://x.dev.',
  ' * ',
  ' ~ ',
  '&copy;',
];
const WILD_CODE = ['', 'a', '`', '``', 'a`b``c', ' ', '  ', ' a ', 'x\ny', '|'];
const WILD_URLS = [
  '/x',
  'javascript:alert(1)',
  '',
  ' ',
  'a b',
  'a(b',
  'a)b',
  'x\\y',
  '<x>',
  'a\nb',
  '/p[1]`',
  'https://x.dev',
  'mailto:a@b.dev',
  'data:image/png;base64,AA',
  'data:text/html,x',
  '(((a)))',
];
const WILD_TITLES = [null, '', 'T', 'a"b', 'a(b', 'a)b', '(x)', 'x\\', '[x]', 'a\nb', '`'];

/** Any tree the types allow, including the ones no parser would produce. */
function wildInlines(random: Random, depth: number): WrMarkdownInline[] {
  return Array.from({ length: int(random, 4) }, () => wildInline(random, depth));
}

function wildInline(random: Random, depth: number): WrMarkdownInline {
  const kinds =
    depth < 3 ? ['text', 'text', 'code', 'strong', 'em', 'del', 'link', 'image', 'break'] : ['text', 'code', 'break'];
  const kind = pick(random, kinds);

  switch (kind) {
    case 'text':
      return text(pick(random, WILD_TEXT));
    case 'code':
      return code(pick(random, WILD_CODE));
    case 'break':
      return hardBreak;
    case 'image':
      return image(pick(random, WILD_URLS), pick(random, WILD_TEXT), pick(random, WILD_TITLES));
    case 'link':
      return link(pick(random, WILD_URLS), pick(random, WILD_TITLES), ...wildInlines(random, depth + 1));
    default:
      return { kind: kind as 'strong' | 'em' | 'del', children: wildInlines(random, depth + 1) };
  }
}

function wildBlocks(random: Random, depth: number): WrMarkdownBlock[] {
  return Array.from({ length: int(random, 4) }, () => wildBlock(random, depth));
}

function wildBlock(random: Random, depth: number): WrMarkdownBlock {
  const kinds =
    depth < 3
      ? ['paragraph', 'heading', 'code', 'quote', 'list', 'list', 'table', 'rule']
      : ['paragraph', 'heading', 'code', 'rule'];

  switch (pick(random, kinds)) {
    case 'heading':
      return { kind: 'heading', level: (1 + int(random, 6)) as 1, inlines: wildInlines(random, 0), id: 'stale' };
    case 'code':
      return {
        kind: 'code',
        language: pick(random, [null, '', 'TS', 'a b', '`x', 'c++']),
        code: pick(random, [...CODE_BLOCKS, 'a\r\nb', '\tx', '````', '~~~~\n```']),
        closed: chance(random, 0.8),
      };
    case 'quote':
      return quote(...wildBlocks(random, depth + 1));
    case 'list': {
      const items = Array.from({ length: int(random, 4) }, () =>
        item(wildBlocks(random, depth + 1), pick(random, [null, true, false]))
      );
      return chance(random, 0.5)
        ? numbered(pick(random, [0, 1, 7, 999999998]), chance(random, 0.5), ...items)
        : bullets(chance(random, 0.5), ...items);
    }
    case 'table': {
      const width = int(random, 4);
      // Rows no wider than the header: a longer one is truncated by the parser,
      // and its extra cells are not text anyone can get back.
      const row = (): WrMarkdownInline[][] =>
        Array.from({ length: int(random, width + 1) }, () => wildInlines(random, 1));
      return table(
        Array.from({ length: int(random, 5) }, () => pick<WrMarkdownAlign>(random, [null, 'start', 'center', 'end'])),
        Array.from({ length: width }, () => wildInlines(random, 1)),
        ...Array.from({ length: int(random, 3) }, row)
      );
    }
    case 'rule':
      return rule;
    default:
      return para(...wildInlines(random, 0));
  }
}

/**
 * Every character of text a tree holds, whitespace collapsed — which is exactly
 * what every normalisation is allowed to change. A refused link still has its
 * label and a refused image its alt, because that is what they render as.
 */
function textOf(blocks: readonly WrMarkdownBlock[]): string {
  const inline = (nodes: readonly WrMarkdownInline[]): string =>
    nodes
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
            return inline(node.children);
        }
      })
      .join('');
  const block = (node: WrMarkdownBlock): string => {
    switch (node.kind) {
      case 'paragraph':
      case 'heading':
        return inline(node.inlines);
      case 'code':
        return node.code;
      case 'quote':
        return node.children.map(block).join(' ');
      case 'list':
        return node.items.flatMap(entry => entry.children.map(block)).join(' ');
      case 'table':
        return [node.head, ...node.rows]
          .flatMap(row => row.slice(0, node.head.length).map(cell => inline(cell.inlines)))
          .join(' ');
      case 'rule':
        return '';
    }
  };

  return blocks.map(block).join(' ').replace(/\s+/g, ' ').trim();
}

describe('serializeMarkdown — hostile trees', () => {
  it.each([3, 11, 99, 1234])('writes a fixed point and keeps every character of text (seed %i)', seed => {
    const random = seeded(seed);

    for (let n = 0; n < 250; n++) {
      const tree = wildBlocks(random, 0);
      const markdown = serializeMarkdown(tree);
      const first = parseMarkdown(markdown);
      const again = serializeMarkdown(first);
      const context = `seed ${seed}, tree ${n}:\n${markdown}\n--- rewritten ---\n${again}`;

      // What it writes, it reads back as something it writes the same way.
      expect(withoutIds(parseMarkdown(again)), context).toEqual(withoutIds(first));
      // Nothing typed is lost, and no markup leaks out as literal characters.
      expect(textOf(first), context).toBe(textOf(tree));
    }
  });
});

describe('serializeMarkdown — normalisations', () => {
  it('drops whitespace at the edges of a block and just inside a delimiter', () => {
    const tree = [para(text('  lead '), strong(text(' bold ')), text(' tail  '))];

    expect(serializeMarkdown(tree)).toBe('lead  **bold**  tail');
    expect(reread(tree)).toEqual([para(text('lead  '), strong(text('bold')), text('  tail'))]);
  });

  it('turns a soft break into a space, and a hard break into one where no line can end', () => {
    expect(serializeMarkdown([para(text('one\n   two'))])).toBe('one two');
    expect(serializeMarkdown([heading(1, text('a'), hardBreak, text('b'))])).toBe('# a b');
    expect(serializeMarkdown([table([null], [[text('a'), hardBreak, text('b')]])])).toBe('| a b |\n| --- |');
  });

  it('drops a hard break that ends a block, since a trailing backslash stays literal', () => {
    expect(serializeMarkdown([para(text('end'), hardBreak)])).toBe('end');
  });

  it('drops an empty paragraph, an empty list and a table with no header cell', () => {
    expect(serializeMarkdown([para(), bullets(true), table([], []), para(text('kept'))])).toBe('kept');
  });

  it('merges two adjacent lists of one kind, which nothing in markdown can keep apart', () => {
    const tree = [bullets(true, item([para(text('a'))])), bullets(true, item([para(text('b'))]))];

    expect(serializeMarkdown(tree)).toBe('- a\n- b');
    expect(reread(tree)).toEqual([bullets(true, item([para(text('a'))]), item([para(text('b'))]))]);
  });

  it('cannot keep a single-item list loose, and a loose list loosens the tight one around it', () => {
    expect(reread([bullets(false, item([para(text('a'))]))])).toEqual([bullets(true, item([para(text('a'))]))]);

    const inner = bullets(false, item([para(text('b'))]), item([para(text('c'))]));
    expect(reread([bullets(true, item([para(text('a')), inner]))])).toEqual([
      bullets(false, item([para(text('a')), inner])),
    ]);
  });

  it('reads nesting past the parser limit back as text', () => {
    let tree: WrMarkdownBlock = para(text('deep'));
    for (let level = 0; level < 13; level++) tree = quote(tree);

    let expected: WrMarkdownBlock = para(text('> deep'));
    for (let level = 0; level < 12; level++) expected = quote(expected);

    expect(reread([tree])).toEqual([expected]);
  });

  it('writes marks in one nesting: link outside strong outside emphasis', () => {
    expect(reread([para(strong(link('/x', null, text('a'))))])).toEqual([para(link('/x', null, strong(text('a'))))]);
    expect(reread([para(em(strong(text('x'))))])).toEqual([para(strong(em(text('x'))))]);
  });

  it('gives an image no emphasis, since none of it paints on an image', () => {
    expect(serializeMarkdown([para(em(image('/i.png', 'a')), text(' '), strong(text('b')))])).toBe(
      '![a](/i.png) **b**'
    );
  });

  it('drops an emphasis that can neither keep `*` nor switch to `_`', () => {
    // A word character on both outer sides: `_` cannot flank either run, and
    // `x*a***b**y` would read back as literal stars. The text survives.
    const tree = [para(text('x'), em(text('a')), strong(text('b')), text('y'))];

    expect(serializeMarkdown(tree)).toBe('xa**b**y');
    expect(reread(tree)).toEqual([para(text('xa'), strong(text('b')), text('y'))]);
  });

  it('writes a refused link as its label and a refused image as its alt, as the renderer shows them', () => {
    const tree = [para(link('javascript:alert(1)', null, text('click')), text(' '), image('data:text/html,x', 'alt'))];

    expect(serializeMarkdown(tree)).toBe('click alt');
    expect(reread(tree)).toEqual([para(text('click alt'))]);
  });

  it('percent-encodes what the destination scan cannot carry', () => {
    const tree = [para(link('a\\b<c>(d', null, text('x')))];

    // The backslash before `b` is carried as it is: the scan skips the character
    // after it, and a `b` changes nothing it counts.
    expect(serializeMarkdown(tree)).toBe('[x](a\\b%3Cc%3E%28d)');
    expect(reread(tree)).toEqual([para(link('a\\b%3Cc%3E%28d', null, text('x')))]);
  });

  it('encodes a backslash only where the scan would read it as an escape', () => {
    // Before a parenthesis it would hide that parenthesis from the count, and at
    // the end it would swallow the closing one. Anywhere else a browser reads it
    // as `/` in an http(s) URL, and `%5C` would be a different address.
    expect(reread([para(link('https://x.com/a\\b', null, text('x')))])).toEqual([
      para(link('https://x.com/a\\b', null, text('x'))),
    ]);
    expect(serializeMarkdown([para(link('/a\\(b)', null, text('x')))])).toBe('[x](/a%5C(b))');
    expect(serializeMarkdown([para(link('/a\\', null, text('x')))])).toBe('[x](/a%5C)');
    expect(reread([para(link('/a\\(b)', null, text('x')))])).toEqual([para(link('/a%5C(b)', null, text('x')))]);
  });

  it('removes a tab or line break from a destination, as the URL parser does', () => {
    // A browser strips them before it resolves the address; encoded, they would
    // become part of it.
    expect(serializeMarkdown([para(link('https://x.com/a\nb\tc\r', null, text('x')))])).toBe('[x](https://x.com/abc)');
  });

  it('drops a title that cannot be delimited', () => {
    expect(reread([para(link('/x', 'a)b', text('x')))])).toEqual([para(link('/x', null, text('x')))]);
  });

  it('writes a link label past the parser cap as its text', () => {
    // 998 characters is the longest label the parser reads as one.
    expect(reread([para(link('/x', null, text('a'.repeat(998))))])).toEqual([
      para(link('/x', null, text('a'.repeat(998)))),
    ]);
    expect(reread([para(link('/x', null, text('a'.repeat(999))))])).toEqual([para(text('a'.repeat(999)))]);
  });

  it('keeps the first word of an info string, lowercased, and always closes the fence', () => {
    const tree: WrMarkdownBlock[] = [{ kind: 'code', language: 'TypeScript title="a"', code: 'x', closed: false }];

    expect(serializeMarkdown(tree)).toBe('```typescript\nx\n```');
    expect(reread(tree)).toEqual([fence('x', 'typescript')]);
  });

  it('turns a code span that would open a line as a fence into text', () => {
    // Its value holds a single and a double backtick run, so its fence needs
    // three — and three backticks at the start of a line are a fenced block.
    expect(reread([para(code('a`b``c'))])).toEqual([para(text('a`b``c'))]);
    expect(reread([para(text('x '), code('a`b``c'))])).toEqual([para(text('x '), code('a`b``c'))]);
  });

  it('fits every row of a table to its header', () => {
    const tree = [table([null, 'end'], [[text('a')]], [[text('1')], [text('2')]], [])];

    expect(serializeMarkdown(tree)).toBe('| a |\n| --- |\n| 1 |\n|  |');
    expect(reread(tree)).toEqual([table([null], [[text('a')]], [[text('1')]], [[]])]);
  });

  it('leaves heading ids to the parser', () => {
    const [block] = parseMarkdown(
      serializeMarkdown([{ kind: 'heading', level: 2, inlines: [text('Getting started')], id: 'stale' }])
    );

    expect(block).toMatchObject({ kind: 'heading', id: 'getting-started' });
  });
});
