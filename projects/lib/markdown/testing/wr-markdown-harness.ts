/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, type TestElement } from '@angular/cdk/testing';

import type {
  WrMarkdownCodeBlockHarnessFilters,
  WrMarkdownHarnessAlign,
  WrMarkdownHarnessFilters,
  WrMarkdownHarnessHeading,
  WrMarkdownHarnessImage,
  WrMarkdownHarnessLink,
  WrMarkdownHarnessTable,
  WrMarkdownHarnessTaskItem,
} from './interfaces';
import { WrMarkdownCodeBlockHarness } from './wr-markdown-code-block-harness';
import { wrMarkdownHarnessText } from './wr-markdown-harness-text';

/**
 * The task-state label — hidden from the page, read out in front of the item.
 *
 * Left out of every prose read here, so a spec asserting an item's text does not
 * have to know that `'Done: '` is spliced in front of it. It is not lost: it is a
 * field of its own on {@link WrMarkdownHarnessTaskItem}, which is where its
 * absence is a failure rather than a nuisance.
 */
const SR_ONLY = '.wr-markdown__sr-only';

/** The alignment the renderer wrote as an inline style, if it wrote one. */
const TEXT_ALIGN_RE = /text-align:\s*([a-z]+)/;

/** Every prose read goes through here: collapsed, and without the hidden labels. */
async function proseText(element: TestElement): Promise<string> {
  return wrMarkdownHarnessText(await element.text({ exclude: SR_ONLY }));
}

/**
 * A cell's or a header's alignment, read off the inline `style` attribute.
 *
 * Not through `getCssValue()`, and the difference is not cosmetic: a column the
 * delimiter row said nothing about carries no declaration at all, and computed
 * style answers for it anyway — with whatever the user-agent stylesheet says a
 * `<th>` or a `<td>` is aligned to. That makes "no alignment" indistinguishable
 * from `center`, in the one direction that matters (a `<th>` centres by default),
 * and it makes the answer depend on the browser rather than on the document. The
 * attribute is what the component wrote, which is the fact being asserted.
 */
async function alignOf(cell: TestElement): Promise<WrMarkdownHarnessAlign> {
  const match = TEXT_ALIGN_RE.exec((await cell.getAttribute('style')) ?? '');

  switch (match?.[1]) {
    case 'start':
      return 'start';
    case 'center':
      return 'center';
    case 'end':
      return 'end';
    default:
      return null;
  }
}

/**
 * One body row of a rendered table.
 *
 * Not exported, and not because rows do not matter: a `TestElement` cannot be
 * queried INTO, so reading one row's own cells needs a harness rooted on that row.
 * Nothing here is drivable — rendered prose is inert — so the row's job is to hand
 * its cells up to {@link WrMarkdownHarness.getTables}, which is where a consumer
 * asserts the whole table in one comparison.
 */
class WrMarkdownTableRowReader extends ComponentHarness {
  /** Body rows only: the header row lives in the `<thead>`. */
  static hostSelector = 'tbody tr';

  async getCellTexts(): Promise<string[]> {
    const cells = await this.locatorForAll('.wr-markdown__td')();
    return Promise.all(cells.map(cell => proseText(cell)));
  }
}

/**
 * One rendered task-list item — a harness for the same reason as the row reader.
 *
 * Its three reads have to be SCOPED to the item: querying the tick and the hidden
 * label from the document root would hand every item in the document the first
 * one's state, which is the kind of green spec that reports a broken checklist as
 * intact. A nested task list lives inside its parent `<li>`, and the parent's own
 * tick and label are rendered before it — so the first match under an item is
 * always the item's own.
 */
class WrMarkdownTaskItemReader extends ComponentHarness {
  static hostSelector = '.wr-markdown__item--task';

  private readonly tick = this.locatorForOptional('.wr-markdown__task--checked');
  private readonly stateLabel = this.locatorForOptional(SR_ONLY);

  async read(): Promise<WrMarkdownHarnessTaskItem> {
    const label = await this.stateLabel();

    return {
      text: await proseText(await this.host()),
      checked: (await this.tick()) !== null,
      stateLabel: label ? await label.text() : null,
    };
  }
}

