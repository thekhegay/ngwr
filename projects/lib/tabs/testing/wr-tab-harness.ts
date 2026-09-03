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
  type TestElement,
} from '@angular/cdk/testing';

import type { WrTabHarnessFilters } from './interfaces';

/**
 * Test harness for one tab of a `<wr-tabs>` strip — the header, and the panel it
 * controls.
 *
 * Its host is the RENDERED HEADER, not the `<wr-tab>` element. A `<wr-tab>` is
 * `display:none` and holds nothing but a `<ng-template>`: the label, the selection
 * state, the tab stop and the click target all live on the element the parent
 * renders for it, which is a `<button role="tab">` in content mode and an
 * `<a role="tab">` in router mode. A harness hosted on `wr-tab` would answer every
 * question with nothing.
 *
 * Also a CONTENT CONTAINER, scoped to the panel this tab controls, so
 * `tab.getHarness(WrButtonHarness…)` reaches the consumer's own components inside
 * the tab's content. The panel is not a descendant of the header — it is a sibling
 * of the whole strip — so it is resolved through the `aria-controls` id, which is
 * also the pairing {@link isPanelBound} checks. Only the SELECTED tab has a panel
 * to reach: `<wr-tabs>` renders one panel and destroys it on every switch.
 *
 * @example
 * ```ts
 * const tabs = await loader.getHarness(WrTabsHarness);
 * const [first] = await tabs.getTabs();
 *
 * expect(await first.isSelected()).toBe(true);
 * expect(await first.isPanelBound()).toBe(true);
 * await (await first.getHarness(WrButtonHarness.with({ text: 'Save' }))).click();
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrTabHarness extends ContentContainerComponentHarness {
  /** The header the strip renders for a `<wr-tab>` — a `<button>`, or an `<a>` in router mode. */
  static hostSelector = '.wr-tabs__tab';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrTabHarnessFilters = {}): HarnessPredicate<WrTabHarness> {
    return new HarnessPredicate(WrTabHarness, options)
      .addOption('label', options.label, (harness, label) => HarnessPredicate.stringMatches(harness.getLabel(), label))
      .addOption('selected', options.selected, async (harness, selected) => (await harness.isSelected()) === selected)
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled);
  }

  /** The tab's visible label, trimmed — the `<wr-tab>`'s `title`. */
  async getLabel(): Promise<string> {
    return (await this.host()).text();
  }

  /**
   * The header's own id, which is what the panel points back at with
   * `aria-labelledby` — the tab is the panel's accessible name.
   *
   * Generated from the tab's `key`, so two strips on one page whose tabs share keys
   * publish the same ids and each panel then names whichever header came first.
   */
  async getId(): Promise<string | null> {
    return (await this.host()).getAttribute('id');
  }

  /**
   * Whether this is the strip's selected tab.
   *
   * `aria-selected` first, because that is the state a screen reader acts on and
   * the `--active` class is only what it looks like. Both shapes carry it now — a
   * router tab publishes it off the same `routerActive()` that paints the class —
   * so the class is a fallback for a tab that has neither yet, not a second reading
   * of the same thing. The order is not interchangeable: reading the class first
   * would report a tab as selected while `aria-selected="false"` told assistive tech
   * otherwise.
   */
  async isSelected(): Promise<boolean> {
    const host = await this.host();
    const selected = await host.getAttribute('aria-selected');
    if (selected !== null) return selected === 'true';
    return host.hasClass('wr-tabs__tab--active');
  }

  /**
   * Whether the tab refuses activation.
   *
   * The two shapes say it differently and both are read: a content tab is a real
   * `<button>` and carries the native `disabled`, a router tab is an `<a>` — which
   * cannot be disabled natively — and carries `aria-disabled` with `tabindex="-1"`.
   * The `--disabled` class is on both and is deliberately not the source: a class
   * says how the tab looks, these two say what it refuses.
   */
  async isDisabled(): Promise<boolean> {
    const host = await this.host();
    if ((await host.getAttribute('aria-disabled')) === 'true') return true;
    return (await host.getProperty<boolean | undefined>('disabled')) === true;
  }

  /** Whether this tab is a link — the router shape, where selection follows the route. */
  async isLink(): Promise<boolean> {
    return (await this.host()).matchesSelector('a');
  }

  /**
   * The resolved href of a router tab, or `null` for a content tab.
   *
   * `null` is the answer for a `<button>` rather than a gap — a content tab
   * navigates nowhere, it swaps a panel.
   */
  async getHref(): Promise<string | null> {
    return (await this.host()).getAttribute('href');
  }

  /**
   * Whether a Tab press can land on this header.
   *
   * A content strip is ONE tab stop and hands it to the selected tab; a router
   * strip makes every enabled tab a stop of its own. See
   * `WrTabsHarness.getTabStopLabels()` — the difference is a mode difference, not
   * a rounding error.
   *
   * A non-negative `tabindex` is not enough on its own, which is why `disabled` is
   * read too: `<wr-tabs>` gives the roving `tabindex="0"` to whatever `active`
   * names without checking whether that tab is disabled, so a host binding `active`
   * to a disabled tab's key renders a `<button disabled tabindex="0">` — which no
   * Tab press reaches. jsdom will focus such a button anyway, so this is the only
   * place a unit test can tell the difference.
   */
  async isTabStop(): Promise<boolean> {
    if (await this.isDisabled()) return false;
    const tabIndex = await (await this.host()).getAttribute('tabindex');
    return Number.parseInt(tabIndex ?? '-1', 10) >= 0;
  }

  /**
   * The id of the panel this tab controls, or `null` when it controls none.
   *
   * `null` for a router tab — the strip renders no panel in that mode, the consumer
   * drops a `<router-outlet>` after it — and that missing `aria-controls` is the
   * honest report: there is nothing for the header to point at.
   */
  async getPanelId(): Promise<string | null> {
    return (await this.host()).getAttribute('aria-controls');
  }

  /** Whether this tab's panel is in the DOM right now — true only for the selected tab. */
  async hasPanel(): Promise<boolean> {
    return (await this.panelOrNull()) !== null;
  }

  /**
   * Whether the panel and this header really name each other.
   *
   * Both halves, because each covers a different failure: the header's
   * `aria-controls` has to reach the panel that is showing, and the panel's
   * `aria-labelledby` has to come back to THIS header. A panel wired to the wrong
   * tab looks perfect on screen — the right content is under the right header — and
   * announces the wrong name, which is the whole of a tabbed interface for anyone
   * not looking at it. It also has to be a `tabpanel`: the reference resolving to
   * some other element is a broken pairing, not a styling detail.
   *
   * Throws when there is no panel at all, which is a different fact from a broken
   * pairing — see {@link getPanelText}.
   */
  async isPanelBound(): Promise<boolean> {
    const panel = await this.panelOrThrow('isPanelBound');
    if ((await panel.getAttribute('role')) !== 'tabpanel') return false;
    return (await panel.getAttribute('aria-labelledby')) === (await this.getId());
  }

  /**
   * The text of this tab's panel, trimmed.
   *
   * Throws rather than answering `''` for a tab whose panel is not rendered, and
   * the message says which of the two reasons it is: `<wr-tabs>` keeps only the
   * selected tab's panel in the DOM (the content of every other tab sits in an
   * unrendered `<ng-template>`, so switching tabs destroys a panel and builds the
   * next one), and a router strip renders no panel at all.
   */
  async getPanelText(): Promise<string> {
    return (await this.panelOrThrow('getPanelText')).text();
  }

  /**
   * Activate this tab the way a pointer does.
   *
   * A disabled CONTENT tab is left alone: it is a real `<button disabled>`, which
   * fires no click at all. A disabled ROUTER tab is an `<a>`, where `disabled` is
   * not a thing — it carries `aria-disabled="true"` and `tabindex="-1"` to stay off
   * the keyboard path, renders NO href, and the component drops the click rather
   * than routing it. So the click lands and nothing moves, which is why a router
   * strip's expectations belong on the resolved route rather than on the click.
   */
  async click(): Promise<void> {
    return (await this.host()).click();
  }

  /** Move keyboard focus onto this header. */
  async focus(): Promise<void> {
    return (await this.host()).focus();
  }

  /** Take focus off this header. */
  async blur(): Promise<void> {
    return (await this.host()).blur();
  }

  /** Whether this header holds keyboard focus — the roving cursor, not the selection. */
  async isFocused(): Promise<boolean> {
    return (await this.host()).isFocused();
  }

  /** `getHarness(…)` searches this tab's PANEL, which is where its content is. */
  protected override async getRootHarnessLoader(): Promise<HarnessLoader> {
    // Both checks, in this order, so the failure names the reason — no panel in this
    // mode, or a panel that is not the one showing — instead of the CDK's generic
    // "no element matching selector".
    const id = await this.panelIdOrThrow('getHarness');
    await this.panelOrThrow('getHarness');
    return this.documentRootLocatorFactory().harnessLoaderFor(WrTabHarness.byId(id));
  }

  /** The panel element, or `null` when this tab has none rendered. */
  private async panelOrNull(): Promise<TestElement | null> {
    const id = await this.getPanelId();
    if (id === null) return null;
    // From the document root: the panel is a sibling of the strip, not a descendant
    // of the header this harness is hosted on.
    return this.documentRootLocatorFactory().locatorForOptional(WrTabHarness.byId(id))();
  }

  /** The panel element, or a failure naming which of the two reasons there isn't one. */
  private async panelOrThrow(method: string): Promise<TestElement> {
    await this.panelIdOrThrow(method);
    const panel = await this.panelOrNull();
    if (!panel) {
      throw new Error(
        `WrTabHarness.${method}(): the panel for "${await this.getLabel()}" is not rendered. <wr-tabs> keeps ` +
          'only the SELECTED panel in the DOM — the content of every other tab waits in an unrendered ' +
          '<ng-template> — so select the tab first.'
      );
    }
    return panel;
  }

  /** This tab's `aria-controls`, or a failure saying a router strip has no panels. */
  private async panelIdOrThrow(method: string): Promise<string> {
    const id = await this.getPanelId();
    if (id === null) {
      throw new Error(
        `WrTabHarness.${method}(): "${await this.getLabel()}" controls no panel. A router strip renders none ` +
          '— its tabs navigate and the consumer drops a <router-outlet> after the strip — so assert the ' +
          'routed content instead.'
      );
    }
    return id;
  }

  /**
   * An id selector that survives the id it is given.
   *
   * `[id="…"]` rather than `#…`: the ids here are built from the consumer's `key`,
   * and a key holding a dot, a colon or a leading digit turns `#id` into a selector
   * that either throws or matches something else entirely.
   */
  private static byId(id: string): string {
    return `[id="${id}"]`;
  }
}
