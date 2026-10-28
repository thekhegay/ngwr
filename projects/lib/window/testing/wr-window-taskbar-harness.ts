/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, type TestElement } from '@angular/cdk/testing';

import type { WrWindowTaskbarHarnessFilters } from './types';

/** A drawn tab: a folded window keeps its tab in the rail, hidden, so the rail can measure it. */
const TAB = '.wr-window-taskbar__tab:not(.wr-window-taskbar__tab--folded)';

/**
 * Test harness for `<wr-window-taskbar>` — the rail of minimized windows.
 *
 * Tabs past `maxTabs`, or past what the rail's width holds, fold under a "+N"
 * button: {@link getTabTitles} reads the rail, {@link getFoldedTitles} the menu.
 * Under jsdom nothing has a width, so only `maxTabs` folds there.
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
    const titles = await this.locatorForAll(`${TAB} .wr-window-taskbar__tab-title`)();
    return Promise.all(titles.map(title => title.text()));
  }

  /**
   * The title of the tab marked active — `show="all"` marks the active window's
   * tab, with `aria-pressed` and a modifier. `null` when no tab is marked, which
   * is always the case in the default `show="minimized"`.
   */
  async getActiveTabTitle(): Promise<string | null> {
    const active = await this.locatorForOptional('.wr-window-taskbar__tab--active .wr-window-taskbar__tab-title')();
    return active ? active.text() : null;
  }

  /** Whether a tab's button says it is pressed — the active window's, in `show="all"`. */
  async isTabPressed(title: string): Promise<boolean> {
    return (await (await this.requireTab(title, 'isTabPressed')).getAttribute('aria-pressed')) === 'true';
  }

  /** A tab's accessible name — the restore wording with the window's title in it. */
  async getRestoreLabel(title: string): Promise<string | null> {
    return (await this.requireTab(title, 'getRestoreLabel')).getAttribute('aria-label');
  }

  /**
   * Click a tab — switching to that window, back from the taskbar if it was
   * minimized, and focusing it. In `show="all"` the active window's own tab
   * minimizes it instead.
   */
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
    const closers = await this.locatorForAll(`${TAB} .wr-window-taskbar__tab-close`)();
    await closers[index].click();
  }

  /**
   * How many windows are folded under the "+N" button — `0` when every tab fits.
   * Read off the button's own count, which is what a sighted user sees; the
   * titles behind it are {@link getFoldedTitles}.
   */
  async getFoldedCount(): Promise<number> {
    const more = await this.locatorForOptional('.wr-window-taskbar__more')();
    return more ? Number((await more.text()).trim().replace(/^\+/, '')) : 0;
  }

  /**
   * The titles folded under the "+N" button, in order, read from the menu it
   * opens. A menu this call opened is closed again, so asking does not change
   * what the page shows; `[]` when nothing is folded.
   */
  async getFoldedTitles(): Promise<string[]> {
    const more = await this.locatorForOptional('.wr-window-taskbar__more')();
    if (!more) return [];
    const wasOpen = (await more.getAttribute('aria-expanded')) === 'true';
    const titles = await Promise.all((await this.foldedItems(more)).map(item => item.text()));
    if (!wasOpen) await more.click();
    return titles.map(title => title.trim());
  }

  /**
   * Pick a folded window from the "+N" menu — the menu closes and the window
   * comes forward, as from its tab.
   */
  async restoreFolded(title: string): Promise<void> {
    const more = await this.locatorForOptional('.wr-window-taskbar__more')();
    if (!more) {
      throw new Error(
        `WrWindowTaskbarHarness.restoreFolded("${title}"): nothing is folded — every tab fits, so restore() reaches it.`
      );
    }
    const items = await this.foldedItems(more);
    for (const item of items) {
      if ((await item.text()).trim() === title) {
        await item.click();
        return;
      }
    }
    const offered = await Promise.all(items.map(item => item.text()));
    throw new Error(
      `WrWindowTaskbarHarness.restoreFolded("${title}"): no such window under "+N". It holds: ` +
        `${offered.map(t => t.trim()).join(', ')}.`
    );
  }

  /**
   * The rows of the "+N" menu, opening it first if it is closed. Scoped by the id
   * the button publishes in `aria-controls`, never by the menu's class: the menu
   * renders in the overlay container, beside every other dropdown on the page.
   */
  private async foldedItems(more: TestElement): Promise<TestElement[]> {
    if ((await more.getAttribute('aria-expanded')) !== 'true') await more.click();
    const id = await more.getAttribute('aria-controls');
    if (!id) {
      throw new Error('WrWindowTaskbarHarness: the "+N" button opened no menu — it names none in aria-controls.');
    }
    return this.documentRootLocatorFactory().locatorForAll(`#${id} .wr-window-taskbar__fold-item`)();
  }

  /**
   * The tab's BUTTON, not the pill around it.
   *
   * `.wr-window-taskbar__tab` is a plain container — it carries the pill's look
   * and nothing else, because the close beside it cannot be a control nested in
   * a control. The name and the click both belong to `__tab-restore`.
   */
  private async requireTab(title: string, method: string): Promise<TestElement> {
    const tabs = await this.locatorForAll(`${TAB} .wr-window-taskbar__tab-restore`)();
    return tabs[await this.indexOf(title, method)];
  }

  /** Which tab carries this title — one lookup for both the tab and its close button. */
  private async indexOf(title: string, method: string): Promise<number> {
    const tabs = await this.locatorForAll(`${TAB} .wr-window-taskbar__tab-restore`)();
    for (const [index, tab] of tabs.entries()) {
      if ((await tab.text()) === title) return index;
    }

    const offered = await this.getTabTitles();
    const folded = await this.getFoldedCount();
    throw new Error(
      `WrWindowTaskbarHarness.${method}("${title}"): no such tab. The rail holds: ` +
        `${offered.length ? offered.join(', ') : '(nothing — no window is minimized)'}.${
          folded ? ` The rest are folded under "+${folded}", where restoreFolded() reaches them.` : ''
        }`
    );
  }
}
