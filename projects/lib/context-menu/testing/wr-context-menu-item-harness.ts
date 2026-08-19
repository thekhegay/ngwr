/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, type HarnessLoader, HarnessPredicate, TestKey } from '@angular/cdk/testing';

import type { WrContextMenuItemHarnessFilters } from './interfaces';
import { DEFAULT_TIMEOUT, POLL_STEP, sleep } from './wait';

/**
 * Test harness for one `<wr-context-menu-item>` inside a context menu.
 *
 * The selector is the CLASS rather than the element, matching
 * `.wr-dropdown-item`: it is public API, and it is on the host whichever way the
 * item was written. A `<wr-context-menu-divider>` is deliberately not one of
 * these — it announces `role="separator"` rather than `menuitem`, so it is not
 * something a user can land on and not a member of the item list
 * (`WrContextMenuHarness.getDividerCount()` counts those).
 *
 * An item that owns a `[submenu]` is also the way INTO it: the submenu is a
 * second overlay pane, a sibling of the root menu rather than a child of the
 * item, and it is reached through the id the item publishes as `aria-controls`
 * while it is open. `getSubmenuItems()` answers with these same harnesses, so a
 * chain of any depth is walked by repeating the call.
 *
 * @example
 * ```ts
 * const [cut, copy, more] = await menu.getItems();
 *
 * expect(await copy.isDisabled()).toBe(true);
 * await more.openSubmenu();
 * await more.clickSubmenuItem({ text: 'Duplicate' });
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrContextMenuItemHarness extends ComponentHarness {
  /** The class the item paints on its host. */
  static hostSelector = '.wr-context-menu-item';

  /** Build a predicate that narrows the query. */
  static with(options: WrContextMenuItemHarnessFilters = {}): HarnessPredicate<WrContextMenuItemHarness> {
    return new HarnessPredicate(WrContextMenuItemHarness, options)
      .addOption('text', options.text, (harness, text) => HarnessPredicate.stringMatches(harness.getText(), text))
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled)
      .addOption(
        'hasSubmenu',
        options.hasSubmenu,
        async (harness, hasSubmenu) => (await harness.hasSubmenu()) === hasSubmenu
      );
  }

  /**
   * The item's label, trimmed.
   *
   * Read from the label span, not from the host: a registered icon is written in
   * with `innerHTML`, so an icon carrying a `<title>` would otherwise become
   * part of the answer.
   */
  async getText(): Promise<string> {
    return (await this.locatorFor('.wr-context-menu-item__label')()).text();
  }

  /** The role the item announces — `menuitem`. */
  async getRole(): Promise<string | null> {
    return (await this.host()).getAttribute('role');
  }

  /**
   * Whether the item refuses activation.
   *
   * `aria-disabled`, not the `--disabled` modifier class: both are there, and
   * this is the one a screen reader is told.
   */
  async isDisabled(): Promise<boolean> {
    return (await (await this.host()).getAttribute('aria-disabled')) === 'true';
  }

  /**
   * Whether the item owns a nested submenu.
   *
   * Read from `aria-haspopup`, not from the `--has-submenu` class or the
   * `[submenu]` input: the input is always BOUND (it takes a
   * `<wr-context-menu>` reference), so it never reaches the DOM, and the ARIA
   * property is what announces the item as a drill-down.
   */
  async hasSubmenu(): Promise<boolean> {
    return (await (await this.host()).getAttribute('aria-haspopup')) === 'menu';
  }

  /** Whether this item's submenu is showing, per `aria-expanded`. */
  async isSubmenuOpen(): Promise<boolean> {
    return (await (await this.host()).getAttribute('aria-expanded')) === 'true';
  }

  /** Whether the item shows a leading icon. */
  async hasIcon(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-context-menu-item__icon')()) !== null;
  }

  /** The leading icon's registered name, or `null` when the item has no icon. */
  async getIconName(): Promise<string | null> {
    const icon = await this.locatorForOptional('.wr-context-menu-item__icon')();
    // `<wr-icon>` reflects the name it was asked for as `data-icon`, whether or not
    // that name is registered — so this answers what the item MEANT to draw.
    return icon ? icon.getAttribute('data-icon') : null;
  }

  /**
   * Whether the item holds the menu's roving focus.
   *
   * The menu moves focus onto its first enabled row as the pane renders and the
   * arrows walk it from there, so this is where the keyboard is. Opening a
   * submenu hands the cursor to the submenu's own first row, which leaves the
   * item that owns it unfocused while its pane is up.
   */
  async isFocused(): Promise<boolean> {
    return (await this.host()).isFocused();
  }

  /**
   * Click the item. A disabled item throws instead.
   *
   * Refusing is the only honest answer. A browser never delivers the click at all:
   * `pointer-events: none` on the `--disabled` modifier takes the row out of the
   * hit test. jsdom loads no stylesheets, so a click dispatched here DOES land on
   * the host, and while the component's own handler refuses it (a disabled item
   * dismisses nothing), the consumer's `(click)` on that same host is a separate
   * listener and runs — so the spec would record an activation that cannot happen
   * in a browser. Assert `isDisabled()` instead.
   *
   * Activating a LEAF item dismisses the whole chain, root menu included. An item
   * that owns a submenu is not a leaf: clicking it does nothing at all (hover or
   * `openSubmenu()` is how it opens).
   */
  async click(): Promise<void> {
    if (await this.isDisabled()) {
      throw new Error(
        `WrContextMenuItemHarness.click(): "${await this.getText()}" is disabled, so clicking it would ` +
          'report behaviour a browser cannot produce — the pointer is stopped by CSS, which jsdom does ' +
          'not load. Assert isDisabled() instead.'
      );
    }

    return (await this.host()).click();
  }

  /**
   * Press Enter on the item — the keyboard equivalent of a click, and the route
   * a spec should prefer, since it needs no hit test.
   *
   * Deliberately does NOT refuse a disabled item the way `click()` does: the
   * component guards the keyboard path itself, so the key can be sent honestly
   * and a spec can assert that nothing happened. On an item that owns a submenu
   * this OPENS the submenu rather than activating the row, which is the APG
   * behaviour — activating it would close the menu and leave the submenu
   * unreachable from the keyboard.
   */
  async activateByKeyboard(): Promise<void> {
    return (await this.host()).sendKeys(TestKey.ENTER);
  }

  /**
   * Open this item's submenu with the right arrow and wait until it says so.
   *
   * The keyboard, not the pointer: it opens with no delay (hover waits out
   * 120ms — `openSubmenuByHover()` covers that path) and needs no coordinates,
   * which jsdom could not supply anyway. A keyboard open walks INTO the submenu,
   * so afterwards the cursor is on the submenu's first row and `isFocused()` on
   * this item is `false` — `openSubmenuByHover()` only shows the pane and leaves
   * the cursor where it was.
   */
  async openSubmenu(timeout = DEFAULT_TIMEOUT): Promise<void> {
    await this.assertHasSubmenu('openSubmenu');
    if (await this.isSubmenuOpen()) return;

    await (await this.host()).sendKeys(TestKey.RIGHT_ARROW);
    if (await this.isSubmenuOpen()) return;
    if (await this.settled(true, timeout)) return;

    throw new Error(
      `WrContextMenuItemHarness.openSubmenu(): "${await this.getText()}" did not open its submenu within ` +
        `${timeout}ms. A disabled item refuses the key outright — check isDisabled().`
    );
  }

  /**
   * Open this item's submenu by resting the pointer on it, the gesture a mouse
   * user actually makes, and wait out the hover delay.
   */
  async openSubmenuByHover(timeout = DEFAULT_TIMEOUT): Promise<void> {
    await this.assertHasSubmenu('openSubmenuByHover');
    if (await this.isSubmenuOpen()) return;

    await (await this.host()).hover();
    if (await this.settled(true, timeout)) return;

    throw new Error(
      `WrContextMenuItemHarness.openSubmenuByHover(): "${await this.getText()}" did not open its submenu ` +
        `within ${timeout}ms. The hover path is a real 120ms timer, so a spec on fake timers has to ` +
        'advance the clock itself; a disabled item ignores the pointer entirely.'
    );
  }

  /** Close this item's submenu with the left arrow. An item without one open is left alone. */
  async closeSubmenu(timeout = DEFAULT_TIMEOUT): Promise<void> {
    if (!(await this.isSubmenuOpen())) return;

    await (await this.host()).sendKeys(TestKey.LEFT_ARROW);
    if (await this.settled(false, timeout)) return;

    throw new Error(
      `WrContextMenuItemHarness.closeSubmenu(): "${await this.getText()}" still reports its submenu open ` +
        `after ${timeout}ms.`
    );
  }

  /**
   * The items in THIS item's submenu, in DOM order.
   *
   * Throws while the submenu is shut, and while the item owns none: both would
   * otherwise answer with an empty array, which reads like a submenu that
   * rendered nothing and fails somewhere else entirely.
   */
  async getSubmenuItems(filters: WrContextMenuItemHarnessFilters = {}): Promise<WrContextMenuItemHarness[]> {
    const loader = await this.submenuLoader();
    return loader.getAllHarnesses(WrContextMenuItemHarness.with(filters));
  }

  /** The labels of the items in this item's submenu, in DOM order. */
  async getSubmenuItemTexts(): Promise<string[]> {
    const items = await this.getSubmenuItems();
    return Promise.all(items.map(item => item.getText()));
  }

  /**
   * Open the submenu if it is shut, then click the first item in it matching the
   * filters.
   *
   * Picking a leaf dismisses the whole chain — this item's submenu and the root
   * menu with it.
   */
  async clickSubmenuItem(filters: WrContextMenuItemHarnessFilters): Promise<void> {
    await this.openSubmenu();

    const [item] = await this.getSubmenuItems(filters);
    if (!item) {
      const offered = await this.getSubmenuItemTexts();
      throw new Error(
        `WrContextMenuItemHarness.clickSubmenuItem(): no item matched ${JSON.stringify(filters)}. ` +
          `The submenu of "${await this.getText()}" offers: ${offered.join(', ')}.`
      );
    }

    await item.click();
  }

  /**
   * A loader scoped to THIS item's submenu pane.
   *
   * Scoped by the published id rather than by `.wr-context-menu`: every pane in
   * the chain — the root menu and each open submenu — carries that class in one
   * shared overlay container, so a class query would answer with whichever
   * opened first.
   */
  private async submenuLoader(): Promise<HarnessLoader> {
    return this.documentRootLocatorFactory().harnessLoaderFor(`#${await this.submenuId()}`);
  }

  /** The id this item publishes as `aria-controls`, which its open submenu carries. */
  private async submenuId(): Promise<string> {
    const id = await (await this.host()).getAttribute('aria-controls');
    if (!id) {
      const label = await this.getText();
      throw new Error(
        `WrContextMenuItemHarness: "${label}" has no submenu showing. An item publishes aria-controls only ` +
          'while its submenu is open — call openSubmenu() first, and check that it owns one at all with ' +
          'hasSubmenu().'
      );
    }
    return id;
  }

  /** Fail early, and by name, when the item is not a drill-down at all. */
  private async assertHasSubmenu(method: string): Promise<void> {
    if (await this.hasSubmenu()) return;

    throw new Error(
      `WrContextMenuItemHarness.${method}(): "${await this.getText()}" owns no submenu, so there is ` +
        'nothing to open. An item that does advertises it with aria-haspopup="menu" — hasSubmenu().'
    );
  }

  /** Poll until `isSubmenuOpen()` reports `open`, and say whether it did. */
  private async settled(open: boolean, timeout: number): Promise<boolean> {
    for (let waited = 0; waited <= timeout; waited += POLL_STEP) {
      if ((await this.isSubmenuOpen()) === open) return true;

      await sleep(POLL_STEP);
      await this.forceStabilize();
    }
    return false;
  }
}
