/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrCollapseHarnessFilters } from './interfaces';

/**
 * Test harness for one `<wr-collapse>` — a disclosure: a header button, and the region
 * it opens. {@link WrCollapseGroupHarness} is the container several of them sit in.
 *
 * Open and closed are read from the header's `aria-expanded`, never from the panel's
 * size, and that is not merely a jsdom workaround. The body animates through
 * `grid-template-rows: 0fr → 1fr`, so a measured box answers with whatever frame the
 * transition happens to be on; a unit test has no layout at all, which makes every box
 * 0×0 and every such answer wrong in the same direction. The attribute is also the only
 * thing a screen-reader user gets — a panel that slides open without flipping it is
 * closed as far as they are concerned.
 *
 * The body stays in the DOM while the panel is closed. It has to: there would be no
 * height to animate otherwise. So its text is READABLE from a spec long before it is
 * visible on screen, which is why {@link getContentText} refuses to answer for a closed
 * panel instead of handing back invisible text, and why {@link isContentHidden} exists
 * to assert that a closed panel really is out of reach.
 *
 * The region itself is a plain `<div>` — the component gives it no `role="region"` — so
 * `aria-expanded` plus `aria-controls` is the whole of the wiring, and
 * {@link isRegionBound} is how a spec checks it still points at this panel's own body.
 *
 * @example
 * ```ts
 * const loader = TestbedHarnessEnvironment.loader(fixture);
 * const shipping = await loader.getHarness(WrCollapseHarness.with({ title: 'Shipping' }));
 *
 * await shipping.open();
 * expect(await shipping.getContentText()).toContain('Ships Monday');
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrCollapseHarness extends ComponentHarness {
  static hostSelector = 'wr-collapse';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrCollapseHarnessFilters = {}): HarnessPredicate<WrCollapseHarness> {
    return new HarnessPredicate(WrCollapseHarness, options)
      .addOption('title', options.title, (harness, title) => HarnessPredicate.stringMatches(harness.getTitle(), title))
      .addOption('open', options.open, async (harness, open) => (await harness.isOpen()) === open)
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled);
  }

  private readonly header = this.locatorFor('button.wr-collapse__header');
  private readonly body = this.locatorFor('.wr-collapse__body');

  /**
   * The header text, trimmed.
   *
   * Read from `.wr-collapse__title` rather than from the header button. Reading the
   * button would return the same string today — the chevron beside the title is an
   * `<svg>`, and an `<svg>` contributes no text — but the title element is the thing that
   * holds the name, so an icon that ever grows a `<text>` node or a label, or a badge
   * added next to the title, cannot leak into it.
   */
  async getTitle(): Promise<string> {
    return (await this.locatorFor('.wr-collapse__title')()).text();
  }

  /**
   * Whether the panel is open, from the header's `aria-expanded`.
   *
   * The `wr-collapse--open` modifier on the host is equally public and says the same
   * thing today, but the attribute is the one a screen reader acts on: a panel that
   * looks open while announcing `false` is the bug worth catching, and reading the class
   * would agree with the animation and miss it.
   */
  async isOpen(): Promise<boolean> {
    return (await (await this.header()).getAttribute('aria-expanded')) === 'true';
  }

  /**
   * Whether the panel refuses interaction.
   *
   * From the header's own `disabled` property — the thing that actually turns a click
   * away, and what the CDK consults before dispatching one — rather than from the
   * `wr-collapse--disabled` modifier the host also carries. Both are public, but the
   * class is styling: a panel could lose it and still refuse every click, and what a
   * spec wants to know is whether the control is inert.
   */
  async isDisabled(): Promise<boolean> {
    return (await this.header()).getProperty<boolean>('disabled');
  }

  /**
   * The id the header's `aria-controls` names, or `null` when it names nothing.
   *
   * Per-instance and generated, so a spec cannot predict it — what it can do is check
   * that two panels do not share one, and {@link isRegionBound} does the rest.
   */
  async getRegionId(): Promise<string | null> {
    return (await this.header()).getAttribute('aria-controls');
  }

  /**
   * Whether the header points at THIS panel's body, and at nothing else on the page.
   *
   * Both halves matter, and neither is provable from the header alone. The id is
   * resolved inside the host first, so a header naming a SIBLING panel's body — which
   * resolves perfectly well from the document and would look correctly wired — fails
   * here. Then it is counted across the document, because two bodies answering to one
   * id hand every reference to whichever comes first, and the second panel's region
   * becomes unreachable to anything that follows the reference.
   */
  async isRegionBound(): Promise<boolean> {
    const id = await this.getRegionId();
    if (id === null) return false;

    const own = await this.locatorForOptional(`.wr-collapse__body#${id}`)();
    if (!own) return false;

    const everywhere = await this.documentRootLocatorFactory().locatorForAll(`#${id}`)();
    return everywhere.length === 1;
  }

  /**
   * Whether the region is hidden from assistive tech AND from the keyboard.
   *
   * Two attributes, because a closed panel needs both and they cover different people:
   * `aria-hidden` keeps the content out of the screen reader's document, `inert` keeps
   * Tab from landing on a link inside a panel nobody can see. The body is never removed
   * from the DOM — the height animation needs it — so these are the only thing standing
   * between a collapsed panel and a keyboard user, and losing either is invisible on
   * screen.
   *
   * They are asserted together on purpose: this answers "is the closed content actually
   * out of reach", and half of it is not.
   */
  async isContentHidden(): Promise<boolean> {
    const body = await this.body();
    const hiddenFromAt = (await body.getAttribute('aria-hidden')) === 'true';
    const inert = (await body.getAttribute('inert')) !== null;
    return hiddenFromAt && inert;
  }

  /**
   * The text of an OPEN panel's region, trimmed.
   *
   * Throws while the panel is closed rather than answering, because the body is still in
   * the DOM and the text would come back exactly as it does when open — a spec asserting
   * it would be pinning content the user cannot see, and would keep passing if the panel
   * stopped opening at all.
   */
  async getContentText(): Promise<string> {
    if (!(await this.isOpen())) {
      throw new Error(
        `WrCollapseHarness.getContentText(): "${await this.getTitle()}" is closed. Its content stays in the ` +
          'DOM while collapsed — the body has to be there for the height to animate — so reading it now would ' +
          'assert text nobody can see. Open the panel first, or ask isContentHidden().'
      );
    }
    return (await this.locatorFor('.wr-collapse__inner')()).text();
  }

  /** Open the panel. An already-open one is left alone; a disabled one throws. */
  async open(): Promise<void> {
    if (await this.isOpen()) return;
    await this.toggle();

    if (!(await this.isOpen())) {
      throw new Error(
        `WrCollapseHarness.open(): "${await this.getTitle()}" did not open. A disabled panel refuses its own ` +
          'header — the button carries `disabled`, and the component checks it again before toggling.'
      );
    }
  }

  /** Close the panel. An already-closed one is left alone; a disabled one throws. */
  async close(): Promise<void> {
    if (!(await this.isOpen())) return;
    await this.toggle();

    if (await this.isOpen()) {
      throw new Error(
        `WrCollapseHarness.close(): "${await this.getTitle()}" did not close. A disabled panel that was opened ` +
          'through `[open]` cannot be closed from the page at all: the toggle refuses while `disabled` is set, ' +
          'whichever direction the click would have gone.'
      );
    }
  }

  /**
   * Click the header — the panel's entire interactive surface.
   *
   * A click rather than Enter / Space, and nothing is lost by it: the header is a native
   * `<button>`, so a real keyboard activation is the BROWSER synthesising a click from
   * the key press, and jsdom synthesises none. The click is dispatched onto the header
   * itself, so it needs no coordinate and cannot miss in a test that has no layout.
   *
   * A disabled panel ignores this and stays as it was, twice over: the CDK withholds the
   * `click` from an element carrying `disabled`, and the component checks `disabled`
   * again inside its own toggle. Assert rather than assume, or reach for {@link open} /
   * {@link close}, which say so.
   */
  async toggle(): Promise<void> {
    return (await this.header()).click();
  }

  /**
   * Move keyboard focus to the header — the only focusable element the component itself
   * renders. Projected content can of course hold its own (which is why a closed panel is
   * `inert`), but that belongs to the consumer, not to this harness.
   */
  async focus(): Promise<void> {
    return (await this.header()).focus();
  }

  /** Whether the header currently holds focus. */
  async isFocused(): Promise<boolean> {
    return (await this.header()).isFocused();
  }
}
