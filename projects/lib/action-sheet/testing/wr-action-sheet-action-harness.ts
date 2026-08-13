/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrActionSheetAction } from 'ngwr/action-sheet';

import type { WrActionSheetActionHarnessFilters } from './interfaces';

/**
 * Test harness for one row inside a {@link WrActionSheetHarness}.
 *
 * A row is a real `<button>`, not an ARIA-decorated div, so `disabled` is the
 * property rather than an attribute and the CDK refuses to click it — which is the
 * behaviour a spec wants asserted, since the component ALSO checks `disabled`
 * inside its own handler. Either guard alone would keep a disabled row inert; both
 * being there means removing one is invisible until the other is removed too, and
 * {@link click} is where that shows up.
 *
 * **Clicking a row closes the sheet.** The component emits `action` and clears
 * `open` in the same call, so a harness held across a {@link click} is pointed at a
 * detached element the moment it returns — read what you need first, and get a
 * fresh harness afterwards if the sheet was reopened.
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrActionSheetActionHarness extends ComponentHarness {
  /** The class every row carries, cancel rows included. */
  static hostSelector = '.wr-action-sheet__action';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrActionSheetActionHarnessFilters = {}): HarnessPredicate<WrActionSheetActionHarness> {
    return new HarnessPredicate(WrActionSheetActionHarness, options)
      .addOption('label', options.label, (harness, label) => HarnessPredicate.stringMatches(harness.getLabel(), label))
      .addOption('role', options.role, async (harness, role) => (await harness.getRole()) === role)
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled);
  }

  /**
   * The row's label, trimmed.
   *
   * Read from `.wr-action-sheet__label` rather than from the button, so a leading
   * icon can never join it. The icon contributes no text today — it is an `<svg>` —
   * but an icon set that ships a `<title>` for its own accessibility would, and the
   * label element is the thing that actually holds the string.
   */
  async getLabel(): Promise<string> {
    return (await this.locatorFor('.wr-action-sheet__label')()).text();
  }

  /**
   * The row's visual role, as the component painted it.
   *
   * `default` is returned for a row the caller left unroled, which is what the
   * component does with the value: only `destructive` and `cancel` change anything,
   * and everything else falls through to the plain row. The two modifiers are
   * mutually exclusive by construction — `cancel` rows are filtered into their own
   * group before the destructive class is ever considered — so reading them in
   * either order gives the same answer.
   */
  async getRole(): Promise<NonNullable<WrActionSheetAction['role']>> {
    const host = await this.host();
    if (await host.hasClass('wr-action-sheet__action--cancel')) return 'cancel';
    if (await host.hasClass('wr-action-sheet__action--destructive')) return 'destructive';
    return 'default';
  }

  /**
   * Whether the row refuses interaction, from the button's own `disabled` property
   * — the thing the CDK consults before dispatching a click, and the DOM before
   * delivering one.
   *
   * There is no `aria-disabled` to fall back to here, and none is wanted: the row is
   * a native button, where the property already carries the state to assistive tech.
   */
  async isDisabled(): Promise<boolean> {
    return (await this.host()).getProperty<boolean>('disabled');
  }

  /** Whether the row draws a leading icon. */
  async hasIcon(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-action-sheet__icon')()) !== null;
  }

  /**
   * The icon's registered name, or `null` on a row without one.
   *
   * From `wr-icon`'s reflected `data-icon`, which is the only place the name reaches
   * the DOM — the rendered `<svg>` carries no trace of which entry of the set it
   * came from.
   */
  async getIconName(): Promise<string | null> {
    const icon = await this.locatorForOptional('.wr-action-sheet__icon')();
    return icon ? icon.getAttribute('data-icon') : null;
  }

  /**
   * Pick this row — emitting `action` and closing the sheet.
   *
   * Throws on a disabled row instead of quietly doing nothing. The click would not
   * land anyway (the DOM swallows it), so the alternative is a spec that reads as
   * "picked the row" and asserts a sheet that never moved.
   */
  async click(): Promise<void> {
    if (await this.isDisabled()) {
      throw new Error(
        `WrActionSheetActionHarness.click(): "${await this.getLabel()}" is disabled. The DOM swallows a click ` +
          'on a disabled button and the component checks `disabled` again before emitting, so nothing would ' +
          'happen — assert isDisabled() instead.'
      );
    }
    await (await this.host()).click();
  }

  /** Move keyboard focus to the row. */
  async focus(): Promise<void> {
    return (await this.host()).focus();
  }

  /** Whether the row currently holds focus. */
  async isFocused(): Promise<boolean> {
    return (await this.host()).isFocused();
  }
}
