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
  TestKey,
  type TestElement,
} from '@angular/cdk/testing';

import type { WrPopoverPosition } from 'ngwr/popover';

import type { WrPopoverHarnessFilters } from './interfaces';

/** How long the waiters poll before giving up, in ms. Generous next to the 120ms default delays. */
const DEFAULT_TIMEOUT = 1000;

/** How often they re-check, in ms. */
const POLL_STEP = 10;

/**
 * The real `setTimeout`, captured at module load — before a spec can install
 * fake timers.
 *
 * The waiters have to let REAL time pass: the show / hide delays are plain
 * `setTimeout`s inside the directive, and under zoneless change detection
 * `whenStable()` resolves without waiting for a macrotask. Reading the faked
 * global instead would mean the sleep never fires at all, and the harness would
 * hang where it should fail with the message it prepared.
 */
const realSetTimeout = globalThis.setTimeout;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    realSetTimeout(resolve, ms);
  });
}

/**
 * Test harness for `[wrPopover]` — both shapes the one directive ships:
 *
 * - **popover** — template content, opens on click (or hover), announces
 *   `role="dialog"` and is what the trigger's `aria-expanded` describes;
 * - **tooltip** — string content, opens on hover AND focus after a delay,
 *   announces `role="tooltip"` and DESCRIBES its trigger instead of being
 *   owned by it.
 *
 * The panel is never inside the trigger: it is a portal in the overlay
 * container, a sibling of the whole app. It is reached through the document
 * root, scoped by the id the trigger publishes while the panel is showing —
 * `aria-controls` in popover mode, `aria-describedby` in tooltip mode. That id
 * is what lets two popovers be open at once without reading each other's
 * content, and it is why every panel reader throws while the panel is shut:
 * there is no element to answer about.
 *
 * Being a CONTENT CONTAINER is the point in popover mode — the panel holds the
 * consumer's own components, so `popover.getHarness(WrButtonHarness…)` reaches
 * them without the spec ever touching the overlay.
 *
 * **Timing.** A tooltip opens on `showDelay` and hides on `hideDelay`; a hover
 * popover hides 120ms after the pointer leaves. `open()`, `close()` and the two
 * waiters sit out that REAL time, so a spec that installs fake timers should
 * drive the clock itself and read `isOpen()` rather than call them.
 *
 * @example
 * ```ts
 * const loader = TestbedHarnessEnvironment.loader(fixture);
 * const details = await loader.getHarness(WrPopoverHarness.with({ triggerText: 'Details' }));
 *
 * await details.open();
 * expect(await details.getRole()).toBe('dialog');
 * await (await details.getHarness(WrButtonHarness.with({ text: 'Confirm' }))).click();
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrPopoverHarness extends ContentContainerComponentHarness {
  /**
   * The directive's host — whatever element the consumer put `[wrPopover]` on.
   *
   * Matched by the marker class, not by `[wrPopover]`: popover-mode content is a
   * `TemplateRef` and so is always BOUND (`[wrPopover]="tpl"`), which leaves no
   * attribute in the DOM at all, and a CLOSED tooltip publishes no ARIA either.
   * (A tooltip written with the static string form, `wrPopover="Save changes"`,
   * does keep the attribute — but only that one shape would be findable by it.)
   * Same shape as `.wr-dropdown-trigger`.
   */
  static hostSelector = '.wr-popover-trigger';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrPopoverHarnessFilters = {}): HarnessPredicate<WrPopoverHarness> {
    return new HarnessPredicate(WrPopoverHarness, options)
      .addOption('triggerText', options.triggerText, (harness, text) =>
        HarnessPredicate.stringMatches(harness.getTriggerText(), text)
      )
      .addOption('mode', options.mode, async (harness, mode) => (await harness.getMode()) === mode)
      .addOption('open', options.open, async (harness, open) => (await harness.isOpen()) === open);
  }

  /**
   * Which shape this trigger carries.
   *
   * Read from the ARIA contract, not from the `mode` input: a bound `[mode]`
   * never reaches the DOM, while `aria-haspopup="dialog"` is on every popover
   * trigger and on no tooltip trigger — a tooltip is a description of the
   * control, not a popup it owns.
   */
  async getMode(): Promise<'popover' | 'tooltip'> {
    return (await (await this.host()).getAttribute('aria-haspopup')) === 'dialog' ? 'popover' : 'tooltip';
  }

  /** The trigger's own visible text. The panel's content is `getContentText()`. */
  async getTriggerText(): Promise<string> {
    return (await this.host()).text();
  }

  /**
   * Whether the panel is showing.
   *
   * Two different signals because the two modes advertise different things: a
   * popover flips `aria-expanded` on its trigger, a tooltip has none at all and
   * links its description instead. So a tooltip's answer is only as good as the
   * directive's claim on `aria-describedby` — put the tooltip on a control that
   * is ALSO described by something else (a `<wr-form-field>` hint, say) and the
   * two bindings fight over one attribute.
   */
  async isOpen(): Promise<boolean> {
    const host = await this.host();
    return (await this.getMode()) === 'popover'
      ? (await host.getAttribute('aria-expanded')) === 'true'
      : (await host.getAttribute('aria-describedby')) !== null;
  }

  /**
   * Open the panel with the gesture this trigger actually answers to, and wait
   * until it is showing.
   *
   * `trigger` is an input, so the DOM does not say which gesture this popover
   * wants — the harness moves the pointer on first and falls back to a click.
   * Hover leads because a click is an outside pointer event for every OTHER open
   * panel, so leading with it would dismiss someone else's popover on the way to
   * opening this one; a click-driven popover ignores the hover outright. A
   * tooltip is never clicked at all — hover and focus are its only gestures.
   *
   * Throws when nothing appears: a tooltip with an empty string never opens, and
   * a spec on fake timers has to advance the clock itself.
   */
  async open(timeout = DEFAULT_TIMEOUT): Promise<void> {
    if (await this.isOpen()) return;

    const host = await this.host();
    await host.hover();
    if ((await this.getMode()) === 'tooltip') return this.waitUntilOpen(timeout);

    if (await this.isOpen()) return;
    await host.click();
    return this.waitUntilOpen(timeout);
  }

  /**
   * Dismiss the panel and wait until it is gone.
   *
   * Escape, because it is the one gesture both modes honour immediately: a
   * popover is closed by the overlay's keyboard dispatcher, a tooltip by the
   * directive's own binding — no delay in either. To exercise the delayed
   * pointer path instead, call `mouseAway()` and then `waitUntilClosed()`.
   */
  async close(timeout = DEFAULT_TIMEOUT): Promise<void> {
    if (!(await this.isOpen())) return;

    await this.sendEscape();
    return this.waitUntilClosed(timeout);
  }

  /** Click the trigger. Opens a click-driven popover, toggles it shut again, and does nothing else. */
  async click(): Promise<void> {
    return (await this.host()).click();
  }

  /** Move the pointer onto the trigger — opens a hover popover at once, a tooltip after `showDelay`. */
  async hover(): Promise<void> {
    return (await this.host()).hover();
  }

  /** Move the pointer off the trigger. The panel goes after the grace period, not instantly. */
  async mouseAway(): Promise<void> {
    return (await this.host()).mouseAway();
  }

  /** Focus the trigger — a tooltip's other opening gesture, so keyboard users get the hint too. */
  async focus(): Promise<void> {
    return (await this.host()).focus();
  }

  /** Blur the trigger, which hides a tooltip after `hideDelay`. */
  async blur(): Promise<void> {
    return (await this.host()).blur();
  }

  /** Press Escape on the trigger. Both modes dismiss on it, and neither moves focus. */
  async sendEscape(): Promise<void> {
    return (await this.host()).sendKeys(TestKey.ESCAPE);
  }

  /** Wait out a pending show. Resolves at once when the panel is already up. */
  async waitUntilOpen(timeout = DEFAULT_TIMEOUT): Promise<void> {
    if (await this.settled(true, timeout)) return;

    throw new Error(
      `WrPopoverHarness.waitUntilOpen(): nothing opened within ${timeout}ms. A tooltip waits out its ` +
        'showDelay (and never opens at all for an empty string); this wait uses real time, so a spec on ' +
        'fake timers has to advance the clock itself and read isOpen().'
    );
  }

  /** Wait out a pending hide. Resolves at once when the panel is already gone. */
  async waitUntilClosed(timeout = DEFAULT_TIMEOUT): Promise<void> {
    if (await this.settled(false, timeout)) return;

    throw new Error(
      `WrPopoverHarness.waitUntilClosed(): still showing after ${timeout}ms. A hover popover closes 120ms ` +
        'after the pointer leaves — and only if it left at all, since a mouseleave INTO that panel is ' +
        'deliberately not a leave. A tooltip closes on its hideDelay after mouseleave or blur.'
    );
  }

  /**
   * The panel's text.
   *
   * In tooltip mode that is the string itself, rendered into the small text
   * panel; in popover mode it is everything the projected template renders.
   */
  async getContentText(): Promise<string> {
    return (await this.panel()).text();
  }

  /**
   * The role the open panel announces: `'dialog'` for a popover, `'tooltip'` for
   * a tooltip.
   *
   * Worth asserting rather than assuming, twice over: the directive sets it on
   * the OVERLAY PANE, not on the content a consumer wrote, and in tooltip mode
   * the pane is deliberately the only element carrying it — the text panel
   * inside has none, or the description would nest a tooltip in a tooltip.
   */
  async getRole(): Promise<string | null> {
    return (await this.panel()).getAttribute('role');
  }

  /**
   * The panel's accessible name — `null` in tooltip mode.
   *
   * A popover is a named `role="dialog"`: the `ariaLabel` input, or the i18n
   * catalog's `popover.label` when the consumer says nothing, because an unnamed
   * dialog announces as "dialog" and nothing else. A tooltip has no name of its
   * own; it IS the trigger's description, which is `getDescriptionText()`.
   */
  async getLabel(): Promise<string | null> {
    return (await this.panel()).getAttribute('aria-label');
  }

  /**
   * Whether the panel claims modality.
   *
   * `false`, deliberately, and worth pinning: the popover sets
   * `aria-modal="false"` because focus is NOT trapped and the panel dismisses on
   * outside click / Escape rather than blocking the page.
   */
  async isModal(): Promise<boolean> {
    return (await (await this.panel()).getAttribute('aria-modal')) === 'true';
  }

  /**
   * Where the panel sits relative to the trigger, or `null` when it is presented
   * as a sheet and has no anchor.
   *
   * The APPLIED position, not the requested one: CDK flips a placement that does
   * not fit to the next in its fallback chain and swaps the modifier class with
   * it. Under a unit test that is always the requested placement — jsdom measures
   * every box as 0×0, so the first candidate always "fits" — but in a browser the
   * two can differ, and this answers what is on screen. The directive defaults
   * the request per mode (`bottom` for a popover, `top` for a tooltip).
   *
   * The arrow itself is a `::after` pseudo-element, so it exists for no DOM query
   * at all; this class is the placement, and it is what the arrow's own CSS keys
   * off.
   */
  async getPosition(): Promise<WrPopoverPosition | null> {
    const classes = (await (await this.panel()).getAttribute('class')) ?? '';
    const modifier = /wr-(?:popover|tooltip)-overlay--([a-z-]+)/.exec(classes);
    return modifier ? (modifier[1] as WrPopoverPosition) : null;
  }

  /** Whether the popover is presented as a full-width bottom sheet instead of an anchored panel. */
  async isSheet(): Promise<boolean> {
    return (await this.panel()).hasClass('wr-overlay-sheet');
  }

  /**
   * The text a screen reader reads as the TRIGGER'S DESCRIPTION, or `null` when
   * it describes nothing.
   *
   * This resolves `aria-describedby` the way an assistive technology would, so
   * it answers the whole of tooltip mode's naming contract in one call. Always
   * `null` for a popover, open or shut — a popover is a thing the trigger owns
   * (`aria-haspopup` / `aria-expanded`), never a description of it.
   */
  async getDescriptionText(): Promise<string | null> {
    const id = await (await this.host()).getAttribute('aria-describedby');
    if (!id) return null;

    const described = await this.documentRootLocatorFactory().locatorForOptional(`#${id}`)();
    return described ? described.text() : null;
  }

  /**
   * Harnesses for the consumer's own components are resolved inside THIS
   * instance's panel.
   *
   * Scoped by the published id rather than by `.wr-popover-overlay`: the overlay
   * container is shared, so a class query would answer with whichever popover
   * opened first.
   */
  protected override async getRootHarnessLoader(): Promise<HarnessLoader> {
    return this.documentRootLocatorFactory().harnessLoaderFor(`#${await this.panelId()}`);
  }

  /** Poll until `isOpen()` reports `open`, and say whether it did. */
  private async settled(open: boolean, timeout: number): Promise<boolean> {
    for (let waited = 0; waited <= timeout; waited += POLL_STEP) {
      if ((await this.isOpen()) === open) return true;

      await sleep(POLL_STEP);
      await this.forceStabilize();
    }
    return false;
  }

  /** This instance's overlay pane. */
  private async panel(): Promise<TestElement> {
    return this.documentRootLocatorFactory().locatorFor(`#${await this.panelId()}`)();
  }

  /** The id the trigger publishes for its panel, which only exists while the panel does. */
  private async panelId(): Promise<string> {
    const attribute = (await this.getMode()) === 'popover' ? 'aria-controls' : 'aria-describedby';
    const id = await (await this.host()).getAttribute(attribute);

    if (!id) {
      throw new Error(
        `WrPopoverHarness: nothing is showing. The trigger publishes its panel id as ${attribute} only ` +
          'while the panel is open — call open() first (a tooltip also has to wait out its showDelay).'
      );
    }
    return id;
  }
}