/** One rendered table — see {@link WrMarkdownTableRowReader} for why this is a harness. */
class WrMarkdownTableReader extends ComponentHarness {
  static hostSelector = 'table.wr-markdown__table';

  async read(): Promise<WrMarkdownHarnessTable> {
    const headers = await this.locatorForAll('th.wr-markdown__th')();
    const rows = await this.locatorForAll(WrMarkdownTableRowReader)();

    return {
      headers: await Promise.all(headers.map(header => proseText(header))),
      rows: await Promise.all(rows.map(row => row.getCellTexts())),
      align: await Promise.all(headers.map(header => alignOf(header))),
    };
  }
}

/**
 * Test harness for `<wr-markdown>`, with {@link WrMarkdownCodeBlockHarness} for one
 * fenced code block.
 *
 * What a consumer of a markdown renderer actually asserts is that a piece of
 * SOURCE became the right DOM, so everything here reads rendered elements: the
 * heading levels, the `href` / `target` / `rel` triple on a link, the tick state of
 * a task item, a table as a rectangle of text. The parse tree is not exposed on
 * purpose — `parseMarkdown()` is a pure function with its own spec, and a harness
 * that reported its nodes would pass straight through the half that breaks people,
 * which is the template between the tree and the page.
 *
 * Three things worth knowing before writing expectations:
 *
 * - **Prose reads are whitespace-collapsed, code is not.** A soft line break inside
 *   a paragraph is a real `\n` in the DOM (CommonMark says CSS collapses it), so
 *   every text answer here is normalized to the line a reader sees.
 *   {@link WrMarkdownCodeBlockHarness.getCode} is the exception and reads its
 *   snippet exactly.
 * - **The hidden task-state labels are left out of prose.** They are announced text,
 *   not visible text; {@link getTaskItems} reports them as a field.
 * - **Everything is flat and in document order.** Markdown nests — a quote holds
 *   blocks, a list item holds blocks — and these readers do not re-derive that
 *   hierarchy: {@link getCodeBlocks} finds a block inside a quote, and a nested
 *   list item's text is part of its parent's, because that is what the DOM says.
 *
 * @example
 * ```ts
 * const md = await loader.getHarness(WrMarkdownHarness);
 *
 * expect(await md.getHeadings()).toEqual([{ level: 1, text: 'Release notes', id: 'release-notes' }]);
 * expect(await md.getLinks()).toEqual([
 *   { text: 'the docs', href: 'https://ngwr.dev', title: null, target: '_blank', rel: 'noopener noreferrer' },
 * ]);
 * ```
 *
 * @see https://ngwr.dev/reference/components/markdown
 * @see https://ngwr.dev/guides/testing
 */
