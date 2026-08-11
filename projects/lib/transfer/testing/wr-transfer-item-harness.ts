/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrTransferItemHarnessFilters } from './interfaces';

/**
 * Test harness for one row of a `<wr-transfer>` pane.
 *
 * A row is a `<li>` holding a `<wr-checkbox>`, and the checkbox is the thing the
 * user operates — so the state is read from the native `<input type="checkbox">`
 * inside it, and {@link toggle} clicks that. The pane is deliberately NOT a
 * `role="listbox"` of `role="option"` rows (an option may not contain an
 * interactive control, and the axe gate says so), which is why there is no
 * `aria-selected` here to read: the checkbox's own state IS the announcement.
 *
 * **Checked is not the value.** A tick stages the row for the next move and
 * nothing more; which pane the row sits in is what `[(value)]` carries. Staging is
 * spent — and cleared — by the move that commits it.
 *
 * @example
 * ```ts
 * const source = await transfer.getPane('source');
 * await (await source.getItem({ label: 'Read' })).check();
 *
 * await transfer.moveTo('target');
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrTransferItemHarness extends ComponentHarness {
  /**
   * `.wr-transfer__item` is a DATA row and nothing else.
   *
   * An empty pane renders an `<li class="wr-transfer__empty">` for its placeholder,
   * so querying `li` would hand that back as a row with no checkbox to read.
   */
  static hostSelector = '.wr-transfer__item';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrTransferItemHarnessFilters = {}): HarnessPredicate<WrTransferItemHarness> {
    return new HarnessPredicate(WrTransferItemHarness, options)
      .addOption('label', options.label, (harness, label) => HarnessPredicate.stringMatches(harness.getLabel(), label))
      .addOption('checked', options.checked, async (harness, checked) => (await harness.isChecked()) === checked)
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled);
  }

  private readonly input = this.locatorFor('input.wr-checkbox__input');

  /** The row's label, trimmed — the `WrTransferItem.label` the pane shows and the search matches. */
  async getLabel(): Promise<string> {
    return (await this.locatorFor('.wr-checkbox__text')()).text();
  }

  /**
   * Whether the row is STAGED for the next move.
   *
   * Not "selected": a row's pane is what the value says, and the tick is transient
   * staging the move spends. `WrTransferPaneHarness.getCheckedLabels()` reads the
   * whole staged set of a pane.
   */
  async isChecked(): Promise<boolean> {
    return (await this.input()).getProperty<boolean>('checked');
  }

  /**
   * Whether the row refuses staging.
   *
   * The native input's `disabled` — the state a screen reader is given and the one
   * that decides whether a click does anything. It answers `true` for BOTH reasons a
   * row can be inert: the item's own `disabled` flag, and a disabled transfer, which
   * disables every row. The `wr-transfer__item--disabled` modifier only marks the
   * first of those, so it is the narrower question and not the one that predicts
   * behaviour.
   */
  async isDisabled(): Promise<boolean> {
    return (await this.input()).getProperty<boolean>('disabled');
  }

  /**
   * Flip the row's staging.
   *
   * Refuses a disabled row rather than clicking into the void: the component drops
   * the toggle outright, so the click would resolve having changed nothing and the
   * failure would surface as an unexplained empty move two assertions later.
   */
  async toggle(): Promise<void> {
    if (await this.isDisabled()) {
      const label = await this.getLabel();
      throw new Error(
        `WrTransferItemHarness.toggle(): "${label}" is disabled and the component refuses to stage it. ` +
          'Either the item carries `disabled`, or the whole transfer does — check isDisabled() on the transfer too.'
      );
    }
    await (await this.input()).click();
  }

  /** Stage the row if it is not already staged. */
  async check(): Promise<void> {
    if (!(await this.isChecked())) await this.toggle();
  }

  /** Unstage the row if it is staged. */
  async uncheck(): Promise<void> {
    if (await this.isChecked()) await this.toggle();
  }

  /** Move keyboard focus onto the row's checkbox — the row's only tab stop. */
  async focus(): Promise<void> {
    return (await this.input()).focus();
  }

  /** Whether the row's checkbox has focus. */
  async isFocused(): Promise<boolean> {
    return (await this.input()).isFocused();
  }
}
