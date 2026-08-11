/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, TestKey, type TestElement } from '@angular/cdk/testing';

import type { WrInputOtpSize } from 'ngwr/input-otp';

import type { WrInputOtpBoxHarnessFilters, WrInputOtpHarnessFilters } from './interfaces';
import { WrInputOtpBoxHarness } from './wr-input-otp-box-harness';

/** Which box a keyboard move aims at, and the key that gets it there. */
const MOVE_KEYS = {
  previous: TestKey.LEFT_ARROW,
  next: TestKey.RIGHT_ARROW,
  first: TestKey.HOME,
  last: TestKey.END,
} as const;

/**
 * Test harness for `<wr-input-otp>` — one code spread over N single-character
 * boxes, with {@link WrInputOtpBoxHarness} for a box.
 *
 * Everything here is driven from the KEYBOARD and from `input` / `paste` events,
 * never by clicking a box. The control binds no `(click)` handler at all — what a
 * click gives you in a browser is FOCUS, and a unit-test DOM moves no focus on
 * click, so a click-driven method would look like it worked and change nothing.
 * The keyboard is the path this control is designed around anyway.
 *
 * Two things about this control regularly surprise people, and the harness
 * reports them rather than smoothing them over:
 * - {@link getValue} is the boxes JOINED, which is what the component publishes
 *   for every edit made inside it. Emptying a middle box therefore SHORTENS the
 *   code instead of leaving a gap in it — `1 2 _ 4 5 6` publishes `'12456'`.
 *   {@link getBoxValues} is the only place that hole is visible, and
 *   {@link isComplete} is the only safe answer to "can this be submitted".
 * - {@link paste} always fills from the FIRST box, whichever box the paste
 *   landed on.
 *
 * @example
 * ```ts
 * const otp = await loader.getHarness(WrInputOtpHarness);
 *
 * await otp.setValue('482913');
 * expect(await otp.isComplete()).toBe(true);
 * expect(await otp.getValue()).toBe('482913');
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrInputOtpHarness extends ComponentHarness {
  static hostSelector = 'wr-input-otp';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrInputOtpHarnessFilters = {}): HarnessPredicate<WrInputOtpHarness> {
    return new HarnessPredicate(WrInputOtpHarness, options)
      .addOption('value', options.value, (harness, value) => HarnessPredicate.stringMatches(harness.getValue(), value))
      .addOption('length', options.length, async (harness, length) => (await harness.getLength()) === length)
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled)
      .addOption('complete', options.complete, async (harness, complete) => (await harness.isComplete()) === complete);
  }

  /** The boxes, in order. A box is a whole harness — see {@link WrInputOtpBoxHarness}. */
  async getBoxes(filters: WrInputOtpBoxHarnessFilters = {}): Promise<WrInputOtpBoxHarness[]> {
    return this.locatorForAll(WrInputOtpBoxHarness.with(filters))();
  }

  /** One box by index. Throws rather than returning `undefined` for an index that is not there. */
  async getBox(index: number): Promise<WrInputOtpBoxHarness> {
    const boxes = await this.getBoxes();
    const box = boxes[index];
    if (!box) {
      throw new Error(
        `WrInputOtpHarness.getBox(${index}): out of range — this control renders ${boxes.length} ` +
          `boxes, so the valid indexes are 0 to ${boxes.length - 1}.`
      );
    }
    return box;
  }

  /** How many boxes are rendered. `length` is clamped to `[1, 20]`, so this is the real count. */
  async getLength(): Promise<number> {
    return (await this.getBoxes()).length;
  }

  /** The character in each box, in order, `''` for an empty one. */
  async getBoxValues(): Promise<string[]> {
    const boxes = await this.getBoxes();
    return Promise.all(boxes.map(box => box.getValue()));
  }

  /**
   * The assembled code — the boxes joined. For anything typed, pasted or deleted
   * inside the control this is exactly the string it publishes through its
   * `value` model.
   *
   * An emptied middle box closes up here; {@link getBoxValues} keeps the hole.
   *
   * A write from OUTSIDE can leave the two disagreeing, and the model is the one
   * that keeps the surplus: the control splits the incoming value into boxes,
   * dropping what its `mode` rejects and anything past `length`, without writing
   * the shortened code back. Writing `'12a456'` in `numeric` mode shows `12_456`
   * and reads `'12456'` here while the bound model still holds `'12a456'`.
   */
  async getValue(): Promise<string> {
    return (await this.getBoxValues()).join('');
  }

  /** Whether every box holds a character — the condition the `completed` output fires on. */
  async isComplete(): Promise<boolean> {
    const values = await this.getBoxValues();
    return values.length > 0 && values.every(value => value !== '');
  }

  /**
   * Whether the control refuses interaction.
   *
   * Read from the boxes' `disabled` property rather than the host's
   * `wr-input-otp--disabled` class: the property is what actually stops the
   * events and the focus, the class only paints.
   */
  async isDisabled(): Promise<boolean> {
    const boxes = await this.getBoxes();
    const flags = await Promise.all(boxes.map(box => box.isDisabled()));
    return flags.every(Boolean);
  }

  /** Whether the typed characters are hidden, like a password field. */
  async isMasked(): Promise<boolean> {
    return (await this.getBox(0)).isMasked();
  }

  /**
   * The keyboard a mobile browser is asked for.
   *
   * `numeric` mode publishes `inputmode="numeric"`; `alphanumeric` and `text`
   * BOTH publish `text`, so the two cannot be told apart from the DOM. What
   * separates them is only observable by typing: `alphanumeric` drops anything
   * that is not a letter or a digit.
   */
  async getInputMode(): Promise<'numeric' | 'text'> {
    const mode = await (await this.boxElement(0)).getAttribute('inputmode');
    return mode === 'numeric' ? 'numeric' : 'text';
  }

  /** The control size, from the host modifier. `md` is the default and emits no modifier. */
  async getSize(): Promise<WrInputOtpSize> {
    const host = await this.host();
    if (await host.hasClass('wr-input-otp--sm')) return 'sm';
    if (await host.hasClass('wr-input-otp--lg')) return 'lg';
    return 'md';
  }

  /** The character shown in an empty box. */
  async getPlaceholder(): Promise<string> {
    return (await this.boxElement(0)).getProperty<string>('placeholder');
  }

  /**
   * The name the group announces.
   *
   * The boxes are separate inputs; the host's `role="group"` plus this label are
   * what make them one control to a screen reader.
   */
  async getLabel(): Promise<string | null> {
    return (await this.host()).getAttribute('aria-label');
  }

  /** The index of the box with focus, or `null` when focus is outside the control. */
  async getFocusedIndex(): Promise<number | null> {
    const boxes = await this.getBoxes();
    const flags = await Promise.all(boxes.map(box => box.isFocused()));
    const index = flags.indexOf(true);
    return index === -1 ? null : index;
  }

  /** Put the caret in a box — the first one unless asked otherwise. */
  async focus(index = 0): Promise<void> {
    await this.assertEnabled('focus');
    await (await this.getBox(index)).focus();
  }

  /**
   * Take focus off the control, which is what makes it emit `touch` so a bound
   * field can mark itself touched. The box that HAS focus is the one blurred:
   * blurring any other one still emits `touch` (a unit-test DOM dispatches a blur
   * event even on an element that never had focus), which would report a field as
   * touched while the caret sits in it. Throws when no box has focus at all, for
   * the same reason.
   */
  async blur(): Promise<void> {
    await this.assertEnabled('blur');
    const index = await this.focusedIndexOrThrow('blur');
    await (await this.boxElement(index)).blur();
  }

  /**
   * Enter a whole code, the way a person does: one character per box, into
   * whichever box the control has moved focus to.
   *
   * Every box is emptied first, so a shorter code cannot leave the tail of a
   * previous one behind.
   *
   * The control is left to decide what it accepts: a character its `mode`
   * rejects lands nowhere and focus stays put, so the next character overwrites
   * the same box — which is exactly what a browser produces. Read {@link getValue}
   * back rather than assuming the argument arrived.
   */
  async setValue(code: string): Promise<void> {
    await this.assertEnabled('setValue');

    const chars = [...code];
    const length = await this.getLength();
    if (chars.length > length) {
      throw new Error(
        `WrInputOtpHarness.setValue('${code}'): ${chars.length} characters for ${length} boxes — ` +
          'the extra ones would pile into the last box. Trim the code, or raise `length`.'
      );
    }

    await this.clear();
    await this.typeFrom(0, chars);
  }

  /**
   * Type into the control from where it already is — the focused box, or the
   * first box when focus is elsewhere. Unlike {@link setValue} nothing is cleared,
   * so this appends the way a half-finished code is finished.
   */
  async type(chars: string): Promise<void> {
    await this.assertEnabled('type');
    await this.typeFrom((await this.getFocusedIndex()) ?? 0, [...chars]);
  }

  /**
   * Paste a code in.
   *
   * The event goes to the focused box (the first one when focus is elsewhere),
   * because that is where a browser delivers it — but the control fills from the
   * FIRST box regardless, replacing everything, dropping characters its `mode`
   * rejects and trimming what is left to `length`. A paste with nothing usable in
   * it is ignored outright.
   *
   * jsdom implements neither `ClipboardEvent` nor `DataTransfer`, so the payload
   * is attached to a plain event; `getData('text')` is what the control asks for,
   * aliased to `text/plain` the way a browser does.
   */
  async paste(text: string): Promise<void> {
    await this.assertEnabled('paste');
    const target = await this.boxElement((await this.getFocusedIndex()) ?? 0);
    await target.dispatchEvent('paste', {
      clipboardData: { getData: (type: string) => (type === 'text' || type === 'text/plain' ? text : '') },
    });
  }

  /**
   * Press Backspace in the focused box.
   *
   * The control only handles the key itself when the box is ALREADY empty — then
   * it clears the box behind and steps focus back, which is what makes fixing a
   * typo one keystroke. On a filled box it defers to the browser's own editing,
   * and jsdom performs none, so the harness supplies that half: the character is
   * removed and an `input` event is dispatched, exactly as a real delete would.
   * Focus stays where it is, and the emptied box becomes a hole in
   * {@link getBoxValues} while {@link getValue} closes up.
   */
  async backspace(): Promise<void> {
    await this.assertEnabled('backspace');
    const index = await this.focusedIndexOrThrow('backspace');
    const box = await this.boxElement(index);
    const filled = (await box.getProperty<string>('value')) !== '';

    await box.sendKeys(TestKey.BACKSPACE);
    if (filled) await box.clear();
  }

  /**
   * Move focus with the arrow keys, `Home` or `End` — the control's own
   * navigation, and the only one available in a unit test, where nothing has a
   * position to click.
   *
   * Throws when no box has focus: the keys are handled by the box that receives
   * them, so there is no move to make.
   */
  async moveFocus(to: 'previous' | 'next' | 'first' | 'last'): Promise<void> {
    await this.assertEnabled('moveFocus');
    const index = await this.focusedIndexOrThrow('moveFocus');
    await (await this.boxElement(index)).sendKeys(MOVE_KEYS[to]);
  }

  /**
   * Empty every box and leave focus on the first, ready to be typed into.
   *
   * Each box is cleared through an `input` event rather than by writing the
   * model, so the control publishes the change the same way it would for a user.
   */
  async clear(): Promise<void> {
    await this.assertEnabled('clear');
    for (const box of await this.getBoxes()) {
      // An already-empty box is skipped: clearing it would re-publish the same
      // code, and drag focus through the control on the way.
      if (!(await box.isEmpty())) await (await box.host()).clear();
    }
    await (await this.boxElement(0)).focus();
  }

  /** Type `chars` starting at `index`, following the control's focus as it advances. */
  private async typeFrom(index: number, chars: readonly string[]): Promise<void> {
    let cursor = index;
    for (const char of chars) {
      await (await this.getBox(cursor)).type(char);
      // The control advances focus itself, and only for a character it accepted.
      // Following it — rather than incrementing — is what keeps a rejected
      // character from silently shifting the rest of the code one box along.
      cursor = (await this.getFocusedIndex()) ?? cursor;
    }
  }

  private async boxElement(index: number): Promise<TestElement> {
    return (await this.getBox(index)).host();
  }

  private async focusedIndexOrThrow(method: string): Promise<number> {
    const index = await this.getFocusedIndex();
    if (index === null) {
      throw new Error(
        `WrInputOtpHarness.${method}(): no box has focus, and this acts on the focused box. ` +
          'Call focus() (or type into the control) first.'
      );
    }
    return index;
  }

  private async assertEnabled(method: string): Promise<void> {
    if (!(await this.isDisabled())) return;
    throw new Error(
      `WrInputOtpHarness.${method}(): the control is disabled. A disabled input fires no events and ` +
        'takes no focus, so driving it here would report interaction a browser never delivers.'
    );
  }
}
