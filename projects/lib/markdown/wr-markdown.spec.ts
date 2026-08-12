/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrConfig } from 'ngwr/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { WrHighlightLine } from './interfaces';
import { provideWrMarkdownHighlighter } from './provide-wr-markdown';
import { WrMarkdown } from './wr-markdown';

/**
 * What this spec asserts, and why it reads the DOM rather than the tree.
 *
 * `parse-markdown.spec.ts` already covers the tree exhaustively. What is left is
 * the half that a node tree cannot promise: that the recursive template turns it
 * into the RIGHT elements. `<ul>` owning its `<li>` directly, a `<th scope>`, a
 * `<pre>` whose whitespace survived Angular's template whitespace removal, an
 * anchor that carries `rel` whenever it carries `target` — all of those are the
 * public contract, and none of them is visible from the parser's side.
 *
 * The `.wr-*` classes are asserted deliberately too. They are public API in this
 * library (`ViewEncapsulation.None`), so consumers style against them.
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
      [headingIdPrefix]="headingIdPrefix()"
    />
  `,
})
class Host {
  readonly value = signal('');
  readonly streaming = signal(false);
  readonly copyable = signal<boolean | null>(null);
  readonly linkTarget = signal<'_blank' | '_self' | null>(null);
  readonly headingIds = signal(true);
  readonly headingIdPrefix = signal('user-content-');
}

const TICK = String.fromCharCode(96);
const FENCE = TICK + TICK + TICK;

describe('WrMarkdown', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector('wr-markdown')!;
  const q = <T extends Element>(selector: string): T | null => root().querySelector<T>(selector);
  const all = (selector: string): Element[] => Array.from(root().querySelectorAll(selector));

  const render = async (value: string): Promise<void> => {
    fixture.componentInstance.value.set(value);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const setup = (providers: unknown[] = []): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  };

  beforeEach(() => setup());

  afterEach(() => fixture.destroy());

  it('renders headings as real heading elements with linkable ids', async () => {
    await render('# One\n\n### Three');

    // Real `<h1>` / `<h3>`, not a div with `role="heading"`: the element carries
    // the level to assistive technology and to every stylesheet.
    expect(q('h1.wr-markdown__heading')!.textContent.trim()).toBe('One');
    expect(q('h3.wr-markdown__heading')!.id).toBe('user-content-three');
  });

  it('namespaces heading ids so a document cannot claim the page around it', async () => {
    // The failure this prevents is silent and severe. A document containing
    // `# Search` renders `id="search"`; if the page already has
    // `<label for="search">`, that label stops labelling its input — the control
    // loses its accessible name, and nothing anywhere reports an error. GitHub
    // emits the same `user-content-` prefix for untrusted markdown.
    const label = document.createElement('label');
    label.setAttribute('for', 'search');
    const input = document.createElement('input');
    input.id = 'search';
    document.body.append(label, input);

    try {
      await render('# Search');

      expect(q('h1')!.id).toBe('user-content-search');
      expect(label.control).toBe(input);
    } finally {
      label.remove();
      input.remove();
    }
  });

  it('points a document-internal anchor at the namespaced id', async () => {
    await render('[go](#section)\n\n## Section');

    // Otherwise the namespace would break every link the document writes about
    // itself — which is what makes the prefix affordable.
    expect(q<HTMLAnchorElement>('a')!.getAttribute('href')).toBe('#user-content-section');
    expect(q('h2')!.id).toBe('user-content-section');
  });

  it('leaves the ids bare when the prefix is emptied', async () => {
    fixture.componentInstance.headingIdPrefix.set('');
    await render('# One\n\n[go](#one)');

    // The escape hatch for a document you wrote yourself.
    expect(q('h1')!.id).toBe('one');
    expect(q<HTMLAnchorElement>('a')!.getAttribute('href')).toBe('#one');
  });

  it('numbers a repeated heading instead of emitting the id twice', async () => {
    await render('## Fixes\n\ntext\n\n## Fixes');

    // Duplicate ids are invalid, and `#fixes` would resolve to whichever came
    // first. Changelogs repeat section names constantly.
    expect(all('h2').map(h => h.id)).toEqual(['user-content-fixes', 'user-content-fixes-1']);
  });

  it('binds no id at all when the heading slugs to nothing', async () => {
    await render('# 🚀\n\n# 🎉');

    // An empty `id` is invalid, and two of them are duplicates.
    expect(all('h1').map(h => h.hasAttribute('id'))).toEqual([false, false]);
  });

  it('drops the ids when headingIds is off', async () => {
    fixture.componentInstance.headingIds.set(false);
    await render('# One');

    expect(q('h1')!.hasAttribute('id')).toBe(false);
  });

  it('renders inline emphasis as the elements that mean it', async () => {
    await render(`a **b** *c* ~~d~~ ${TICK}e${TICK}`);

    expect(q('strong')!.textContent).toBe('b');
    expect(q('em')!.textContent).toBe('c');
    expect(q('del')!.textContent).toBe('d');
    expect(q('code.wr-markdown__code-inline')!.textContent).toBe('e');
  });

  it('pins inline code to LTR, because code is not prose', async () => {
    await render(`run ${TICK}foo();${TICK}`);

    // Found the hard way during the RTL sweep: under `dir="rtl"` the browser
    // reorders `foo();` to `;foo()`.
    expect(q('code.wr-markdown__code-inline')!.getAttribute('dir')).toBe('ltr');
  });

  it('escapes raw HTML into text instead of rendering it', async () => {
    await render('<img src=x onerror="alert(1)"> and <b>bold</b>');

    // The security property the whole design exists for. Nothing in the pipeline
    // is parsed as HTML, so a hostile tag is characters on screen.
    expect(q('img')).toBeNull();
    expect(q('b')).toBeNull();
    expect(host().textContent).toContain('<img src=x onerror="alert(1)">');
  });

  it('renders a link, and adds no target or rel unless asked', async () => {
    await render('[x](https://a.b)');
    const link = q<HTMLAnchorElement>('a.wr-markdown__link')!;

    expect(link.getAttribute('href')).toBe('https://a.b');
    expect(link.hasAttribute('target')).toBe(false);
    expect(link.hasAttribute('rel')).toBe(false);
  });

  it('never lets a target out without rel="noopener noreferrer"', async () => {
    fixture.componentInstance.linkTarget.set('_blank');
    await render('[x](https://a.b)');
    const link = q<HTMLAnchorElement>('a')!;

    // A `_blank` without this hands `window.opener` to a page whose URL came out
    // of the document being rendered — which is untrusted input by construction.
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('renders a refused URL as text rather than as a dead anchor', async () => {
    await render('[click me](javascript:alert(1))');

    // Angular would sanitize this href to `unsafe:javascript:…` and leave an
    // anchor that announces as a link and does nothing.
    expect(q('a')).toBeNull();
    expect(host().textContent).toContain('click me');
  });

  it('renders an image with its alt text and lazy loading', async () => {
    await render('![a duck](/duck.png)');
    const image = q<HTMLImageElement>('img.wr-markdown__image')!;

    expect(image.getAttribute('src')).toBe('/duck.png');
    expect(image.getAttribute('alt')).toBe('a duck');
    expect(image.getAttribute('loading')).toBe('lazy');
  });

  it('keeps a code block whitespace-exact', async () => {
    const code = 'const a = 1;\n  indented\n\nafter a blank line';
    await render(`${FENCE}ts\n${code}\n${FENCE}`);

    // The case most at risk from the framework rather than from the parser:
    // Angular strips whitespace-only text nodes from templates, so the code has
    // to arrive as an interpolation. Indentation and blank lines are the content.
    expect(q('pre.wr-markdown__pre')!.textContent).toBe(code);
    expect(q('code.wr-markdown__code')!.getAttribute('data-language')).toBe('ts');
    expect(q('pre')!.getAttribute('dir')).toBe('ltr');
  });

  it('renders a tight list without paragraph wrappers', async () => {
    await render('- a\n- b');

    // CommonMark's tight/loose distinction, and the reason a two-item list does
    // not render double-spaced.
    expect(all('ul.wr-markdown__list > li.wr-markdown__item')).toHaveLength(2);
    expect(q('li p')).toBeNull();
  });

  it('renders a loose list with them', async () => {
    await render('- a\n\n- b');

    expect(all('li p.wr-markdown__paragraph')).toHaveLength(2);
  });

  it('puts nested list items inside their parent item, not beside it', async () => {
    await render('- a\n  - b');

    // The DOM shape a recursive component could not produce: a host element
    // between `<ul>` and `<li>` is invalid markup and breaks the list's
    // accessibility tree.
    expect(all('ul > li > ul > li')).toHaveLength(1);
    expect(root().querySelector('ul')!.children[0].tagName).toBe('LI');
  });

  it('carries an ordered list start attribute only when it is not 1', async () => {
    await render('3. c\n4. d');
    expect(q('ol')!.getAttribute('start')).toBe('3');

    await render('1. a');
    expect(q('ol')!.hasAttribute('start')).toBe(false);
  });

  it('renders a task item without an unlabelled form control', async () => {
    await render('- [x] done\n- [ ] todo');

    // A real `<input type="checkbox">` here has no label — a serious axe
    // violation — and making it operable would promise an interaction a renderer
    // cannot honour. The state goes to assistive tech as text instead.
    expect(q('input')).toBeNull();
    expect(all('.wr-markdown__task')).toHaveLength(2);
    expect(q('.wr-markdown__task')!.getAttribute('aria-hidden')).toBe('true');
    expect(all('.wr-markdown__sr-only').map(n => n.textContent)).toEqual(['Done:', 'To do:']);
  });

  it('renders a table with column scope and logical alignment', async () => {
    await render('| a | b |\n| :-- | --: |\n| 1 | 2 |');

    expect(all('th.wr-markdown__th').map(th => th.getAttribute('scope'))).toEqual(['col', 'col']);
    // `start` / `end`, not `left` / `right`: the alignment mirrors under RTL on
    // its own.
    expect(all('th').map(th => (th as HTMLElement).style.textAlign)).toEqual(['start', 'end']);
    expect(all('tbody td')).toHaveLength(2);
  });

  it('gives a wide table its own scroller', async () => {
    await render('| a |\n| - |\n| 1 |');

    // Without it a wide table pushes the page sideways, which is also what the
    // RTL layout gate measures.
    expect(q('.wr-markdown__table-scroll > table')).not.toBeNull();
  });

  it('renders a blockquote and a thematic break', async () => {
    await render('> quoted\n\n---');

    expect(q('blockquote.wr-markdown__quote')!.textContent.trim()).toBe('quoted');
    expect(q('hr.wr-markdown__rule')).not.toBeNull();
  });

  it('marks the host while streaming, which is what paints the caret', async () => {
    await render('partial');
    expect(host().classList.contains('wr-markdown--streaming')).toBe(false);

    fixture.componentInstance.streaming.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    // The caret is a `::after` on the last block, so the class is the whole API.
    expect(host().classList.contains('wr-markdown--streaming')).toBe(true);
  });

  it('renders a half-typed bold as bold rather than as asterisks', async () => {
    fixture.componentInstance.streaming.set(true);
    await render('almost **there');

    expect(q('strong')!.textContent).toBe('there');
    expect(host().textContent).not.toContain('**');
  });

  it('re-renders in place as the value grows', async () => {
    fixture.componentInstance.streaming.set(true);
    await render('# Title\n\nfirst');
    const heading = q('h1')!;

    await render('# Title\n\nfirst second');

    // `track $index` reuses the DOM for blocks that did not change: a growing
    // document must not tear down and rebuild everything above the cursor, or
    // text selection and scroll position are lost on every chunk.
    expect(q('h1')).toBe(heading);
    expect(q('p')!.textContent).toContain('first second');
  });
});

describe('WrMarkdown — code copy button', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  const q = <T extends Element>(selector: string): T | null =>
    (fixture.nativeElement as HTMLElement).querySelector<T>(selector);

  const write = vi.fn<(text: string) => Promise<void>>();

  beforeEach(async () => {
    write.mockReset();
    write.mockResolvedValue(undefined);
    // jsdom has no clipboard at all, so the directive would take its legacy path
    // into `execCommand`, which jsdom also lacks.
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: write },
    });

    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.copyable.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
    Reflect.deleteProperty(window.navigator, 'clipboard');
  });

  const render = async (value: string): Promise<void> => {
    fixture.componentInstance.value.set(value);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('offers a copy button on a finished block and not on an open one', async () => {
    await render(`${FENCE}ts\nconst a = 1;\n${FENCE}`);
    expect(q('button.wr-markdown__copy')).not.toBeNull();

    await render(`${FENCE}ts\nconst a = 1;`);
    // Mid-stream the snippet is not all there, and a button that copies half of
    // one is worse than no button.
    expect(q('button.wr-markdown__copy')).toBeNull();
  });

  it('offers none at all unless copyable is on', async () => {
    fixture.componentInstance.copyable.set(false);
    await render(`${FENCE}\na\n${FENCE}`);

    expect(q('button.wr-markdown__copy')).toBeNull();
  });

  it('copies the block and swaps its label for confirmation', async () => {
    await render(`${FENCE}ts\nconst a = 1;\n${FENCE}`);
    const button = q<HTMLButtonElement>('button.wr-markdown__copy')!;

    expect(button.getAttribute('aria-label')).toBe('Copy code');

    button.click();
    await fixture.whenStable();
    fixture.detectChanges();

    // The CODE, not the rendered text: a highlighted block's DOM is spans, and
    // copying its `textContent` would be right by accident and wrong the moment
    // a line number or a language badge is added.
    expect(write).toHaveBeenCalledWith('const a = 1;');
    expect(button.getAttribute('aria-label')).toBe('Copied');
  });

  it('keeps the confirmation on the block that was copied', async () => {
    await render(`${FENCE}\nfirst\n${FENCE}\n\n${FENCE}\nsecond\n${FENCE}`);
    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button.wr-markdown__copy')
    );

    buttons[0].click();
    await fixture.whenStable();
    fixture.detectChanges();

    // One shared boolean would light up every button in the document.
    expect(buttons.map(b => b.getAttribute('aria-label'))).toEqual(['Copied', 'Copy code']);
  });
});

describe('WrMarkdown — highlighting', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const mount = async (providers: unknown[], value: string): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set(value);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  afterEach(() => fixture.destroy());

  const SPANS: readonly WrHighlightLine[] = [
    [{ text: 'const', color: '#ff0000' }, { text: ' a = 1;' }],
    [{ text: 'second', fontStyle: 'italic' }],
  ];

  it('renders highlighter spans as elements with bound styles', async () => {
    await mount([provideWrMarkdownHighlighter(() => SPANS)], `${FENCE}ts\nconst a = 1;\nsecond\n${FENCE}`);

    const spans = Array.from(el().querySelectorAll<HTMLElement>('.wr-markdown__line span'));
    expect(spans.map(s => s.textContent)).toEqual(['const', ' a = 1;', 'second']);
    // Spans and bound styles rather than an HTML string: nothing here needed
    // `bypassSecurityTrustHtml`, which is the entire reason the highlighter
    // signature returns data.
    expect(spans[0].style.color).toBe('rgb(255, 0, 0)');
    expect(spans[2].style.fontStyle).toBe('italic');
  });

  it('keeps the lines separated by real newlines', async () => {
    await mount([provideWrMarkdownHighlighter(() => SPANS)], `${FENCE}ts\nconst a = 1;\nsecond\n${FENCE}`);

    // What a reader copies out of a highlighted block has to still be code.
    expect(el().querySelector('pre')!.textContent).toBe('const a = 1;\nsecond');
  });

  it('renders plain code first and colours it when an async highlighter resolves', async () => {
    let release: ((lines: readonly WrHighlightLine[]) => void) | null = null;
    const pending = new Promise<readonly WrHighlightLine[]>(resolve => (release = resolve));

    await mount([provideWrMarkdownHighlighter(() => pending)], `${FENCE}ts\nconst a = 1;\nsecond\n${FENCE}`);

    // A grammar engine loads WASM. Waiting for it would leave the reader with a
    // blank block, so the text goes up immediately and gains colour after.
    expect(el().querySelector('.wr-markdown__line')).toBeNull();
    expect(el().querySelector('pre')!.textContent).toBe('const a = 1;\nsecond');

    release!(SPANS);
    await pending;
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el().querySelectorAll('.wr-markdown__line')).toHaveLength(2);
  });

  it('falls back to plain code when the highlighter throws or declines', async () => {
    await mount(
      [
        provideWrMarkdownHighlighter(() => {
          throw new Error('no grammar');
        }),
      ],
      `${FENCE}ts\nconst a = 1;\n${FENCE}`
    );

    // A highlighter that throws on an unknown language must cost the reader
    // colour, not the content.
    expect(el().querySelector('pre')!.textContent).toBe('const a = 1;');
  });

  it('does not ask for a language it was never given', async () => {
    const highlighter = vi.fn(() => SPANS);
    await mount([provideWrMarkdownHighlighter(highlighter)], `${FENCE}\nplain\n${FENCE}`);

    // A bare fence has no grammar to pick, so there is nothing to ask for.
    expect(highlighter).not.toHaveBeenCalled();
  });

  it('asks once per distinct block, however often it re-renders', async () => {
    const highlighter = vi.fn(() => SPANS);
    await mount([provideWrMarkdownHighlighter(highlighter)], `${FENCE}ts\nconst a = 1;\nsecond\n${FENCE}`);

    const calls = highlighter.mock.calls.length;
    fixture.componentInstance.streaming.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    // The template asks on every change detection; the cache is what stops a
    // grammar engine running on every keystroke of a stream.
    expect(highlighter.mock.calls.length).toBe(calls);
  });
});

describe('WrMarkdown — config defaults', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  const q = <T extends Element>(selector: string): T | null =>
    (fixture.nativeElement as HTMLElement).querySelector<T>(selector);

  const mount = async (value: string): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideWrConfig({ markdown: { linkTarget: '_blank', copyable: true } })],
    });
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set(value);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  afterEach(() => fixture.destroy());

  it('takes both defaults from provideWrConfig', async () => {
    await mount(`[x](https://a.b)\n\n${FENCE}\na\n${FENCE}`);

    // Whether links open in a new tab, and whether code carries a copy button,
    // are app-wide policy — which is the test a config key has to pass.
    expect(q('a')!.getAttribute('target')).toBe('_blank');
    expect(q('button.wr-markdown__copy')).not.toBeNull();
  });

  it('lets a bound value win over the configured one', async () => {
    await mount('[x](https://a.b)');
    fixture.componentInstance.linkTarget.set('_self');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(q('a')!.getAttribute('target')).toBe('_self');
  });

  it('lets a bound false turn a configured true back off', async () => {
    await mount(`${FENCE}\na\n${FENCE}`);
    fixture.componentInstance.copyable.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    // The NG-ZORRO lesson, and the reason `useConfigValue` checks for `null`
    // rather than for falsiness: a config nobody can escape is a config that
    // every template has to re-state.
    expect(q('button.wr-markdown__copy')).toBeNull();
  });
});

/**
 * Defects found by auditing the first draft, each one reproduced before it was
 * fixed. The first two are the kind that a spec is the only realistic guard for: a
 * runaway effect does not fail a test, it starves the timer that was supposed to.
 */
