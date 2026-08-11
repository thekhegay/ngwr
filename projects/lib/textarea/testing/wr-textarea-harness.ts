/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, type TestElement } from '@angular/cdk/testing';

import type { WrTextareaResize, WrTextareaSize } from 'ngwr/textarea';

import type { WrTextareaHarnessFilters } from './interfaces';

/** Sizes that earn a modifier class — `md` is the default and carries none. */
const SIZES: readonly WrTextareaSize[] = ['sm', 'lg'];

/** Directions the corner grip can advertise. It never renders for `none`. */
const RESIZE_DIRECTIONS: readonly WrTextareaResize[] = ['vertical', 'horizontal', 'both'];

/**
 * Test harness for `<wr-textarea>` — the multi-line COMPONENT.
 *
 * Not to be confused with `WrInputHarness` (`ngwr/input/testing`), which drives
 * `[wrInput]` — the directive form, applied to a real `<textarea>` the consumer
 * wrote themselves. Pick by the markup: `<wr-textarea …>` is this harness,
 * `<textarea wrInput>` is that one. They are not interchangeable, because here
 * the native element is INSIDE the component: the value, the name and every
 * native state below are read off `.wr-textarea__native` (the host carries only
 * the `wr-textarea--*` modifiers), and the accessible name has to be forwarded
 * onto it — a `<label for>` in the consumer's template cannot reach inside.
 *
 * Two things this deliberately does NOT offer:
 *
 * - **A character counter or `maxlength`.** `<wr-textarea>` has neither — it
 *   forwards only `placeholder`, `rows`, `readonly`, `disabled`, `value` and the
 *   resolved `aria-label` to the native element, so there is no counter to read, and a
 *   `maxlength` attribute written on `<wr-textarea>` lands on the wrapper where
 *   nothing consumes it. A `getMaxLength()` could only ever answer `null`, which
 *   would read as "no limit set" rather than "no limit possible". Cap the text in
 *   the model instead.
 * - **A height, or a grip drag.** Autosize fits from `scrollHeight`, and the grip
 *   is driven by pointer coordinates. A DOM with no layout reports 0 for both, so
 *   either method would answer confidently and wrongly. What survives without
 *   layout is who OWNS the height ({@link hasFittedHeight}) and which direction
 *   the grip advertises ({@link getResizeDirection}); the grip is also
 *   `aria-hidden` and has no keyboard path, so there is no accessible route for a
 *   harness to drive it down.
 *
 * @example
 * ```ts
 * const notes = await loader.getHarness(WrTextareaHarness.with({ placeholder: 'Notes' }));
 *
 * await notes.setValue('first draft');
 * expect(await notes.getValue()).toBe('first draft');
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrTextareaHarness extends ComponentHarness {
  static hostSelector = 'wr-textarea';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrTextareaHarnessFilters = {}): HarnessPredicate<WrTextareaHarness> {
    return new HarnessPredicate(WrTextareaHarness, options)
      .addOption('value', options.value, (harness, value) => HarnessPredicate.stringMatches(harness.getValue(), value))
      .addOption('placeholder', options.placeholder, (harness, placeholder) =>
        HarnessPredicate.stringMatches(harness.getPlaceholder(), placeholder)
      )
      .addOption('label', options.label, (harness, label) => HarnessPredicate.stringMatches(harness.getLabel(), label))
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled);
  }

  private readonly native = this.locatorFor('textarea.wr-textarea__native');

  /**
   * The text currently in the field.
   *
   * The `value` PROPERTY, never the element's text: a `<textarea>`'s text content
   * is only its initial content, and this one is bound with `[value]`, so the
   * text content stays empty for the field's whole life no matter what is typed.
   */
  async getValue(): Promise<string> {
    return (await this.native()).getProperty<string>('value');
  }

  /**
   * Type a value in, the way a user would as far as the component can tell.
   *
   * No `change` is dispatched: `sendKeys` fires one `input` per character (plus the
   * key events around it), and `input` is the only value event the component
   * listens to. It hands the result out through the `value` model, so signal forms,
   * `[formField]`, `[(ngModel)]` and `[(value)]` all hear that single write.
   * `WrInputHarness` dispatches a `change` on top for the directive form; that is
   * belt-and-braces rather than a requirement, since Angular's own accessors for
   * text controls listen to `input` too.
   *
   * Throws on a disabled or read-only field — see {@link assertWritable}.
   */
  async setValue(value: string): Promise<void> {
    const native = await this.assertWritable('setValue');

    await native.clear();
    // `sendKeys('')` throws "No keys have been specified", so an empty write is
    // the clear on its own — which is exactly what emptying a field produces.
    if (value) await native.sendKeys(value);
  }

  /** Empty the field, dispatching the same `input` a user's last backspace would. */
  async clear(): Promise<void> {
    await (await this.assertWritable('clear')).clear();
  }

  /** The placeholder text, or `''` when the field has none. */
  async getPlaceholder(): Promise<string> {
    return (await this.native()).getProperty<string>('placeholder');
  }

  /**
   * The accessible name the field answers to, or `null` when it has none.
   *
   * Read from the native element's `aria-label`, which is the only place a name
   * can live for this component: the `<textarea>` is inside it, so a
   * `<label for>` outside cannot reach it and an `aria-label` on `<wr-textarea>`
   * names the wrapper rather than the control. The component forwards `ariaLabel`
   * and falls back to `placeholder` — and an empty placeholder is treated as no
   * name at all rather than an empty one, so this answers `null`, not `''`.
   */
  async getLabel(): Promise<string | null> {
    return (await this.native()).getAttribute('aria-label');
  }

  /** The visible row count (`rows`) — the field's height until autosize takes over. */
  async getRows(): Promise<number> {
    return (await this.native()).getProperty<number>('rows');
  }

  /** The control size. `md` is the default and earns no modifier, so a bare host IS `md`. */
  async getSize(): Promise<WrTextareaSize> {
    const host = await this.host();
    for (const size of SIZES) {
      if (await host.hasClass(`wr-textarea--${size}`)) return size;
    }
    return 'md';
  }

  /**
   * Whether the field refuses input.
   *
   * The native element's `disabled` property, not the host's `--disabled` class:
   * the property is what actually blocks typing and what the accessibility tree
   * reports, while the class only paints it.
   */
  async isDisabled(): Promise<boolean> {
    return (await this.native()).getProperty<boolean>('disabled');
  }

  /** Whether the field shows its value but refuses edits (`readonly`). */
  async isReadonly(): Promise<boolean> {
    return (await this.native()).getProperty<boolean>('readOnly');
  }

  /**
   * Whether the field is marked invalid.
   *
   * The native element is checked first, because that is the element a screen
   * reader reports on — but `<wr-textarea>` forwards nothing here (it takes no
   * `ariaInvalid` input and, unlike `[wrInput]`, does not read the surrounding
   * `<wr-form-field>`), so a consumer marks the field by binding `aria-invalid`
   * on the host. Both are read for that reason, and a native `aria-invalid="false"`
   * wins over the wrapper rather than falling through to it.
   */
  async isInvalid(): Promise<boolean> {
    const onNative = await (await this.native()).getAttribute('aria-invalid');
    if (onNative !== null) return onNative === 'true';

    return (await (await this.host()).getAttribute('aria-invalid')) === 'true';
  }

  /**
   * Whether the field grows with its content (`autosize`).
   *
   * Read from `wr-textarea--no-resize`, which is named for what it does to the
   * grip but is added by `autosize` and by nothing else — `[resizable]="false"`
   * takes the grip away without it.
   */
  async isAutosizing(): Promise<boolean> {
    return (await this.host()).hasClass('wr-textarea--no-resize');
  }

  /**
   * Whether autosize currently OWNS the field's height: the inline `height` it
   * writes on the native element, and hands back when `autosize` goes off.
   *
   * The fitted number itself is not exposed — see the class docs. What is worth
   * asserting is the handover: a field left frozen at the last fitted height
   * ignores `rows` from then on, which reads as the input having done nothing.
   *
   * An inline `height` a consumer wrote themselves is indistinguishable from a
   * fitted one; pair this with {@link isAutosizing} when that matters.
   */
  async hasFittedHeight(): Promise<boolean> {
    const style = (await (await this.native()).getAttribute('style')) ?? '';
    return /(?:^|;)\s*height\s*:/.test(style);
  }

  /**
   * The direction the corner grip will drag in, or `'none'` when there is no grip
   * to drag — which is any of `[resizable]="false"`, `autosize` or `disabled`.
   * {@link isAutosizing} and {@link isDisabled} tell those three apart.
   */
  async getResizeDirection(): Promise<WrTextareaResize> {
    const grip = await this.locatorForOptional('.wr-textarea__resize')();
    if (!grip) return 'none';

    for (const direction of RESIZE_DIRECTIONS) {
      if (await grip.hasClass(`wr-textarea__resize--${direction}`)) return direction;
    }

    throw new Error(
      'WrTextareaHarness.getResizeDirection(): the grip carries no ' +
        '`wr-textarea__resize--<direction>` class. Every rendered grip sets one, so the element ' +
        'matched is probably not an ngwr textarea grip.'
    );
  }

  /** Move keyboard focus onto the native element — the host itself is not focusable. */
  async focus(): Promise<void> {
    return (await this.native()).focus();
  }

  /** Take focus away, which is what makes the component emit `touch`. */
  async blur(): Promise<void> {
    return (await this.native()).blur();
  }

  async isFocused(): Promise<boolean> {
    return (await this.native()).isFocused();
  }

  /**
   * The native element, or a targeted failure when writing to it would prove
   * nothing.
   *
   * A browser drops every keystroke aimed at a disabled or read-only field, but a
   * DOM with no input gating accepts them and the model updates — so a harness
   * that typed anyway would hand a consumer a green spec for behaviour that
   * cannot happen in their app.
   */
  private async assertWritable(method: string): Promise<TestElement> {
    if (await this.isDisabled()) {
      throw new Error(
        `WrTextareaHarness.${method}(): the textarea is disabled, so a user could not type here. ` +
          'Enable it first, or assert isDisabled() instead.'
      );
    }
    if (await this.isReadonly()) {
      throw new Error(
        `WrTextareaHarness.${method}(): the textarea is read-only, so a user could not type here. ` +
          'Write through the bound model instead, or assert isReadonly().'
      );
    }

    return this.native();
  }
}
