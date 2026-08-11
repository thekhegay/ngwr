/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, type TestElement } from '@angular/cdk/testing';

import type { WrTreeNodeHarnessFilters } from './interfaces';

/**
 * Test harness for one node of a `<wr-tree>` — a `role="treeitem"` row.
 *
 * Everything about a tree's shape that a screen reader gets lives on these rows:
 * the list itself is FLAT, with no `role="group"` and no nesting, so `aria-level`,
 * `aria-posinset` and `aria-setsize` are the only place the hierarchy exists. The
 * indent is decoration.
 *
 * @example
 * ```ts
 * const src = await tree.getNode({ label: 'src' });
 *
 * await src.expand();
 * expect(await src.getLevel()).toBe(1);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrTreeNodeHarness extends ComponentHarness {
  /**
   * The row, and nothing else the list can hold.
   *
   * A windowed tree pads its list with `<li class="wr-tree__spacer" role="presentation">`
   * at each end, so `li` would hand back up to two "nodes" with no label and no
   * state. `[role="treeitem"]` selects exactly the same set as this class.
   */
  static hostSelector = '.wr-tree__row';

  /** Build a predicate that narrows the query. */
  static with(options: WrTreeNodeHarnessFilters = {}): HarnessPredicate<WrTreeNodeHarness> {
    return new HarnessPredicate(WrTreeNodeHarness, options)
      .addOption('label', options.label, (harness, label) => HarnessPredicate.stringMatches(harness.getLabel(), label))
      .addOption('selected', options.selected, async (harness, selected) => (await harness.isSelected()) === selected)
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled)
      .addOption(
        'expanded',
        options.expanded,
        // A leaf is not a closed branch: it announces no `aria-expanded` at all, so
        // it matches neither value rather than answering `false` and turning
        // `{ expanded: false }` into "every row that is not open".
        async (harness, expanded) => (await harness.isExpandable()) && (await harness.isExpanded()) === expanded
      )
      .addOption('level', options.level, async (harness, level) => (await harness.getLevel()) === level);
  }

  /**
   * The node's label.
   *
   * Read from `.wr-tree__label` rather than from the row's text, so the answer stays
   * the label alone however the row is decorated around it.
   */
  async getLabel(): Promise<string> {
    return (await this.locatorFor('.wr-tree__label')()).text();
  }

  /** The node's 1-based depth, as the row announces it (`aria-level`). */
  async getLevel(): Promise<number> {
    return this.announcedNumber('aria-level');
  }

  /**
   * The node's 1-based position within its SIBLING GROUP (`aria-posinset`) — not its
   * position in the flat list of visible rows.
   *
   * `src`'s first child is `posinset` 1 even though it is the second row on screen.
   * That is what ARIA asks for, and the whole reason the attribute is needed here:
   * the rendered list cannot express the nesting on its own.
   */
  async getPosInSet(): Promise<number> {
    return this.announcedNumber('aria-posinset');
  }

  /** How many nodes are in this node's sibling group, itself included (`aria-setsize`). */
  async getSetSize(): Promise<number> {
    return this.announcedNumber('aria-setsize');
  }

  /**
   * The node's index in the full list of VISIBLE nodes — every rendered row plus the
   * ones a window left out, in the order the tree would show them.
   *
   * It is the index the tree's own keyboard code addresses rows by, and while the
   * tree is windowed it is the only way to place a row: DOM order then says nothing,
   * because the rows in the DOM are a slice.
   */
  async getIndex(): Promise<number> {
    return this.announcedNumber('data-tree-index');
  }

  /**
   * The row's DOM id, or `null`.
   *
   * Only a windowed tree gives its rows ids, because that is the shape where the
   * list keeps focus and names the cursor row with `aria-activedescendant` — the id
   * exists to be pointed at.
   */
  async getId(): Promise<string | null> {
    return (await this.host()).getAttribute('id');
  }

  /**
   * Whether the node is a branch — it has children, whether or not they are showing.
   *
   * From `aria-expanded`: only a branch carries it, and a branch that does not is
   * announced as a leaf, so the user never learns there is anything underneath. The
   * toggle element cannot answer this — a leaf renders a `<span>` with the same
   * `.wr-tree__toggle` class purely to hold the indent.
   */
  async isExpandable(): Promise<boolean> {
    return (await (await this.host()).getAttribute('aria-expanded')) !== null;
  }

  /** Whether the branch is open. A leaf is never expanded. */
  async isExpanded(): Promise<boolean> {
    return (await (await this.host()).getAttribute('aria-expanded')) === 'true';
  }

  /** Open the branch. Already-open branches are left alone; a leaf throws. */
  async expand(): Promise<void> {
    if (await this.isExpanded()) return;
    await this.toggleExpand();

    if (!(await this.isExpanded())) {
      throw new Error(
        `WrTreeNodeHarness.expand(): "${await this.getLabel()}" did not open. A disabled node ignores its ` +
          'own toggle, and so does every node of a disabled tree.'
      );
    }
  }

  /** Close the branch. Already-closed branches are left alone; a leaf throws. */
  async collapse(): Promise<void> {
    if (!(await this.isExpanded())) {
      // A closed branch is fine to ask twice; a leaf is a mistake worth naming.
      await this.toggleElement();
      return;
    }
    await this.toggleExpand();

    if (await this.isExpanded()) {
      throw new Error(
        `WrTreeNodeHarness.collapse(): "${await this.getLabel()}" did not close. A disabled node ignores ` +
          'its own toggle, and so does every node of a disabled tree.'
      );
    }
  }

  /**
   * Click the branch's expand toggle.
   *
   * Expanding is the TOGGLE's job and not the row's: a click anywhere else in the row
   * selects instead, which is the one thing a spec driving this by hand tends to get
   * wrong.
   */
  async toggleExpand(): Promise<void> {
    await (await this.toggleElement()).click();
  }

  /**
   * Whether the node is selected.
   *
   * From `aria-selected` rather than the `--selected` modifier: both are public, but
   * the attribute is what a screen reader acts on, and a row that looks selected
   * without saying so is the bug worth catching.
   */
  async isSelected(): Promise<boolean> {
    return (await (await this.host()).getAttribute('aria-selected')) === 'true';
  }

  /**
   * Whether the tree offers selection at all.
   *
   * A `selectionMode="none"` tree announces NO `aria-selected` on its rows, which is
   * how an unselectable node differs from one that is merely unselected — the two
   * look identical otherwise.
   */
  async isSelectable(): Promise<boolean> {
    return (await (await this.host()).getAttribute('aria-selected')) !== null;
  }

  /**
   * Whether the node refuses interaction (`aria-disabled`).
   *
   * True for EVERY node while the whole tree is disabled, not just for the ones the
   * data marks — the row announces the effective state, which is the one a user runs
   * into.
   */
  async isDisabled(): Promise<boolean> {
    return (await (await this.host()).getAttribute('aria-disabled')) === 'true';
  }

  /**
   * Whether the node is where the keyboard cursor sits.
   *
   * The two patterns publish the cursor differently, and this covers both: a tree
   * that renders every row hands the single tab stop to the cursor row (roving
   * tabindex), while a windowed one keeps focus on the list and marks the row with
   * the `--active` modifier plus the list's `aria-activedescendant`.
   * `WrTreeHarness.getActiveNodeLabel()` reads that reference itself.
   */
  async isActive(): Promise<boolean> {
    const host = await this.host();
    return (await host.getAttribute('tabindex')) === '0' || host.hasClass('wr-tree__row--active');
  }

  /**
   * Whether the row holds real DOM focus.
   *
   * Deliberately separate from {@link isActive}: in a windowed tree the two DIVERGE
   * by design — focus stays on the `role="tree"` list and only the announced cursor
   * moves — so a spec asserting that a key press moved focus needs to know which of
   * the two it is asking about.
   */
  async isFocused(): Promise<boolean> {
    return (await this.host()).isFocused();
  }

  /**
   * Click the node — which SELECTS it. A disabled node, and any node of a
   * `selectionMode="none"` tree, ignores the click.
   *
   * In multi mode a plain click REPLACES the selection rather than adding to it (the
   * component's deliberate choice: one selected node clicked again clears it, and any
   * other click starts over from that node). {@link ctrlClick} is how a selection is
   * accumulated.
   */
  async click(): Promise<void> {
    return (await this.host()).click();
  }

  /**
   * Ctrl-click the node — ADDS it to the selection, or removes it, in multi mode.
   *
   * The component takes Cmd as well as Ctrl; the harness sends Ctrl because a unit
   * test has no platform. In single mode it behaves exactly like {@link click}.
   */
  async ctrlClick(): Promise<void> {
    return (await this.host()).click({ control: true });
  }

  /** The branch's toggle button, or a failure that says this row is a leaf. */
  private async toggleElement(): Promise<TestElement> {
    // `button` is load-bearing: a leaf renders a `<span>` with the same
    // `.wr-tree__toggle` class to hold the indent, and taking that for a control
    // would report every leaf as a branch that refused to open.
    const toggle = await this.locatorForOptional('button.wr-tree__toggle')();
    if (!toggle) {
      throw new Error(`WrTreeNodeHarness: "${await this.getLabel()}" is a leaf — there is no branch to open or close.`);
    }
    return toggle;
  }

  /** A numeric attribute every row carries, or a failure that says the row is broken. */
  private async announcedNumber(attribute: string): Promise<number> {
    const value = await (await this.host()).getAttribute(attribute);
    if (value === null) {
      throw new Error(
        `WrTreeNodeHarness: this row announces no \`${attribute}\`. Every row of a \`<wr-tree>\` carries ` +
          'one, so a missing value is a rendering fault rather than a state worth reporting as null.'
      );
    }
    return Number.parseInt(value, 10);
  }
}
