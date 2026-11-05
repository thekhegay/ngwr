/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, TestKey } from '@angular/cdk/testing';

import { WrTextareaHarness } from 'ngwr/textarea/testing';

import type { WrCommentComposerHarnessFilters } from './types';

/**
 * Test harness for `<wr-comment-composer>`: a chat composer, which is a
 * `<wr-textarea>` with a send button beside it.
 *
 * The field is driven through {@link WrTextareaHarness}, handed out by
 * {@link getField}, rather than re-queried here: one harness per element, so
 * the two cannot drift. What this one adds is the sending half - whether a
 * send would go through, and the two ways a user triggers one.
 *
 * Nothing here answers "did it send". The composer emits the text through an
 * output and keeps no record, so the spec listens to `(send)` on its own host.
 * What IS readable afterwards is the draft: with `clearOnSend` the field is
 * empty once the text is out, and {@link getValue} says so.
 *
 * There is no IME method. jsdom fires no composition events, and a harness
 * that set `isComposing` by hand would be testing its own flag; a spec that
 * needs that path dispatches the keydown itself.
 *
 * @example
 * ```ts
 * const composer = await loader.getHarness(WrCommentComposerHarness.with({ placeholder: 'Message' }));
 *
 * await composer.setValue('On my way');
 * await composer.pressEnter();
 * expect(await composer.getValue()).toBe('');
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrCommentComposerHarness extends ComponentHarness {
  static hostSelector = 'wr-comment-composer';

  /** Build a predicate that narrows the query - pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrCommentComposerHarnessFilters = {}): HarnessPredicate<WrCommentComposerHarness> {
    return new HarnessPredicate(WrCommentComposerHarness, options)
      .addOption('value', options.value, (harness, value) => HarnessPredicate.stringMatches(harness.getValue(), value))
      .addOption('placeholder', options.placeholder, (harness, placeholder) =>
        HarnessPredicate.stringMatches(harness.getPlaceholder(), placeholder)
      )
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled);
  }

  private readonly field = this.locatorFor(WrTextareaHarness);
  // The one thing read past the field's harness: a keystroke has to land on
  // the native element, and `WrTextareaHarness` types values, not keys.
  private readonly native = this.locatorFor('textarea.wr-textarea__native');
  private readonly sendButton = this.locatorFor('button.wr-comment-composer__send');

  /** The field itself, for everything `WrTextareaHarness` already answers. */
  async getField(): Promise<WrTextareaHarness> {
    return this.field();
  }

  /** The draft currently in the field. */
  async getValue(): Promise<string> {
    return (await this.field()).getValue();
  }

  /**
   * Type a draft in, through the field's own harness, so a disabled or
   * read-only composer throws the same way the field would.
   */
  async setValue(value: string): Promise<void> {
    return (await this.field()).setValue(value);
  }

  /** The field's placeholder. */
  async getPlaceholder(): Promise<string> {
    return (await this.field()).getPlaceholder();
  }

  /** The send button's accessible name - `sendLabel`, or the catalog's `comment.send`. */
  async getSendLabel(): Promise<string | null> {
    return (await this.sendButton()).getAttribute('aria-label');
  }

  /** Whether the field refuses input - the native element's own `disabled`. */
  async isDisabled(): Promise<boolean> {
    return (await this.field()).isDisabled();
  }

  /** Whether the field shows its draft but refuses edits. */
  async isReadonly(): Promise<boolean> {
    return (await this.field()).isReadonly();
  }

  /** Whether a send is in flight, from the host's `aria-busy`. */
  async isSending(): Promise<boolean> {
    return (await (await this.host()).getAttribute('aria-busy')) === 'true';
  }

  /**
   * Whether a send would go through right now, from the send button's own
   * `disabled`: it is off for whitespace-only text and under `disabled`,
   * `readonly` and `sending` alike, which is the same gate Enter checks.
   */
  async canSend(): Promise<boolean> {
    return !(await (await this.sendButton()).getProperty<boolean>('disabled'));
  }

  /**
   * Click the send button. Throws when a send could not go through, rather than
   * clicking a disabled button and reporting nothing: assert {@link canSend}
   * instead where that is the point.
   */
  async send(): Promise<void> {
    if (!(await this.canSend())) {
      throw new Error(
        'WrCommentComposerHarness.send(): the send button is disabled - the draft is empty, or the composer is ' +
          'disabled, read-only or sending. Type something first, or assert canSend().'
      );
    }
    return (await this.sendButton()).click();
  }

  /**
   * Press Enter in the field, exactly as a user would: with `enterSends` it
   * sends, and a Shift+Enter is not this method. Nothing is thrown when the
   * send is refused, because that refusal is behaviour worth asserting.
   */
  async pressEnter(): Promise<void> {
    return (await this.native()).sendKeys(TestKey.ENTER);
  }

  /** Move keyboard focus into the field. */
  async focus(): Promise<void> {
    return (await this.field()).focus();
  }

  /** Whether the field holds focus. */
  async isFocused(): Promise<boolean> {
    return (await this.field()).isFocused();
  }
}
