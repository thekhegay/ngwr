/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import {
  ComponentHarness,
  type HarnessLoader,
  HarnessPredicate,
  TestKey,
  type TestElement,
} from '@angular/cdk/testing';

import type {
  WrCascaderColumnHarnessFilters,
  WrCascaderHarnessFilters,
  WrCascaderOptionHarnessFilters,
} from './interfaces';
import { WrCascaderColumnHarness } from './wr-cascader-column-harness';
import type { WrCascaderOptionHarness } from './wr-cascader-option-harness';

/**
 * Test harness for `<wr-cascader>` — the trigger, and the panel of COLUMNS it
 * opens. Root of a small family: {@link WrCascaderColumnHarness} for one level,
 * `WrCascaderOptionHarness` for one option in it.
 *
 * A cascader is not a select with extra steps. Its value is the whole PATH from
 * root to leaf (`['eu', 'de', 'ber']`, not `'ber'`), and the panel shows one
 * column per level, so which columns exist depends on what is expanded — column
 * 0 is the roots, and every further column holds the children of the active
 * option in the column to its left. That relationship is the component, so it is
 * what {@link getColumns} and {@link getColumnLabels} are for.
 *
 * The panel is NOT inside the cascader: it is a template portal in the overlay
 * container, a sibling of the whole app. Every read of it goes through the
 * document root scoped by the `aria-controls` id the trigger publishes, so two
 * cascaders on one page can never answer with each other's columns.
 *
 * @example
 * ```ts
 * const cascader = await loader.getHarness(WrCascaderHarness);
 *
 * await cascader.selectPath(['Europe', 'Germany', 'Berlin']);
 *
 * expect(await cascader.getValueText()).toBe('Europe / Germany / Berlin');
 * expect(await cascader.isOpen()).toBe(false);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrCascaderHarness extends ComponentHarness {
  static hostSelector = 'wr-cascader';

  /** Build a predicate that narrows the query. */
  static with(options: WrCascaderHarnessFilters = {}): HarnessPredicate<WrCascaderHarness> {
    return new HarnessPredicate(WrCascaderHarness, options)
      .addOption('text', options.text, (harness, text) => HarnessPredicate.stringMatches(harness.getValueText(), text))
      .addOption('placeholder', options.placeholder, (harness, placeholder) =>
        HarnessPredicate.stringMatches(harness.getPlaceholder(), placeholder)
      )
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled)
      .addOption('open', options.open, async (harness, open) => (await harness.isOpen()) === open);
  }

  private readonly trigger = this.locatorFor('.wr-cascader__trigger');

  /**
   * Whether the panel is showing.
   *
   * From the trigger's `aria-expanded` rather than the host's `--open` class:
   * both exist, and the ARIA state is the one a screen-reader user is told.
   */
  async isOpen(): Promise<boolean> {
    return (await (await this.trigger()).getAttribute('aria-expanded')) === 'true';
  }

  /**
   * Whether the cascader refuses interaction.
   *
   * From the trigger's native `disabled`, which is what actually stops a pointer
   * and what assistive tech reports; the host's `--disabled` class only mirrors
   * it for styling.
   */
  async isDisabled(): Promise<boolean> {
    return (await this.trigger()).getProperty<boolean>('disabled');
  }

  /**
   * What the trigger displays as the selection: the labels of the whole path
   * joined by the `separator` (`'Europe / Germany / Berlin'` by default), or `''`
   * while nothing is selected and the placeholder is showing.
   *
   * The joined string is all the DOM has — the separator is not published
   * anywhere on its own, so the harness will not pretend it can split the path
   * back apart. Assert against the bound value, or against
   * {@link getActiveTrail} while the panel is open, when the segments matter.
   */
  async getValueText(): Promise<string> {
    const value = await this.locatorForOptional('.wr-cascader__value')();
    return value ? value.text() : '';
  }

  /**
   * The placeholder, or `null` when a selection is hiding it.
   *
   * `''` is a real answer, not an absence: a cascader with no `placeholder` still
   * renders the element while unselected.
   */
  async getPlaceholder(): Promise<string | null> {
    const placeholder = await this.locatorForOptional('.wr-cascader__placeholder')();
    return placeholder ? placeholder.text() : null;
  }

  /**
   * The trigger's accessible name — the `ariaLabel` input, falling back to the
   * placeholder and then to the i18n catalog, because a `role="combobox"` with
   * nothing selected and no placeholder would otherwise have no name at all.
   */
  async getAccessibleName(): Promise<string | null> {
    return (await this.trigger()).getAttribute('aria-label');
  }

  /** The kind of popup the trigger promises via `aria-haspopup` — `menu`. */
  async getPopupRole(): Promise<string | null> {
    return (await this.trigger()).getAttribute('aria-haspopup');
  }

  /** The role the panel announces — `menu`, matching what the trigger promised. */
  async getPanelRole(): Promise<string | null> {
    return (await this.panel()).getAttribute('role');
  }

  /**
   * The id the trigger publishes as `aria-controls`.
   *
   * Published unconditionally, open or closed — so while the panel is closed this
   * id resolves to nothing in the document. Exposed so a spec can pin that
   * (dangling or not) rather than have the harness quietly decide for it; every
   * panel read goes through the same id but refuses to run while closed.
   */
  async getPanelId(): Promise<string | null> {
    return (await this.trigger()).getAttribute('aria-controls');
  }

  /**
   * Whether the panel now in the overlay is the one this trigger claims to
   * control — `aria-controls` resolving to a real element that carries that id.
   *
   * With several cascaders on a page it is also the check that the reference lands
   * on THIS instance's panel rather than a neighbour's: the overlay container is
   * shared, so panels sit side by side in it with nothing but their ids to tell
   * them apart.
   */
  async isPanelWiredToTrigger(): Promise<boolean> {
    const rendered = await (await this.panel()).getAttribute('id');
    return rendered !== null && rendered === (await this.getPanelId());
  }

  /**
   * Open the panel.
   *
   * Clicks the trigger, because that is the only gesture the component binds. The
   * trigger is a native `<button>`, so a browser turns Enter / Space on it into
   * the same click — there is no separate keyboard route to model here, and jsdom
   * does not synthesise button activation from a key, so an `openByKeyboard()`
   * would only be able to lie.
   */
  async open(): Promise<void> {
    if (await this.isOpen()) return;

    await (await this.trigger()).click();
    if (await this.isOpen()) return;

    throw new Error(
      'WrCascaderHarness.open(): the panel did not open. A disabled cascader refuses the click — ' +
        'check isDisabled().'
    );
  }

  /**
   * Close the panel with Escape. A closed cascader is left alone.
   *
   * Escape reaches the panel through the CDK's keyboard dispatcher rather than
   * through the DOM tree, which is why sending it to the trigger works even
   * though the panel is somewhere else entirely.
   */
  async close(): Promise<void> {
    if (!(await this.isOpen())) return;

    await (await this.trigger()).sendKeys(TestKey.ESCAPE);
    if (await this.isOpen()) {
      throw new Error('WrCascaderHarness.close(): Escape did not close the panel.');
    }
  }

  /** Click the trigger once, whatever that does — opens a closed panel, closes an open one. */
  async clickTrigger(): Promise<void> {
    return (await this.trigger()).click();
  }

  /**
   * The columns of the open panel, left to right: column 0 is the root options,
   * and each further one holds the children of its neighbour's active option.
   *
   * Throws while the panel is closed. The columns do not exist anywhere until the
   * portal is attached, and an empty array reads like a panel that rendered
   * nothing — a confusing failure three lines later instead of here.
   */
  async getColumns(filters: WrCascaderColumnHarnessFilters = {}): Promise<WrCascaderColumnHarness[]> {
    const loader = await this.panelLoader();
    return loader.getAllHarnesses(WrCascaderColumnHarness.with(filters));
  }

  /** How many levels the panel is currently showing. */
  async getColumnCount(): Promise<number> {
    return (await this.getColumns()).length;
  }

  /**
   * One column by its 0-based level. Throws when the level is not showing, which
   * is the interesting failure: it means the option before it has no children, or
   * has not been expanded yet.
   */
  async getColumn(index: number): Promise<WrCascaderColumnHarness> {
    const columns = await this.getColumns();
    const column = columns[index];
    if (!column) {
      throw new Error(
        `WrCascaderHarness.getColumn(): no column at level ${index} — the panel is showing ` +
          `${columns.length}. A deeper column appears only once a parent with children is expanded.`
      );
    }
    return column;
  }

  /** The labels offered by every column, outer array left to right. */
  async getColumnLabels(): Promise<string[][]> {
    const columns = await this.getColumns();
    return Promise.all(columns.map(column => column.getOptionLabels()));
  }

  /**
   * The expanded trail — the label of the active option in each column, root
   * first.
   *
   * This is the panel's own idea of where the user is, which is NOT always the
   * committed value: drilling into a branch moves the trail without committing
   * anything unless `changeOnSelect` is on. Once a leaf is picked the two agree,
   * and this is the only place the path's segments exist separately in the DOM.
   */
  async getActiveTrail(): Promise<string[]> {
    const trail: string[] = [];
    for (const column of await this.getColumns()) {
      const active = await column.getActiveOptionText();
      if (active !== null) trail.push(active);
    }
    return trail;
  }

  /**
   * The first option matching the filters, anywhere in the panel. Throws when
   * nothing matches, naming what is on offer.
   *
   * Use {@link getColumn} when the level matters — the same label can legitimately
   * appear at more than one level.
   */
  async getOption(filters: WrCascaderOptionHarnessFilters): Promise<WrCascaderOptionHarness> {
    for (const column of await this.getColumns()) {
      const [option] = await column.getOptions(filters);
      if (option) return option;
    }

    throw new Error(
      `WrCascaderHarness.getOption(): no option matched ${JSON.stringify(filters)}. ` +
        `The panel offers: ${(await this.getColumnLabels()).map(labels => labels.join(', ')).join(' | ')}.`
    );
  }

  /**
   * Walk a path by label, opening the panel first if needed: each label is
   * clicked in the column it belongs to, so `['Europe', 'Germany', 'Berlin']`
   * drills two levels and commits the third.
   *
   * Clicking is the only way down — this cascader does not expand on hover, so
   * neither does the harness. A path that ends on a BRANCH just leaves that
   * branch expanded: the component commits nothing on the way down unless
   * `changeOnSelect` is on, and only a leaf closes the panel.
   */
  async selectPath(labels: readonly string[]): Promise<void> {
    if (labels.length === 0) {
      throw new Error(
        'WrCascaderHarness.selectPath(): the path is empty. Pass at least one label, or call clear() ' +
          'to unset the selection.'
      );
    }

    await this.open();

    for (let level = 0; level < labels.length; level++) {
      const label = labels[level];
      const columns = await this.getColumns();
      const column = columns[level];
      if (!column) {
        throw new Error(
          `WrCascaderHarness.selectPath(): "${label}" would be at level ${level}, but the panel is ` +
            `showing ${columns.length} column(s) — the step before it opened no deeper level.`
        );
      }

      const option = await column.getOption({ text: label });
      if (await option.isDisabled()) {
        throw new Error(`WrCascaderHarness.selectPath(): "${label}" is disabled, so no path can pass through it.`);
      }

      const isLast = level === labels.length - 1;
      if (!isLast && !(await option.hasChildren())) {
        throw new Error(
          `WrCascaderHarness.selectPath(): "${label}" is a leaf, so the path cannot continue to ` +
            `"${labels[level + 1]}" — picking it commits and closes the panel.`
        );
      }

      await option.click();
    }
  }

  /**
   * Click the clear (×) control on the trigger.
   *
   * Throws when there is none, and both reasons are worth failing on: the
   * cascader is not `clearable`, or nothing is selected — the control is not
   * rendered at all in either case (nor while disabled).
   */
  async clear(): Promise<void> {
    const clear = await this.locatorForOptional('.wr-cascader__clear')();
    if (!clear) {
      throw new Error(
        'WrCascaderHarness.clear(): this cascader shows no clear control — it is rendered only when ' +
          '`clearable` is on, something is selected, and the control is enabled.'
      );
    }
    await clear.click();
  }

  /** Move keyboard focus to the trigger. */
  async focus(): Promise<void> {
    return (await this.trigger()).focus();
  }

  /** Take focus off the trigger, which is what makes a bound form field touched. */
  async blur(): Promise<void> {
    return (await this.trigger()).blur();
  }

  /** Whether the trigger holds keyboard focus. */
  async isFocused(): Promise<boolean> {
    return (await this.trigger()).isFocused();
  }

  /** This cascader's panel element in the overlay — the single-element scoped read. */
  private async panel(): Promise<TestElement> {
    return this.documentRootLocatorFactory().locatorFor(`#${await this.panelId()}`)();
  }

  /**
   * A loader scoped to THIS cascader's panel — the list scoped read.
   *
   * Scoped by the published id rather than by `.wr-cascader-panel`: the overlay
   * container is shared with every other overlay in the app, so a bare class
   * query would answer with whichever panel happened to be open.
   */
  private async panelLoader(): Promise<HarnessLoader> {
    return this.documentRootLocatorFactory().harnessLoaderFor(`#${await this.panelId()}`);
  }

  /** The panel id, refusing to hand it out while there is no panel to find. */
  private async panelId(): Promise<string> {
    if (!(await this.isOpen())) {
      throw new Error(
        'WrCascaderHarness: the panel is closed, so there are no columns to read — call open() or ' +
          'selectPath() first. The trigger publishes `aria-controls` even while closed, so the id ' +
          'alone is not proof the panel exists.'
      );
    }

    const id = await this.getPanelId();
    if (!id) {
      throw new Error('WrCascaderHarness: the trigger publishes no `aria-controls`, so its panel cannot be found.');
    }
    return id;
  }
}
