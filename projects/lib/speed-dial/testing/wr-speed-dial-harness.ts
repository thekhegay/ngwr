/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, TestKey } from '@angular/cdk/testing';

import type { WrSpeedDialDirection } from 'ngwr/speed-dial';

import type { WrSpeedDialActionHarnessFilters, WrSpeedDialHarnessFilters } from './interfaces';
import { WrSpeedDialActionHarness } from './wr-speed-dial-action-harness';

const DIRECTIONS: readonly WrSpeedDialDirection[] = ['up', 'down', 'left', 'right'];

/**
 * Test harness for `<wr-speed-dial>` — the floating trigger and the actions that fan
 * out of it.
 *
 * **The actions never leave the DOM.** They are hidden with `visibility`, which is
 * what actually takes them out of the tab order and the accessibility tree —
 * `opacity: 0` alone would leave them focusable — and CSS is exactly what a unit
 * test does not have. So a closed dial's buttons are queryable, clickable and
 * readable from a spec while being unreachable in a browser. {@link getActions} and
 * {@link pick} therefore REFUSE while the dial is closed rather than answering with
 * elements nobody can see; open it first, which is what a user has to do too.
 *
 * @example
 * ```ts
 * const dial = await loader.getHarness(WrSpeedDialHarness);
 *
 * await dial.open();
 * expect(await dial.getActionLabels()).toEqual(['Share', 'Copy link']);
 *
 * await dial.pick({ label: 'Share' });
 * expect(await dial.isOpen()).toBe(false);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrSpeedDialHarness extends ComponentHarness {
  static hostSelector = 'wr-speed-dial';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrSpeedDialHarnessFilters = {}): HarnessPredicate<WrSpeedDialHarness> {
    return new HarnessPredicate(WrSpeedDialHarness, options)
      .addOption('triggerLabel', options.triggerLabel, (harness, label) =>
        HarnessPredicate.stringMatches(harness.getTriggerLabel(), label)
      )
      .addOption(
        'direction',
        options.direction,
        async (harness, direction) => (await harness.getDirection()) === direction
      )
      .addOption('open', options.open, async (harness, open) => (await harness.isOpen()) === open)
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled);
  }

  private readonly trigger = this.locatorFor('.wr-speed-dial__trigger');
  private readonly menu = this.locatorFor('.wr-speed-dial__actions');

  /** Whether the dial is fanned out, from the trigger's `aria-expanded`. */
  async isOpen(): Promise<boolean> {
    return (await (await this.trigger()).getAttribute('aria-expanded')) === 'true';
  }

  /** The direction the actions travel, from the host modifier. */
  async getDirection(): Promise<WrSpeedDialDirection> {
    const host = await this.host();
    for (const direction of DIRECTIONS) {
      if (await host.hasClass(`wr-speed-dial--${direction}`)) return direction;
    }
    throw new Error(
      'WrSpeedDialHarness.getDirection(): this host carries no `wr-speed-dial--<direction>` class, which ' +
        'every dial sets — the element matched is probably not an ngwr speed dial.'
    );
  }

  /**
   * The trigger's accessible name.
   *
   * The trigger is icon-only, so this is its ONLY name — there is no text to fall
   * back on, and a dial that loses it is announced as an unnamed button.
   */
  async getTriggerLabel(): Promise<string | null> {
    return (await this.trigger()).getAttribute('aria-label');
  }

  /** The trigger icon's registered name, from `wr-icon`'s reflected `data-icon`. */
  async getTriggerIcon(): Promise<string | null> {
    const icon = await this.locatorForOptional('.wr-speed-dial__trigger wr-icon')();
    return icon ? icon.getAttribute('data-icon') : null;
  }

  /** Whether the dial refuses interaction, from the trigger's own `disabled` property. */
  async isDisabled(): Promise<boolean> {
    return (await this.trigger()).getProperty<boolean>('disabled');
  }

  /** Whether the host is padded for the device's safe area (`safeArea`). */
  async hasSafeArea(): Promise<boolean> {
    return (await this.host()).hasClass('wr-speed-dial--safe-area');
  }

  /**
   * The role the action list announces — `list`.
   *
   * Worth asking despite being a plain `<ul>`: the list is styled `list-style: none`,
   * which drops the implicit list semantics in Safari, so the role is written out. It
   * is deliberately NOT `menu` — that role promises arrows, Home/End and a single tab
   * stop, none of which this component has.
   */
  async getMenuRole(): Promise<string | null> {
    return (await this.menu()).getAttribute('role');
  }

  /**
   * Whether the trigger's `aria-controls` names THIS dial's action list, and nothing
   * else on the page.
   *
   * Both halves matter. The id is resolved inside the host first, so a trigger
   * pointing at a SIBLING dial's list — which resolves perfectly well from the
   * document — fails here. Then it is counted across the document, because two lists
   * answering to one id hand every reference to whichever comes first.
   */
  async isMenuBound(): Promise<boolean> {
    const id = await (await this.trigger()).getAttribute('aria-controls');
    if (!id) return false;

    const own = await this.locatorForOptional(`.wr-speed-dial__actions#${id}`)();
    if (!own) return false;

    const everywhere = await this.documentRootLocatorFactory().locatorForAll(`#${id}`)();
    return everywhere.length === 1;
  }

  /**
   * The actions, in DOM order.
   *
   * Throws while the dial is closed. The buttons are still in the DOM then — they
   * have to be, for the fan-out to animate — and jsdom applies no `visibility`, so
   * they would come back looking perfectly reachable when a real user cannot tab to
   * one. A spec that read them closed would pass on a dial that never opens.
   */
  async getActions(filters: WrSpeedDialActionHarnessFilters = {}): Promise<WrSpeedDialActionHarness[]> {
    await this.requireOpen('getActions');
    return this.locatorForAll(WrSpeedDialActionHarness.with(filters))();
  }

  /** The accessible names of the actions, in DOM order. Throws while closed. */
  async getActionLabels(): Promise<(string | null)[]> {
    const actions = await this.getActions();
    return Promise.all(actions.map(action => action.getLabel()));
  }

  /** How many actions the dial holds — readable while closed, since it is not a reach. */
  async getActionCount(): Promise<number> {
    return (await this.locatorForAll('.wr-speed-dial__action')()).length;
  }

  /** Open the dial. An already-open one is left alone; a disabled one throws. */
  async open(): Promise<void> {
    if (await this.isOpen()) return;
    await this.toggle();

    if (!(await this.isOpen())) {
      throw new Error(
        'WrSpeedDialHarness.open(): the dial did not open. A disabled trigger refuses the click twice over — ' +
          'the DOM swallows it, and the component checks `disabled` again.'
      );
    }
  }

  /** Close the dial. An already-closed one is left alone. */
  async close(): Promise<void> {
    if (!(await this.isOpen())) return;
    await this.toggle();
  }

  /** Click the trigger once, whichever way that takes it. */
  async toggle(): Promise<void> {
    return (await this.trigger()).click();
  }

  /**
   * Pick the first action matching the filters — emitting `pick` and closing the dial.
   *
   * Opens first if it has to, the way `WrDropdownHarness.clickItem` does: a spec that
   * says "pick Share" means the whole gesture. Throws when nothing matches, naming
   * what the dial does offer.
   */
  async pick(filters: WrSpeedDialActionHarnessFilters): Promise<void> {
    await this.open();

    const [action] = await this.getActions(filters);
    if (!action) {
      const offered = await this.getActionLabels();
      throw new Error(
        `WrSpeedDialHarness.pick(): no action matched ${JSON.stringify(filters)}. ` +
          `The dial offers: ${offered.join(', ')}.`
      );
    }
    await action.click();
  }

  /**
   * Press Escape — closing the dial and putting focus back on the trigger.
   *
   * Sent to the host, which is where the component listens. The focus return is the
   * half worth asserting: the actions are ordinary tab stops, so without it a keyboard
   * user has to walk through every action to leave.
   */
  async sendEscape(): Promise<void> {
    await (await this.host()).sendKeys(TestKey.ESCAPE);
  }

  /** Move keyboard focus to the trigger. */
  async focusTrigger(): Promise<void> {
    return (await this.trigger()).focus();
  }

  /** Whether the trigger currently holds focus. */
  async isTriggerFocused(): Promise<boolean> {
    return (await this.trigger()).isFocused();
  }

  private async requireOpen(method: string): Promise<void> {
    if (await this.isOpen()) return;
    throw new Error(
      `WrSpeedDialHarness.${method}(): the dial is closed. Its actions stay in the DOM while collapsed — the ` +
        'fan-out animates them — and only `visibility` hides them, which a unit test does not apply. Reading ' +
        'them now would assert buttons nobody can reach. Call open() first, or getActionCount().'
    );
  }
}
