import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { type WrHighlightLine, WrMarkdown, provideWrMarkdownHighlighter } from 'ngwr/markdown';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrMarkdownHarness } from './wr-markdown-harness';

/** Three backticks, in a single-quoted string so nothing has to be escaped. */
const FENCE = '```';

/**
 * The component used the way a consumer uses it: one `[value]`, and the four inputs
 * that change what the harness should report about the same source.
 */
@Component({
  imports: [WrMarkdown],
  template: `
    <wr-markdown
      [value]="value()"
      [streaming]="streaming()"
      [copyable]="copyable()"
      [linkTarget]="linkTarget()"
      [headingIds]="headingIds()"
    />
  `,
})
class Host {
  readonly value = signal('');
  readonly streaming = signal(false);
  readonly copyable = signal<boolean | null>(null);
  readonly linkTarget = signal<'_blank' | '_self' | null>(null);
  readonly headingIds = signal(true);
}

/** Two documents on one page — the shape that catches a harness answering for both. */
@Component({
  imports: [WrMarkdown],
  template: `
    <wr-markdown [value]="release" />
    <wr-markdown [value]="comment" [streaming]="true" />
  `,
})
class PairHost {
  readonly release = ['# Release notes', '', `${FENCE}ts`, 'const v = 11;', FENCE].join('\n');
  readonly comment = 'looks good to me';
}

