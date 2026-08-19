/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import {
  ContentContainerComponentHarness,
  type HarnessLoader,
  HarnessPredicate,
  TestKey,
  type TestElement,
} from '@angular/cdk/testing';

import type { WrContextMenuHarnessFilters, WrContextMenuItemHarnessFilters } from './interfaces';
import { DEFAULT_TIMEOUT, POLL_STEP, sleep } from './wait';
import { WrContextMenuItemHarness } from './wr-context-menu-item-harness';

/**
 * How long to sit still before an outside press is allowed to dismiss the menu.
 *
 * The directive ignores outside events for 200ms after opening, because the very
 * right-click that opened the menu still has its own `mouseup` / `auxclick`
 * pending — without the window, lifting the finger would shut the menu again.
 */
const OUTSIDE_GUARD_MS = 250;

/**
 * Test harness for `[wrContextMenu]` — the right-click target, and the menu it
 * opens.
 *
 * The harness matches the TARGET, because that is the only part of a context
 * menu in the fixture: `<wr-context-menu>` renders nothing of its own (it hands
 * over an `<ng-template>` and hides its host), and the menu is portalled into the
 * overlay container, a sibling of the whole app. So every item is read through
 * the document root, scoped by the `aria-controls` id the target publishes while
 * its menu is up — which is what keeps two menus on one page from answering with
 * each other's items, and what keeps a re-opened menu from answering with the one
 * still playing its exit animation.
 *
 * That scoped loader is also this harness's CONTENT loader, so
 * `menu.getHarness(…)` resolves inside THIS menu: a component the consumer
 * projected into the menu is reachable without the spec ever touching the
 * overlay.
 *
 * **How it differs from `WrDropdownHarness`, its closest sibling.**
 *
 * - The gesture is a real `contextmenu` event, not a click — `open()` sends one,
 *   and `openByLongPress()` covers the touch path. There is no toggle: a second
 *   right-click re-opens the menu at the new pointer position.
 * - Activating an item DISMISSES the menu (a dropdown's stays up), so
 *   `clickItem()` leaves it closed.
 * - Submenus are a first-class input here rather than a nested trigger, so they
 *   are driven from {@link WrContextMenuItemHarness}.
 * - Focus moves in on EVERY open, where a dropdown's does so only when a
 *   keyboard opened it. There is no hover trigger here — a right-click, Shift+F10
 *   or a long-press is always a deliberate request for the menu — so
 *   `getFocusedItemText()` answers straight after `open()`.
 *
 * **Timing.** The waits are real: a 500ms `setTimeout` for the long-press hold and
 * another 220ms one for the exit animation the pane is held alive through, plus the
 * outside-press window above — that one is a `performance.now()` comparison against
 * the moment the menu opened rather than a timer, so only wall-clock time gets past
 * it. The methods that must sit out real time say so; a spec on fake timers should
 * drive the clock itself and read `isOpen()`.
 *
 * @example
 * ```ts
 * const menu = await loader.getHarness(WrContextMenuHarness.with({ text: 'Right-click me' }));
 *
 * await menu.open();
 * expect(await menu.getItemTexts()).toEqual(['Cut', 'Copy', 'More']);
 *
 * await menu.clickItem({ text: 'Cut' });
 * expect(await menu.isOpen()).toBe(false);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrContextMenuHarness extends ContentContainerComponentHarness {
  /** The directive's host — whatever element the consumer put `[wrContextMenu]` on. */
  static hostSelector = '.wr-context-menu-host';

  /** Build a predicate that narrows the query. */
  static with(options: WrContextMenuHarnessFilters = {}): HarnessPredicate<WrContextMenuHarness> {
    return new HarnessPredicate(WrContextMenuHarness, options)
      .addOption('text', options.text, (harness, text) => HarnessPredicate.stringMatches(harness.getTargetText(), text))
      .addOption('open', options.open, async (harness, open) => (await harness.isOpen()) === open);
  }

  /** The target's own visible text — the content that gets right-clicked. */
  async getTargetText(): Promise<string> {
    return (await this.host()).text();
  }

  /**
   * Whether this target's menu is showing.
   *
   * Read from the target rather than from the overlay, and that is the whole
   * point: a closed menu's pane stays in the DOM for its exit animation, while
   * the reference is dropped the instant the close begins. Asking the DOM
   * "is a menu present" would answer `true` for a quarter of a second after every
   * dismissal.
   *
   * So the answer is only as good as the directive's claim on `aria-controls`:
   * put `[wrContextMenu]` on an element that publishes one of its own and the two
   * fight over a single attribute.
   */
  async isOpen(): Promise<boolean> {
    return (await (await this.host()).getAttribute('aria-controls')) !== null;
  }

  /** The role the menu announces — `menu`. Throws while no menu is open. */
  async getMenuRole(): Promise<string | null> {
    return (await this.menu()).getAttribute('role');
  }

  /**
   * Everything the open menu renders as text, runs of whitespace collapsed.
   *
   * Wider than `getItemTexts()` on purpose: `<wr-context-menu>` projects whatever
   * it is given, so a section heading or any other markup a consumer put between
   * the items shows up here and in no item harness. Dividers contribute nothing —
   * they render no text.
   *
   * Expect to match a FRAGMENT of this rather than the whole of it: Angular
   * strips the whitespace between elements at compile time, so the labels run
   * together (`'Pick oneAppleBanana'`). The collapsing here only tidies newlines
   * inside a single block of projected text.
   */
  async getMenuText(): Promise<string> {
    return (await (await this.menu()).text()).replace(/\s+/g, ' ').trim();
  }

  /**
   * Open the menu by right-clicking the target, the gesture the directive
   * actually listens for (`contextmenu`, which is also what Shift+F10 sends).
   *
   * An already-open menu is left alone — `rightClick()` is the raw gesture if
   * what you want is the re-open.
   *
   * Note for a spec with two targets: a `contextmenu` event anywhere is an
   * outside pointer event for every OTHER open menu, so this dismisses them on
   * the way in. `openByLongPress()` is the route that does not.
   */
  async open(): Promise<void> {
    if (await this.isOpen()) return;

    await this.rightClick();
    if (await this.isOpen()) return;

    throw new Error(
      'WrContextMenuHarness.open(): the right-click did not open a menu. The directive answers ' +
        '`contextmenu` on its own host, so check this is the element you put [wrContextMenu] on. One ' +
        'deliberate exception: a right-click within 700ms of a long-press open is swallowed, because touch ' +
        'browsers fire a synthetic contextmenu after the hold.'
    );
  }

  /**
   * Send a `contextmenu` to the target whatever state the menu is in.
   *
   * On an open menu this re-opens it at the new pointer position — the previous
   * pane is dismissed and a fresh one takes its place, which is why the harness
   * scopes by a per-open id rather than by class: for the length of the exit
   * animation both are in the container, the dying one first.
   *
   * The coordinates the CDK requires are all zeros, and meaningless: jsdom has no
   * layout. Nothing here needs them — the event is dispatched on the element
   * itself, no hit test involved.
   */
  async rightClick(): Promise<void> {
    return (await this.host()).rightClick(0, 0);
  }

  /**
   * Open the menu with a touch long-press — hold a non-mouse pointer on the
   * target for 500ms — and wait until it is up.
   *
   * Worth its own method rather than an argument to `open()`, for the reason the
   * dropdown has `openByKeyboard()`: it is the only way to get TWO context menus
   * open at once. The press emits no `click` / `auxclick` / `contextmenu`, so it
   * is not an outside press for anyone else's menu, while a right-click is.
   *
   * The pointer fields the directive reads are assigned onto a synthetic event:
   * what matters is a primary pointer that is not a mouse. Movement beyond 10px,
   * a scroll, or an early lift cancels the hold in the component — none of which
   * this does.
   */
  async openByLongPress(timeout = DEFAULT_TIMEOUT): Promise<void> {
    if (await this.isOpen()) return;

    const host = await this.host();
    await host.dispatchEvent('pointerdown', {
      pointerType: 'touch',
      isPrimary: true,
      clientX: 0,
      clientY: 0,
      pageX: 0,
      pageY: 0,
    });

    const opened = await this.settled(true, timeout);
    // The finger comes off once the menu is up — after the hold, so it reads as a
    // completed long-press rather than the early lift that cancels one.
    await host.dispatchEvent('pointerup');

    if (opened) return;

    throw new Error(
      `WrContextMenuHarness.openByLongPress(): nothing opened within ${timeout}ms. The hold is a real 500ms ` +
        'timer, so a spec on fake timers has to advance the clock itself and read isOpen().'
    );
  }

  /**
   * Dismiss the menu with Escape and wait until its pane has left the DOM.
   *
   * Escape is delivered by the CDK's keyboard dispatcher to the TOP-MOST overlay,
   * so with a later menu (or any other overlay) open on top, this one keeps
   * waiting its turn — that is what the throw below is about. The wait covers the
   * 220ms exit animation, so a spec can assert afterwards that nothing lingers.
   */
  async close(timeout = DEFAULT_TIMEOUT): Promise<void> {
    if (!(await this.isOpen())) return;

    // Captured first: the target drops the reference the instant the close starts,
    // and the wait below still has to know which pane to watch.
    const id = await this.menuId();
    await (await this.host()).sendKeys(TestKey.ESCAPE);

    if (await this.isOpen()) {
      throw new Error(
        'WrContextMenuHarness.close(): Escape did not dismiss the menu. The CDK keyboard dispatcher ' +
          'delivers it to the TOP-MOST overlay only, so anything opened after this menu takes it first.'
      );
    }

    return this.waitUntilGone(id, 'close', timeout);
  }

  /**
   * Dismiss the menu by pressing outside it, the way a user gets rid of one, and
   * wait until its pane has left the DOM.
   *
   * Sits out real time first: the directive ignores outside events for 200ms after
   * opening, so the right-click that opened the menu cannot immediately close it
   * again with its own trailing `auxclick`. The press then lands on the TARGET,
   * which is outside the pane and therefore counts — the page background is not
   * something a harness has a handle on. A target that carries a `(click)` of its
   * own will see it fire, so assert on the dismissal rather than on that handler.
   */
  async closeByOutsidePress(timeout = DEFAULT_TIMEOUT): Promise<void> {
    if (!(await this.isOpen())) return;

    const id = await this.menuId();
    await sleep(OUTSIDE_GUARD_MS);
    await this.forceStabilize();
    await (await this.host()).click();

    if (await this.isOpen()) {
      throw new Error(
        'WrContextMenuHarness.closeByOutsidePress(): the menu is still open. A press inside the pane is ' +
          'not an outside press, and neither is one that started inside it — this one lands on the target.'
      );
    }

    return this.waitUntilGone(id, 'closeByOutsidePress', timeout);
  }

  /**
   * The items in this menu, in DOM order.
   *
   * Only this menu's own: an open submenu is a separate pane, so its items are
   * `WrContextMenuItemHarness.getSubmenuItems()`, not part of this list. Dividers
   * are not items either.
   *
   * Throws while the menu is shut — the items do not exist anywhere until the
   * portal is attached, and an empty array reads like a menu that rendered
   * nothing.
   */
  async getItems(filters: WrContextMenuItemHarnessFilters = {}): Promise<WrContextMenuItemHarness[]> {
    return this.getAllHarnesses(WrContextMenuItemHarness.with(filters));
  }

  /** The labels of this menu's items, in DOM order. */
  async getItemTexts(): Promise<string[]> {
    const items = await this.getItems();
    return Promise.all(items.map(item => item.getText()));
  }

  /**
   * The label of the item that currently holds focus, or `null` when the
   * keyboard is elsewhere.
   *
   * The menu roves focus rather than drawing a cursor — it lands on the first
   * ENABLED item as the pane renders, and the arrows walk it over the enabled
   * items only — so this is the only way to ask where the keyboard is. It answers
   * `null` once a submenu has taken the cursor: that pane is a separate overlay,
   * and its own rows are reached through `WrContextMenuItemHarness`.
   */
  async getFocusedItemText(): Promise<string | null> {
    for (const item of await this.getItems()) {
      if (await item.isFocused()) return item.getText();
    }
    return null;
  }

  /**
   * How many separators this menu shows.
   *
   * Counted by `role="separator"` rather than by `.wr-context-menu-divider`, so a
   * separator the consumer wrote themselves counts too — the role is what tells a
   * screen reader where one group of items ends. A separator is never a member of
   * `getItems()`.
   */
  async getDividerCount(): Promise<number> {
    const separators = await this.inMenuAll('[role="separator"]');
    return separators.length;
  }

  /**
   * Open the menu if it is shut, then click the first item matching the filters.
   *
   * Picking a leaf DISMISSES the menu — unlike a dropdown, which stays up. The
   * dismissal is reported at once (the target drops its reference synchronously),
   * while the pane plays its exit animation for another 220ms.
   */
  async clickItem(filters: WrContextMenuItemHarnessFilters): Promise<void> {
    await this.open();

    const [item] = await this.getItems(filters);
    if (!item) {
      const offered = await this.getItemTexts();
      throw new Error(
        `WrContextMenuHarness.clickItem(): no item matched ${JSON.stringify(filters)}. ` +
          `The menu offers: ${offered.join(', ')}.`
      );
    }

    await item.click();
  }

  /**
   * A loader scoped to THIS target's menu — the content loader every
   * `HarnessLoader` method on this class runs through, `getItems()` included.
   *
   * Scoped by the published id rather than by `.wr-context-menu`: the overlay
   * container is shared by every pane on the page, so a bare class query would
   * answer with whichever menu opened first.
   */
  protected override async getRootHarnessLoader(): Promise<HarnessLoader> {
    return this.documentRootLocatorFactory().harnessLoaderFor(`#${await this.menuId()}`);
  }

  /** This target's menu element in the overlay. */
  private async menu(): Promise<TestElement> {
    return this.documentRootLocatorFactory().locatorFor(`#${await this.menuId()}`)();
  }

  /** Every element inside THIS menu matching the selector. */
  private async inMenuAll(selector: string): Promise<TestElement[]> {
    return this.documentRootLocatorFactory().locatorForAll(`#${await this.menuId()} ${selector}`)();
  }

  /** The id the target publishes as `aria-controls`, which its open menu carries. */
  private async menuId(): Promise<string> {
    const id = await (await this.host()).getAttribute('aria-controls');
    if (!id) {
      throw new Error(
        'WrContextMenuHarness: no menu is open, so there is nothing inside it to read — call open() ' +
          'first. The target publishes `aria-controls` only while its menu is up.'
      );
    }
    return id;
  }

  /** Poll until the pane with this id has been disposed. */
  private async waitUntilGone(id: string, method: string, timeout: number): Promise<void> {
    const locate = this.documentRootLocatorFactory().locatorForOptional(`#${id}`);

    for (let waited = 0; waited <= timeout; waited += POLL_STEP) {
      if ((await locate()) === null) return;

      await sleep(POLL_STEP);
      await this.forceStabilize();
    }

    throw new Error(
      `WrContextMenuHarness.${method}(): the menu was still in the DOM ${timeout}ms after it closed. The ` +
        'directive keeps the pane alive for its 220ms exit animation and disposes it on a real timer, so a ' +
        'spec on fake timers has to advance the clock itself.'
    );
  }

  /** Poll until `isOpen()` reports `open`, and say whether it did. */
  private async settled(open: boolean, timeout: number): Promise<boolean> {
    for (let waited = 0; waited <= timeout; waited += POLL_STEP) {
      if ((await this.isOpen()) === open) return true;

      await sleep(POLL_STEP);
      await this.forceStabilize();
    }
    return false;
  }
}
