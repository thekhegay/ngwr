/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import {
  type ComponentHarnessConstructor,
  ContentContainerComponentHarness,
  type HarnessLoader,
  HarnessPredicate,
  TestKey,
  type TestElement,
} from '@angular/cdk/testing';

import type { WrDropdownPosition } from 'ngwr/dropdown';

import type { WrDropdownHarnessFilters, WrDropdownItemHarnessFilters } from './types';
import { WrDropdownItemHarness } from './wr-dropdown-item-harness';

/**
 * Test harness for `[wrDropdown]` — the trigger, and the menu it opens.
 *
 * The harness matches the TRIGGER, because that is the only part of the dropdown
 * in the fixture: `<wr-dropdown-menu>` renders nothing of its own (it hands over
 * an `<ng-template>`), and the menu is portalled into the overlay container, a
 * sibling of the whole app. So every item is read through the document root,
 * scoped by the `aria-controls` id the trigger publishes while it is open — which
 * is what keeps two dropdowns on one page from answering with each other's items.
 *
 * That scoped loader is also this harness's CONTENT loader, so
 * `dropdown.getHarness(…)` resolves inside THIS dropdown's menu: the consumer's
 * own components in the menu are reachable without the spec ever touching the
 * overlay, and so is a nested `[wrDropdown]`. A submenu is reached with
 * `openSubmenu()`, which answers with a harness scoped to that submenu.
 *
 * @example
 * ```ts
 * const dropdown = await loader.getHarness(WrDropdownHarness.with({ text: 'Actions' }));
 *
 * await dropdown.open();
 * expect(await dropdown.getItemTexts()).toEqual(['Copy', 'Delete']);
 *
 * await dropdown.clickItem({ text: 'Copy' });
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrDropdownHarness extends ContentContainerComponentHarness {
  /** The directive's host — whatever element the consumer put `[wrDropdown]` on. */
  static hostSelector = '.wr-dropdown-trigger';

  /** Build a predicate that narrows the query. */
  static with<T extends WrDropdownHarness>(
    this: ComponentHarnessConstructor<T>,
    options: WrDropdownHarnessFilters = {}
  ): HarnessPredicate<T> {
    return new HarnessPredicate(this, options)
      .addOption('text', options.text, (harness, text) =>
        HarnessPredicate.stringMatches(harness.getTriggerText(), text)
      )
      .addOption('open', options.open, async (harness, open) => (await harness.isOpen()) === open)
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled);
  }

  /** The trigger's visible text. */
  async getTriggerText(): Promise<string> {
    return (await this.host()).text();
  }

  /** Whether the menu is showing. */
  async isOpen(): Promise<boolean> {
    return (await (await this.host()).getAttribute('aria-expanded')) === 'true';
  }

  /**
   * Whether `wrDropdownDisabled` has turned the trigger off — read from
   * `wr-dropdown-trigger--disabled`, the one mark a disabled trigger carries.
   * The HOST's own `disabled` is another question: the directive never sets it,
   * so ask the host's harness (`WrButtonHarness.isDisabled()`).
   */
  async isDisabled(): Promise<boolean> {
    return (await this.host()).hasClass('wr-dropdown-trigger--disabled');
  }

  /** The role the menu announces — `menu`. Throws while the menu is closed. */
  async getMenuRole(): Promise<string | null> {
    return (await this.menu()).getAttribute('role');
  }

  /**
   * Where the menu sits relative to the trigger, or `null` when its pane names
   * no placement, as a submenu's does not. Throws while the menu is closed.
   *
   * Read off the pane's public modifier class, since a bound `position` never
   * reaches the DOM. The class names the placement the menu LANDED on, which is
   * the one asked for unless it had no room there and flipped; in jsdom, with no
   * layout to run out of, the two are the same.
   */
  async getPosition(): Promise<WrDropdownPosition | null> {
    const pane = await this.documentRootLocatorFactory().locatorFor(
      `.wr-dropdown-overlay:has(> #${await this.menuId()})`
    )();
    const classes = (await pane.getAttribute('class')) ?? '';
    const modifier = /wr-dropdown-overlay--((?:top|bottom|left|right)(?:-(?:start|end))?)(?![a-z-])/.exec(classes);
    return modifier ? (modifier[1] as WrDropdownPosition) : null;
  }

  /**
   * Whether the menu takes its accessible name from this trigger.
   *
   * The menu carries no label of its own, so that reference IS its name — and the
   * id it points at is generated unless the consumer named the trigger
   * themselves, which is why a spec cannot simply hard-code one.
   */
  async isMenuLabelledByTrigger(): Promise<boolean> {
    const labelledBy = await (await this.menu()).getAttribute('aria-labelledby');
    return labelledBy !== null && labelledBy === (await (await this.host()).getAttribute('id'));
  }

  /**
   * Open the menu, whichever gesture this dropdown listens for.
   *
   * `trigger` is not reflected in the DOM, so the harness cannot ask which mode it
   * is in: it moves the pointer on first and falls back to a click. Hover leads
   * because a click is an outside pointer event for every OTHER open overlay — so
   * leading with it would shut someone else's menu on the way to opening this one
   * — and a `trigger="click"` dropdown ignores the hover outright.
   */
  async open(): Promise<void> {
    if (await this.isOpen()) return;
    const host = await this.host();

    await host.hover();
    if (await this.isOpen()) return;

    await host.click();
    if (await this.isOpen()) return;

    throw new Error(
      'WrDropdownHarness.open(): the menu did not open — neither hovering the trigger nor clicking it ' +
        'had any effect. Both gestures were tried, so the `trigger` mode is not the cause; check that this ' +
        'element is the trigger you meant and that it is not disabled (isDisabled()). openByKeyboard() is ' +
        'the third route in.'
    );
  }

  /**
   * Open the menu from the keyboard — ArrowDown on the trigger, the APG
   * menu-button path (ArrowUp / Enter / Space do the same). Focus stays on the
   * trigger unless the dropdown sets `autoFocus`.
   *
   * Worth its own method rather than an argument to `open()`: it is the only way
   * to get TWO dropdowns open at once, because clicking a second trigger is an
   * outside pointer event for the first and closes it.
   */
  async openByKeyboard(): Promise<void> {
    if (await this.isOpen()) return;

    await (await this.host()).sendKeys(TestKey.DOWN_ARROW);
    if (await this.isOpen()) return;

    throw new Error(
      'WrDropdownHarness.openByKeyboard(): ArrowDown on the trigger did not open the menu. The component ' +
        'takes ArrowDown / ArrowUp / Enter / Space in EVERY `trigger` mode, so the mode is not the cause; ' +
        'check that this element is the trigger you meant and that it is not disabled (isDisabled()).'
    );
  }

  /** Close the menu. A closed dropdown is left alone. */
  async close(): Promise<void> {
    if (!(await this.isOpen())) return;
    const host = await this.host();

    // Pointer-out leads for the reason `open()` hovers first: it closes a
    // `trigger="hover"` dropdown without a click, and the click a `trigger="click"`
    // one needs would also count as an outside press for every other open overlay.
    await host.mouseAway();
    if (!(await this.isOpen())) return;

    await host.click();
    if (!(await this.isOpen())) return;

    throw new Error(
      'WrDropdownHarness.close(): the menu is still open. Moving the pointer away closes a ' +
        '`trigger="hover"` dropdown and a second click closes a `trigger="click"` one; neither worked.'
    );
  }

  /** Click the trigger. A `trigger="hover"` dropdown deliberately ignores this. */
  async clickTrigger(): Promise<void> {
    return (await this.host()).click();
  }

  /** Move the pointer onto the trigger. Opens a `trigger="hover"` dropdown. */
  async hoverTrigger(): Promise<void> {
    return (await this.host()).hover();
  }

  /** Move the pointer off the trigger. Closes a `trigger="hover"` dropdown. */
  async mouseAwayFromTrigger(): Promise<void> {
    return (await this.host()).mouseAway();
  }

  /**
   * The items in this dropdown's menu, in DOM order.
   *
   * Throws while the menu is closed: the items do not exist anywhere until the
   * portal is attached, and an empty array reads like a menu that rendered
   * nothing — a failure three lines later instead of here.
   */
  async getItems(filters: WrDropdownItemHarnessFilters = {}): Promise<WrDropdownItemHarness[]> {
    return this.getAllHarnesses(WrDropdownItemHarness.with(filters));
  }

  /** The labels of the items in this dropdown's menu, in DOM order. */
  async getItemTexts(): Promise<string[]> {
    const items = await this.getItems();
    return Promise.all(items.map(item => item.getText()));
  }

  /**
   * Open the menu if it is closed, then click the first item matching the filters.
   *
   * Picking does NOT close the menu — there is no close-on-select in the item or
   * the menu, so a consumer who wants one calls `close()` themselves.
   */
  async clickItem(filters: WrDropdownItemHarnessFilters): Promise<void> {
    await this.open();

    const [item] = await this.getItems(filters);
    if (!item) {
      const offered = await this.getItemTexts();
      throw new Error(
        `WrDropdownHarness.clickItem(): no item matched ${JSON.stringify(filters)}. ` +
          `The menu offers: ${offered.join(', ')}.`
      );
    }

    await item.click();
  }

  /**
   * Open the menu if it is closed, then open the submenu of the item with this
   * label and answer with its harness: `getItems()`, `clickItem()` and a further
   * `openSubmenu()` all read that submenu and nothing else.
   *
   * A click opens it, since hovering waits out the item's `showDelay`.
   */
  async openSubmenu(text: string | RegExp): Promise<WrDropdownSubmenuHarness> {
    await this.open();

    const submenu = await this.getHarnessOrNull(WrDropdownSubmenuHarness.with({ text }));
    if (!submenu) {
      const offered = await this.getAllHarnesses(WrDropdownSubmenuHarness);
      const labels = await Promise.all(offered.map(item => item.getTriggerText()));
      throw new Error(
        `WrDropdownHarness.openSubmenu(): no item labelled ${String(text)} opens a submenu. ` +
          `Items with a submenu here: ${labels.join(', ') || 'none'}.`
      );
    }

    await submenu.open();
    return submenu;
  }

  /**
   * The label of the item that currently holds focus, or `null` when focus is
   * elsewhere.
   *
   * The menu roves focus rather than moving a visual cursor, so this is the only
   * way to ask where the keyboard is. Opening leaves focus on the trigger unless
   * the dropdown sets `autoFocus`: send ArrowDown to the host
   * (`(await dropdown.host()).sendKeys(TestKey.DOWN_ARROW)`) to walk in at the
   * first ENABLED item, and the arrow keys walk from there over the enabled
   * items only (a disabled one is not a stop).
   */
  async getFocusedItemText(): Promise<string | null> {
    for (const item of await this.getItems()) {
      if (await item.isFocused()) return item.getText();
    }
    return null;
  }

  /**
   * A loader scoped to THIS dropdown's menu — the content loader every
   * `HarnessLoader` method on this class runs through, `getItems()` included.
   *
   * Scoped by the published id rather than by `.wr-dropdown-menu`: the overlay
   * container is shared, so a bare class query would answer with whichever
   * dropdown happened to open first.
   */
  protected override async getRootHarnessLoader(): Promise<HarnessLoader> {
    return this.documentRootLocatorFactory().harnessLoaderFor(`#${await this.menuId()}`);
  }

  /** This dropdown's menu element in the overlay. */
  protected async menu(): Promise<TestElement> {
    return this.documentRootLocatorFactory().locatorFor(`#${await this.menuId()}`)();
  }

  /** The id the trigger publishes as `aria-controls`, which its menu carries. */
  private async menuId(): Promise<string> {
    const id = await (await this.host()).getAttribute('aria-controls');
    if (!id) {
      throw new Error(
        'WrDropdownHarness: the menu is closed, so there is nothing inside it to read — call open() ' +
          'first. The trigger publishes `aria-controls` only while its menu is open.'
      );
    }
    return id;
  }
}

