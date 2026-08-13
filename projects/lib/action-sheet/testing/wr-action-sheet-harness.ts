/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, TestKey } from '@angular/cdk/testing';

import type { WrActionSheetActionHarnessFilters, WrActionSheetHarnessFilters } from './interfaces';
import { WrActionSheetActionHarness } from './wr-action-sheet-action-harness';

/**
 * One `.wr-action-sheet__group` — internal, and the only way to read the rows of ONE
 * group: a `TestElement` cannot be queried into, so scoping to a child element means
 * a harness anchored on it.
 */
class GroupHarness extends ComponentHarness {
  static hostSelector = '.wr-action-sheet__group';

  async getLabels(): Promise<string[]> {
    const labels = await this.locatorForAll('.wr-action-sheet__label')();
    return Promise.all(labels.map(label => label.text()));
  }
}

/**
 * Test harness for an open `<wr-action-sheet>` — the iOS-style bottom sheet of
 * choices.
 *
 * The sheet renders through `<wr-drawer>`, so its rows are in the NGWR overlay
 * container rather than in the fixture: load this from
 * `TestbedHarnessEnvironment.documentRootLoader()`. A fixture-scoped loader finds
 * nothing at all — the `<wr-action-sheet>` host element itself holds no content and
 * the drawer it wraps is `display: none`.
 *
 * The anchor is `.wr-action-sheet`, the sheet's own root inside the drawer panel,
 * which makes each instance self-scoping: two sheets open at once are two hosts, and
 * every query here descends from one of them. That is worth stating because it is
 * NOT how the drawer harness underneath has to work — a drawer publishes no link to
 * the overlay it opened, so `WrDrawerHarness` anchors on the shared pane and scopes
 * by id.
 *
 * **What belongs to the drawer, not here.** Dismissal by backdrop click or by the ✕
 * button, the modal role, the focus trap and the panel's position are all the
 * drawer's surface, and `WrDrawerHarness` from the same root loader answers them.
 * {@link sendEscape} is the one exception, kept because dismissing without choosing
 * is a documented behaviour of the sheet itself: it closes and emits NOTHING, which
 * is the assertion most specs are actually after.
 *
 * @example
 * ```ts
 * const rootLoader = TestbedHarnessEnvironment.documentRootLoader(fixture);
 * const sheet = await rootLoader.getHarness(WrActionSheetHarness);
 *
 * expect(await sheet.getActionLabels()).toEqual(['Take Photo', 'Delete', 'Cancel']);
 * await sheet.select({ label: 'Delete' });
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrActionSheetHarness extends ComponentHarness {
  /** The sheet's root inside the drawer panel. A closed sheet renders none. */
  static hostSelector = '.wr-action-sheet';

  /** Build a predicate that narrows the query — sheets can be stacked. */
  static with(options: WrActionSheetHarnessFilters = {}): HarnessPredicate<WrActionSheetHarness> {
    return new HarnessPredicate(WrActionSheetHarness, options)
      .addOption('title', options.title, (harness, title) => HarnessPredicate.stringMatches(harness.getTitle(), title))
      .addOption('message', options.message, (harness, message) =>
        HarnessPredicate.stringMatches(harness.getMessage(), message)
      )
      .addOption('accessibleName', options.accessibleName, (harness, name) =>
        HarnessPredicate.stringMatches(harness.getAccessibleName(), name)
      );
  }

  /**
   * Whether this sheet is still open.
   *
   * A harness can only be obtained while the sheet is open — closing disposes the
   * overlay and everything in it — so this is the answer for a harness you are
   * already HOLDING: it flips to `false` after a pick or a dismissal, where a fresh
   * `getHarnessOrNull()` comes back `null`.
   *
   * Attachment is the test rather than a class, because disposal removes the element
   * without changing anything on it.
   */
  async isOpen(): Promise<boolean> {
    return (await this.host()).matchesSelector('body .wr-action-sheet');
  }

  /** The visible heading, or `null` when the sheet was opened without a `title`. */
  async getTitle(): Promise<string | null> {
    const title = await this.locatorForOptional('.wr-action-sheet__title')();
    return title ? title.text() : null;
  }

  /** The muted sub-heading, or `null` when the sheet has no `message`. */
  async getMessage(): Promise<string | null> {
    const message = await this.locatorForOptional('.wr-action-sheet__message')();
    return message ? message.text() : null;
  }

  /**
   * The name the dialog announces.
   *
   * The sheet always publishes one, and for an untitled sheet it is INVISIBLE: the
   * component renders a screen-reader-only `[wrDrawerTitle]` carrying
   * `actionSheet.label` (English default `Actions`), because a bottom sheet is an
   * `aria-modal` dialog and an unnamed one is announced as nothing at all. Nothing
   * on screen changes when that string is wrong or missing, which is exactly why it
   * is worth an assertion.
   *
   * Read from `.wr-drawer__title` — the class the title directive applies — so the
   * one query answers for both shapes: the visible heading carries it too.
   */
  async getAccessibleName(): Promise<string> {
    return (await this.locatorFor('.wr-drawer__title')()).text();
  }

  /** Whether the announced name comes from a visible heading rather than the fallback. */
  async isTitleVisible(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-action-sheet__title')()) !== null;
  }

  /**
   * Whether the dialog is actually WIRED to that name — the drawer panel's
   * `aria-labelledby` resolving to this sheet's own title element, and to nothing
   * else on the page.
   *
   * {@link getAccessibleName} only proves a string exists in the markup; a screen
   * reader reads it only if the reference points at it. The two are separate
   * failures and the second is silent: the title renders, the sheet looks right, and
   * the dialog is announced as unnamed. Worth its own assertion because the drawer
   * resolves the reference AFTER attaching the panel rather than while rendering it,
   * so a title that arrives late is named late or not at all.
   *
   * Counted across the document as well, because two panels answering to one id hand
   * every reference to whichever comes first — which is how a second sheet ends up
   * announcing the first one's title.
   */
  async isNamed(): Promise<boolean> {
    const id = await (await this.locatorFor('.wr-drawer__title')()).getAttribute('id');
    if (!id) return false;

    const root = this.documentRootLocatorFactory();
    const named = await root.locatorForAll(`[aria-labelledby="${id}"]`)();
    const titles = await root.locatorForAll(`[id="${id}"]`)();
    return named.length === 1 && titles.length === 1;
  }

  /** The rows this sheet offers, in DOM order — cancel rows last, in their own group. */
  async getActions(filters: WrActionSheetActionHarnessFilters = {}): Promise<WrActionSheetActionHarness[]> {
    return this.locatorForAll(WrActionSheetActionHarness.with(filters))();
  }

  /** The labels of every row, in DOM order. */
  async getActionLabels(): Promise<string[]> {
    const actions = await this.getActions();
    return Promise.all(actions.map(action => action.getLabel()));
  }

  /**
   * The labels grouped the way the sheet lays them out: the main group first, then
   * the cancel group when there is one.
   *
   * The grouping is the component's whole visual contract — a `cancel` row is pulled
   * out of the list and pinned to the bottom with a gap above it — and it is
   * invisible to {@link getActionLabels}, which flattens the two. A cancel row that
   * stopped being separated would still come last in DOM order, so the flat list
   * cannot catch it.
   */
  async getActionGroups(): Promise<string[][]> {
    const groups = await this.locatorForAll(GroupHarness)();
    return Promise.all(groups.map(group => group.getLabels()));
  }

  /**
   * Whether the sheet drew a separate bottom group — true exactly when at least one
   * row was given `role: 'cancel'`, since the component omits the group entirely
   * rather than rendering an empty one.
   */
  async hasCancelGroup(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-action-sheet__group--cancel')()) !== null;
  }

  /**
   * Pick the first row matching the filters.
   *
   * Throws when nothing matches, naming what the sheet does offer — the alternative
   * is a silent no-op followed by an assertion about a sheet that never moved. A
   * disabled match throws too, from the row harness.
   */
  async select(filters: WrActionSheetActionHarnessFilters): Promise<void> {
    const [action] = await this.getActions(filters);
    if (!action) {
      const offered = await this.getActionLabels();
      throw new Error(
        `WrActionSheetHarness.select(): no row matched ${JSON.stringify(filters)}. ` +
          `The sheet offers: ${offered.join(', ')}.`
      );
    }
    await action.click();
  }

  /**
   * Press Escape — dismissing the sheet WITHOUT emitting `action`.
   *
   * The key never needs to reach the sheet itself: the drawer underneath listens
   * through the CDK's keyboard dispatcher, which keeps one document listener and
   * hands the event to the top-most overlay. So with sheets stacked this dismisses
   * the top one whichever harness it is called on.
   */
  async sendEscape(): Promise<void> {
    await (await this.host()).sendKeys(TestKey.ESCAPE);
  }
}
