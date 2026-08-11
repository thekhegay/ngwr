/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrOptionHarnessFilters } from './interfaces';

/**
 * Test harness for one option inside a `<wr-select>` panel.
 *
 * The selector is the CLASS, not the `wr-option` element: a select rendering a
 * virtualized list emits plain `<div role="option" class="wr-option">` rows
 * instead of components, and a spec should not have to care which one it got.
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrOptionHarness extends ComponentHarness {
  /** The projected component and the virtualized row both carry this class. */
  static hostSelector = '.wr-option';

  /** Build a predicate that narrows the query. */
  static with(options: WrOptionHarnessFilters = {}): HarnessPredicate<WrOptionHarness> {
    return new HarnessPredicate(WrOptionHarness, options)
      .addOption('text', options.text, (harness, text) => HarnessPredicate.stringMatches(harness.getText(), text))
      .addOption('selected', options.selected, async (harness, selected) => (await harness.isSelected()) === selected)
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled);
  }

  /** The option's label, trimmed. */
  async getText(): Promise<string> {
    return (await this.host()).text();
  }

  /** Whether the option is currently selected. */
  async isSelected(): Promise<boolean> {
    return (await (await this.host()).getAttribute('aria-selected')) === 'true';
  }

  /** Whether the option refuses selection. */
  async isDisabled(): Promise<boolean> {
    return (await (await this.host()).getAttribute('aria-disabled')) === 'true';
  }

  /** Whether the option is the keyboard cursor target. */
  async isActive(): Promise<boolean> {
    return (await this.host()).hasClass('wr-option--active');
  }

  /**
   * Whether a search query has filtered this option out.
   *
   * Filtered options stay in the DOM — registration order has to survive a
   * query — and collapse via CSS, so a spec that counts options while a search
   * is active gets them back unless it asks. `getOptions()` on the select
   * harness already drops them.
   */
  async isHidden(): Promise<boolean> {
    return (await this.host()).hasClass('wr-option--hidden');
  }

  /** Click the option. */
  async click(): Promise<void> {
    return (await this.host()).click();
  }
}
