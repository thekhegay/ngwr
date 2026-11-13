/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrSidebarItemHarnessFilters } from './types';

/** The hidden separator a row's name is joined with. It is spoken, and it is not part of any one piece. */
const SEPARATOR = '.wr-sidebar__comma';

/**
 * Test harness for one row of a `<wr-sidebar>`: a page link, a disabled page,
 * or the title row of a group.
 *
 * A row's accessible name is its title, badge and count joined by a hidden
 * separator. Each reader here answers one piece without that separator, so
 * `getTitle()` is `'Guides'` and never `'Guides,'`.
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrSidebarItemHarness extends ComponentHarness {
  static hostSelector = '.wr-sidebar__row';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrSidebarItemHarnessFilters = {}): HarnessPredicate<WrSidebarItemHarness> {
    return new HarnessPredicate(WrSidebarItemHarness, options)
      .addOption('title', options.title, (harness, title) => HarnessPredicate.stringMatches(harness.getTitle(), title))
      .addOption('current', options.current, async (harness, current) => (await harness.isCurrent()) === current)
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled);
  }

  /** The row's title, trimmed. */
  async getTitle(): Promise<string> {
    return (await this.locatorFor('.wr-sidebar__title')()).text({ exclude: SEPARATOR });
  }

  /** The line under the title, or `null`. */
  async getSubtitle(): Promise<string | null> {
    return (await (await this.locatorForOptional('.wr-sidebar__subtitle')())?.text()) ?? null;
  }

  /** The word badge (`New`, `Soon`), or `null`. */
  async getBadge(): Promise<string | null> {
    return (await (await this.locatorForOptional('.wr-sidebar__badge')())?.text({ exclude: SEPARATOR })) ?? null;
  }

  /** The count as drawn at the end of the row (`'12'`, `'99+'`), or `null`. */
  async getCount(): Promise<string | null> {
    return (await (await this.locatorForOptional('.wr-sidebar__count')())?.text({ exclude: SEPARATOR })) ?? null;
  }

  /** The nesting level, from 1, out of the row's `wr-sidebar__row--level-<n>` modifier. Level 3 and deeper read `3`. */
  async getLevel(): Promise<number> {
    const host = await this.host();
    for (const level of [1, 2, 3]) {
      if (await host.hasClass(`wr-sidebar__row--level-${level}`)) return level;
    }
    throw new Error(`WrSidebarItemHarness.getLevel(): "${await this.getTitle()}" carries no level modifier.`);
  }

  /** Whether this row is the current page, from `aria-current="page"`. */
  async isCurrent(): Promise<boolean> {
    return (await (await this.host()).getAttribute('aria-current')) === 'page';
  }

  /** Whether the row is a disabled page: plain text, out of the tab order. */
  async isDisabled(): Promise<boolean> {
    return (await this.host()).hasClass('wr-sidebar__row--disabled');
  }

  /** Whether the row is the title of a group. {@link WrSidebarGroupHarness} opens and closes it. */
  async isGroup(): Promise<boolean> {
    return (await this.host()).hasClass('wr-sidebar__row--group');
  }

  /**
   * Click the row: a link navigates, and a group with no page of its own
   * toggles. Throws for a disabled page, which is text and does nothing.
   */
  async click(): Promise<void> {
    if (await this.isDisabled()) {
      throw new Error(`WrSidebarItemHarness.click(): "${await this.getTitle()}" is disabled, so it is not a link.`);
    }
    await (await this.host()).click();
  }

  /** Move keyboard focus to the row. */
  async focus(): Promise<void> {
    return (await this.host()).focus();
  }

  /** Whether the row holds focus. */
  async isFocused(): Promise<boolean> {
    return (await this.host()).isFocused();
  }
}
