/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, type TestElement } from '@angular/cdk/testing';

import type { WrTransferHarnessFilters, WrTransferSide } from './interfaces';
import { WrTransferItemHarness } from './wr-transfer-item-harness';
import { WrTransferPaneHarness } from './wr-transfer-pane-harness';

/**
 * Test harness for `<wr-transfer>` — the root of a small family, since a dual
 * listbox is three things and not one control: {@link WrTransferPaneHarness} for one
 * pane and {@link WrTransferItemHarness} for one row inside it.
 *
 * **Everything is keyed by SIDE, never duplicated per pane.** The two panes are the
 * same block rendered twice, so a `…Source` / `…Target` method pair for each
 * question would double the surface and let the halves drift; instead
 * {@link getPane} takes the side once and the pane answers, and the two whole-
 * control operations that are inherently directional — the move buttons — take the
 * side they move rows INTO. `moveTo('target')` is the right-facing button in an LTR
 * layout, and stays the correct one under `dir="rtl"`, where "right" is not.
 *
 * **The staged ticks are not the value.** `[(value)]` is the RIGHT pane's
 * membership; a tick inside either pane is transient staging that the next move
 * spends and clears. Conflating them is the failure this component invites, so the
 * two are separate questions here: {@link WrTransferPaneHarness.getItemLabels} is
 * what a pane HOLDS (the value, on the right) and
 * {@link WrTransferPaneHarness.getCheckedLabels} is what it has STAGED.
 *
 * Both are scoped to what a pane is showing, which is also the component's own rule
 * for a move: a row staged before a search hid it is no longer counted, no longer
 * ticked, and does not travel.
 *
 * @example
 * ```ts
 * const transfer = await loader.getHarness(WrTransferHarness);
 * const source = await transfer.getPane('source');
 *
 * await (await source.getItem({ label: 'Read' })).check();
 * await transfer.moveTo('target');
 *
 * expect(await (await transfer.getPane('target')).getItemLabels()).toEqual(['Read']);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrTransferHarness extends ComponentHarness {
  static hostSelector = 'wr-transfer';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrTransferHarnessFilters = {}): HarnessPredicate<WrTransferHarness> {
    return new HarnessPredicate(WrTransferHarness, options)
      .addOption('sourceTitle', options.sourceTitle, (harness, title) =>
        HarnessPredicate.stringMatches(harness.paneTitle('source'), title)
      )
      .addOption('targetTitle', options.targetTitle, (harness, title) =>
        HarnessPredicate.stringMatches(harness.paneTitle('target'), title)
      )
      .addOption('itemLabel', options.itemLabel, async (harness, label) => {
        for (const shown of await harness.shownLabels()) {
          if (await HarnessPredicate.stringMatches(shown, label)) return true;
        }
        return false;
      })
      .addOption(
        'searchable',
        options.searchable,
        async (harness, searchable) => (await harness.isSearchable()) === searchable
      )
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled);
  }

  /**
   * One of the two panes — `'source'` is the left one (the rows outside the value),
   * `'target'` the right one (the value).
   *
   * The side is named here and nowhere else; see the class note.
   */
  async getPane(side: WrTransferSide): Promise<WrTransferPaneHarness> {
    return this.locatorFor(WrTransferPaneHarness.with({ side }))();
  }

  /**
   * Whether the whole control refuses interaction.
   *
   * From the host modifier, which is the only signal the host itself carries: a
   * `<wr-transfer>` element is not a control and publishes no `aria-disabled` of its
   * own — the state reaches assistive tech through the checkboxes, the buttons and
   * the filter boxes it disables, which is where
   * {@link WrTransferItemHarness.isDisabled} and {@link canMoveTo} read it.
   */
  async isDisabled(): Promise<boolean> {
    return (await this.host()).hasClass('wr-transfer--disabled');
  }

  /** Whether the panes have filter boxes — `[searchable]` gives both one or neither. */
  async isSearchable(): Promise<boolean> {
    return (await this.host()).hasClass('wr-transfer--searchable');
  }

  /**
   * Whether the button that moves rows INTO `side` is offering itself.
   *
   * It is enabled only while the OTHER pane has something staged and showing, so
   * this is also the readable way to assert that staging landed — and that a search
   * which hid a staged row took the move away again.
   *
   * Read from the native `disabled` attribute: these are `button[wr-btn]`, the
   * native shape, where that attribute is the state. (`wr-btn` adds `aria-disabled`
   * only for its custom-element shape, on which `disabled` is inert.)
   */
  async canMoveTo(side: WrTransferSide): Promise<boolean> {
    return (await (await this.moveButton(side)).getAttribute('disabled')) === null;
  }

  /**
   * The accessible name of the button that moves rows INTO `side` —
   * `[toTargetLabel]` / `[toSourceLabel]`, or the i18n fallback.
   *
   * Worth pinning: the button's only content is an `aria-hidden` chevron, so this
   * `aria-label` is the entire announcement. Lose it and the pair becomes two
   * unnamed buttons.
   */
  async getMoveLabel(side: WrTransferSide): Promise<string | null> {
    return (await this.moveButton(side)).getAttribute('aria-label');
  }

  /**
   * Press the button that moves the staged rows INTO `side`, committing them to the
   * value.
   *
   * Only the rows the other pane is SHOWING as staged travel, and the staging is
   * cleared afterwards — the component's rule, not this harness's.
   *
   * Refuses a disabled button rather than pressing it: a native disabled `<button>`
   * swallows the click before Angular's listener sees it, so the call would resolve
   * having moved nothing at all.
   */
  async moveTo(side: WrTransferSide): Promise<void> {
    if (!(await this.canMoveTo(side))) {
      const from: WrTransferSide = side === 'target' ? 'source' : 'target';
      throw new Error(
        `WrTransferHarness.moveTo('${side}'): the button is disabled, so nothing would move. The ${from} pane ` +
          'has nothing staged and showing — a row staged before a search hid it no longer counts — or the whole ' +
          'transfer is disabled.'
      );
    }
    await (await this.moveButton(side)).click();
  }

  /**
   * Stage everything the other pane can stage, then move it INTO `side`.
   *
   * "Everything" is the pane's own scope: the rows it is SHOWING, disabled ones
   * excluded. A search narrows it, and with a filter typed this moves what is
   * visible rather than the whole pane.
   */
  async moveAllTo(side: WrTransferSide): Promise<void> {
    const from = await this.getPane(side === 'target' ? 'source' : 'target');
    await from.checkAll();
    await this.moveTo(side);
  }

  /** The heading of one pane — the `sourceTitle` / `targetTitle` filters run through this. */
  private async paneTitle(side: WrTransferSide): Promise<string> {
    return (await this.getPane(side)).getTitle();
  }

  /** Every label rendered in either pane, for the `itemLabel` filter. */
  private async shownLabels(): Promise<string[]> {
    const items = await this.locatorForAll(WrTransferItemHarness)();
    return Promise.all(items.map(item => item.getLabel()));
  }

  /**
   * The move button for a direction, addressed by its `--to-source` / `--to-target`
   * modifier.
   *
   * Not by DOM order, and that is the point: two identically classed buttons whose
   * only difference was their position would let a template reshuffle silently
   * reverse every `moveTo()` in every consumer's suite, with both directions still
   * green. Not by the `aria-label` either — that string is localizable.
   */
  private async moveButton(side: WrTransferSide): Promise<TestElement> {
    return this.locatorFor(`.wr-transfer__move--to-${side}`)();
  }
}
