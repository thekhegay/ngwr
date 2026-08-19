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

import type { WrTabHarnessFilters, WrTabsHarnessFilters, WrTabsHarnessSize } from './interfaces';
import { WrTabHarness } from './wr-tab-harness';

/**
 * Test harness for `<wr-tabs>`, with {@link WrTabHarness} for one tab and the panel
 * it controls.
 *
 * The component has two modes and they answer "which tab is active" differently,
 * which is most of what this harness exists to keep straight:
 *
 * - **Content** — the tabs are `<button role="tab">`s, the strip is ONE tab stop
 *   (the roving `tabindex` sits on the selected tab), and the arrow keys ACTIVATE
 *   the tab they move to, the APG's automatic-activation pattern. `<wr-tabs>`
 *   renders exactly one panel: the selected tab's.
 * - **Router** — one `routerLink` on any child switches the whole strip over. The
 *   tabs become `<a role="tab">`s whose `aria-selected` follows the resolved route
 *   (the same `routerLinkActive` that paints `--active`), the strip renders NO
 *   panel, and it stops being one tab stop — every enabled tab is a Tab stop of its
 *   own. The arrow keys still move focus, but they select nothing: the route does
 *   that.
 *
 * So {@link getSelectedLabel} and {@link getFocusedLabel} are two different
 * questions, and {@link getTabStopLabels} is a third. They coincide in content mode
 * and come apart in router mode; a spec that asserts one and means another passes
 * through the bug.
 *
 * Everything here is driven from the KEYBOARD rather than by clicking a coordinate:
 * a unit test has no layout, so a hit test would answer with nothing, and the
 * keyboard is the accessible path anyway. {@link select} is the exception — a
 * no-arg click needs no coordinate.
 *
 * @example
 * ```ts
 * const tabs = await loader.getHarness(WrTabsHarness);
 *
 * expect(await tabs.getTabLabels()).toEqual(['One', 'Two', 'Three']);
 * await tabs.select({ label: 'Two' });
 * expect(await tabs.getPanelText()).toContain('Second panel');
 * ```
 *
 * @see https://ngwr.dev/reference/components/tabs
 * @see https://ngwr.dev/guides/testing
 */
