/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrSidebarGroupHarnessFilters, WrSidebarItemHarnessFilters } from './types';
import { WrSidebarItemHarness } from './wr-sidebar-item-harness';

/**
 * Test harness for one group of a `<wr-sidebar>`: a title row, and the rows it
 * opens.
 *
 * A group comes in two shapes and the harness covers both. Without a page of
 * its own the whole title row is the toggle. With one, the title is a link and
 * the arrow beside it is a separate button: {@link isLink} tells them apart,
 * and {@link toggle} presses whichever element carries `aria-expanded`.
 *
 * Open and closed are read from that attribute. The rows of a closed group
 * stay in the DOM, so {@link isContentHidden} is how a spec checks they are out
 * of reach of the keyboard.
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrSidebarGroupHarness extends ComponentHarness {
  static hostSelector = 'li.wr-sidebar__group';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrSidebarGroupHarnessFilters = {}): HarnessPredicate<WrSidebarGroupHarness> {
    return new HarnessPredicate(WrSidebarGroupHarness, options)
      .addOption('title', options.title, (harness, title) => HarnessPredicate.stringMatches(harness.getTitle(), title))
      .addOption('open', options.open, async (harness, open) => (await harness.isOpen()) === open);
  }

  // Every first match below is this group's own: its title row and its toggle
  // come before its body, and the groups nested in it are inside that body.
  private readonly row = this.locatorFor(WrSidebarItemHarness);
  private readonly toggleElement = this.locatorFor('[aria-expanded]');
  private readonly body = this.locatorFor('.wr-sidebar__group-wrap');

  /** The group's title, trimmed. */
  async getTitle(): Promise<string> {
    return (await this.row()).getTitle();
  }

  /** The group's title row, for its subtitle, badge, count and current state. */
  async getRow(): Promise<WrSidebarItemHarness> {
    return this.row();
  }

  /** Whether the group is open, from its toggle's `aria-expanded`. */
  async isOpen(): Promise<boolean> {
    return (await (await this.toggleElement()).getAttribute('aria-expanded')) === 'true';
  }

  /** Whether the group is a page as well: its title is a link, and the arrow is a button of its own. */
  async isLink(): Promise<boolean> {
    return (await this.toggleElement()).hasClass('wr-sidebar__toggle');
  }

  /** The toggle's own accessible name: only a split group's arrow has one, the rest are named by their row. */
  async getToggleLabel(): Promise<string | null> {
    return (await this.toggleElement()).getAttribute('aria-label');
  }

  /**
   * Whether the group is closed around the current page, from the
   * `wr-sidebar__row--holds-active` modifier that draws its dot.
   */
  async holdsCurrent(): Promise<boolean> {
    return (await (await this.row()).host()).hasClass('wr-sidebar__row--holds-active');
  }

  /** Whether the group's rows are out of reach of the keyboard, from `inert` on its body. */
  async isContentHidden(): Promise<boolean> {
    return (await (await this.body()).getAttribute('inert')) !== null;
  }

  /**
   * The rows under this group, in order, nested groups' rows included.
   * Answered whether the group is open or not: ask {@link isOpen} first when
   * the question is what a user can reach.
   */
  async getItems(filters: WrSidebarItemHarnessFilters = {}): Promise<WrSidebarItemHarness[]> {
    return this.locatorForAll(WrSidebarItemHarness.with({ ...filters, ancestor: await this.bodySelector() }))();
  }

  /** The titles of the rows under this group, in order. */
  async getItemTitles(): Promise<string[]> {
    const items = await this.getItems();
    return Promise.all(items.map(item => item.getTitle()));
  }

  /** Press the toggle. */
  async toggle(): Promise<void> {
    await (await this.toggleElement()).click();
  }

  /** Open the group. An already-open one is left alone. */
  async open(): Promise<void> {
    if (!(await this.isOpen())) await this.toggle();
  }

  /** Close the group. An already-closed one is left alone. */
  async close(): Promise<void> {
    if (await this.isOpen()) await this.toggle();
  }

  /** The body's own id, which the toggle's `aria-controls` names. */
  private async bodySelector(): Promise<string> {
    return `#${await (await this.toggleElement()).getAttribute('aria-controls')}`;
  }
}
