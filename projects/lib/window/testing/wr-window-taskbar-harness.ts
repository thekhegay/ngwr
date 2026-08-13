/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, type TestElement } from '@angular/cdk/testing';

import type { WrWindowTaskbarHarnessFilters } from './interfaces';

/**
 * Test harness for `<wr-window-taskbar>` — the rail of minimized windows.
 *
 * The taskbar IS an element in your template, so it comes from the normal fixture
 * loader, unlike the windows it lists. It renders nothing but its own host until a
 * window is minimized; {@link isEmpty} is the question, and {@link getTabTitles}
 * answers `[]` rather than throwing, because "no minimized windows" is the ordinary
 * state rather than a mistake.
 *
 * @example
 * ```ts
 * const taskbar = await loader.getHarness(WrWindowTaskbarHarness);
 *
 * await (await rootLoader.getHarness(WrWindowHarness)).minimize();
 * expect(await taskbar.getTabTitles()).toEqual(['Untitled.md']);
 * await taskbar.restore('Untitled.md');
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrWindowTaskbarHarness extends ComponentHarness {
  static hostSelector = 'wr-window-taskbar';

  /** Build a predicate that narrows the query. */
  static with(options: WrWindowTaskbarHarnessFilters = {}): HarnessPredicate<WrWindowTaskbarHarness> {
    return new HarnessPredicate(WrWindowTaskbarHarness, options).addOption(
      'position',
      options.position,
      async (harness, position) => (await harness.getPosition()) === position
    );
  }

  /** The edge the rail is pinned to. */
  async getPosition(): Promise<'top' | 'bottom'> {
    return (await (await this.host()).hasClass('wr-window-taskbar--top')) ? 'top' : 'bottom';
  }

  /**
   * The rail's accessible name — it is a `role="toolbar"`, and an unnamed one is
   * announced as nothing.
   */
  async getRailLabel(): Promise<string | null> {
    return (await this.host()).getAttribute('aria-label');
  }

  /** Whether nothing is minimized — the rail draws no markup at all then. */
  async isEmpty(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-window-taskbar__rail')()) === null;
  }

  /**
   * The titles in the rail, in order.
   *
   * A window opened without a title still gets a tab, named by the catalog's
   * fallback rather than left blank — a nameless tab is unreachable by voice and
   * indistinguishable from its neighbours.
   */
  async getTabTitles(): Promise<string[]> {
    const titles = await this.locatorForAll('.wr-window-taskbar__tab-title')();
    return Promise.all(titles.map(title => title.text()));
  }

  /** A tab's accessible name — the restore wording with the window's title in it. */
  async getRestoreLabel(title: string): Promise<string | null> {
    return (await this.requireTab(title, 'getRestoreLabel')).getAttribute('aria-label');
  }

  /** Click a tab — restoring that window and focusing it. */
  async restore(title: string): Promise<void> {
    await (await this.requireTab(title, 'restore')).click();
  }

  /**
   * Click a tab's ✕ — closing the window WITHOUT restoring it.
   *
   * Still worth asserting separately now that the two are siblings rather than
   * nested: they sit inside one pill and look like one control, so a close that
   * also restored would flash a closing window's content and look plausible.
   */
  async closeTab(title: string): Promise<void> {
    const index = await this.indexOf(title, 'closeTab');
    const closers = await this.locatorForAll('.wr-window-taskbar__tab-close')();
    await closers[index].click();
  }

  /**
   * The tab's BUTTON, not the pill around it.
   *
   * `.wr-window-taskbar__tab` is a plain container — it carries the pill's look
   * and nothing else, because the close beside it cannot be a control nested in
   * a control. The name and the click both belong to `__tab-restore`.
   */
  private async requireTab(title: string, method: string): Promise<TestElement> {
    const tabs = await this.locatorForAll('.wr-window-taskbar__tab-restore')();
    return tabs[await this.indexOf(title, method)];
  }

  /** Which tab carries this title — one lookup for both the tab and its close button. */
  private async indexOf(title: string, method: string): Promise<number> {
    const tabs = await this.locatorForAll('.wr-window-taskbar__tab-restore')();
    for (const [index, tab] of tabs.entries()) {
      if ((await tab.text()) === title) return index;
    }

    const offered = await this.getTabTitles();
    throw new Error(
      `WrWindowTaskbarHarness.${method}("${title}"): no such tab. The rail holds: ` +
        `${offered.length ? offered.join(', ') : '(nothing — no window is minimized)'}.`
    );
  }
}
