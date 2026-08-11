/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrSegmentedOptionHarnessFilters } from './interfaces';

/**
 * Test harness for one segment of a `<wr-segmented>` — an option, not a control.
 *
 * A segment is a real `<button type="button">` carrying `aria-pressed`, so it is a
 * TOGGLE BUTTON to a screen reader: it announces its own pressed state and its own
 * name, and it is its own tab stop. That is why this exists as a harness of its own,
 * and why the questions below are worth asking per segment rather than in bulk on
 * `WrSegmentedHarness` — which is where the SELECTION lives.
 *
 * Three name-shaped methods, because a segment has three different names and only
 * one of them is what a person hears:
 *
 * - {@link getText} — the visible label, `null` for an icon-only segment.
 * - {@link getAccessibleName} — what is announced, `null` when nothing names it.
 * - {@link getLabel} — the same, but it refuses to answer `null`, so a spec
 *   addressing segments by label fails where the mistake is rather than three
 *   lines later.
 *
 * @example
 * ```ts
 * const segmented = await loader.getHarness(WrSegmentedHarness);
 * const [, week] = await segmented.getOptions();
 *
 * await week.select();
 * expect(await week.isSelected()).toBe(true);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrSegmentedOptionHarness extends ComponentHarness {
  /** The segment is a plain `<button>` — the BEM class is what identifies it. */
  static hostSelector = '.wr-segmented__option';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrSegmentedOptionHarnessFilters = {}): HarnessPredicate<WrSegmentedOptionHarness> {
    return (
      new HarnessPredicate(WrSegmentedOptionHarness, options)
        // Matched on the nullable name, not on `getLabel()`: a predicate runs against
        // EVERY segment, so one unnamed sibling would otherwise throw a query for the
        // others out of the water.
        .addOption('label', options.label, (harness, label) =>
          HarnessPredicate.stringMatches(harness.getAccessibleName(), label)
        )
        .addOption('selected', options.selected, async (harness, selected) => (await harness.isSelected()) === selected)
        .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled)
    );
  }

  private readonly labelText = this.locatorForOptional('.wr-segmented__label');
  private readonly icon = this.locatorForOptional('.wr-segmented__icon');

  /**
   * The visible label, or `null` for an icon-only segment.
   *
   * `null` rather than `''`: the label element is only rendered when the option
   * carries a `label`, and "no text at all" and "an empty label" are different
   * mistakes to be looking at.
   */
  async getText(): Promise<string | null> {
    const label = await this.labelText();
    return label ? label.text() : null;
  }

  /**
   * The name a screen reader announces for this segment, or `null` when nothing
   * names it.
   *
   * The component's own fallback chain, read back off the page: a labelled segment
   * is named by its text and carries no `aria-label`; an icon-only one is named by
   * `aria-label`, which the template fills from the option's `ariaLabel` or — as a
   * last resort — from its stringified `value`.
   *
   * `null` is a finding, not a detail: an icon-only segment whose option supplied
   * neither an `ariaLabel` nor a stringifiable value is announced as a bare unnamed
   * button.
   */
  async getAccessibleName(): Promise<string | null> {
    const text = await this.getText();
    if (text !== null) return text;
    return (await this.host()).getAttribute('aria-label');
  }

  /**
   * The segment's accessible name, for addressing it — and a targeted failure when
   * it has none.
   *
   * {@link getAccessibleName} is the same answer without the refusal; use that one
   * when `null` is what a spec is checking for.
   */
  async getLabel(): Promise<string> {
    const name = await this.getAccessibleName();
    if (name === null) {
      throw new Error(
        'WrSegmentedOptionHarness.getLabel(): this segment has no name — it renders no label and carries no ' +
          '`aria-label`, so a screen reader announces an unnamed button. Give the option a `label`, or an ' +
          '`ariaLabel` when it is icon-only.'
      );
    }
    return name;
  }

  /**
   * Whether this segment is the control's current answer.
   *
   * From `aria-pressed`, in preference to the `wr-segmented__option--selected`
   * class: both are public and they move together, but the class only recolours the
   * label while the attribute is the entire state a screen reader is given.
   */
  async isSelected(): Promise<boolean> {
    return (await (await this.host()).getAttribute('aria-pressed')) === 'true';
  }

  /**
   * Whether the segment refuses selection — for either reason.
   *
   * The native `disabled` PROPERTY, which is what actually blocks activation. The
   * option's own `disabled` and the whole control's land on it identically, and from
   * outside they are the same thing: this segment cannot be picked. Ask
   * `WrSegmentedHarness.isDisabled()` for which of the two it was.
   */
  async isDisabled(): Promise<boolean> {
    return (await this.host()).getProperty<boolean>('disabled');
  }

  /** Whether the segment renders an icon beside (or instead of) its label. */
  async hasIcon(): Promise<boolean> {
    return (await this.icon()) !== null;
  }

  /**
   * The name of the segment's icon, or `null` when it renders none.
   *
   * From `data-icon`, which `<wr-icon>` reflects. The glyph itself is markup the
   * icon registry writes into the element, and an UNREGISTERED name leaves that
   * empty — so the attribute is the only place the wiring survives, and it is the
   * one that tells "no icon asked for" from "icon asked for, never registered".
   */
  async getIconName(): Promise<string | null> {
    const icon = await this.icon();
    return icon ? icon.getAttribute('data-icon') : null;
  }

  /**
   * Pick this segment.
   *
   * A click, and deliberately not a keypress: activating a `<button>` from the
   * keyboard is the BROWSER's default action for Enter / Space — the component
   * implements no key handling of its own — and jsdom implements none of it either,
   * so there is nothing here for a key to drive. A no-arg CDK click needs no
   * layout, which is the other half of why this is the drivable path.
   *
   * Nothing happens when the segment is already selected (a segmented control has no
   * untoggle), and nothing happens when it is disabled — but not for the reason the
   * `pointer-events: none` on a whole disabled control suggests, which is CSS a unit
   * test never applies. The CDK's own `click()` reads the native `disabled` PROPERTY
   * and dispatches the mouse sequence WITHOUT the final `click` event, so on a
   * disabled segment the component's handler is never reached at all (measured: zero
   * click events). Either way the value does not move and this resolves quietly, so
   * assert the result rather than assume it, or reach for
   * `WrSegmentedHarness.select()`, which says which of the two it was.
   */
  async select(): Promise<void> {
    return (await this.host()).click();
  }

  /** Move keyboard focus to the segment. Each segment is its own tab stop. */
  async focus(): Promise<void> {
    return (await this.host()).focus();
  }

  /** Take focus off the segment. */
  async blur(): Promise<void> {
    return (await this.host()).blur();
  }

  async isFocused(): Promise<boolean> {
    return (await this.host()).isFocused();
  }
}