/**
 * Test harness for an item carrying `[wrDropdownSubmenu]`, and the submenu it
 * opens. Usually reached through `openSubmenu()` on the level above.
 *
 * It is a `WrDropdownHarness` whose trigger is the item, so everything that
 * reads a menu reads the submenu, scoped the same way, by the id the item
 * publishes. Two things differ. `hoverTrigger()` opens nothing by itself: the
 * item waits out its `showDelay`, which is the spec's own fake timer to
 * advance. And clicking a leaf item closes every submenu, so `clickItem()`
 * leaves this one closed, while the root menu stays open as it always has.
 *
 * Which side the submenu opened on is not readable: jsdom has no layout.
 *
 * @example
 * ```ts
 * const file = await loader.getHarness(WrDropdownHarness.with({ text: 'File' }));
 * const exportAs = await file.openSubmenu('Export');
 *
 * expect(await exportAs.getItemTexts()).toEqual(['CSV', 'PDF', 'Excel']);
 * await exportAs.clickItem({ text: 'CSV' });
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrDropdownSubmenuHarness extends WrDropdownHarness {
  /** The class the directive puts on its item. */
  static override hostSelector = '.wr-dropdown-submenu-trigger';

  /** Open the submenu with a click on its item. */
  override async open(): Promise<void> {
    if (await this.isOpen()) return;

    await (await this.host()).click();
    if (await this.isOpen()) return;

    throw new Error(
      'WrDropdownSubmenuHarness.open(): clicking the item did not open its submenu. A disabled item ' +
        'opens nothing, and neither does one whose own menu has closed; check isOpen() on the level above.'
    );
  }

  /**
   * Open the submenu from the keyboard, with Enter on its item. Enter rather
   * than the arrow because the arrow that opens a submenu depends on the
   * reading direction, and Enter does not.
   */
  override async openByKeyboard(): Promise<void> {
    if (await this.isOpen()) return;

    await (await this.host()).sendKeys(TestKey.ENTER);
    if (await this.isOpen()) return;

    throw new Error(
      'WrDropdownSubmenuHarness.openByKeyboard(): Enter on the item did not open its submenu. Enter ' +
        'reaches it through `<wr-dropdown-item>`, so check that the directive sits on one and that it is enabled.'
    );
  }

  /** Close the submenu with Escape typed inside it, which closes this level only. */
  override async close(): Promise<void> {
    if (!(await this.isOpen())) return;

    await (await this.menu()).sendKeys(TestKey.ESCAPE);
    if (!(await this.isOpen())) return;

    throw new Error('WrDropdownSubmenuHarness.close(): the submenu is still open after Escape was typed in it.');
  }
}
