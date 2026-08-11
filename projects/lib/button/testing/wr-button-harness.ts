/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import { WR_COLORS, type WrColor } from 'ngwr/theme';

import type { WrButtonHarnessFilters } from './interfaces';

/**
 * Test harness for `<wr-btn>` — drive a button from a consumer's spec without
 * knowing how it is built.
 *
 * Everything this reads is public API: the `wr-btn` selector, the
 * `.wr-btn__label` element, the `wr-btn--*` modifiers and the disabled attributes.
 * `<wr-btn>` is deliberately NOT always a native `<button>` — the element form
 * exists so a link or a custom host can be one — which is why the disabled state
 * is answered from the ATTRIBUTES rather than from `el.disabled`, a property half
 * of those shapes do not have.
 *
 * @example
 * ```ts
 * const loader = TestbedHarnessEnvironment.loader(fixture);
 * const save = await loader.getHarness(WrButtonHarness.with({ text: 'Save' }));
 *
 * expect(await save.isDisabled()).toBe(false);
 * await save.click();
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrButtonHarness extends ComponentHarness {
  /** Every shape the button ships in: the element, and the two attribute forms. */
  static hostSelector = 'wr-btn, button[wr-btn], a[wr-btn]';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrButtonHarnessFilters = {}): HarnessPredicate<WrButtonHarness> {
    return new HarnessPredicate(WrButtonHarness, options)
      .addOption('text', options.text, (harness, text) => HarnessPredicate.stringMatches(harness.getText(), text))
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled);
  }

  /** The button's visible label, trimmed. Icons and the spinner are not part of it. */
  async getText(): Promise<string> {
    return (await this.locatorFor('.wr-btn__label')()).text();
  }

  /**
   * Whether the button refuses interaction.
   *
   * Both signals are read, because the component sets them for different reasons:
   * `disabled` lands on every shape (it is inert on a custom element, which is
   * exactly why `aria-disabled` exists as well, but it is the attribute that is
   * always there). A button that is merely LOADING also answers `true` here, and
   * that is not a quirk — by default a loading button refuses clicks.
   */
  async isDisabled(): Promise<boolean> {
    const host = await this.host();
    if ((await host.getAttribute('disabled')) !== null) return true;
    return (await host.getAttribute('aria-disabled')) === 'true';
  }

  /** Whether the button is showing its loading spinner. */
  async isLoading(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-btn__spin')()) !== null;
  }

  /**
   * The intent colour, or `null` when the button carries none.
   *
   * Matched against `WR_COLORS` rather than "the first `wr-btn--*` class": the
   * modifier list also carries the size, the shape, `outlined`, `block`, `loading`
   * and the icon position, so a pattern match answers `icon` as readily as
   * `primary`.
   */
  async getColor(): Promise<WrColor | null> {
    const classes = (await (await this.host()).getAttribute('class')) ?? '';
    const present = classes.split(/\s+/);
    return WR_COLORS.find(color => present.includes(`wr-btn--${color}`)) ?? null;
  }

  /** Click the button. A disabled button is still clicked — assert, do not assume. */
  async click(): Promise<void> {
    return (await this.host()).click();
  }

  /** Move keyboard focus to the button. */
  async focus(): Promise<void> {
    return (await this.host()).focus();
  }

  /** Whether the button currently has focus. */
  async isFocused(): Promise<boolean> {
    return (await this.host()).isFocused();
  }
}
