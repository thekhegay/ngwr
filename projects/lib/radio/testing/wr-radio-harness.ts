/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrRadioSize } from 'ngwr/radio';

import type { WrRadioHarnessFilters } from './interfaces';

/**
 * Test harness for one `<wr-radio>` — an option, not a control.
 *
 * The visible dot is a `<span>` the stylesheet paints; the state lives on a real
 * `<input type="radio">` inside the label, and that is what this reads and clicks.
 * A radio cannot exist alone — the component throws when it is constructed outside
 * a `<wr-radio-group>` — so `WrRadioGroupHarness` is where the SELECTION lives and
 * this answers questions about one option.
 *
 * There is no `aria-checked` here to prefer over the DOM, and that is right: a
 * native radio carries its state in the `checked` IDL property, so the ARIA
 * attribute would only be a second source of truth for a screen reader to
 * disagree with. {@link isChecked} reads the property, which is the state.
 *
 * @example
 * ```ts
 * const medium = await loader.getHarness(WrRadioHarness.with({ label: 'Medium' }));
 * await medium.check();
 * expect(await medium.isChecked()).toBe(true);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrRadioHarness extends ComponentHarness {
  static hostSelector = 'wr-radio';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrRadioHarnessFilters = {}): HarnessPredicate<WrRadioHarness> {
    return new HarnessPredicate(WrRadioHarness, options)
      .addOption('label', options.label, (harness, label) => HarnessPredicate.stringMatches(harness.getLabel(), label))
      .addOption('value', options.value, (harness, value) => HarnessPredicate.stringMatches(harness.getValue(), value))
      .addOption('checked', options.checked, async (harness, checked) => (await harness.isChecked()) === checked)
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled);
  }

  private readonly input = this.locatorFor('input.wr-radio__input');
  private readonly label = this.locatorFor('label.wr-radio__label');

  /** The projected label text, trimmed. An icon lives in the dot, so it is not part of it. */
  async getLabel(): Promise<string> {
    return (await this.locatorFor('.wr-radio__text')()).text();
  }

  /**
   * The option's value as the template WROTE it, or `null` when it was bound.
   *
   * The gap worth knowing about before a spec leans on this: `value` is `unknown`,
   * and the component never puts it on the native input — the group holds the
   * selection and a radio only says which one it is. So the only `value` in the
   * DOM is the static attribute Angular leaves behind for a literal `value="sm"`;
   * `[value]="size"` reaches the component without ever touching the page and
   * reads `null` here whatever it holds, which for an object value it always will.
   *
   * Address options by their LABEL when it matters, and assert the picked value on
   * the host's own model, which is the only place it exists.
   */
  async getValue(): Promise<string | null> {
    return (await this.host()).getAttribute('value');
  }

  /**
   * The `name` the group stamps on this radio's native input.
   *
   * It is the whole of the group's keyboard behaviour: one shared name is what
   * makes a browser treat the radios as a single tab stop, walk the arrow keys
   * between them and announce "1 of 3". None of that is implemented in the
   * component, so a name that stops being shared takes all of it away silently.
   */
  async getName(): Promise<string> {
    return (await this.input()).getProperty<string>('name');
  }

  /**
   * Whether this option is the group's answer.
   *
   * Read from the input's `checked` PROPERTY: `[checked]` is a property binding,
   * so the attribute is never written and reading it would report `null` for a
   * radio with a visible dot.
   */
  async isChecked(): Promise<boolean> {
    return (await this.input()).getProperty<boolean>('checked');
  }

  /**
   * Whether the option refuses selection — for either reason.
   *
   * The native input is disabled by this radio's own `disabled` OR by the group's,
   * and from outside they are the same thing: the option cannot be picked.
   */
  async isDisabled(): Promise<boolean> {
    return (await this.input()).getProperty<boolean>('disabled');
  }

  /**
   * The control size, from the host modifier.
   *
   * `md` is the default and carries NO modifier class, so its absence is the
   * answer rather than a missing one.
   */
  async getSize(): Promise<WrRadioSize> {
    const host = await this.host();
    if (await host.hasClass('wr-radio--sm')) return 'sm';
    if (await host.hasClass('wr-radio--lg')) return 'lg';
    return 'md';
  }

  /** Whether the dot is filled by an icon instead of the default solid circle. */
  async hasIcon(): Promise<boolean> {
    return (await this.host()).hasClass('wr-radio--has-icon');
  }

  /**
   * Whether the `<label for>` really points at this radio's input.
   *
   * Not the option's only naming route, and worth being precise about: the input
   * sits INSIDE the `<label>`, so the implicit association already names it and a
   * `for` that misses does not leave the radio unnamed. What a stray `for` does
   * take away is the pairing every consumer assumes — it hands label clicks, and
   * anything that references the label, to whatever else on the page owns that id.
   */
  async isLabelBound(): Promise<boolean> {
    const forAttr = await (await this.label()).getAttribute('for');
    return forAttr !== null && forAttr === (await (await this.input()).getProperty<string>('id'));
  }

  /**
   * Pick this option, the way a user does — a click on the native input.
   *
   * Nothing happens when it is already checked (a radio has no untick), and
   * nothing happens when it is disabled, so assert the result rather than assume
   * it — or reach for `WrRadioGroupHarness.select()`, which says which of the two
   * it was.
   *
   * A click rather than a keypress, despite jsdom having no layout: the events are
   * dispatched onto the input itself, so nothing is hit-tested and the zero-sized
   * rect jsdom reports for every element cannot miss its target, and the
   * `change` event it produces is exactly the one the component listens for. The
   * arrow keys that would move a real user between options are the BROWSER's
   * behaviour over a shared `name`, not the component's, and jsdom implements none
   * of it — there is nothing here for a keyboard to drive.
   */
  async check(): Promise<void> {
    if (await this.isChecked()) return;
    await (await this.input()).click();
  }

  /** Move keyboard focus onto the real control. */
  async focus(): Promise<void> {
    return (await this.input()).focus();
  }

  /**
   * Take focus off the radio — which is what makes the GROUP emit `touch`, since a
   * blur from any child is what marks a bound field touched.
   */
  async blur(): Promise<void> {
    return (await this.input()).blur();
  }

  async isFocused(): Promise<boolean> {
    return (await this.input()).isFocused();
  }
}