describe('WrMarkdownHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  /** Set the source and let the renderer catch up, the way a chunk of a stream would. */
  const render = async (value: string): Promise<WrMarkdownHarness> => {
    fixture.componentInstance.value.set(value);
    await fixture.whenStable();
    return loader.getHarness(WrMarkdownHarness);
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('reads headings as the elements the renderer chose, with the ids a link needs', async () => {
    const md = await render('# Release notes\n\n### Fixed at last');

    // The level comes off the `<h1>` / `<h3>` itself — a `<div role="heading">`
    // would be a regression nothing on screen shows — and the slug is what every
    // deep link into the document depends on.
    expect(await md.getHeadings()).toEqual([
      { level: 1, text: 'Release notes', id: 'user-content-release-notes' },
      { level: 3, text: 'Fixed at last', id: 'user-content-fixed-at-last' },
    ]);
  });

  it('reports a heading with no id when headingIds is off', async () => {
    fixture.componentInstance.headingIds.set(false);
    const md = await render('# Release notes');

    // `null` rather than `''`: the attribute is gone, and an anchor that silently
    // stops being generated changes nothing on screen.
    expect(await md.getHeadings()).toEqual([{ level: 1, text: 'Release notes', id: null }]);
  });

  it('reads paragraphs as one line, however the author wrapped them', async () => {
    const md = await render('a soft\nbreak is\nstill one paragraph');

    // The soft breaks are real newlines in the DOM — CommonMark leaves them to CSS
    // — so a raw `textContent` read would report three lines the browser shows as
    // one.
    expect(await md.getParagraphs()).toEqual(['a soft break is still one paragraph']);
  });

  it('reads a link with the attributes that make it safe', async () => {
    const md = await render('[the docs](https://ngwr.dev "guide") and <https://a.b>');

    expect(await md.getLinks()).toEqual([
      { text: 'the docs', href: 'https://ngwr.dev', title: 'guide', target: null, rel: null },
      { text: 'https://a.b', href: 'https://a.b', title: null, target: null, rel: null },
    ]);
  });

  it('never reports a target without the rel that makes it safe', async () => {
    fixture.componentInstance.linkTarget.set('_blank');
    const md = await render('[x](https://a.b)');

    // The pair is the assertion. A `_blank` without `noopener noreferrer` hands
    // `window.opener` to a page whose URL came out of the rendered document, which
    // is untrusted input by construction — so a harness that reported only the
    // target would let that regression through.
    expect(await md.getLinks()).toEqual([
      { text: 'x', href: 'https://a.b', title: null, target: '_blank', rel: 'noopener noreferrer' },
    ]);
  });

  it('has no link at all to read when the URL was refused', async () => {
    const md = await render('[click me](javascript:alert(1))');

    // Angular would sanitize this href to `unsafe:javascript:…` and leave an anchor
    // that announces as a link and does nothing; the component refuses it outright
    // and keeps the label as text.
    expect(await md.getLinks()).toEqual([]);
    expect(await md.getText()).toContain('click me');
  });

  it('reads an image, and the alt text a refused source falls back to', async () => {
    const md = await render('![a duck](/duck.png "quack")');

    // The `src` as written: unresolved, so a relative path stays relative.
    expect(await md.getImages()).toEqual([{ src: '/duck.png', alt: 'a duck', title: 'quack' }]);

    const refused = await render('![a duck](javascript:alert(1))');

    expect(await refused.getImages()).toEqual([]);
    expect(await refused.getText()).toContain('a duck');
  });

  it('finds raw HTML as text rather than as elements', async () => {
    const md = await render('<img src=x onerror="alert(1)"> and <b>bold</b>');

    // The security property the whole component exists for: nothing in the pipeline
    // is parsed as HTML, so a hostile tag is characters on screen.
    expect(await md.getImages()).toEqual([]);
    expect(await md.getText()).toContain('<img src=x onerror="alert(1)">');
  });

  it('keeps inline code apart from a fenced block', async () => {
    const md = await render('run `foo();` twice');

    expect(await md.getInlineCode()).toEqual(['foo();']);
    expect(await md.getCodeBlocks()).toEqual([]);
  });

  it('keeps a code block whitespace-exact and answers its language', async () => {
    // The blank first and last line are the point of the fixture, not decoration:
    // they are what separates an exact read from a trimmed one, and a snippet that
    // arrives out of a model with a leading newline is the common case.
    const code = ['', 'const answer = 42;', '  indented', '', 'after a blank line', ''].join('\n');
    const md = await render([`${FENCE}ts`, code, FENCE].join('\n'));
    const block = await md.getCodeBlock();

    // Indentation and blank lines are the content, and they are the part most at
    // risk from the framework rather than from the parser: Angular strips
    // whitespace-only text nodes from templates.
    expect(await block.getCode()).toBe(code);
    expect(await block.getLanguage()).toBe('ts');
    expect(await block.isHighlighted()).toBe(false);
    // No `copyable`, so no button — and asking for one says why rather than
    // resolving quietly.
    expect(await block.canCopy()).toBe(false);
    expect(await block.getCopyLabel()).toBeNull();
    await expect(block.copy()).rejects.toThrow(/no copy button/);
  });

  it('reports a bare fence as having no language, and no filter finds one', async () => {
    const md = await render(`${FENCE}\nplain text\n${FENCE}`);
    const [block] = await md.getCodeBlocks();

    // `null` is the honest answer: nothing named a grammar, so nothing is asked to
    // colour it.
    expect(await block.getLanguage()).toBeNull();
    expect(await md.getCodeBlocks({ language: 'ts' })).toEqual([]);
  });

  it('narrows the blocks of a document by language and by code', async () => {
    const md = await render(`${FENCE}ts\nconst a = 1;\n${FENCE}\n\n${FENCE}sh\nls -la\n${FENCE}`);

    expect(await md.getCodeBlocks()).toHaveLength(2);
    expect(await (await md.getCodeBlock({ language: 'sh' })).getCode()).toBe('ls -la');
    expect(await (await md.getCodeBlock({ code: /const/ })).getLanguage()).toBe('ts');
  });

  it('says which languages the document does offer when nothing matched', async () => {
    const md = await render(`${FENCE}ts\na\n${FENCE}\n\n${FENCE}\nb\n${FENCE}`);

    // A `getCodeBlocks(…)[0]` that resolves to `undefined` fails three lines later
    // on an unrelated read; this fails here, and names what it found instead.
    await expect(md.getCodeBlock({ language: 'python' })).rejects.toThrow(/2 block\(s\), in: ts, \(none\)/);

    const empty = await render('no code here');
    await expect(empty.getCodeBlock()).rejects.toThrow(/renders no code blocks at all/);
  });

  it('finds a code block nested inside a quote', async () => {
    const md = await render(`> quoted\n>\n> ${FENCE}sh\n> ls\n> ${FENCE}`);

    // Indenting a snippet under a bullet or a quote must not make the document
    // report itself as having no code: it renders the same way, copy button and all.
    expect(await md.getCodeBlocks()).toHaveLength(1);
    expect(await (await md.getCodeBlock()).getLanguage()).toBe('sh');
    expect(await md.getQuotes()).toHaveLength(1);
    expect((await md.getQuotes())[0]).toContain('quoted');
  });

  it('reads a tight list without paragraphs and a loose one with them', async () => {
    const tight = await render('- a\n- b');

    // CommonMark's tight/loose distinction, and the reason a two-item list does not
    // render double-spaced. An empty paragraph list here is the correct answer.
    expect(await tight.getListItems()).toEqual(['a', 'b']);
    expect(await tight.getParagraphs()).toEqual([]);

    const loose = await render('- a\n\n- b');

    expect(await loose.getListItems()).toEqual(['a', 'b']);
    expect(await loose.getParagraphs()).toEqual(['a', 'b']);
  });

  it('keeps a nested item inside its parent, which is what the DOM says', async () => {
    const md = await render('- outer\n  - inner');
    const items = await md.getListItems();

    // A nested list lives INSIDE its parent `<li>` — a host element between `<ul>`
    // and `<li>` would be invalid markup and would break the list's accessibility
    // tree — so the parent's text contains the child's, and the child is an entry of
    // its own.
    expect(items).toHaveLength(2);
    expect(items[0]).toContain('inner');
    expect(items[1]).toBe('inner');
  });

  it('reads a task item’s tick, its text and the state only a screen reader gets', async () => {
    const md = await render('- [x] ship it\n- [ ] write docs');

    // The tick is `aria-hidden` — a real `<input type="checkbox">` here would be an
    // unlabelled form control — so the hidden label is the entire accessible state,
    // and both halves belong in the answer.
    expect(await md.getTaskItems()).toEqual([
      { text: 'ship it', checked: true, stateLabel: 'Done:' },
      { text: 'write docs', checked: false, stateLabel: 'To do:' },
    ]);
    // The label is announced text, not visible text: a spec asserting what a reader
    // sees should not have to know 'Done:' is spliced in front of it.
    expect(await md.getListItems()).toEqual(['ship it', 'write docs']);
    expect(await md.getText()).not.toContain('Done:');
  });

  it('keeps one task item’s state out of the next one’s', async () => {
    const md = await render('- [ ] first\n- [x] second\n- [ ] third');

    // The failure this pins: reading the tick from the document root instead of from
    // the item hands every item the first one's state, and reports a broken
    // checklist as intact.
    expect((await md.getTaskItems()).map(item => item.checked)).toEqual([false, true, false]);
  });

  it('reads a table as a rectangle, with the logical alignment the delimiter row asked for', async () => {
    const md = await render(['| Name | Size |', '| :--- | ---: |', '| ngwr | 12 kB |', '| cdk |  |'].join('\n'));

    // `start` / `end`, never `left` / `right`: the alignment mirrors under RTL on its
    // own. A short row is padded to the header's width, which is what makes the whole
    // table one comparison.
    expect(await md.getTables()).toEqual([
      {
        headers: ['Name', 'Size'],
        rows: [
          ['ngwr', '12 kB'],
          ['cdk', ''],
        ],
        align: ['start', 'end'],
      },
    ]);
  });

  it('reports no alignment for a column the delimiter row said nothing about', async () => {
    const md = await render(['| a | b |', '| --- | :-: |', '| 1 | 2 |'].join('\n'));

    // The one that computed style cannot answer: a `<th>` centres by default, so
    // reading `getComputedStyle` would report this unaligned column as `center`.
    expect((await md.getTables())[0].align).toEqual([null, 'center']);
  });

  it('reads two tables without mixing their rows', async () => {
    const md = await render(['| a |', '| - |', '| 1 |', '', '| b |', '| - |', '| 2 |'].join('\n'));

    expect(await md.getTables()).toEqual([
      { headers: ['a'], rows: [['1']], align: [null] },
      { headers: ['b'], rows: [['2']], align: [null] },
    ]);
  });

  it('counts thematic breaks, which have nothing to read', async () => {
    const md = await render('> quoted\n\n---\n\n***');

    expect(await md.getQuotes()).toEqual(['quoted']);
    expect(await md.getRuleCount()).toBe(2);
  });

  it('tells an empty document from one that merely has no text', async () => {
    const md = await render('');

    expect(await md.isEmpty()).toBe(true);
    expect(await md.getText()).toBe('');
    expect(await md.getHeadings()).toEqual([]);

    const rule = await render('---');

    // An `<hr>` is a document with no text in it. `getText() === ''` would call this
    // empty; it rendered.
    expect(await rule.isEmpty()).toBe(false);
    expect(await rule.getText()).toBe('');
    expect(await rule.getRuleCount()).toBe(1);
  });

  it('reads the streaming state off the host, next to what streaming changes', async () => {
    const md = await render('almost **there');

    // Settled, the unmatched `**` is literal text — and the modifier is off, so
    // nothing paints a caret.
    expect(await md.isStreaming()).toBe(false);
    expect(await md.getText()).toBe('almost **there');

    fixture.componentInstance.streaming.set(true);
    await fixture.whenStable();

    // Mid-stream the same source is bold with the closer still in flight, and the
    // host carries the class the caret is painted with.
    expect(await md.isStreaming()).toBe(true);
    expect(await md.getText()).toBe('almost there');
  });
});

