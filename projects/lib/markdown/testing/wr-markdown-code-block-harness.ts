/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrMarkdownCodeBlockHarnessFilters } from './interfaces';

/**
 * Test harness for one fenced code block of a `<wr-markdown>` document.
 *
 * A block of its own rather than a field on the document harness, because it is
 * the one piece of rendered markdown that has BEHAVIOUR: it carries a language, it
 * may or may not be coloured yet, and it may offer a copy button — three states
 * that belong to the block and not to the page it is on.
 *
 * Its host is the `.wr-markdown__code-block` wrapper, which is what holds the
 * `<pre>` and the copy button together. Blocks nested inside a quote or a list item
 * are blocks too, and this harness finds them: `<wr-markdown>` renders them the
 * same way, and the copy affordance is theirs as well.
 *
 * @example
 * ```ts
 * const block = await (await loader.getHarness(WrMarkdownHarness)).getCodeBlock({ language: 'ts' });
 *
 * expect(await block.getCode()).toBe('const a = 1;');
 * await block.copy();
 * ```
 *
 * @see https://ngwr.dev/reference/components/markdown
 * @see https://ngwr.dev/guides/testing
 */
export class WrMarkdownCodeBlockHarness extends ComponentHarness {
  static hostSelector = '.wr-markdown__code-block';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrMarkdownCodeBlockHarnessFilters = {}): HarnessPredicate<WrMarkdownCodeBlockHarness> {
    return new HarnessPredicate(WrMarkdownCodeBlockHarness, options)
      .addOption('language', options.language, (harness, language) =>
        HarnessPredicate.stringMatches(harness.getLanguage(), language)
      )
      .addOption('code', options.code, (harness, code) => HarnessPredicate.stringMatches(harness.getCode(), code));
  }

  private readonly pre = this.locatorFor('pre.wr-markdown__pre');
  private readonly code = this.locatorFor('code.wr-markdown__code');
  private readonly copyButton = this.locatorForOptional('button.wr-markdown__copy');

  /**
   * The block's language — the info string's first word, lowercased — or `null` for
   * a bare fence.
   *
   * Read from `data-language`, which is the only place it reaches the DOM, and the
   * reason it is there at all: a highlighter picks a grammar by it, and the
   * showcase's markdown export needs it to re-fence the block. `null` is a real
   * answer, not a gap: a bare fence names no grammar, so nothing is ever asked to
   * colour it.
   */
  async getLanguage(): Promise<string | null> {
    return (await this.code()).getAttribute('data-language');
  }

  /**
   * The block's code, EXACTLY — every space, every blank line, every newline.
   *
   * Nothing is collapsed here, unlike every prose read on the document harness,
   * and it is read off the `<pre>` rather than off the host so the copy button is
   * not part of the answer. Two failures live in this one string. Angular strips
   * whitespace-only text nodes from templates, so the code has to arrive as an
   * interpolation — a template that types it instead loses the indentation. And a
   * HIGHLIGHTED block is not one text node but a span per token: what separates its
   * lines is a real `\n` interpolated between them, so a spec that only ever
   * asserts the unhighlighted case would not notice a highlighted block copying out
   * as one run-together line.
   */
  async getCode(): Promise<string> {
    return (await (await this.pre()).getProperty<string | null>('textContent')) ?? '';
  }

  /**
   * Whether the block is coloured right now.
   *
   * A block is plain text until a highlighter answers for it, and that is the
   * intended order rather than a compromise: a grammar engine loads WASM, and
   * blocking on it would leave the reader with an empty box instead of their code.
   * So this is `false` with no `WR_MARKDOWN_HIGHLIGHTER` provided, `false` for a
   * language the highlighter declined or threw on, `false` under SSR — a
   * highlighter resolving after prerender cannot contribute to the HTML — and
   * `false` for the first render of an async one.
   */
  async isHighlighted(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-markdown__line')()) !== null;
  }

  /**
   * Whether this block offers a copy button.
   *
   * Two conditions, and both are the component's policy rather than an accident:
   * `copyable` has to be on (bound, or defaulted through
   * `provideWrConfig({ markdown: { copyable: true } })`), and the fence has to be
   * CLOSED. Mid-stream a block's code is not all there, and a button that copies
   * half a snippet is worse than no button.
   */
  async canCopy(): Promise<boolean> {
    return (await this.copyButton()) !== null;
  }

  /**
   * The copy button's accessible name, or `null` when there is no button.
   *
   * Worth reading rather than assuming, because it is the whole of the copy
   * feedback: the button swaps its label — and its icon — for the "copied" one for
   * two seconds after a successful write, and both strings come from the i18n
   * catalog (`markdown.copy` / `markdown.copied`) or the matching inputs. Which is
   * also why this harness reports the name instead of a `isCopied()` boolean: only
   * the consuming app knows which of its own two strings means which.
   */
  async getCopyLabel(): Promise<string | null> {
    const button = await this.copyButton();
    return button ? button.getAttribute('aria-label') : null;
  }

  /**
   * Copy the block, the way a pointer does.
   *
   * Throws when there is no button, naming both reasons — a silent no-op here
   * surfaces as an empty clipboard assertion several lines later. Note what a
   * successful click needs from the environment: the directive behind the button
   * writes through `navigator.clipboard`, which jsdom does not implement at all, so
   * a unit test has to stand one in before the write can succeed and the label can
   * swap.
   */
  async copy(): Promise<void> {
    const button = await this.copyButton();
    if (!button) {
      throw new Error(
        'WrMarkdownCodeBlockHarness.copy(): this block has no copy button. Either `copyable` is off — it ' +
          'falls back to `markdown.copyable` from provideWrConfig(), then to false — or the fence is still ' +
          'open, and <wr-markdown> only offers one on a CLOSED block.'
      );
    }
    await button.click();
  }
}
