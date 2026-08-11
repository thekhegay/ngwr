/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrDropdownItemHarnessFilters } from './interfaces';

/**
 * Test harness for one `<wr-dropdown-item>` inside a dropdown menu.
 *
 * The selector is the CLASS rather than the element: `.wr-dropdown-item` is what
 * the directive's own keyboard navigation queries, so it is the contract both
 * sides already rely on. Only the class, though — the directive narrows its query
 * to `:not(.wr-dropdown-item--disabled)` because it is looking for focus stops,
 * while a spec still has to be able to see a disabled item and assert that it is
 * one.
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrDropdownItemHarness extends ComponentHarness {
  /** The class the item paints on its host, and the one arrow-key navigation looks for. */
  static hostSelector = '.wr-dropdown-item';

  /** Build a predicate that narrows the query. */
  static with(options: WrDropdownItemHarnessFilters = {}): HarnessPredicate<WrDropdownItemHarness> {
    return new HarnessPredicate(WrDropdownItemHarness, options)
      .addOption('text', options.text, (harness, text) => HarnessPredicate.stringMatches(harness.getText(), text))
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled);
  }

  /** The item's label, trimmed. A leading icon is not part of it. */
  async getText(): Promise<string> {
    return (await this.locatorFor('.wr-dropdown-item__label')()).text();
  }

  /** The role the item announces — `menuitem`. */
  async getRole(): Promise<string | null> {
    return (await this.host()).getAttribute('role');
  }

  /** Whether the item refuses activation. */
  async isDisabled(): Promise<boolean> {
    return (await (await this.host()).getAttribute('aria-disabled')) === 'true';
  }

  /** Whether the item shows a leading icon. */
  async hasIcon(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-dropdown-item__icon')()) !== null;
  }

  /** The leading icon's registered name, or `null` when the item has no icon. */
  async getIconName(): Promise<string | null> {
    const icon = await this.locatorForOptional('.wr-dropdown-item__icon')();
    // `<wr-icon>` reflects the name it was asked for as `data-icon`, whether or not
    // that name is registered — so this answers what the item MEANT to draw.
    return icon ? icon.getAttribute('data-icon') : null;
  }

  /** Whether the item holds the menu's roving focus. */
  async isFocused(): Promise<boolean> {
    return (await this.host()).isFocused();
  }

  /**
   * Click the item. A disabled item throws instead.
   *
   * Refusing is the only honest answer: the item's own `disabled` guards the
   * KEYBOARD path only, and a pointer is stopped by `pointer-events: none` in the
   * stylesheet. jsdom loads no stylesheets, so a click dispatched here would land
   * on the host — exactly where the consumer bound `(click)` — and the spec would
   * record an activation that cannot happen in a browser. Assert `isDisabled()`
   * instead.
   */
  async click(): Promise<void> {
    if (await this.isDisabled()) {
      throw new Error(
        `WrDropdownItemHarness.click(): "${await this.getText()}" is disabled, so clicking it would ` +
          'report behaviour a browser cannot produce — the pointer is stopped by CSS, which jsdom does ' +
          'not load. Assert isDisabled() instead.'
      );
    }

    return (await this.host()).click();
  }
}
