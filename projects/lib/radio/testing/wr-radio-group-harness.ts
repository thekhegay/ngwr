/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrRadioGroupHarnessFilters, WrRadioHarnessFilters } from './interfaces';
import { WrRadioHarness } from './wr-radio-harness';

/**
 * Test harness for `<wr-radio-group>` — the control a `<wr-radio>` only means
 * anything inside of, and the root of a two-part family with {@link WrRadioHarness}.
 *
 * Options are addressed by their LABEL rather than by their value, and there is
 * deliberately no `getValue()` here. The group's value is a signal of `unknown`
 * that the component never writes to the DOM: not to the group element, not to a
 * radio's native input. The one thing on the page is whatever static attribute the
 * template happened to leave behind, so a selection made through `[(value)]`, a
 * `[formField]` or an object is not there at all, and a harness reporting it would
 * be guessing. {@link getSelectedLabel} says what the page says, and a spec that
 * needs the value itself asserts the host's own model — which is the assertion that
 * would have caught the bug anyway.
 *
 * Arrow-key navigation is not this component's either: the radios share one `name`
 * attribute and the browser does the rest, so jsdom — which implements none of it
 * — leaves nothing for a keyboard to drive. {@link getName} is what a spec should
 * pin instead, because losing the shared name is what actually takes arrow
 * navigation away, and {@link getTabStopLabel} answers the other half.
 *
 * @example
 * ```ts
 * const size = await loader.getHarness(WrRadioGroupHarness.with({ name: 'size' }));
 *
 * expect(await size.getRadioLabels()).toEqual(['Small', 'Medium', 'Large']);
 * await size.select({ label: 'Large' });
 * expect(await size.getSelectedLabel()).toBe('Large');
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrRadioGroupHarness extends ComponentHarness {
  static hostSelector = 'wr-radio-group';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrRadioGroupHarnessFilters = {}): HarnessPredicate<WrRadioGroupHarness> {
    return new HarnessPredicate(WrRadioGroupHarness, options)
      .addOption('name', options.name, (harness, name) => HarnessPredicate.stringMatches(harness.getName(), name))
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled);
  }

  /**
   * The role the group announces — `radiogroup`, which is what tells a screen
   * reader that the options belong to one question and how many of them there are.
   */
  async getRole(): Promise<string | null> {
    return (await this.host()).getAttribute('role');
  }

  /**
   * The group's accessible name, resolved in the order a screen reader resolves it:
   * the text of every element `aria-labelledby` points at, and `aria-label` only
   * when that named nothing. `null` when the consumer wired neither.
   *
   * The order is not interchangeable — `aria-labelledby` WINS over `aria-label` in
   * the accessible-name computation, so a group carrying both is announced by the
   * heading it points at and reporting the `aria-label` would describe a name
   * nobody hears.
   *
   * That `null` is a finding rather than a detail — a `radiogroup` with no name
   * announces three answers and never the question. The component ships no label
   * input on purpose (the question is the consumer's own heading), so this is the
   * only way to check the wiring held.
   */
  async getAccessibleName(): Promise<string | null> {
    const host = await this.host();

    const labelledBy = await host.getAttribute('aria-labelledby');
    if (labelledBy !== null) {
      // Resolved from the document root: `aria-labelledby` may point anywhere on the
      // page, and the heading above a group is normally outside it.
      const root = this.documentRootLocatorFactory();
      const texts: string[] = [];
      for (const id of labelledBy.split(/\s+/).filter(Boolean)) {
        const target = await root.locatorForOptional(`#${id}`)();
        if (target) texts.push(await target.text());
      }

      // A reference that resolves to nothing names nothing, and the computation
      // falls through to `aria-label` exactly as it does in a browser.
      if (texts.length) return texts.join(' ');
    }

    return host.getAttribute('aria-label');
  }

  /**
   * The `name` every radio in the group shares.
   *
   * Read off the radios because they are the only place it is RELIABLY written: the
   * group's `name` input reaches the page as an attribute on each native input, and
   * a bound `[name]="…"` never lands on the group element at all. A literal
   * `name="size"` does survive on the group element — Angular leaves a static
   * attribute alone — which is exactly the trap: reading it there works for the
   * literal form and quietly returns nothing for the bound one.
   */
  async getName(): Promise<string> {
    const [first] = await this.radiosOrThrow();
    return first.getName();
  }

  /**
   * Whether the group refuses every option.
   *
   * Answered from the radios, and it could not be otherwise: a bound `[disabled]`
   * on the group reaches the page only by disabling each native input, so a group
   * disabled as a whole and a group whose every option is individually disabled
   * are the same page. They are also the same thing to the person using it, which
   * is the question a harness should be answering.
   */
  async isDisabled(): Promise<boolean> {
    for (const radio of await this.radiosOrThrow()) {
      if (!(await radio.isDisabled())) return false;
    }
    return true;
  }

  /** The group's own options, in DOM order. A sibling group's radios are not here. */
  async getRadios(filters: WrRadioHarnessFilters = {}): Promise<WrRadioHarness[]> {
    return this.locatorForAll(WrRadioHarness.with(filters))();
  }

  /** The label of every option, in DOM order. */
  async getRadioLabels(): Promise<string[]> {
    const radios = await this.getRadios();
    return Promise.all(radios.map(radio => radio.getLabel()));
  }

  /** The checked option, or `null` while the group is unanswered. */
  async getSelectedRadio(): Promise<WrRadioHarness | null> {
    const [checked] = await this.getRadios({ checked: true });
    return checked ?? null;
  }

  /**
   * The label of the checked option, or `null` while the group is unanswered.
   *
   * Also `null` for a value that matches no radio — the group holds it, nothing is
   * checked, and the page shows an unanswered question.
   */
  async getSelectedLabel(): Promise<string | null> {
    const selected = await this.getSelectedRadio();
    return selected ? selected.getLabel() : null;
  }

  /**
   * Pick the first option matching the filters — this is how the group's value
   * changes.
   *
   * Throws when nothing matches, naming the options that do exist, and throws
   * again when the option is still unchecked afterwards. That second failure has
   * exactly two causes and reports both, because a click that quietly did nothing
   * surfaces as an unrelated assertion three lines later.
   */
  async select(filters: WrRadioHarnessFilters): Promise<void> {
    const [radio] = await this.getRadios(filters);
    if (!radio) {
      throw new Error(
        `WrRadioGroupHarness.select(): no radio matched ${JSON.stringify(filters)}. This group offers: ` +
          `${(await this.getRadioLabels()).join(', ')}.`
      );
    }

    await radio.check();

    if (!(await radio.isChecked())) {
      throw new Error(
        `WrRadioGroupHarness.select(): "${await radio.getLabel()}" is still unchecked after being clicked — ` +
          'either that option carries `disabled` or the whole group does.'
      );
    }
  }

  /**
   * The label of the option a Tab press would land on, or `null` when every option
   * is disabled and the group is skipped over entirely.
   *
   * A radio group is ONE tab stop, and which radio it is is written down nowhere:
   * the component authors no roving `tabindex`, because the browser already
   * applies the native rule to a shared `name` — the checked radio, or the first
   * enabled one while nothing is checked. So this is DERIVED from the rendered
   * state rather than read off an attribute, there being no attribute to read.
   *
   * Worth asking precisely because those two answers are different radios exactly
   * when a form opens unanswered, which is the state most specs start in.
   */
  async getTabStopLabel(): Promise<string | null> {
    const stop = await this.tabStop();
    return stop ? stop.getLabel() : null;
  }

  /** Put focus where a Tab press would put it. Throws when the group has no tab stop. */
  async focusTabStop(): Promise<void> {
    const stop = await this.tabStop();
    if (!stop) {
      throw new Error(
        'WrRadioGroupHarness.focusTabStop(): every option in this group is disabled, so the group is not a ' +
          'tab stop at all — Tab skips it rather than entering it.'
      );
    }
    await stop.focus();
  }

  /**
   * The label of the option that currently holds focus, or `null` when focus is
   * elsewhere. The counterpart to {@link focusTabStop}: in a real browser the
   * arrow keys move this, and moving it is also what picks a new answer.
   */
  async getFocusedLabel(): Promise<string | null> {
    for (const radio of await this.getRadios()) {
      if (await radio.isFocused()) return radio.getLabel();
    }
    return null;
  }

  /** The radio Tab would enter on, applying the browser's rule to the rendered state. */
  private async tabStop(): Promise<WrRadioHarness | null> {
    const enabled: WrRadioHarness[] = [];
    for (const radio of await this.getRadios()) {
      if (!(await radio.isDisabled())) enabled.push(radio);
    }

    for (const radio of enabled) {
      if (await radio.isChecked()) return radio;
    }
    return enabled[0] ?? null;
  }

  /** The options, or a failure saying why an empty group has nothing to report. */
  private async radiosOrThrow(): Promise<WrRadioHarness[]> {
    const radios = await this.getRadios();
    if (!radios.length) {
      throw new Error(
        'WrRadioGroupHarness: this group has no <wr-radio> children, and every group-level fact here is read ' +
          'off them — the shared name and the disabled state reach the DOM through the radios, and a bound ' +
          '[name] / [disabled] leaves nothing on the group element to read instead.'
      );
    }
    return radios;
  }
}
