/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrCopyValueHarnessFilters } from './types';

/**
 * Test harness for one `<wr-copy-value>` — a value and the button that copies it.
 *
 * It answers from what the component renders: the value's text node, the button's
 * accessible name, the polite status region and the public `wr-copy-value--*`
 * modifiers. Two things are absent on purpose. Whether a long value is TRUNCATED is
 * a measured box, and jsdom has no layout, so the answer would be the same for a
 * working component and a broken one; {@link getTitle} reads the full text the
 * truncated value keeps instead. And what reached the CLIPBOARD is not the
 * component's to report: stub `navigator.clipboard.writeText` in the spec and
 * assert the call.
 *
 * @example
 * ```ts
 * const loader = TestbedHarnessEnvironment.loader(fixture);
 * const id = await loader.getHarness(WrCopyValueHarness.with({ value: 'ORD-1042' }));
 *
 * await id.copy();
 * expect(await id.isCopied()).toBe(true);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrCopyValueHarness extends ComponentHarness {
  static hostSelector = 'wr-copy-value';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrCopyValueHarnessFilters = {}): HarnessPredicate<WrCopyValueHarness> {
    return new HarnessPredicate(WrCopyValueHarness, options)
      .addOption('value', options.value, (harness, value) => HarnessPredicate.stringMatches(harness.getValue(), value))
      .addOption('empty', options.empty, async (harness, empty) => (await harness.isEmpty()) === empty);
  }

  private readonly text = this.locatorForOptional('.wr-copy-value__text');
  private readonly button = this.locatorForOptional('button.wr-copy-value__button');

  /**
   * The value shown, or `null` when it is empty.
   *
   * `null` rather than the placeholder: the dash is not the value, and a spec that
   * compared against it would pass on a component showing a real `-`.
   * {@link getEmptyText} reads the placeholder.
   */
  async getValue(): Promise<string | null> {
    const text = await this.text();
    if (text === null) return null;
    // Under `wrap` the last word sits in the tail, beside the button.
    const tail = await this.locatorFor('.wr-copy-value__tail')();
    const raw = async (el: typeof text): Promise<string> => (await el.getProperty<string>('textContent')) ?? '';
    return ((await raw(text)) + (await raw(tail))).trim();
  }

  /**
   * Whether the value is empty: no value and no button, the placeholder in their
   * place. Read from what is rendered rather than from the `wr-copy-value--empty`
   * modifier, which could be lost while the button is still withheld.
   */
  async isEmpty(): Promise<boolean> {
    return (await this.text()) === null && (await this.button()) === null;
  }

  /** The placeholder an empty value shows (`emptyLabel`). Throws when there is a value. */
  async getEmptyText(): Promise<string> {
    const empty = await this.locatorForOptional('.wr-copy-value__empty')();
    if (!empty) {
      throw new Error(
        'WrCopyValueHarness.getEmptyText(): the component shows a value, so it renders no placeholder. ' +
          'Ask getValue() instead.'
      );
    }
    return empty.text();
  }

  /**
   * The full text a truncated value keeps in its `title`, or `null` under `wrap`,
   * where nothing is cut and the attribute is not written.
   */
  async getTitle(): Promise<string | null> {
    return (await (await this.text())?.getAttribute('title')) ?? null;
  }

  /** Whether the value wraps instead of truncating, from the `wr-copy-value--wrap` modifier. */
  async isWrapped(): Promise<boolean> {
    return (await this.host()).hasClass('wr-copy-value--wrap');
  }

  /** The button's accessible name (`copyLabel`). Throws when the value is empty. */
  async getCopyLabel(): Promise<string | null> {
    return (await this.requireButton('getCopyLabel')).getAttribute('aria-label');
  }

  /**
   * Click the copy button. Throws when the value is empty, since there is no button.
   *
   * The write itself is asynchronous and may be refused, so this resolving says a
   * click happened, not that anything was copied: ask {@link isCopied} afterwards.
   */
  async copy(): Promise<void> {
    return (await this.requireButton('copy')).click();
  }

  /**
   * Whether the component is showing its "copied" state, which lasts a moment after
   * a successful write.
   *
   * Both halves, because they reach different people: the modifier flips the glyph
   * to a tick, the status region is what a screen reader hears. One without the
   * other is a copy that half the users are not told about.
   */
  async isCopied(): Promise<boolean> {
    const flagged = await (await this.host()).hasClass('wr-copy-value--copied');
    return flagged && (await this.getStatusText()) !== '';
  }

  /** The text in the polite status region: `copiedLabel` after a copy, empty otherwise. */
  async getStatusText(): Promise<string> {
    return (await (await this.locatorForOptional('.wr-copy-value__status')())?.text()) ?? '';
  }

  /** Move keyboard focus to the copy button. Throws when the value is empty. */
  async focus(): Promise<void> {
    return (await this.requireButton('focus')).focus();
  }

  /** Whether the copy button holds focus. An empty value has nothing to focus. */
  async isFocused(): Promise<boolean> {
    return (await (await this.button())?.isFocused()) ?? false;
  }

  private async requireButton(method: string): Promise<NonNullable<Awaited<ReturnType<typeof this.button>>>> {
    const button = await this.button();
    if (!button) {
      throw new Error(
        `WrCopyValueHarness.${method}(): the value is empty, and an empty value renders no copy button. ` +
          'Check isEmpty() first.'
      );
    }
    return button;
  }
}