export class WrTabsHarness extends ComponentHarness {
  static hostSelector = 'wr-tabs';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrTabsHarnessFilters = {}): HarnessPredicate<WrTabsHarness> {
    return new HarnessPredicate(WrTabsHarness, options)
      .addOption('tabLabel', options.tabLabel, async (harness, label) => {
        for (const tab of await harness.getTabLabels()) {
          if (await HarnessPredicate.stringMatches(tab, label)) return true;
        }
        return false;
      })
      .addOption('selectedLabel', options.selectedLabel, async (harness, label) => {
        const selected = await harness.getSelectedLabel();
        return selected === null ? false : HarnessPredicate.stringMatches(selected, label);
      })
      .addOption('size', options.size, async (harness, size) => (await harness.getSize()) === size)
      .addOption('router', options.router, async (harness, router) => (await harness.isRouterMode()) === router);
  }

  /**
   * The role the strip announces — `tablist`.
   *
   * Read off the strip, not the host: `<wr-tabs>` carries the `wr-tabs` class and no
   * role of its own, and the `tablist` is the scrolling `.wr-tabs__strip` inside it.
   * Without that role the headers are a row of buttons: nothing tells a screen
   * reader how many tabs there are or which one of them is showing.
   */
  async getRole(): Promise<string | null> {
    return (await this.strip()).getAttribute('role');
  }

  /**
   * The axis the strip announces, which decides which arrow keys a screen-reader
   * user is told to press.
   *
   * `<wr-tabs>` ships one orientation — the strip is a horizontal scroller and hard
   * codes `aria-orientation="horizontal"` — so today this always answers
   * `'horizontal'`. It is read from the DOM and normalized the way ARIA reads it:
   * anything that is not `vertical`, a missing attribute included, is `'horizontal'`,
   * the default for a `tablist`.
   *
   * Which means an assertion here catches a strip that starts ANNOUNCING `vertical`
   * while its arrow keys still walk the horizontal axis — and cannot catch the
   * mirror image, a vertical mode that forgets to update the attribute: that one
   * answers `'horizontal'` and looks unchanged. One attribute is all this reads.
   */
  async getOrientation(): Promise<'horizontal' | 'vertical'> {
    return (await (await this.strip()).getAttribute('aria-orientation')) === 'vertical' ? 'vertical' : 'horizontal';
  }

  /**
   * The size the strip renders at, from the host modifier.
   *
   * `md` is the default and paints no modifier of its own, so its absence is the
   * answer rather than a missing one.
   */
  async getSize(): Promise<WrTabsHarnessSize> {
    const host = await this.host();
    if (await host.hasClass('wr-tabs--sm')) return 'sm';
    if (await host.hasClass('wr-tabs--lg')) return 'lg';
    return 'md';
  }

  /**
   * Whether this strip navigates instead of swapping panels.
   *
   * Derived from what got RENDERED — a router tab is an `<a>` — rather than from the
   * `routerLink` inputs, because the switch is all-or-nothing: one `routerLink`
   * anywhere in the strip turns every tab into a link and drops the panel. A strip
   * with no tabs at all is content mode, which is what the component does with it.
   */
  async isRouterMode(): Promise<boolean> {
    const tabs = await this.getTabs();
    for (const tab of tabs) {
      if (await tab.isLink()) return true;
    }
    return false;
  }

  /**
   * This strip's tabs, in render order.
   *
   * Scoped to this strip rather than to the host, which is what keeps a `<wr-tabs>`
   * NESTED in a panel from answering for its parent: the inner strip is a descendant
   * of the outer host, so a host-wide query would hand back both sets of tabs as one
   * flat list.
   */
  async getTabs(filters: WrTabHarnessFilters = {}): Promise<WrTabHarness[]> {
    return (await this.stripLoader()).getAllHarnesses(WrTabHarness.with(filters));
  }

  /** The label of every tab, in render order. */
  async getTabLabels(): Promise<string[]> {
    const tabs = await this.getTabs();
    return Promise.all(tabs.map(tab => tab.getLabel()));
  }

  /**
   * The selected tab, or `null` when none is.
   *
   * A content strip always has one — it falls back to the first tab when `active`
   * matches nothing — so `null` means a router strip whose current route matches no
   * tab, or a strip with no tabs.
   */
  async getSelectedTab(): Promise<WrTabHarness | null> {
    const [selected] = await this.getTabs({ selected: true });
    return selected ?? null;
  }

  /** The label of the selected tab, or `null` when none is selected. */
  async getSelectedLabel(): Promise<string | null> {
    const selected = await this.getSelectedTab();
    return selected ? selected.getLabel() : null;
  }

  /**
   * Select the first tab matching the filters, the way a pointer does.
   *
   * Throws when nothing matches, naming the tabs that do exist, and throws again
   * when the tab is still unselected afterwards — with both causes named, because a
   * click that quietly did nothing surfaces as an unrelated assertion three lines
   * later. Those causes are a disabled CONTENT tab (a `<button disabled>` never sees
   * the click at all) and a router strip whose navigation did not land on this tab.
   *
   * A router strip is otherwise fine here: the click starts a route change, the
   * harness stabilizes the pending navigation before it re-reads the strip, and
   * `routerLinkActive` has painted the selection by then — so this resolves. It is a
   * guard, a redirect or an unmatched path that leaves the tab unselected. Note that
   * `disabled` does not stop a router tab at all; see {@link WrTabHarness.click}.
   */
  async select(filters: WrTabHarnessFilters): Promise<void> {
    const [tab] = await this.getTabs(filters);
    if (!tab) {
      const labels = await this.getTabLabels();
      const offered =
        labels.length > 0 ? `This strip offers: ${labels.join(', ')}.` : 'This strip renders no tabs at all.';
      throw new Error(`WrTabsHarness.select(): no tab matched ${JSON.stringify(filters)}. ${offered}`);
    }
    await this.activate(tab, 'select');
  }

  /**
   * Select the tab at this position in render order, counting from 0.
   *
   * Throws on an index the strip does not have, naming its length: a silent no-op
   * there reads as "the tab did not react" when the tab was never addressed.
   */
  async selectByIndex(index: number): Promise<void> {
    const tabs = await this.getTabs();
    const tab = tabs[index];
    if (!tab) {
      throw new Error(
        `WrTabsHarness.selectByIndex(): this strip has ${tabs.length} tab(s), so index ${index} is out of ` +
          'range — they are numbered from 0 in render order.'
      );
    }
    await this.activate(tab, 'selectByIndex');
  }

  /**
   * The labels of every tab a Tab press can land on, in render order.
   *
   * A LIST rather than one label, because the count is the mode: a content strip
   * roves a single `tabindex="0"` and answers with exactly one label — the selected
   * tab — while a router strip makes every enabled tab its own stop and answers with
   * all of them. Either way a disabled tab is never in here.
   */
  async getTabStopLabels(): Promise<string[]> {
    const labels: string[] = [];
    for (const tab of await this.getTabs()) {
      if (await tab.isTabStop()) labels.push(await tab.getLabel());
    }
    return labels;
  }

  /**
   * Whether the strip is a single tab stop — the roving-`tabindex` pattern the APG
   * asks a `tablist` for.
   *
   * True for a content strip, false for a router one, which puts every enabled tab
   * in the page tab order. A strip whose every tab is disabled has no stop at all
   * and answers `true`: nothing to rove, and Tab skips it.
   */
  async isRoving(): Promise<boolean> {
    return (await this.getTabStopLabels()).length <= 1;
  }

  /**
   * The label of the tab holding keyboard focus, or `null` when focus is elsewhere.
   *
   * The other answer to "which tab is active", and not the same as
   * {@link getSelectedLabel}: the arrow keys move this. In content mode they also
   * select what they land on, so the two stay together; in router mode focus walks
   * the strip while the selection stays on whatever the route resolved to.
   */
  async getFocusedLabel(): Promise<string | null> {
    for (const tab of await this.getTabs()) {
      if (await tab.isFocused()) return tab.getLabel();
    }
    return null;
  }

  /**
   * Put focus where a Tab press would put it — the first tab stop in render order.
   *
   * That is the selected tab in content mode, and the first enabled tab in a router
   * strip. Throws when the strip has no stop at all, because Tab then skips past it
   * rather than entering it — a content strip whose selected tab is disabled has
   * none, and neither has one whose every tab is disabled, or one with no tabs.
   */
  async focusTabStop(): Promise<void> {
    for (const tab of await this.getTabs()) {
      if (await tab.isTabStop()) {
        await tab.focus();
        return;
      }
    }

    throw new Error(
      'WrTabsHarness.focusTabStop(): this strip has no tab stop — its selected tab is disabled, every tab ' +
        'is disabled, or it renders no tabs — so Tab skips it rather than entering it.'
    );
  }

  /**
   * ArrowRight on the strip — one tab toward the visual RIGHT, wrapping at the end
   * and skipping disabled tabs.
   *
   * The physical key, because that is what a keyboard has. The component follows
   * visual order per the APG, so under `dir="rtl"` this moves to the PREVIOUS tab —
   * a spec exercising a mirrored strip swaps this and {@link pressArrowLeft}.
   *
   * In content mode the tab it lands on is also SELECTED (automatic activation); in
   * router mode only focus moves.
   */
  async pressArrowRight(): Promise<void> {
    await this.press(TestKey.RIGHT_ARROW);
  }

  /** ArrowLeft on the strip — one tab toward the visual LEFT, mirrored under `dir="rtl"`. */
  async pressArrowLeft(): Promise<void> {
    await this.press(TestKey.LEFT_ARROW);
  }

  /**
   * Home on the strip — the FIRST enabled tab.
   *
   * Home and End name a position in the tab list rather than an edge of the strip,
   * so unlike the arrows they read the same in both reading directions.
   */
  async pressHome(): Promise<void> {
    await this.press(TestKey.HOME);
  }

  /** End on the strip — the LAST enabled tab, in both reading directions. */
  async pressEnd(): Promise<void> {
    await this.press(TestKey.END);
  }

  /** Whether this strip is showing a panel at all — false for a router strip. */
  async hasPanel(): Promise<boolean> {
    const selected = await this.getSelectedTab();
    return selected === null ? false : selected.hasPanel();
  }

  /**
   * The text of the panel that is showing, trimmed — the selected tab's content, and
   * the only tab content in the DOM.
   *
   * Throws when nothing is selected. Delegates to the selected tab, so the panel it
   * reads is the one that tab's `aria-controls` points at rather than "the first
   * `.wr-tabs__panel` around" — the two are only the same page when the wiring is
   * right, and {@link WrTabHarness.isPanelBound} is what says whether it is.
   */
  async getPanelText(): Promise<string> {
    const selected = await this.getSelectedTab();
    if (!selected) {
      throw new Error(
        'WrTabsHarness.getPanelText(): no tab is selected, so no panel is rendered. A router strip whose ' +
          'route matches none of its tabs looks like this, as does a strip with no tabs.'
      );
    }
    return selected.getPanelText();
  }

  /**
   * Which edges of the strip are faded out, from the public `--fade-start` /
   * `--fade-end` host modifiers — the cue that there are more tabs than fit, on the
   * side they are on.
   *
   * The component computes these from the strip's scroll metrics, so in a unit test
   * both are always `false`: jsdom lays nothing out, every element measures 0x0, and
   * a strip that never overflows never fades. Assert this in a real browser, or
   * declare the metrics and dispatch a `scroll` the way the component's own spec
   * does.
   */
  async getFades(): Promise<{ start: boolean; end: boolean }> {
    const host = await this.host();
    return {
      start: await host.hasClass('wr-tabs--fade-start'),
      end: await host.hasClass('wr-tabs--fade-end'),
    };
  }

  /** Click a tab and check it took, or say which of the two reasons it did not. */
  private async activate(tab: WrTabHarness, method: string): Promise<void> {
    await tab.click();
    if (await tab.isSelected()) return;

    throw new Error(
      `WrTabsHarness.${method}(): "${await tab.getLabel()}" is still unselected after being clicked — ` +
        'either it is a content tab carrying `disabled`, which fires no click at all, or this is a router ' +
        'strip whose navigation did not land on this tab: a guard, a redirect or an unmatched path leaves ' +
        '`routerLinkActive` painting some other one.'
    );
  }

  /**
   * Send a key to the `role="tablist"` strip.
   *
   * The strip owns the keydown handler, and a real user's keypress on the focused
   * header bubbles to exactly here — so this is the honest target, and the one that
   * still works when jsdom has left real focus on `<body>`. It is also the target
   * that leaves the headers alone: the CDK types into whatever element it is handed,
   * which on a `<button>` means writing a `value` attribute onto a tab.
   */
  private async press(key: TestKey): Promise<void> {
    await (await this.strip()).sendKeys(key);
  }

  /** This strip's own `role="tablist"` element — the first one under the host. */
  private async strip(): Promise<TestElement> {
    return this.locatorFor('.wr-tabs__strip')();
  }

  /**
   * A loader rooted at this strip, so tab queries cannot reach a nested strip's tabs:
   * a nested `<wr-tabs>` lives in the PANEL, which is outside this element.
   */
  private async stripLoader(): Promise<HarnessLoader> {
    return this.locatorFactory.harnessLoaderFor('.wr-tabs__strip');
  }
}
