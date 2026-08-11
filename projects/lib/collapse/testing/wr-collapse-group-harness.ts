/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrCollapseGroupHarnessFilters, WrCollapseHarnessFilters } from './interfaces';
import { WrCollapseHarness } from './wr-collapse-harness';

/**
 * Test harness for `<wr-collapse-group>` and `<wr-accordion>` — the container a set of
 * {@link WrCollapseHarness} panels sits in, matched in both of its element shapes.
 *
 * There is deliberately no `isAccordion()`, and the reason is worth knowing before a
 * spec goes looking for one: single-open behaviour is not written down anywhere on the
 * page. `<wr-accordion>` carries the marker class `wr-collapse-group--accordion`, but
 * `<wr-collapse-group [accordion]="true">` enforces exactly the same rule and carries
 * nothing — a bound input reaches the component without touching the DOM, and even the
 * literal `accordion` attribute survives only because Angular leaves a static attribute
 * alone. So the class answers "which element did the template use", not "does this group
 * close siblings", and a harness reporting it would call the group form false. Assert the
 * BEHAVIOUR instead: open two panels and read {@link getOpenTitles} — the assertion that
 * would catch a broken accordion anyway.
 *
 * A collapse group is also not a composite widget. Every header is a native `<button>`
 * in the normal tab order, with no roving `tabindex` and no arrow-key navigation (the
 * APG lists both as optional for an accordion), so there is no "active" panel to tell
 * apart from the open one — {@link getFocusedTitle} is the only cursor there is.
 *
 * @example
 * ```ts
 * const settings = await loader.getHarness(WrCollapseGroupHarness.with({ panelTitle: 'Profile' }));
 *
 * await settings.openPanel({ title: 'Security' });
 * expect(await settings.getOpenTitles()).toEqual(['Security']);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrCollapseGroupHarness extends ComponentHarness {
  /** Both shapes the container ships in: the plain group, and the always-accordion one. */
  static hostSelector = 'wr-collapse-group, wr-accordion';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrCollapseGroupHarnessFilters = {}): HarnessPredicate<WrCollapseGroupHarness> {
    return new HarnessPredicate(WrCollapseGroupHarness, options)
      .addOption('panelTitle', options.panelTitle, async (harness, title) => {
        for (const panel of await harness.getPanelTitles()) {
          if (await HarnessPredicate.stringMatches(panel, title)) return true;
        }
        return false;
      })
      .addOption('openPanelTitle', options.openPanelTitle, async (harness, title) => {
        for (const open of await harness.getOpenTitles()) {
          if (await HarnessPredicate.stringMatches(open, title)) return true;
        }
        return false;
      });
  }

  /**
   * The group's panels, in DOM order.
   *
   * Every `<wr-collapse>` inside the host, which includes one nested in another panel's
   * content and every panel of a nested group — the group scopes no more tightly than
   * the DOM does, and a nested accordion's children are still descendants of this one.
   */
  async getPanels(filters: WrCollapseHarnessFilters = {}): Promise<WrCollapseHarness[]> {
    return this.locatorForAll(WrCollapseHarness.with(filters))();
  }

  /** The header text of every panel, in DOM order. */
  async getPanelTitles(): Promise<string[]> {
    const panels = await this.getPanels();
    return Promise.all(panels.map(panel => panel.getTitle()));
  }

  /** The first panel matching the filters, or a failure naming the panels that exist. */
  async getPanel(filters: WrCollapseHarnessFilters): Promise<WrCollapseHarness> {
    const [panel] = await this.getPanels(filters);
    if (!panel) {
      throw new Error(
        `WrCollapseGroupHarness.getPanel(): no panel matched ${JSON.stringify(filters)}. This group holds: ` +
          `${(await this.getPanelTitles()).join(', ')}.`
      );
    }
    return panel;
  }

  /**
   * The panel at a 0-based position in DOM order — the other half of "by text or by
   * index", and the only way to address a panel whose title is not unique.
   *
   * Throws for an index past the end rather than resolving to nothing, and says how many
   * panels there are: an out-of-range index is a mistake in the spec, and a `undefined`
   * handed back would surface three lines later as a failure about something else.
   */
  async getPanelAt(index: number): Promise<WrCollapseHarness> {
    const panels = await this.getPanels();
    const panel = panels[index];
    if (!panel) {
      throw new Error(
        `WrCollapseGroupHarness.getPanelAt(): index ${index} is out of range — this group holds ` +
          `${panels.length} panel(s), so the last index is ${panels.length - 1}.`
      );
    }
    return panel;
  }

  /** The panels that are open, in DOM order. In accordion mode there is at most one. */
  async getOpenPanels(): Promise<WrCollapseHarness[]> {
    return this.getPanels({ open: true });
  }

  /**
   * The header text of every open panel, in DOM order.
   *
   * The assertion an accordion is worth pinning with: opening a second panel has to leave
   * this a list of ONE, and it reads the state from each header's `aria-expanded`, so a
   * sibling that collapsed on screen while still announcing itself open fails here.
   */
  async getOpenTitles(): Promise<string[]> {
    const open = await this.getOpenPanels();
    return Promise.all(open.map(panel => panel.getTitle()));
  }

  /**
   * Open the first panel matching the filters.
   *
   * In accordion mode this is also what CLOSES the siblings — the group is told by the
   * panel that opened, not by the click — so a spec that opens two panels in a row is
   * asserting the mode, and {@link getOpenTitles} is where the answer shows up. Throws
   * when nothing matched, and again when the panel refused to open (it is disabled).
   */
  async openPanel(filters: WrCollapseHarnessFilters): Promise<void> {
    await (await this.getPanel(filters)).open();
  }

  /** Close the first panel matching the filters. */
  async closePanel(filters: WrCollapseHarnessFilters): Promise<void> {
    await (await this.getPanel(filters)).close();
  }

  /**
   * Close every open panel.
   *
   * The open panels are resolved first and then closed one at a time. Every click a
   * harness makes already awaits its own change detection, so closing them concurrently
   * would work too — this reads in the order a user would click, and keeps each failure
   * attributable to the panel that caused it. A disabled panel that was opened through
   * `[open]` cannot be closed from the page and throws — the same failure
   * {@link WrCollapseHarness.close} reports, for the same reason.
   */
  async closeAll(): Promise<void> {
    for (const panel of await this.getOpenPanels()) {
      await panel.close();
    }
  }

  /**
   * The header text of the panel whose header holds focus, or `null` when focus is
   * elsewhere.
   *
   * Every header is its own tab stop here, so this reports where focus actually IS
   * rather than where the group would send it — there is no roving tab stop to diverge
   * from.
   */
  async getFocusedTitle(): Promise<string | null> {
    for (const panel of await this.getPanels()) {
      if (await panel.isFocused()) return panel.getTitle();
    }
    return null;
  }
}
