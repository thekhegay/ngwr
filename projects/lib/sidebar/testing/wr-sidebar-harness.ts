/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrSidebarGroupHarnessFilters, WrSidebarHarnessFilters, WrSidebarItemHarnessFilters } from './types';
import { WrSidebarGroupHarness } from './wr-sidebar-group-harness';
import { WrSidebarItemHarness } from './wr-sidebar-item-harness';

/** Not inside a closed group. A closed group keeps its rows in the DOM, behind `inert`. */
const REACHABLE = ':not(.wr-sidebar__group-wrap[inert] *)';

/**
 * Test harness for `<wr-sidebar>`, the navigation drawn from data.
 *
 * The sidebar has no collapsed state of its own: its groups open and close,
 * each through a {@link WrSidebarGroupHarness}. A closed group keeps its rows
 * in the DOM so its height can animate, which means a plain query finds links
 * nobody can reach. {@link getItems} and {@link getGroups} answer with what is
 * reachable, the rows outside every closed group, and `clickItem()` on a row
 * inside one fails and names the rows that are there.
 *
 * The current page is asked for separately, across every row, because a
 * collapsed group can hold it: see {@link getCurrentTitles}.
 *
 * @example
 * ```ts
 * const nav = await loader.getHarness(WrSidebarHarness);
 *
 * await nav.openGroup('Settings');
 * await nav.clickItem('Billing');
 * expect(await nav.getCurrentTitles()).toEqual(['Billing']);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrSidebarHarness extends ComponentHarness {
  static hostSelector = 'wr-sidebar';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrSidebarHarnessFilters = {}): HarnessPredicate<WrSidebarHarness> {
    return new HarnessPredicate(WrSidebarHarness, options).addOption('label', options.label, (harness, label) =>
      HarnessPredicate.stringMatches(harness.getLabel(), label)
    );
  }

  /** The accessible name of the navigation landmark. */
  async getLabel(): Promise<string | null> {
    return (await this.host()).getAttribute('aria-label');
  }

  /** The reachable rows, in order: pages, disabled pages and group titles, outside every closed group. */
  async getItems(filters: WrSidebarItemHarnessFilters = {}): Promise<WrSidebarItemHarness[]> {
    return this.locatorForAll(WrSidebarItemHarness.with({ ...filters, selector: REACHABLE }))();
  }

  /** The titles of the reachable rows, in order. */
  async getItemTitles(): Promise<string[]> {
    const items = await this.getItems();
    return Promise.all(items.map(item => item.getTitle()));
  }

  /** The first reachable row with this title, or a failure naming the rows that are reachable. */
  async getItem(title: string | RegExp): Promise<WrSidebarItemHarness> {
    const [item] = await this.getItems({ title });
    if (!item) {
      throw new Error(
        `WrSidebarHarness.getItem(): no reachable row matched ${String(title)}. A row inside a closed group is ` +
          `out of reach: open the group first. Reachable now: ${(await this.getItemTitles()).join(', ')}.`
      );
    }
    return item;
  }

  /** The reachable groups, in order. */
  async getGroups(filters: WrSidebarGroupHarnessFilters = {}): Promise<WrSidebarGroupHarness[]> {
    return this.locatorForAll(WrSidebarGroupHarness.with({ ...filters, selector: REACHABLE }))();
  }

  /** The first reachable group with this title, or a failure naming the groups that are reachable. */
  async getGroup(title: string | RegExp): Promise<WrSidebarGroupHarness> {
    const [group] = await this.getGroups({ title });
    if (!group) {
      const titles = await Promise.all((await this.getGroups()).map(each => each.getTitle()));
      throw new Error(
        `WrSidebarHarness.getGroup(): no reachable group matched ${String(title)}. Reachable now: ${titles.join(', ')}.`
      );
    }
    return group;
  }

  /**
   * The title of every row marked `aria-current="page"`, in order, whether it
   * is reachable or inside a closed group.
   *
   * A list, because the default match is a path prefix: an entry at `['/']`
   * is current on every route unless it asks for an exact match.
   */
  async getCurrentTitles(): Promise<string[]> {
    const current = await this.locatorForAll(WrSidebarItemHarness.with({ current: true }))();
    return Promise.all(current.map(item => item.getTitle()));
  }

  /** Click the first reachable row with this title. Throws when it is out of reach, or disabled. */
  async clickItem(title: string | RegExp): Promise<void> {
    await (await this.getItem(title)).click();
  }

  /** Whether the first reachable group with this title is open. */
  async isGroupOpen(title: string | RegExp): Promise<boolean> {
    return (await this.getGroup(title)).isOpen();
  }

  /** Open the first reachable group with this title. */
  async openGroup(title: string | RegExp): Promise<void> {
    await (await this.getGroup(title)).open();
  }

  /** Close the first reachable group with this title. */
  async closeGroup(title: string | RegExp): Promise<void> {
    await (await this.getGroup(title)).close();
  }
}
