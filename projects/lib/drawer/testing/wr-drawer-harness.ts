/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ContentContainerComponentHarness, HarnessPredicate, TestKey, type TestElement } from '@angular/cdk/testing';

import type { WrDrawerPosition } from 'ngwr/drawer';

import type { WrDrawerHarnessFilters } from './interfaces';

const POSITIONS: readonly WrDrawerPosition[] = ['left', 'right', 'top', 'bottom'];

/**
 * Test harness for an open drawer — both flavours.
 *
 * A drawer ships as an element (`<wr-drawer [(open)]="…">`) AND as a service call
 * (`WrDrawerManager.open(Cmp)`), but neither puts the panel where a consumer's
 * spec can see it: both render into the NGWR overlay container, a sibling of the
 * whole app. So this is loaded from `TestbedHarnessEnvironment.documentRootLoader()`
 * in BOTH cases — a fixture-scoped loader finds nothing, including for the element
 * form, whose `<wr-drawer>` host is `display: none` and holds no content.
 *
 * The harness is anchored on the overlay pane, which is the one element the two
 * flavours share: for `<wr-drawer>` it wraps the panel div, for the manager it IS
 * the panel (the caller's component is attached straight into it). It is also the
 * only per-instance anchor there is — `<wr-drawer>` publishes no `aria-controls` /
 * `aria-owns` link to the overlay it opened — which is why every query here starts
 * from the pane rather than from a class in the shared container.
 *
 * The harness is a CONTENT CONTAINER: the fields and buttons in the panel are the
 * consumer's own components, so `drawer.getHarness(WrButtonHarness…)` reads them
 * without the spec ever touching the overlay.
 *
 * @example
 * ```ts
 * const rootLoader = TestbedHarnessEnvironment.documentRootLoader(fixture);
 * const drawer = await rootLoader.getHarness(WrDrawerHarness.with({ title: 'Filters' }));
 *
 * expect(await drawer.getPosition()).toBe('bottom');
 * expect(await drawer.isSheet()).toBe(true);
 * await drawer.close();
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrDrawerHarness extends ContentContainerComponentHarness {
  /** The overlay pane both flavours create. A closed drawer has none. */
  static hostSelector = '.wr-drawer-overlay';

  /** Build a predicate that narrows the query — drawers can be stacked. */
  static with(options: WrDrawerHarnessFilters = {}): HarnessPredicate<WrDrawerHarness> {
    return new HarnessPredicate(WrDrawerHarness, options)
      .addOption('title', options.title, (harness, title) =>
        HarnessPredicate.stringMatches(harness.getTitleText(), title)
      )
      .addOption('content', options.content, (harness, content) =>
        HarnessPredicate.stringMatches(harness.getContentText(), content)
      )
      .addOption('position', options.position, async (harness, position) => (await harness.getPosition()) === position);
  }

  /**
   * Whether this drawer is still open.
   *
   * A harness can only be obtained while a drawer is open — closing disposes the
   * overlay, panel and all — so this is the answer for a harness you are already
   * HOLDING: it flips to `false` after a dismissal, where a fresh
   * `getHarnessOrNull()` comes back `null`.
   *
   * Attachment is the test, not a class: disposal takes the pane out of the
   * document along with its wrapper, so the `body` ancestor in the selector is what
   * distinguishes a live panel from the detached element a stale harness holds.
   */
  async isOpen(): Promise<boolean> {
    return (await this.host()).matchesSelector('body .wr-drawer-overlay');
  }

  /** The `[wrDrawerTitle]` text, or `null` when the drawer has no title. */
  async getTitleText(): Promise<string | null> {
    const title = await this.locatorForOptional('.wr-drawer__title')();
    return title ? title.text() : null;
  }

  /** The `[wrDrawerContent]` text, or `null` when the body is not wrapped in it. */
  async getContentText(): Promise<string | null> {
    const content = await this.locatorForOptional('.wr-drawer__content')();
    return content ? content.text() : null;
  }

  /**
   * The edge the drawer is attached to.
   *
   * Read from the overlay's own side modifier, which both flavours set and consumer
   * CSS targets. It is a real mode axis rather than a style flag: left/right size
   * themselves from `width` and stretch full-height, top/bottom span the viewport
   * and size themselves from `height` / `maxHeight`.
   */
  async getPosition(): Promise<WrDrawerPosition> {
    const host = await this.host();
    for (const position of POSITIONS) {
      if (await host.hasClass(`wr-drawer-overlay--${position}`)) return position;
    }
    throw new Error(
      'WrDrawerHarness.getPosition(): this overlay carries no `wr-drawer-overlay--<side>` class. ' +
        'Every drawer sets one, so the element matched is probably not an ngwr drawer panel.'
    );
  }

  /**
   * Whether the drawer presents as a SHEET rather than a side panel — the top and
   * bottom edges, where it spans the full viewport width and takes its size from
   * `height` / `maxHeight`.
   *
   * This answers the axis only. The bottom-sheet look is that plus `rounded` and
   * `showHandle`, which {@link isRounded} and {@link hasHandle} answer separately.
   */
  async isSheet(): Promise<boolean> {
    const position = await this.getPosition();
    return position === 'top' || position === 'bottom';
  }

  /** Whether the leading corners are rounded (`rounded`). */
  async isRounded(): Promise<boolean> {
    return (await this.panel()).hasClass('wr-drawer__panel--rounded');
  }

  /** Whether the trailing edge is padded for the device's safe area (`safeArea`). */
  async hasSafeArea(): Promise<boolean> {
    return (await this.panel()).hasClass('wr-drawer__panel--safe-area');
  }

  /**
   * Whether the drawer draws a grab handle (`showHandle`), which is also what
   * enables swipe-to-dismiss.
   *
   * Always `false` for a `WrDrawerManager.open()` drawer, and not a defect: the
   * handle lives in the component's own wrapper markup, which the service path
   * replaces with the caller's component.
   */
  async hasHandle(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-drawer__handle')()) !== null;
  }

  /**
   * The role the drawer announces.
   *
   * Worth asserting rather than assuming: both flavours write it onto the OVERLAY
   * element, not onto the markup the consumer wrote, so a spec looking for it on
   * its own host would not find it.
   */
  async getRole(): Promise<string | null> {
    return (await this.host()).getAttribute('role');
  }

  /** Whether the drawer is marked `aria-modal` — the promise the backdrop and focus trap make. */
  async isModal(): Promise<boolean> {
    return (await (await this.host()).getAttribute('aria-modal')) === 'true';
  }

  /**
   * Whether the panel takes its accessible name from the drawer's own title.
   *
   * Both flavours point `aria-labelledby` at `[wrDrawerTitle]`'s generated id, but
   * only once the content is in the DOM — deferred either way — so a spec has to
   * let the fixture settle (`await fixture.whenStable()`) before asking.
   */
  async isLabelledByTitle(): Promise<boolean> {
    const labelledBy = await (await this.host()).getAttribute('aria-labelledby');
    if (!labelledBy) return false;

    const title = await this.locatorForOptional('.wr-drawer__title')();
    return title !== null && (await title.getAttribute('id')) === labelledBy;
  }

  /** Whether the built-in dismiss (✕) button is present (`closable`, the default). */
  async isClosable(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-drawer__close')()) !== null;
  }

  /** The dismiss button's accessible name — the string a screen reader reads out. */
  async getCloseLabel(): Promise<string | null> {
    const close = await this.locatorForOptional('.wr-drawer__close')();
    return close ? close.getAttribute('aria-label') : null;
  }

  /**
   * Click the built-in dismiss button.
   *
   * Throws on a drawer opened `closable: false`. That is a deliberate shape — the
   * projected content owns the close affordance, typically a `[wrDrawerClose]`
   * button — and a quiet no-op here would read as "closed" three assertions later.
   */
  async close(): Promise<void> {
    const button = await this.locatorForOptional('.wr-drawer__close')();
    if (!button) {
      throw new Error(
        'WrDrawerHarness.close(): this drawer has no dismiss button — it was opened with `closable` off, ' +
          'so its own content owns the close affordance. Click that instead, e.g. through a nested harness.'
      );
    }
    await button.click();
  }

  /**
   * Press Escape. A drawer opened `closeOnEscape: false` ignores it — assert, do
   * not assume.
   *
   * The key reaches a drawer through the CDK's keyboard dispatcher, which hands it
   * to the TOP-MOST listening overlay, so with drawers stacked this dismisses the
   * top one whichever harness it is called on.
   */
  async sendEscape(): Promise<void> {
    await (await this.host()).sendKeys(TestKey.ESCAPE);
  }

  /** Whether the drawer dims the page behind it (`hasBackdrop`, the default). */
  async hasBackdrop(): Promise<boolean> {
    return (await this.backdrop()) !== null;
  }

  /**
   * Click the backdrop — the third way a drawer is dismissed, next to the dismiss
   * button and Escape, and the one a `closeOnBackdropClick: false` drawer is meant
   * to survive.
   */
  async clickBackdrop(): Promise<void> {
    const backdrop = await this.backdrop();
    if (!backdrop) {
      throw new Error(
        'WrDrawerHarness.clickBackdrop(): this drawer has no backdrop of its own — it was opened with ' +
          '`hasBackdrop` off, so there is nothing to click.'
      );
    }
    await backdrop.click();
  }

  /** Whether focus is currently inside the drawer, where the trap should hold it. */
  async isFocusTrapped(): Promise<boolean> {
    return (await this.host()).matchesSelector(':focus-within');
  }

  /**
   * The element carrying the `.wr-drawer__panel` classes.
   *
   * `WrDrawerManager` flattens the panel onto the overlay pane itself, while
   * `<wr-drawer>` renders it as a div inside the pane — same classes, one level
   * apart, so the modifiers have to be read from whichever element has them.
   */
  private async panel(): Promise<TestElement> {
    const host = await this.host();
    return (await host.hasClass('wr-drawer__panel')) ? host : this.locatorFor('.wr-drawer__panel')();
  }

  /**
   * THIS drawer's backdrop, or `null` when it has none.
   *
   * Scoped by the overlay pane's own id, not by a bare `.wr-drawer-backdrop` query:
   * the container is shared, so a class query answers with whichever drawer opened
   * first — and two drawers open at once can disagree about `hasBackdrop`.
   *
   * Two queries, because the CDK puts the backdrop in one of two places. With the
   * popover API — its default wherever `showPopover` exists, so in every real
   * browser — the backdrop is PREPENDED INSIDE the host, next to the pane, which is
   * what the first query's `+` pins down. Without it (jsdom, or `usePopover: false`)
   * it goes immediately BEFORE the host wrapper that holds the pane, which is what
   * the second query matches — so under vitest the second one does the work and the
   * first is the production path.
   */
  private async backdrop(): Promise<TestElement | null> {
    const id = await (await this.host()).getAttribute('id');
    if (!id) return null;

    const own = `[id="${id}"]`;
    return this.documentRootLocatorFactory().locatorForOptional(
      `.wr-drawer-backdrop:has(+ ${own})`,
      `.wr-drawer-backdrop:has(+ * > ${own})`
    )();
  }
}
