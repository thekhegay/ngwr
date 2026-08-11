/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrStepHarnessFilters } from './interfaces';
import { wrStepperHarnessText } from './wr-stepper-harness-text';

/**
 * Test harness for one step of a `<wr-stepper>` — the step as the HEADER STRIP
 * publishes it: its label, its state, and the one control that navigates to it.
 *
 * A step is two pieces of DOM in two different places. The `<wr-step>` the consumer
 * wrote is projected into the stepper's body region; the header this harness hosts on
 * is generated next to it, in the `<ol>` above. Nothing links the two — no
 * `aria-controls`, no id on the body — so `WrStepperHarness.getActiveStepText()` is
 * where the body is read, and this answers what the wizard says about the step.
 *
 * Two states that look alike here are deliberately separate, because the component
 * treats them separately: {@link isDisabled} is the step's own `disabled` input
 * (switched off, whatever else happens), and {@link isReachable} is whether a click
 * would land right now — which a `linear` stepper takes away from every step ahead of
 * the gate without disabling any of them.
 *
 * @example
 * ```ts
 * const [review] = await stepper.getSteps({ label: 'Review' });
 *
 * expect(await review.isOptional()).toBe(true);
 * expect(await review.isReachable()).toBe(false);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrStepHarness extends ComponentHarness {
  /**
   * The header `<li>`, which is the whole step as far as the strip is concerned.
   *
   * Not `.wr-stepper__header-button`: the state modifiers (`--active`, `--completed`,
   * `--disabled`) land on the `<li>`, and the button is a child of it.
   */
  static hostSelector = '.wr-stepper__header';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrStepHarnessFilters = {}): HarnessPredicate<WrStepHarness> {
    return new HarnessPredicate(WrStepHarness, options)
      .addOption('label', options.label, (harness, label) => HarnessPredicate.stringMatches(harness.getLabel(), label))
      .addOption('active', options.active, async (harness, active) => (await harness.isActive()) === active)
      .addOption(
        'completed',
        options.completed,
        async (harness, completed) => (await harness.isCompleted()) === completed
      )
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled)
      .addOption(
        'reachable',
        options.reachable,
        async (harness, reachable) => (await harness.isReachable()) === reachable
      )
      .addOption('optional', options.optional, async (harness, optional) => (await harness.isOptional()) === optional);
  }

  private readonly button = this.locatorFor('button.wr-stepper__header-button');

  /**
   * The step's label, and only the label.
   *
   * The "optional" badge and the description are siblings of the label text inside
   * the same span, so both are excluded — a step addressed by label should be
   * addressable whether or not it also carries a description.
   */
  async getLabel(): Promise<string> {
    const label = await this.locatorFor('.wr-stepper__label')();
    return wrStepperHarnessText(await label.text({ exclude: '.wr-stepper__optional, .wr-stepper__description' }));
  }

  /** The secondary line under the label, or `null` when the step defines none. */
  async getDescription(): Promise<string | null> {
    const description = await this.locatorForOptional('.wr-stepper__description')();
    return description ? wrStepperHarnessText(await description.text()) : null;
  }

  /** Whether the header flags the step as optional. */
  async isOptional(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-stepper__optional')()) !== null;
  }

  /**
   * What a screen reader announces for the header button.
   *
   * The indicator is excluded because it is `aria-hidden`: the step number and the
   * completed tick are decoration, deliberately, since the label and
   * `aria-current="step"` already carry what they would repeat. What IS announced is
   * the label plus the "optional" badge and the description — so this is the method
   * that notices when one of those stops being part of the name.
   */
  async getAccessibleName(): Promise<string> {
    const button = await this.button();
    return wrStepperHarnessText(await button.text({ exclude: '.wr-stepper__indicator' }));
  }

  /**
   * Whether this is the step the wizard is showing.
   *
   * From `aria-current="step"` rather than the `--active` class, because that is the
   * only place the wizard's position is published to a screen reader, and the two can
   * only ever disagree by way of a bug.
   */
  async isActive(): Promise<boolean> {
    return (await (await this.button()).getAttribute('aria-current')) === 'step';
  }

  /**
   * Whether the step is shown as done.
   *
   * Read from the `--completed` class, and there is no ARIA alternative to prefer:
   * completion reaches the page as that class plus a tick glyph that is
   * `aria-hidden`, so a screen-reader user hears the label and nothing else. The
   * class is the whole of what exists.
   *
   * Completion is derived from the active index — every step before it — unless a
   * step's own `completed` input overrides it, which is how a `linear` wizard opens
   * its gate. So a step after the active one can be completed too.
   */
  async isCompleted(): Promise<boolean> {
    return (await this.host()).hasClass('wr-stepper__header--completed');
  }

  /**
   * Whether the step is switched off by its own `disabled` input.
   *
   * The `--disabled` class is exactly that input, which is why it is read here rather
   * than the button's `disabled`: the button is also disabled for a step that is
   * merely behind a `linear` gate, and those are different facts about the wizard.
   * See {@link isReachable} for the one about right now.
   */
  async isDisabled(): Promise<boolean> {
    return (await this.host()).hasClass('wr-stepper__header--disabled');
  }

  /**
   * Whether a click on this header would move the wizard here.
   *
   * Read from the button's `disabled` PROPERTY, because that is the enforcement and
   * not the paint: the component disables the header for a step its own input
   * switched off AND for one a `linear` gate has not opened yet. It is also what puts
   * the header in or out of the tab order — a `disabled` button cannot be focused at
   * all, so an unreachable step is off the keyboard entirely rather than focusable and
   * inert the way `aria-disabled` would leave it.
   */
  async isReachable(): Promise<boolean> {
    return !(await (await this.button()).getProperty<boolean>('disabled'));
  }

  /**
   * Navigate to this step by clicking its header, the way a user does.
   *
   * A click, not a keypress: the header is a real `<button>`, so Enter and Space
   * activate it through the browser's native activation — behaviour jsdom does not
   * implement, leaving nothing for a key to drive. A no-arg CDK click needs no
   * coordinate and no hit test, so the absent layout costs nothing here.
   *
   * Throws when the header refuses, rather than clicking and resolving quietly: the
   * component's guard would drop the click and the wizard would still be showing the
   * old step three assertions later. Reach for `WrStepperHarness.goTo()` when you
   * want the failure to name WHICH earlier step is holding the gate shut.
   */
  async select(): Promise<void> {
    if (!(await this.isReachable())) {
      throw new Error(
        `WrStepHarness.select(): the header for "${await this.getLabel()}" refuses a click — the step carries ` +
          '`disabled`, or the stepper is `linear` and an earlier step has not reported itself complete.'
      );
    }
    await (await this.button()).click();
  }

  /** Move keyboard focus to the header. A header that is not reachable cannot take it. */
  async focus(): Promise<void> {
    return (await this.button()).focus();
  }

  /** Whether the header currently has focus. */
  async isFocused(): Promise<boolean> {
    return (await this.button()).isFocused();
  }
}