describe('WrMarkdownHarness — two documents on one page', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<PairHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(PairHost);
    fixture.detectChanges();
    await fixture.whenStable();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('narrows by a heading, by a language, by the text and by the streaming state', async () => {
    expect(await loader.getAllHarnesses(WrMarkdownHarness)).toHaveLength(2);

    expect(await loader.getAllHarnesses(WrMarkdownHarness.with({ headingText: 'Release notes' }))).toHaveLength(1);
    expect(await loader.getAllHarnesses(WrMarkdownHarness.with({ headingText: 'Nope' }))).toEqual([]);
    expect(await loader.getAllHarnesses(WrMarkdownHarness.with({ codeLanguage: 'ts' }))).toHaveLength(1);
    expect(await loader.getAllHarnesses(WrMarkdownHarness.with({ codeLanguage: 'python' }))).toEqual([]);
    expect(await loader.getAllHarnesses(WrMarkdownHarness.with({ text: 'looks good to me' }))).toHaveLength(1);
    expect(await loader.getAllHarnesses(WrMarkdownHarness.with({ text: /release/i }))).toHaveLength(1);
    expect(await loader.getAllHarnesses(WrMarkdownHarness.with({ streaming: false }))).toHaveLength(1);
  });

  it('answers for its own document only', async () => {
    const [streaming] = await loader.getAllHarnesses(WrMarkdownHarness.with({ streaming: true }));
    const [settled] = await loader.getAllHarnesses(WrMarkdownHarness.with({ streaming: false }));

    // Every read is scoped to one host: a document-wide query would report the
    // comment as having a heading and a code block it never rendered.
    expect(await streaming.getText()).toBe('looks good to me');
    expect(await streaming.getHeadings()).toEqual([]);
    expect(await streaming.getCodeBlocks()).toEqual([]);
    expect(await settled.getHeadings()).toEqual([
      { level: 1, text: 'Release notes', id: 'user-content-release-notes' },
    ]);
    expect(await settled.getCodeBlocks()).toHaveLength(1);
  });
});

