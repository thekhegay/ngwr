/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrSpeedDialActionHarnessFilters } from './interfaces';

/**
 * Test harness for one action inside a {@link WrSpeedDialHarness}.
 *
 * The label is read from `aria-label` rather than from the button's text, and that
 * is the whole point of the control: an action renders an ICON, or — with no icon —
 * the first glyph of its label. Its visible text is therefore `"S"` for "Share", or
 * nothing at all. {@link getInitial} answers what is drawn; {@link getLabel} answers
 * what it is.
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrSpeedDialActionHarness extends ComponentHarness {
  /** The action button. `role="menuitem"` sits on this element too. */
  static hostSelector = '.wr-speed-dial__action';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrSpeedDialActionHarnessFilters = {}): HarnessPredicate<WrSpeedDialActionHarness> {
    return new HarnessPredicate(WrSpeedDialActionHarness, options)
      .addOption('label', options.label, (harness, label) => HarnessPredicate.stringMatches(harness.getLabel(), label))
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled);
  }

  /** The action's accessible name — what a screen reader reads, and what `title` shows. */
  async getLabel(): Promise<string | null> {
    return (await this.host()).getAttribute('aria-label');
  }

  /** The role the action announces — `menuitem`. */
  async getRole(): Promise<string | null> {
    return (await this.host()).getAttribute('role');
  }

  /** Whether the action draws an icon rather than a letter. */
  async hasIcon(): Promise<boolean> {
    return (await this.locatorForOptional('wr-icon')()) !== null;
  }

  /** The icon's registered name, from `wr-icon`'s reflected `data-icon`, or `null`. */
  async getIconName(): Promise<string | null> {
    const icon = await this.locatorForOptional('wr-icon')();
    return icon ? icon.getAttribute('data-icon') : null;
  }

  /**
   * The single glyph drawn in place of a missing icon, or `null` when there is one.
   *
   * A GLYPH, not a character: the component splits the label by code point, so an
   * emoji label draws the whole emoji rather than the broken half of a surrogate pair.
   */
  async getInitial(): Promise<string | null> {
    if (await this.hasIcon()) return null;
    return (await this.host()).text();
  }

  /**
   * Whether the action refuses interaction.
   *
   * Every action follows the DIAL's `disabled` — there is no per-action flag — so
   * this is really "is the dial disabled", asked at the action. Worth having anyway:
   * it is what the DOM and the CDK consult before delivering a click.
   */
  async isDisabled(): Promise<boolean> {
    return (await this.host()).getProperty<boolean>('disabled');
  }

  /** Pick this action — emitting `pick` and closing the dial. */
  async click(): Promise<void> {
    if (await this.isDisabled()) {
      throw new Error(
        `WrSpeedDialActionHarness.click(): "${await this.getLabel()}" is disabled. The DOM swallows the click ` +
          'and the component checks `disabled` again before emitting, so nothing would happen.'
      );
    }
    await (await this.host()).click();
  }

  /** Move keyboard focus to the action. */
  async focus(): Promise<void> {
    return (await this.host()).focus();
  }

  /** Whether the action currently holds focus. */
  async isFocused(): Promise<boolean> {
    return (await this.host()).isFocused();
  }
}