describe('WrMarkdown — regressions', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const mount = async (providers: unknown[], value: string, copyable = false): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set(value);
    if (copyable) fixture.componentInstance.copyable.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  afterEach(() => fixture.destroy());

  it('settles on a document with more code blocks than the highlight cache holds', async () => {
    const highlighter = vi.fn(() => [[{ text: 'x' }]]);
    const blocks = Array.from({ length: 300 }, (_, i) => `${FENCE}ts\nconst v${i} = ${i};\n${FENCE}`).join('\n\n');

    await mount([provideWrMarkdownHighlighter(highlighter)], blocks);

    // The first version of the highlight service kept its answers in a signal and
    // rebuilt it on every store, so the effect that requests highlighting depended
    // on the signal that requesting wrote. Past the cache limit that is an
    // infinite loop — and not a slow one: it starved the 20s test timeout and had
    // to be measured by starving the highlighter instead. One call per block is
    // the whole assertion.
    expect(highlighter).toHaveBeenCalledTimes(300);
    expect(el().querySelectorAll('pre')).toHaveLength(300);
  });

  it('keeps a finished block highlighted while later blocks churn', async () => {
    const highlighter = vi.fn(() => [[{ text: 'coloured' }]]);
    await mount([provideWrMarkdownHighlighter(highlighter)], `${FENCE}ts\ndone()\n${FENCE}`);

    // Eviction used to run oldest-first over the request log, which is exactly
    // backwards mid-stream: it discarded the finished block the reader was looking
    // at and kept the half-typed intermediates, so a coloured block flashed back
    // to plain text. Reads move an entry to the back of the queue now.
    const growing = Array.from({ length: 40 }, (_, i) => 'x'.repeat(i + 1));
    for (const partial of growing) {
      fixture.componentInstance.value.set(`${FENCE}ts\ndone()\n${FENCE}\n\n${FENCE}ts\n${partial}`);
      fixture.detectChanges();
      await fixture.whenStable();
    }

    expect(el().querySelector('pre .wr-markdown__line')).not.toBeNull();
  });

  it('lights up only the button of the block that was copied', async () => {
    const write = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: { writeText: write } });

    try {
      // The same one-liner twice, which any document that shows a command before
      // and after an edit contains. Keyed on the code STRING, both buttons lit up.
      await mount([], `${FENCE}ts\nsame()\n${FENCE}\n\ntext\n\n${FENCE}ts\nsame()\n${FENCE}`, true);

      const buttons = Array.from(el().querySelectorAll<HTMLButtonElement>('button.wr-markdown__copy'));
      expect(buttons).toHaveLength(2);

      buttons[0].click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(buttons.map(b => b.getAttribute('aria-label'))).toEqual(['Copied', 'Copy code']);
    } finally {
      Reflect.deleteProperty(window.navigator, 'clipboard');
    }
  });

  it('makes both scrollable regions reachable from the keyboard', async () => {
    await mount([], `${FENCE}ts\nconst wide = 1;\n${FENCE}\n\n| a |\n| - |\n| 1 |`);

    // axe's `scrollable-region-focusable`, at serious level — a keyboard-only user
    // cannot scroll a wide snippet or a wide table otherwise. Neither a11y gate
    // sees it: `check:a11y` runs in JSDOM with no layout, so nothing ever
    // overflows, and `check:contrast` only enables two rules.
    expect(el().querySelector('pre')!.getAttribute('tabindex')).toBe('0');
    expect(el().querySelector('.wr-markdown__table-scroll')!.getAttribute('tabindex')).toBe('0');
  });

  it('draws the copy button without depending on a registered icon set', async () => {
    const write = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: { writeText: write } });

    try {
      await mount([], `${FENCE}ts\na()\n${FENCE}`, true);

      // The button's entire visible content used to be `<wr-icon name="copy">`, so
      // an app that had not registered that icon rendered an empty button and
      // logged a warning on every change detection. `wr-select` inlines its × for
      // the same reason.
      expect(el().querySelector('button.wr-markdown__copy svg')).not.toBeNull();
      expect(el().querySelector('wr-icon')).toBeNull();
    } finally {
      Reflect.deleteProperty(window.navigator, 'clipboard');
    }
  });
});

/**
 * `copyable` as a bare attribute. This is a COMPILE-time assertion as much as a
 * runtime one: the component's own JSDoc example was written this way and did not
 * build, because an attribute with no value arrives as `''` and the input had no
 * transform.
 */
@Component({
  imports: [WrMarkdown],
  template: `<wr-markdown copyable [value]="value" />`,
})
class BareAttributeHost {
  readonly value = `${FENCE}ts\na()\n${FENCE}`;
}

describe('WrMarkdown — bare boolean attribute', () => {
  it('reads a valueless copyable attribute as true', async () => {
    TestBed.resetTestingModule();
    const fixture = TestBed.createComponent(BareAttributeHost);
    fixture.detectChanges();
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelector('button.wr-markdown__copy')).not.toBeNull();
    fixture.destroy();
  });
});