describe('WrMarkdownHarness — the copy button', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const write = vi.fn<(text: string) => Promise<void>>();

  const render = async (value: string): Promise<WrMarkdownHarness> => {
    fixture.componentInstance.value.set(value);
    await fixture.whenStable();
    return loader.getHarness(WrMarkdownHarness);
  };

  beforeEach(async () => {
    write.mockReset();
    write.mockResolvedValue(undefined);
    // jsdom implements no clipboard at all, so without this the directive falls
    // through to `execCommand`, which jsdom also lacks: the write fails and the
    // label never swaps.
    Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: { writeText: write } });

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.copyable.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => {
    fixture.destroy();
    Reflect.deleteProperty(window.navigator, 'clipboard');
  });

  it('copies the code and swaps the label the button announces', async () => {
    const md = await render(`${FENCE}ts\nconst a = 1;\n${FENCE}`);
    const block = await md.getCodeBlock();

    expect(await block.canCopy()).toBe(true);
    expect(await block.getCopyLabel()).toBe('Copy code');

    await block.copy();
    await fixture.whenStable();

    // The CODE, not the rendered text: a highlighted block's DOM is spans, so
    // copying `textContent` would be right by accident.
    expect(write).toHaveBeenCalledWith('const a = 1;');
    expect(await block.getCopyLabel()).toBe('Copied');
  });

  it('leaves the other blocks’ labels alone', async () => {
    const md = await render(`${FENCE}\nfirst\n${FENCE}\n\n${FENCE}\nsecond\n${FENCE}`);
    const [first, second] = await md.getCodeBlocks();

    await first.copy();
    await fixture.whenStable();

    // One shared boolean would light up every button in the document.
    expect([await first.getCopyLabel(), await second.getCopyLabel()]).toEqual(['Copied', 'Copy code']);
  });

  it('offers nothing to copy while the fence is still open', async () => {
    fixture.componentInstance.streaming.set(true);
    const md = await render(`${FENCE}ts\nconst a = 1;`);
    const block = await md.getCodeBlock();

    // Mid-stream the snippet is not all there, and a button that copies half of one
    // is worse than no button — so the harness names that as the reason.
    expect(await block.canCopy()).toBe(false);
    await expect(block.copy()).rejects.toThrow(/fence is still open/);
    expect(write).not.toHaveBeenCalled();
  });
});