export class WrMarkdownHarness extends ComponentHarness {
  static hostSelector = 'wr-markdown';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrMarkdownHarnessFilters = {}): HarnessPredicate<WrMarkdownHarness> {
    return new HarnessPredicate(WrMarkdownHarness, options)
      .addOption('text', options.text, (harness, text) => HarnessPredicate.stringMatches(harness.getText(), text))
      .addOption('headingText', options.headingText, async (harness, text) => {
        for (const heading of await harness.getHeadings()) {
          if (await HarnessPredicate.stringMatches(heading.text, text)) return true;
        }
        return false;
      })
      .addOption('codeLanguage', options.codeLanguage, async (harness, language) => {
        for (const block of await harness.getCodeBlocks()) {
          if (await HarnessPredicate.stringMatches(block.getLanguage(), language)) return true;
        }
        return false;
      })
      .addOption(
        'streaming',
        options.streaming,
        async (harness, streaming) => (await harness.isStreaming()) === streaming
      );
  }

  /**
   * The whole document as text — whitespace collapsed, the hidden task-state labels
   * left out.
   *
   * The coarse read, and the useful one for the security cases: raw HTML in the
   * source is ESCAPED rather than rendered, so `<img onerror=…>` shows up here as
   * characters, and a refused `javascript:` URL leaves its label behind as text with
   * no anchor around it. A code block's newlines are collapsed like everything else
   * — {@link getCodeBlocks} is where a snippet stays exact.
   *
   * It is `textContent`, which means sibling BLOCKS are not separated: a document of
   * `<h1>Title</h1><p>Body</p>` reads as `'TitleBody'`, because the renderer emits
   * no whitespace between them and none is invented here. Assert a fragment with
   * `toContain`, or read the blocks themselves — {@link getHeadings},
   * {@link getParagraphs} — when the boundary matters.
   */
  async getText(): Promise<string> {
    return proseText(await this.host());
  }

  /**
   * Whether the component rendered nothing at all.
   *
   * True for an empty `value`, and for one that parses to nothing — a lone `<!--`
   * or whitespace. Distinct from `getText() === ''`, which a document made only of
   * a thematic break or an image would also answer.
   */
  async isEmpty(): Promise<boolean> {
    const host = await this.host();
    if ((await host.getProperty<number>('childElementCount')) > 0) return false;
    return (await this.getText()) === '';
  }

  /**
   * Whether the document is being streamed.
   *
   * Read from the `--streaming` host modifier rather than from the input, because
   * the modifier is the whole public API of the feature on the styling side: it is
   * what paints the caret after the last block. What it does NOT say is that
   * partial-safe parsing is on — the same input drives both, but only this reaches
   * the DOM.
   */
  async isStreaming(): Promise<boolean> {
    return (await this.host()).hasClass('wr-markdown--streaming');
  }

  /** Every heading, in document order. */
  async getHeadings(): Promise<WrMarkdownHarnessHeading[]> {
    const headings = await this.locatorForAll('.wr-markdown__heading')();

    return Promise.all(
      headings.map(async heading => ({
        // `H3` → 3. The element is where the level lives; see the field's docs.
        level: Number.parseInt((await heading.getProperty<string>('tagName')).slice(1), 10),
        text: await proseText(heading),
        id: await heading.getAttribute('id'),
      }))
    );
  }

  /**
   * The text of every paragraph, in document order.
   *
   * Including the ones inside a LOOSE list item — CommonMark drops the `<p>` in a
   * tight list and keeps it in a loose one, which is what stops a one-line list from
   * rendering double-spaced, so an empty answer for `- a\n- b` is the correct one
   * rather than a missed paragraph.
   */
  async getParagraphs(): Promise<string[]> {
    const paragraphs = await this.locatorForAll('.wr-markdown__paragraph')();
    return Promise.all(paragraphs.map(paragraph => proseText(paragraph)));
  }

  /**
   * Every link, in document order, with the attributes that make it safe.
   *
   * A URL the renderer refused is NOT here — it renders as plain text instead of as
   * a live anchor that announces as a link and does nothing — so an empty answer
   * where a link was expected is the sanitizer speaking, and {@link getText} still
   * has the label.
   */
  async getLinks(): Promise<WrMarkdownHarnessLink[]> {
    const links = await this.locatorForAll('.wr-markdown__link')();

    return Promise.all(
      links.map(async link => ({
        text: await proseText(link),
        href: await link.getAttribute('href'),
        title: await link.getAttribute('title'),
        target: await link.getAttribute('target'),
        rel: await link.getAttribute('rel'),
      }))
    );
  }

  /**
   * Every image, in document order.
   *
   * A refused source renders no image at all and leaves the alt text as prose,
   * which is the information the author actually wrote — so assert this together
   * with {@link getText} when the point is the refusal.
   */
  async getImages(): Promise<WrMarkdownHarnessImage[]> {
    const images = await this.locatorForAll('.wr-markdown__image')();

    return Promise.all(
      images.map(async image => ({
        src: await image.getAttribute('src'),
        alt: await image.getAttribute('alt'),
        title: await image.getAttribute('title'),
      }))
    );
  }

  /**
   * The text of every inline code span, in document order.
   *
   * A different element from a fenced block (`<code>` on its own, not inside a
   * `<pre>`), and never one of {@link getCodeBlocks}. Read exactly rather than
   * collapsed, for the same reason a block is: this is code, and the spacing in it
   * is content.
   */
  async getInlineCode(): Promise<string[]> {
    const spans = await this.locatorForAll('.wr-markdown__code-inline')();
    return Promise.all(spans.map(async span => (await span.getProperty<string | null>('textContent')) ?? ''));
  }

  /**
   * The fenced code blocks, in document order — nested ones included.
   *
   * A block inside a quote or a list item is a block: it renders the same way and it
   * gets the same copy affordance, so leaving it out would report a document as
   * having no code because its snippet is indented under a bullet.
   */
  async getCodeBlocks(filters: WrMarkdownCodeBlockHarnessFilters = {}): Promise<WrMarkdownCodeBlockHarness[]> {
    return this.locatorForAll(WrMarkdownCodeBlockHarness.with(filters))();
  }

  /**
   * The first code block matching the filters.
   *
   * Throws when nothing matches, naming the languages the document does offer —
   * a `getCodeBlocks(…)[0]` that quietly resolves to `undefined` fails several lines
   * later, on an unrelated line, with `Cannot read properties of undefined`.
   */
  async getCodeBlock(filters: WrMarkdownCodeBlockHarnessFilters = {}): Promise<WrMarkdownCodeBlockHarness> {
    const [block] = await this.getCodeBlocks(filters);
    if (block) return block;

    const languages = await Promise.all((await this.getCodeBlocks()).map(other => other.getLanguage()));
    const offered =
      languages.length > 0
        ? `This document has ${languages.length} block(s), in: ${languages.map(name => name ?? '(none)').join(', ')}.`
        : 'This document renders no code blocks at all.';

    throw new Error(`WrMarkdownHarness.getCodeBlock(): no block matched ${JSON.stringify(filters)}. ${offered}`);
  }

  /**
   * The text of every list item, in document order.
   *
   * Bullets, numbers and task items alike — a task item's tick state is in
   * {@link getTaskItems} instead. NESTING is not re-derived: a nested list lives
   * INSIDE its parent `<li>` (which is what makes the list's accessibility tree
   * valid), so a parent's text contains its children's, and each child is also an
   * entry of its own.
   */
  async getListItems(): Promise<string[]> {
    const items = await this.locatorForAll('.wr-markdown__item')();
    return Promise.all(items.map(item => proseText(item)));
  }

  /**
   * Every task-list item (`- [x]` / `- [ ]`), in document order.
   *
   * Ordinary items are not here, so the count is the number of checkboxes in the
   * document. Both halves of each entry are worth asserting: the `checked` flag is
   * what a reader sees, and `stateLabel` is the only thing a screen reader gets —
   * the tick itself is `aria-hidden`.
   */
  async getTaskItems(): Promise<WrMarkdownHarnessTaskItem[]> {
    const items = await this.locatorForAll(WrMarkdownTaskItemReader)();
    return Promise.all(items.map(item => item.read()));
  }

  /** Every table, in document order, each as a rectangle of text plus its alignment. */
  async getTables(): Promise<WrMarkdownHarnessTable[]> {
    const tables = await this.locatorForAll(WrMarkdownTableReader)();
    return Promise.all(tables.map(table => table.read()));
  }

  /**
   * The text of every blockquote, in document order.
   *
   * A quote holds BLOCKS, so this is everything inside it collapsed to one line —
   * its paragraphs are also in {@link getParagraphs} and a snippet inside it is
   * also one of {@link getCodeBlocks}.
   */
  async getQuotes(): Promise<string[]> {
    const quotes = await this.locatorForAll('.wr-markdown__quote')();
    return Promise.all(quotes.map(quote => proseText(quote)));
  }

  /**
   * How many thematic breaks the document rendered.
   *
   * A count rather than a list because an `<hr>` has no content — and it is worth
   * counting: `---` is the one construct this renderer resolves differently from
   * some others (it is always a break here, never a setext heading underline), so a
   * document that lost a rule gained a heading somewhere.
   */
  async getRuleCount(): Promise<number> {
    return (await this.locatorForAll('.wr-markdown__rule')()).length;
  }
}
