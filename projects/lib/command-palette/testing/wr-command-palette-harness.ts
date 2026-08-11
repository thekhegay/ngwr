/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, type ModifierKeys, TestKey, type TestElement } from '@angular/cdk/testing';

import type {
  WrCommandPaletteGroupHarnessFilters,
  WrCommandPaletteHarnessFilters,
  WrCommandPaletteItemHarnessFilters,
} from './interfaces';
import { WrCommandPaletteGroupHarness } from './wr-command-palette-group-harness';
import { WrCommandPaletteItemHarness } from './wr-command-palette-item-harness';

/**
 * Test harness for `<wr-command-palette>` — the `⌘K` modal, its search box and
 * the filtered list of commands.
 *
 * Three things about this component shape the harness, and none of them match the
 * other overlay harnesses in the library:
 *
 * 1. **It is an element, and it keeps its own dialog.** The panel is NOT portalled
 *    into the overlay container: the whole `role="dialog"` lives inside
 *    `<wr-command-palette>`, wrapped in an `@if (open())`. So every query here is
 *    host-scoped — two palettes on one page cannot read each other's rows — and a
 *    closed palette holds nothing at all, which is why the readers below throw
 *    instead of answering emptily.
 * 2. **There is no trigger element.** The way in is a GLOBAL hotkey (`trigger`,
 *    `'mod+k'` by default), bound on the document, so {@link open} presses a chord
 *    at the document rather than clicking anything. A palette with
 *    `[trigger]="null"` cannot be opened from the DOM at all — set the bound
 *    `open` from the spec. And because the first binding to match a chord calls
 *    `preventDefault()`, which stops the rest, two palettes sharing one chord
 *    means only the first-registered one ever toggles: see {@link pressTrigger}.
 * 3. **The rows are never focused.** Focus stays in the search input, which points
 *    at the highlighted row with `aria-activedescendant`. Navigation is therefore
 *    `moveTo*`, not `focus`, and "where am I" is answered by `aria-selected` plus
 *    that reference — {@link isActiveItemAnnounced} asserts the pair agrees.
 *
 * @example
 * ```ts
 * const palette = await loader.getHarness(WrCommandPaletteHarness);
 *
 * await palette.open();
 * await palette.setQuery('file');
 * await palette.moveToNextItem();
 * await palette.runActiveItem();
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrCommandPaletteHarness extends ComponentHarness {
  static hostSelector = 'wr-command-palette';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrCommandPaletteHarnessFilters = {}): HarnessPredicate<WrCommandPaletteHarness> {
    return new HarnessPredicate(WrCommandPaletteHarness, options)
      .addOption('open', options.open, async (harness, open) => (await harness.isOpen()) === open)
      .addOption('label', options.label, (harness, label) => HarnessPredicate.stringMatches(harness.getLabel(), label));
  }

  /** Whether the palette is showing. */
  async isOpen(): Promise<boolean> {
    return (await this.dialog()) !== null;
  }

  /**
   * The role the palette announces — `dialog` — or `null` while it is closed.
   *
   * Worth asking rather than assuming: the role sits on the palette's own
   * backdrop-and-panel wrapper, not on the `<wr-command-palette>` host, so a
   * consumer looking for it on the element they wrote would not find it.
   */
  async getRole(): Promise<string | null> {
    const dialog = await this.dialog();
    return dialog ? dialog.getAttribute('role') : null;
  }

  /** Whether the palette is marked `aria-modal`. `false` while it is closed. */
  async isModal(): Promise<boolean> {
    const dialog = await this.dialog();
    return dialog !== null && (await dialog.getAttribute('aria-modal')) === 'true';
  }

  /**
   * The palette's accessible name — `paletteLabel`, or the catalogue string it
   * falls back to. `null` while it is closed, since the element carrying the name
   * does not exist then.
   */
  async getLabel(): Promise<string | null> {
    const dialog = await this.dialog();
    return dialog ? dialog.getAttribute('aria-label') : null;
  }

  /**
   * Whether this opening is presented full-screen instead of as a centred modal.
   *
   * Read from the `--sheet` modifier, which is public API: `responsive` is an
   * input that never reaches the DOM, and the decision also folds in the viewport
   * width — so the class is the only place the outcome exists. `false` while closed.
   *
   * That width is sampled when the palette last RECOMPUTED the decision, which is
   * when `responsive` or the app-wide `provideWrResponsiveOverlays()` config
   * changes — not when the palette opens. So a spec that narrows the viewport and
   * then opens sees nothing move until one of those two changes as well.
   */
  async isPresentedAsSheet(): Promise<boolean> {
    const dialog = await this.dialog();
    return dialog !== null && (await dialog.hasClass('wr-command-palette--sheet'));
  }

  /** The search box's placeholder — `placeholder`, or the catalogue fallback. */
  async getPlaceholder(): Promise<string> {
    return (await this.searchInput('getPlaceholder')).getProperty<string>('placeholder');
  }

  /** What is currently typed in the search box. */
  async getQuery(): Promise<string> {
    return (await this.searchInput('getQuery')).getProperty<string>('value');
  }

  /**
   * Replace the search query, filtering the list.
   *
   * The palette matches a query against each item's label, description, group and
   * keywords, and every keystroke sends the highlight back to the FIRST result —
   * so a spec that moves the highlight and then types has to move it again.
   */
  async setQuery(query: string): Promise<void> {
    const input = await this.searchInput('setQuery');
    await input.clear();
    if (query) await input.sendKeys(query);
  }

  /**
   * Whether the search box and the list are wired to each other the way a
   * combobox and its listbox have to be: the input announces itself expanded and
   * its `aria-controls` names THIS palette's listbox.
   *
   * The ids are generated per instance, so a spec cannot hard-code one — and this
   * reads the listbox inside this host, so a second palette's list can never
   * satisfy it.
   */
  async isSearchWiredToList(): Promise<boolean> {
    const input = await this.searchInput('isSearchWiredToList');
    const controls = await input.getAttribute('aria-controls');

    return (
      (await input.getAttribute('aria-expanded')) === 'true' &&
      controls !== null &&
      controls === (await (await this.listbox()).getAttribute('id'))
    );
  }

  /**
   * The commands currently offered, in rendered order.
   *
   * Rendered order, not the order they were passed in: the palette buckets by
   * `group` as each group first appears, so two interleaved groups come back
   * regrouped — and that order is what the arrows walk and what every index here
   * counts against.
   */
  async getItems(filters: WrCommandPaletteItemHarnessFilters = {}): Promise<WrCommandPaletteItemHarness[]> {
    await this.requireOpen('getItems');
    return this.locatorForAll(WrCommandPaletteItemHarness.with(filters))();
  }

  /** The labels of the commands currently offered, in rendered order. */
  async getItemLabels(): Promise<string[]> {
    const items = await this.getItems();
    return Promise.all(items.map(item => item.getLabel()));
  }

  /** The buckets the commands are grouped into, in rendered order. */
  async getGroups(filters: WrCommandPaletteGroupHarnessFilters = {}): Promise<WrCommandPaletteGroupHarness[]> {
    await this.requireOpen('getGroups');
    return this.locatorForAll(WrCommandPaletteGroupHarness.with(filters))();
  }

  /**
   * One entry per bucket, in rendered order — `null` for the bucket holding
   * ungrouped items, which is unlabelled by design.
   */
  async getGroupTitles(): Promise<(string | null)[]> {
    const groups = await this.getGroups();
    return Promise.all(groups.map(group => group.getTitle()));
  }

  /**
   * The "no results" message, or `null` when the palette has results.
   *
   * The two are exclusive — the panel renders the message INSTEAD of the buckets —
   * so a non-null answer here and an empty {@link getItemLabels} are the same fact.
   */
  async getEmptyText(): Promise<string | null> {
    await this.requireOpen('getEmptyText');
    const empty = await this.locatorForOptional('.wr-command-palette__empty')();
    return empty ? empty.text() : null;
  }

  /** The highlighted command, or `null` when nothing matches the query. */
  async getActiveItem(): Promise<WrCommandPaletteItemHarness | null> {
    const [active] = await this.getItems({ active: true });
    return active ?? null;
  }

  /** The highlighted command's label, or `null` when nothing matches the query. */
  async getActiveItemLabel(): Promise<string | null> {
    const active = await this.getActiveItem();
    return active ? active.getLabel() : null;
  }

  /**
   * Where the highlight sits in the rendered list, or `-1` when nothing matches
   * the query.
   */
  async getActiveItemIndex(): Promise<number> {
    const items = await this.getItems();
    for (let index = 0; index < items.length; index++) {
      if (await items[index].isActive()) return index;
    }
    return -1;
  }

  /**
   * Whether the search box points at the row that is actually highlighted.
   *
   * The rows are not focusable, so this reference is the ONLY thing telling a
   * screen-reader user where they are — and it is a per-instance id, so it is also
   * what would give away a palette announcing another palette's row. An empty list
   * announces nothing, and that counts as agreeing.
   */
  async isActiveItemAnnounced(): Promise<boolean> {
    const announced = await (await this.searchInput('isActiveItemAnnounced')).getAttribute('aria-activedescendant');
    const active = await this.getActiveItem();

    if (!active) return announced === null;
    return announced !== null && announced === (await active.getId());
  }

  /**
   * Open the palette with its global hotkey.
   *
   * Throws when the chord changes nothing, because every reason it would is worth
   * failing on rather than continuing against a closed palette — see
   * {@link pressTrigger} for the list.
   */
  async open(): Promise<void> {
    if (await this.isOpen()) return;
    await this.pressTrigger();
  }

  /**
   * Close the palette with Escape, the way a keyboard user does. A closed palette
   * is left alone.
   */
  async close(): Promise<void> {
    if (!(await this.isOpen())) return;

    await (await this.searchInput('close')).sendKeys(TestKey.ESCAPE);
    if (!(await this.isOpen())) return;

    throw new Error(
      'WrCommandPaletteHarness.close(): Escape did not close the palette. The panel handles it whatever ' +
        'holds focus inside, so check that `open` is not being written back by the binding it came from.'
    );
  }

  /** Dismiss the palette by clicking outside the panel, on the backdrop. */
  async clickBackdrop(): Promise<void> {
    await this.requireOpen('clickBackdrop');
    await (await this.locatorFor('.wr-command-palette__backdrop')()).click();
  }

  /**
   * Press the palette's global trigger chord, which TOGGLES it.
   *
   * Two things make this the least local method on the harness, and both are the
   * component's design rather than a shortcut here:
   *
   * - The chord is dispatched at the document, because that is where `trigger` is
   *   bound. It reaches every palette on the page, not just this one.
   * - `mod` is Cmd on a Mac and Ctrl everywhere else, and nothing in the DOM says
   *   which. The binding compares modifier state EXACTLY, so a chord with both set
   *   matches neither: Ctrl is tried first, then Cmd, watching whether this palette
   *   moved.
   *
   * Throws when neither did anything. With two palettes bound to the same chord
   * that is exactly what happens to the SECOND one — the first binding to match
   * calls `preventDefault()`, which stops the rest — and the first palette will
   * have toggled on the way. Give the palettes different `trigger` specs, or drive
   * them through the bound `open`.
   */
  async pressTrigger(): Promise<void> {
    const before = await this.isOpen();

    await this.pressHotkey('k', { control: true });
    if ((await this.isOpen()) !== before) return;

    await this.pressHotkey('k', { meta: true });
    if ((await this.isOpen()) !== before) return;

    throw new Error(
      'WrCommandPaletteHarness.pressTrigger(): `mod+k` left this palette ' +
        `${before ? 'open' : 'closed'}. It fails when \`trigger\` is \`null\` (nothing is bound — write the ` +
        'bound `open` instead), when `trigger` is some other spec (press it with pressHotkey()), or when ' +
        'another palette is bound to the same chord and matched it first.'
    );
  }

  /**
   * Press an arbitrary chord at the document, where `trigger` is bound — the way
   * to exercise a palette whose `trigger` is not the default `'mod+k'`.
   *
   * The keys go to the `<wr-command-palette>` host and bubble to the document from
   * there. Any element inside the page would do — the listener is the document's,
   * and it fires even while a text field has focus — but the host is the one this
   * harness can always reach, and it takes no focus of its own, so an open palette
   * keeps the caret in its search box.
   */
  async pressHotkey(key: string, modifiers: ModifierKeys = {}): Promise<void> {
    await (await this.host()).sendKeys(modifiers, key);
  }

  /** Move the highlight down one row. Wraps from the last row to the first. */
  async moveToNextItem(): Promise<void> {
    await (await this.searchInput('moveToNextItem')).sendKeys(TestKey.DOWN_ARROW);
  }

  /** Move the highlight up one row. Wraps from the first row to the last. */
  async moveToPreviousItem(): Promise<void> {
    await (await this.searchInput('moveToPreviousItem')).sendKeys(TestKey.UP_ARROW);
  }

  /** Move the highlight to the first row — Home. */
  async moveToFirstItem(): Promise<void> {
    await (await this.searchInput('moveToFirstItem')).sendKeys(TestKey.HOME);
  }

  /** Move the highlight to the last row — End. */
  async moveToLastItem(): Promise<void> {
    await (await this.searchInput('moveToLastItem')).sendKeys(TestKey.END);
  }

  /**
   * Run the highlighted command — Enter in the search box, the accessible path.
   *
   * Throws when nothing is highlighted, which happens exactly when the query
   * matches nothing: Enter would then be a no-op and the spec would pass having
   * run no command at all. Assert {@link getEmptyText} instead.
   */
  async runActiveItem(): Promise<void> {
    const input = await this.searchInput('runActiveItem');

    if (!(await this.getActiveItem())) {
      throw new Error(
        'WrCommandPaletteHarness.runActiveItem(): nothing is highlighted, so Enter would run nothing — ' +
          `the query "${await this.getQuery()}" matches no command. Assert getEmptyText() instead.`
      );
    }

    await input.sendKeys(TestKey.ENTER);
  }

  /**
   * Run the first command matching the filters, by pointer.
   *
   * The palette must already be open — unlike a select, there is nothing to click
   * to open it, so this cannot do it for you. With `closeOnPick` left at its
   * default the palette closes as the command runs.
   */
  async runItem(filters: WrCommandPaletteItemHarnessFilters): Promise<void> {
    const [item] = await this.getItems(filters);
    if (!item) {
      const offered = await this.getItemLabels();
      throw new Error(
        `WrCommandPaletteHarness.runItem(): no command matched ${JSON.stringify(filters)}. ` +
          `The palette offers: ${offered.length > 0 ? offered.join(', ') : '(nothing — the query matches none)'}.`
      );
    }

    await item.click();
  }

  /** Put the caret in the search box. The palette does this itself as it opens. */
  async focus(): Promise<void> {
    return (await this.searchInput('focus')).focus();
  }

  /**
   * Take focus out of the search box.
   *
   * The palette emits nothing on blur — it exists so a spec can prove
   * {@link focus} puts the caret back where the component put it.
   */
  async blur(): Promise<void> {
    return (await this.searchInput('blur')).blur();
  }

  /**
   * Whether the caret is in the search box.
   *
   * The only focus question worth asking of this component: the rows are never
   * focused, so the input is where focus is meant to stay for as long as the
   * palette is open.
   */
  async isSearchInputFocused(): Promise<boolean> {
    return (await this.searchInput('isSearchInputFocused')).isFocused();
  }

  /** The palette's dialog wrapper, or `null` while it is closed. */
  private async dialog(): Promise<TestElement | null> {
    // The role, not `.wr-command-palette`: both sit on the same element, but the
    // role is what a screen reader is told, and the element only exists while the
    // palette is open — so "is there a dialog in this host" IS the open state.
    return this.locatorForOptional('[role="dialog"]')();
  }

  /** The search box, or a failure naming the reason there is none. */
  private async searchInput(method: string): Promise<TestElement> {
    await this.requireOpen(method);
    // Matched on the role rather than on `.wr-command-palette__search input`: the
    // combobox is the accessible contract, and the search row also holds a
    // decorative icon and the `esc` hint.
    return this.locatorFor('input[role="combobox"]')();
  }

  /** This palette's listbox. */
  private async listbox(): Promise<TestElement> {
    return this.locatorFor('[role="listbox"]')();
  }

  /** Fail with the reason when the panel is not rendered. */
  private async requireOpen(method: string): Promise<void> {
    if (await this.isOpen()) return;

    throw new Error(
      `WrCommandPaletteHarness.${method}(): the palette is closed, so nothing it holds exists — the search ` +
        'box, the list and the rows are all inside an `@if (open())`. Call open() to press the global ' +
        'trigger, or set the bound `open` when this palette has none.'
    );
  }
}