describe('WrMarkdownHarness — highlighting', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const SPANS: readonly WrHighlightLine[] = [
    [{ text: 'const', color: '#ff0000' }, { text: ' a = 1;' }],
    [{ text: 'second' }],
  ];

  const mount = async (providers: unknown[]): Promise<WrMarkdownHarness> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set(`${FENCE}ts\nconst a = 1;\nsecond\n${FENCE}`);
    fixture.detectChanges();
    await fixture.whenStable();
    loader = TestbedHarnessEnvironment.loader(fixture);
    return loader.getHarness(WrMarkdownHarness);
  };

  afterEach(() => fixture.destroy());

  it('reports a coloured block, and still reads its code as code', async () => {
    const md = await mount([provideWrMarkdownHighlighter(() => SPANS)]);
    const block = await md.getCodeBlock();

    expect(await block.isHighlighted()).toBe(true);
    // The half a spec would otherwise never see: a highlighted block is a span per
    // token, and what separates its lines is a real `\n` interpolated between them.
    // Read wrong, a coloured block copies out as one run-together line.
    expect(await block.getCode()).toBe('const a = 1;\nsecond');
  });

  it('reports a plain block when no highlighter is provided', async () => {
    const md = await mount([]);
    const block = await md.getCodeBlock();

    // Not a gap: a grammar engine loads WASM, so the code goes up as text and gains
    // colour later — and under SSR it never does at all.
    expect(await block.isHighlighted()).toBe(false);
    expect(await block.getCode()).toBe('const a = 1;\nsecond');
  });
});
