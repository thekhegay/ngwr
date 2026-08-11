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

import type { WrTreeHarnessFilters, WrTreeNodeHarnessFilters } from './interfaces';
import { WrTreeNodeHarness } from './wr-tree-node-harness';

/** How many levels {@link WrTreeHarness.expandAll} is willing to walk. */
const MAX_EXPAND_PASSES = 20;

/**
 * Test harness for `<wr-tree>`, with {@link WrTreeNodeHarness} for one row.
 *
 * The component has two render shapes and this harness covers both:
 * - `openOn="inline"` (default) — the rows live in the host, and the tree is always
 *   showing them.
 * - `openOn="overlay"` — a `role="combobox"` trigger opens a panel that is a template
 *   portal in the shared overlay container, a sibling of the whole app. Nothing in it
 *   is a descendant of the host, so every row is read through the document root,
 *   SCOPED by the `aria-controls` id the trigger publishes — which is what keeps two
 *   trees on one page from answering with each other's nodes.
 *
 * A tree is data-driven and projects nothing, so the scoped loader exists to point the
 * node queries at the right shape rather than to reach a consumer's own components: the
 * inherited `getHarness(…)` resolves wherever THIS tree's rows are, and there is nothing
 * else in there.
 *
 * Two things the harness cannot do, both jsdom rather than the component:
 * - it never clicks a row by coordinate, and it drives the cursor with the KEYBOARD,
 *   which is the accessible path anyway. There is no layout in a unit test, so a
 *   hit test would answer with nothing.
 * - it offers no SCROLL for a windowed tree. jsdom does remember a `scrollTop` write,
 *   but it fires no `scroll` event for it, so the tree — which learns its offset from
 *   that event — would not move until the caller also dispatched one and waited a
 *   frame: a scroll gesture that only works because the test faked the notification.
 *   The keyboard moves the window honestly instead — see {@link focusLast}. (jsdom has
 *   no `Element.scrollTo` at all, which the tree calls while windowed, so a spec for
 *   that shape has to stub it.)
 *
 * @example
 * ```ts
 * const tree = await loader.getHarness(WrTreeHarness);
 *
 * await (await tree.getNode({ label: 'src' })).expand();
 * await tree.selectNode({ label: 'main.ts' });
 *
 * expect(await tree.getSelectedLabels()).toEqual(['main.ts']);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrTreeHarness extends ContentContainerComponentHarness {
  static hostSelector = 'wr-tree';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrTreeHarnessFilters = {}): HarnessPredicate<WrTreeHarness> {
    return new HarnessPredicate(WrTreeHarness, options)
      .addOption('text', options.text, (harness, text) =>
        HarnessPredicate.stringMatches(harness.triggerTextIfAny(), text)
      )
      .addOption('nodeLabel', options.nodeLabel, async (harness, label) => {
        for (const shown of await harness.nodeLabelsIfShowing()) {
          if (await HarnessPredicate.stringMatches(shown, label)) return true;
        }
        return false;
      })
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled)
      .addOption('open', options.open, async (harness, open) => (await harness.isOpen()) === open);
  }

  /** Whether this tree is the combobox shape (`openOn="overlay"`) rather than inline. */
  async isOverlay(): Promise<boolean> {
    return (await this.host()).hasClass('wr-tree--combobox');
  }

  /**
   * Whether the rows are showing.
   *
   * From the trigger's `aria-expanded` rather than the `--open` modifier: both are
   * public, but that attribute is the promise the combobox makes to a screen reader.
   * An inline tree is always open — its rows are part of the host and there is
   * nothing to open or close.
   */
  async isOpen(): Promise<boolean> {
    if (!(await this.isOverlay())) return true;
    return (await (await this.trigger()).getAttribute('aria-expanded')) === 'true';
  }

  /**
   * Open the panel. An already-open tree — and every inline one — is left alone.
   *
   * Note for a spec with two overlay trees: this clicks, and a click is an outside
   * pointer event for every other open overlay, so it closes any panel already up.
   * There is no second gesture to swap in: the trigger is opened by its `click`
   * handler, and while a real keyboard user reaches that through a `<button>`'s native
   * activation, a SYNTHETIC Enter / Space never produces a click — so a harness cannot
   * open a panel any other way.
   */
  async open(): Promise<void> {
    if (await this.isOpen()) return;

    await (await this.trigger()).click();
    if (await this.isOpen()) return;

    throw new Error(
      'WrTreeHarness.open(): the panel did not open. A disabled tree refuses the trigger and closes any ' +
        'panel that was up, so check `disabled` first.'
    );
  }

  /** Close the panel with Escape. An already-closed tree is left alone. */
  async close(): Promise<void> {
    // Not a no-op for an inline tree: asking to close one means the spec believes it
    // has a panel, and it does not.
    const trigger = await this.trigger();
    if (!(await this.isOpen())) return;

    // Escape reaches the tree through the CDK's keyboard dispatcher, which hands it to
    // the top-most overlay — so it does not matter that focus may be on a row inside.
    await trigger.sendKeys(TestKey.ESCAPE);
  }

  /**
   * Whether the tree refuses interaction.
   *
   * The host modifier is the only answer both shapes carry: an inline tree has no
   * control of its own to mark `disabled`, and a closed overlay tree has no rows to
   * read `aria-disabled` from. The rows do announce it — see
   * {@link WrTreeNodeHarness.isDisabled}.
   */
  async isDisabled(): Promise<boolean> {
    return (await this.host()).hasClass('wr-tree--disabled');
  }

  /**
   * Whether the tree takes more than one selected node.
   *
   * From the list's `aria-multiselectable`, which is what a screen reader acts on. The
   * list does not exist while an overlay panel is closed, so the host modifier answers
   * then — it is only painted in the combobox shape, which is exactly the shape that
   * can be asked while closed.
   */
  async isMultiple(): Promise<boolean> {
    if (await this.isOpen()) {
      return (await (await this.list()).getAttribute('aria-multiselectable')) === 'true';
    }
    return (await this.host()).hasClass('wr-tree--multi');
  }

  /**
   * How much the tree lets you select.
   *
   * `'none'` is not "nothing selected": it is a tree whose rows announce no
   * `aria-selected` at all, and telling that from `'single'` needs a row — so an empty
   * tree throws rather than guessing.
   */
  async getSelectionMode(): Promise<'none' | 'single' | 'multi'> {
    if (await this.isMultiple()) return 'multi';

    const [first] = await this.getNodes();
    if (!first) {
      throw new Error(
        'WrTreeHarness.getSelectionMode(): this tree renders no nodes, and single vs none is only visible ' +
          'on a row — `selectionMode="none"` is the absence of `aria-selected`, so there is nothing to read.'
      );
    }
    return (await first.isSelectable()) ? 'single' : 'none';
  }

  /**
   * Whether the list is WINDOWED right now.
   *
   * Read from the list's modifier rather than from the input, and that is the point:
   * `virtualScroll` only takes effect when there is something to window, so an empty
   * tree renders the plain shape however the input is set.
   */
  async isVirtual(): Promise<boolean> {
    return (await this.list()).hasClass('wr-tree__list--virtual');
  }

  /**
   * The role the list announces — `tree`.
   *
   * Worth asking: rendered without it, the rows are a bag of names, identical on
   * screen and structureless to anyone not looking at it.
   */
  async getRole(): Promise<string | null> {
    return (await this.list()).getAttribute('role');
  }

  /**
   * What the trigger shows as the selection: the chip labels joined by `', '` in multi
   * mode, the label in single mode, and `''` when nothing is selected (the placeholder
   * is showing). The `+N more` chip a `maxTagCount` produces is NOT part of it — it is
   * a count rather than a selection, and {@link getOverflowText} reads it. Inline trees
   * have no trigger and throw.
   */
  async getValueText(): Promise<string> {
    await this.trigger();

    const chips = await this.getChipLabels();
    if (chips.length > 0) return chips.join(', ');

    const value = await this.locatorForOptional('.wr-tree__value')();
    return value ? value.text() : '';
  }

  /** The placeholder, or `null` when a selection is hiding it. */
  async getPlaceholder(): Promise<string | null> {
    await this.trigger();

    const placeholder = await this.locatorForOptional('.wr-tree__placeholder')();
    return placeholder ? placeholder.text() : null;
  }

  /**
   * The chip labels on the trigger, in order (multi mode).
   *
   * The `+N more` overflow chip is not one of them — it is a count, not a selection.
   * {@link getOverflowText} reads it.
   */
  async getChipLabels(): Promise<string[]> {
    await this.trigger();

    const labels = await this.locatorForAll('.wr-tree__chip-label')();
    return Promise.all(labels.map(label => label.text()));
  }

  /**
   * The `+N more` chip's text, or `null` when every selected node has a chip of its
   * own. Only a `maxTagCount` below the number selected produces one.
   */
  async getOverflowText(): Promise<string | null> {
    await this.trigger();

    const more = await this.locatorForOptional('.wr-tree__chip--more')();
    return more ? more.text() : null;
  }

  /** Remove one chip by its label. */
  async removeChip(label: string): Promise<void> {
    const labels = await this.getChipLabels();
    const index = labels.indexOf(label);
    if (index < 0) {
      throw new Error(
        `WrTreeHarness.removeChip(): no chip labelled "${label}". The trigger shows [${labels.join(', ')}] — ` +
          'a selection past `maxTagCount` has no chip to remove.'
      );
    }

    // Label and remove control are emitted once per chip by the same loop, so the two
    // lists line up by index.
    const removes = await this.locatorForAll('.wr-tree__chip-remove')();
    await removes[index].click();
  }

  /** Click the clear (×) control on the trigger. */
  async clear(): Promise<void> {
    await this.trigger();

    const clear = await this.locatorForOptional('.wr-tree__clear')();
    if (!clear) {
      throw new Error(
        'WrTreeHarness.clear(): this trigger has no clear control — `clearable` is off, nothing is ' +
          'selected, or the tree is disabled.'
      );
    }
    await clear.click();
  }

  /**
   * The nodes currently rendered, in the order they are shown.
   *
   * A collapsed branch's children are not rendered at all, so this is the VISIBLE
   * tree — expand first to reach deeper.
   *
   * While {@link isVirtual} is true it is narrower still: the list holds only the
   * window around the scroll offset — padded by a spacer at whichever end has rows
   * outside it, so a window resting at the top has one and a window in the middle has
   * two — and this returns the WINDOW, not the dataset. Nothing in the DOM carries a
   * total —
   * `aria-setsize` counts a SIBLING GROUP, not the flat list — so the harness cannot
   * offer one; {@link WrTreeNodeHarness.getIndex} places each row in the full visible
   * list, and the `[nodes]` data is where the total actually lives.
   *
   * Throws while an overlay panel is closed: the rows do not exist anywhere until it
   * opens, and an empty array reads like a tree that rendered nothing.
   */
  async getNodes(filters: WrTreeNodeHarnessFilters = {}): Promise<WrTreeNodeHarness[]> {
    return this.getAllHarnesses(WrTreeNodeHarness.with(filters));
  }

  /** The labels of the nodes currently rendered, in order. */
  async getNodeLabels(): Promise<string[]> {
    const nodes = await this.getNodes();
    return Promise.all(nodes.map(node => node.getLabel()));
  }

  /** The first node matching the filters, or a failure that says what is showing. */
  async getNode(filters: WrTreeNodeHarnessFilters): Promise<WrTreeNodeHarness> {
    const [node] = await this.getNodes(filters);
    if (!node) {
      const showing = await this.getNodeLabels();
      throw new Error(
        `WrTreeHarness.getNode(): no node matched ${JSON.stringify(filters)}. The tree is showing ` +
          `[${showing.join(', ')}] — a node inside a collapsed branch is not rendered at all, and a ` +
          'windowed tree only renders its window.'
      );
    }
    return node;
  }

  /**
   * Open the panel if needed, then select the first node matching the filters.
   *
   * `additive` ctrl-clicks instead, which is how a multi-mode selection is built up: a
   * plain click there REPLACES the selection, by the component's own choice.
   *
   * Throws rather than clicking into the void on a disabled node or a
   * `selectionMode="none"` tree — both ignore the click, and the silence turns into a
   * confusing failure at the next assertion. Reach for `getNode().click()` when
   * proving exactly that.
   */
  async selectNode(filters: WrTreeNodeHarnessFilters, options: { additive?: boolean } = {}): Promise<void> {
    await this.open();

    const node = await this.getNode(filters);
    const label = await node.getLabel();

    if (!(await node.isSelectable())) {
      throw new Error(
        `WrTreeHarness.selectNode(): "${label}" announces no selected state, so this tree is in ` +
          'selectionMode="none" — clicking it cannot select anything.'
      );
    }
    if (await node.isDisabled()) {
      throw new Error(
        `WrTreeHarness.selectNode(): "${label}" is disabled and the tree ignores the click. A disabled ` +
          'TREE disables every node — check isDisabled() on the tree too.'
      );
    }

    await (options.additive === true ? node.ctrlClick() : node.click());
  }

  /**
   * The labels of the selected nodes, in row order.
   *
   * Only among the rows that are RENDERED: a selected node inside a collapsed branch,
   * or outside a window, is not here. The `[(selected)]` model is the whole set.
   */
  async getSelectedLabels(): Promise<string[]> {
    const nodes = await this.getNodes({ selected: true });
    return Promise.all(nodes.map(node => node.getLabel()));
  }

  /**
   * Open every branch, level by level — each pass reveals the next one down.
   *
   * Refuses on a windowed tree instead of half-doing it: only the window is rendered,
   * so the branches outside it cannot be reached from the DOM at all. Write the
   * `[(expanded)]` model there.
   */
  async expandAll(): Promise<void> {
    if (await this.isVirtual()) {
      throw new Error(
        'WrTreeHarness.expandAll(): a windowed tree renders only its window, so this cannot reach the ' +
          'branches outside it. Set the `[(expanded)]` model instead.'
      );
    }

    for (let pass = 0; pass < MAX_EXPAND_PASSES; pass++) {
      const collapsed = await this.getNodes({ expanded: false });
      if (collapsed.length === 0) return;
      for (const node of collapsed) await node.expand();
    }

    throw new Error(
      `WrTreeHarness.expandAll(): still finding closed branches after ${MAX_EXPAND_PASSES} levels — is the ` +
        'node data recursive?'
    );
  }

  /**
   * The label of the node the keyboard cursor is on, or `null`.
   *
   * Read the way the shape publishes it: a windowed tree keeps focus on the list and
   * names the row with `aria-activedescendant` (which goes `null` while the cursor has
   * been scrolled out of the window, so the reference never dangles at a row that was
   * removed), while a plain one hands the single tab stop to the cursor row.
   */
  async getActiveNodeLabel(): Promise<string | null> {
    const nodes = await this.getNodes();

    if (await this.isVirtual()) {
      const active = await (await this.list()).getAttribute('aria-activedescendant');
      if (!active) return null;
      for (const node of nodes) {
        if ((await node.getId()) === active) return node.getLabel();
      }
      return null;
    }

    for (const node of nodes) {
      if (await node.isActive()) return node.getLabel();
    }
    return null;
  }

  /** Move the cursor down one row — ArrowDown. Stops at the last row. */
  async focusNext(): Promise<void> {
    await this.press(TestKey.DOWN_ARROW);
  }

  /** Move the cursor up one row — ArrowUp. Stops at the first row. */
  async focusPrevious(): Promise<void> {
    await this.press(TestKey.UP_ARROW);
  }

  /** Move the cursor to the first row — Home. */
  async focusFirst(): Promise<void> {
    await this.press(TestKey.HOME);
  }

  /**
   * Move the cursor to the last row — End.
   *
   * On a windowed tree this also moves the WINDOW: the tree writes its scroll offset
   * synchronously so the row it is about to point at exists in the same change
   * detection pass. It is the honest way to reach the far end of a window in a unit
   * test — jsdom keeps a `scrollTop` write but never fires the `scroll` event the tree
   * listens for, so a scroll gesture would move the window only for a test that also
   * dispatched the notification itself.
   */
  async focusLast(): Promise<void> {
    await this.press(TestKey.END);
  }

  /**
   * ArrowRight on the cursor row — the APG's one key with two jobs: it OPENS a closed
   * branch, and on an already-open one it steps into the first child. A leaf ignores
   * it.
   *
   * These two send the PHYSICAL key, because that is what a keyboard has. Under
   * `dir="rtl"` the tree follows the indent and swaps the pair, so a spec exercising
   * an RTL tree opens with {@link collapseActive} and closes with this one. The
   * names describe the LTR job, which is the one worth naming.
   */
  async expandActive(): Promise<void> {
    await this.press(TestKey.RIGHT_ARROW);
  }

  /**
   * ArrowLeft on the cursor row — CLOSES an open branch, and on anything else steps
   * out to the parent row. A root-level leaf ignores it.
   *
   * Physical, and mirrored by the component under `dir="rtl"` — see
   * {@link expandActive}.
   */
  async collapseActive(): Promise<void> {
    await this.press(TestKey.LEFT_ARROW);
  }

  /**
   * Select the cursor row from the keyboard — Enter.
   *
   * `additive` holds Ctrl, the keyboard twin of {@link WrTreeNodeHarness.ctrlClick}:
   * in multi mode a plain Enter replaces the selection, Ctrl-Enter adds to it. A
   * disabled row is skipped by the component, silently — assert the model.
   */
  async selectActive(options: { additive?: boolean } = {}): Promise<void> {
    const list = await this.list();
    if (options.additive === true) {
      await list.sendKeys({ control: true }, TestKey.ENTER);
      return;
    }
    await list.sendKeys(TestKey.ENTER);
  }

  /**
   * The loader every node query runs through — the host inline, THIS tree's overlay
   * panel otherwise.
   *
   * Scoped by the published panel id rather than by `.wr-tree-panel`: the overlay
   * container is shared, so a bare class query would answer with whichever tree
   * happened to open first.
   */
  protected override async getRootHarnessLoader(): Promise<HarnessLoader> {
    if (!(await this.isOverlay())) return super.getRootHarnessLoader();
    return this.documentRootLocatorFactory().harnessLoaderFor(`#${await this.panelId()}`);
  }

  /**
   * Send a key to the `role="tree"` list.
   *
   * The list owns the keydown handler in both patterns — the roving-tabindex one
   * focuses a row, whose event bubbles to exactly here — so this is the honest target
   * either way, and the one that works when jsdom has left real focus on `<body>`.
   */
  private async press(key: TestKey): Promise<void> {
    await (await this.list()).sendKeys(key);
  }

  /**
   * The `<ul role="tree">` of THIS tree — in the host inline, in this tree's own
   * overlay panel otherwise.
   */
  private async list(): Promise<TestElement> {
    if (!(await this.isOverlay())) return this.locatorFor('.wr-tree__list')();
    return this.documentRootLocatorFactory().locatorFor(`#${await this.panelId()} .wr-tree__list`)();
  }

  /** The combobox trigger, or a failure that says this tree renders inline. */
  private async trigger(): Promise<TestElement> {
    const trigger = await this.locatorForOptional('.wr-tree__trigger')();
    if (!trigger) {
      throw new Error(
        'WrTreeHarness: this tree renders inline, so it has no trigger, no chips and no panel — its rows ' +
          'are part of the host. `openOn="overlay"` is the combobox shape.'
      );
    }
    return trigger;
  }

  /** The id the trigger publishes as `aria-controls`, which its panel carries. */
  private async panelId(): Promise<string> {
    const id = await (await this.trigger()).getAttribute('aria-controls');
    if (!id) {
      throw new Error(
        'WrTreeHarness: the trigger publishes no `aria-controls` id, so its panel cannot be told apart ' +
          "from another tree's."
      );
    }
    if (!(await this.isOpen())) {
      throw new Error('WrTreeHarness: the panel is closed — call open() first. A closed tree renders no rows.');
    }
    return id;
  }

  /** The trigger's text for the `text` filter, or `null` for an inline tree (which never matches). */
  private async triggerTextIfAny(): Promise<string | null> {
    const trigger = await this.locatorForOptional('.wr-tree__trigger')();
    return trigger ? this.getValueText() : null;
  }

  /** The rendered labels for the `nodeLabel` filter — a closed tree matches nothing rather than failing. */
  private async nodeLabelsIfShowing(): Promise<string[]> {
    if (!(await this.isOpen())) return [];
    return this.getNodeLabels();
  }
}
