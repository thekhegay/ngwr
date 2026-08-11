/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, TestKey } from '@angular/cdk/testing';

import type { WrCascaderOptionHarnessFilters } from './interfaces';

/**
 * Test harness for one option inside a `<wr-cascader>` column.
 *
 * An option is either a BRANCH (it has children, so clicking it opens the next
 * column) or a LEAF (clicking it commits the whole path and closes the panel).
 * {@link hasChildren} is the only way to tell them apart, and it reads the
 * chevron the template draws for branches — the option carries no
 * `aria-haspopup` / `aria-expanded`, so a screen-reader user is told nothing
 * about a branch either. Reported here rather than papered over.
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrCascaderOptionHarness extends ComponentHarness {
  /** The `<li role="menuitem">` a column renders per option. */
  static hostSelector = '.wr-cascader__opt';

  /** Build a predicate that narrows the query. */
  static with(options: WrCascaderOptionHarnessFilters = {}): HarnessPredicate<WrCascaderOptionHarness> {
    return new HarnessPredicate(WrCascaderOptionHarness, options)
      .addOption('text', options.text, (harness, text) => HarnessPredicate.stringMatches(harness.getText(), text))
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled)
      .addOption('active', options.active, async (harness, active) => (await harness.isActive()) === active)
      .addOption(
        'hasChildren',
        options.hasChildren,
        async (harness, hasChildren) => (await harness.hasChildren()) === hasChildren
      );
  }

  /** The option's label, trimmed. The branch chevron contributes no text. */
  async getText(): Promise<string> {
    return (await this.locatorFor('.wr-cascader__opt-label')()).text();
  }

  /** The role the option announces — `menuitem`. */
  async getRole(): Promise<string | null> {
    return (await this.host()).getAttribute('role');
  }

  /** Whether the option refuses selection, from the state a screen reader is given. */
  async isDisabled(): Promise<boolean> {
    return (await (await this.host()).getAttribute('aria-disabled')) === 'true';
  }

  /**
   * Whether this is the option its column is currently drilled into — the one
   * whose children the column to the right is showing, or the committed segment
   * at this level.
   *
   * Read from the `--active` modifier because nothing else says it: the option
   * has no `aria-selected` and no `aria-expanded`, so the class is both the
   * whole visual answer and the only one available.
   */
  async isActive(): Promise<boolean> {
    return (await this.host()).hasClass('wr-cascader__opt--active');
  }

  /** Whether the option opens a deeper level rather than ending the path. */
  async hasChildren(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-cascader__opt-arrow')()) !== null;
  }

  /**
   * The option's tab index — `0` for every enabled option, `-1` for a disabled
   * one.
   *
   * Worth asking: a cascader column is NOT a roving-cursor listbox. Every
   * enabled option is its own tab stop, in every column, which is the documented
   * reason virtual scrolling is deferred for this component — there is no
   * container-owned arrow-nav model to hang a window off.
   *
   * Read as the element's `tabIndex` PROPERTY rather than the attribute, so an
   * option that carried no `tabindex` at all answers `-1` — what the DOM says of a
   * bare `<li>` — instead of a made-up `0` that would report an unfocusable option
   * as a tab stop if this component ever moved to a roving cursor.
   */
  async getTabIndex(): Promise<number> {
    return (await this.host()).getProperty<number>('tabIndex');
  }

  /**
   * Click the option: a branch opens its children to the right, a leaf commits
   * the path and closes the panel.
   *
   * A disabled option is clickable here on purpose — the component refuses it in
   * its own handler rather than through `pointer-events`, so the click a spec
   * dispatches is exactly as ineffective as one in a browser.
   */
  async click(): Promise<void> {
    return (await this.host()).click();
  }

  /**
   * Activate the option from the keyboard (Enter; Space is bound to the same
   * handler).
   *
   * This is the component's entire keyboard model — the columns bind
   * `keydown.enter` / `keydown.space` per option and nothing else, so there are
   * no arrow keys to walk levels with. A keyboard user reaches the option they
   * want with Tab and presses Enter — and Tab is a long way round: the panel is a
   * portal in the overlay container at the end of the document, and nothing moves
   * focus into it on open, so the first option is not the next stop after the
   * trigger.
   */
  async selectByKeyboard(): Promise<void> {
    return (await this.host()).sendKeys(TestKey.ENTER);
  }

  /**
   * Move the pointer onto the option.
   *
   * Deliberately does NOT expand a branch: this cascader drills down on CLICK
   * only, unlike the hover-to-expand cascaders elsewhere. Kept because a spec
   * may want to pin that, and because the option's hover tint is styled.
   */
  async hover(): Promise<void> {
    return (await this.host()).hover();
  }

  /** Move keyboard focus to the option. */
  async focus(): Promise<void> {
    return (await this.host()).focus();
  }

  /** Whether the option holds keyboard focus. */
  async isFocused(): Promise<boolean> {
    return (await this.host()).isFocused();
  }
}
