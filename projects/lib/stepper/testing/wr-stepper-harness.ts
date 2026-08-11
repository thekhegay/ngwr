/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrStepHarnessFilters, WrStepperHarnessFilters } from './interfaces';
import { WrStepHarness } from './wr-step-harness';
import { wrStepperHarnessText } from './wr-stepper-harness-text';

/**
 * Test harness for `<wr-stepper>` — the root of a two-part family with
 * {@link WrStepHarness}, which is one step of it.
 *
 * Steps are addressed by their index or their LABEL, the two things a consumer can
 * see; there is no key or id on a `<wr-step>` to address it by.
 *
 * Navigation here always goes through the HEADER STRIP, because that is the only
 * control the component renders — a wizard's Next and Back buttons are the
 * consumer's own, and they call `WrStepper.next()` / `prev()`. That distinction is
 * not cosmetic: the imperative API does NOT consult `linear`, so it walks straight
 * past a gate that refuses the equivalent header click. {@link next} and
 * {@link goTo} therefore refuse exactly where a user would be refused, and a spec
 * covering the wizard's own buttons should drive those buttons (through their own
 * harness) instead of these.
 *
 * @example
 * ```ts
 * const wizard = await loader.getHarness(WrStepperHarness);
 *
 * expect(await wizard.getStepLabels()).toEqual(['Account', 'Address', 'Review']);
 * expect(await wizard.canGoTo(2)).toBe(false);
 * await wizard.goToLabel('Address');
 * expect(await wizard.getActiveStepText()).toBe('Address body');
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrStepperHarness extends ComponentHarness {
  static hostSelector = 'wr-stepper';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrStepperHarnessFilters = {}): HarnessPredicate<WrStepperHarness> {
    return new HarnessPredicate(WrStepperHarness, options)
      .addOption('stepLabel', options.stepLabel, async (harness, label) => {
        for (const stepLabel of await harness.getStepLabels()) {
          if (await HarnessPredicate.stringMatches(stepLabel, label)) return true;
        }
        return false;
      })
      .addOption(
        'orientation',
        options.orientation,
        async (harness, orientation) => (await harness.getOrientation()) === orientation
      )
      .addOption('linear', options.linear, async (harness, linear) => (await harness.isLinear()) === linear);
  }

  private readonly headerList = this.locatorFor('ol.wr-stepper__headers');

  /**
   * The layout direction the stepper was ASKED for.
   *
   * Unusually for this library both values carry a class, so neither is read as the
   * absence of the other. What the class cannot tell you is how the strip actually
   * laid itself out: a `responsive` horizontal stepper drops to the vertical layout
   * when its own box is too narrow, and that reflow is a container query — the class
   * never changes. No unit test can see the difference in any case, jsdom having no
   * layout at all; assert the opt-in with {@link isResponsive} instead.
   */
  async getOrientation(): Promise<'horizontal' | 'vertical'> {
    return (await (await this.host()).hasClass('wr-stepper--vertical')) ? 'vertical' : 'horizontal';
  }

  /** Whether the stepper locks the steps after the last completed one. */
  async isLinear(): Promise<boolean> {
    return (await this.host()).hasClass('wr-stepper--linear');
  }

  /** Whether the stepper may reflow to the vertical layout in a narrow container. */
  async isResponsive(): Promise<boolean> {
    return (await this.host()).hasClass('wr-stepper--responsive');
  }

  /**
   * The role the header strip announces — `list`.
   *
   * An `<ol>` is a list already, so the explicit role looks redundant and is not: the
   * stylesheet removes the markers, and Safari drops list semantics from a list with
   * `list-style: none`. Losing it costs the "list, 3 items" a VoiceOver user hears,
   * which is how they learn how long the wizard is before starting it.
   */
  async getListRole(): Promise<string | null> {
    return (await this.headerList()).getAttribute('role');
  }

  /** The wizard's steps, in order. */
  async getSteps(filters: WrStepHarnessFilters = {}): Promise<WrStepHarness[]> {
    return this.locatorForAll(WrStepHarness.with(filters))();
  }

  /** The label of every step, in order. */
  async getStepLabels(): Promise<string[]> {
    const steps = await this.getSteps();
    return Promise.all(steps.map(step => step.getLabel()));
  }

  /**
   * The index of the step the wizard is showing, from the header announcing
   * `aria-current="step"`.
   *
   * Throws when no header does, which is a state a stepper can genuinely be in: the
   * `active` model is two-way, `WrStepper.goTo()` clamps an out-of-range index but a
   * host writing `active` directly does not, and an index past the last step leaves
   * every header un-current and every step body hidden. A `-1` here would be read as
   * "the first step" by the next line of a spec.
   */
  async getActiveIndex(): Promise<number> {
    const steps = await this.getSteps();
    for (let index = 0; index < steps.length; index++) {
      if (await steps[index].isActive()) return index;
    }

    throw new Error(
      'WrStepperHarness.getActiveIndex(): no header announces `aria-current="step"` — this stepper either has ' +
        'no <wr-step> children, or its bound `active` index points outside them, which also hides every step ' +
        'body. `WrStepper.goTo()` clamps such an index; a host writing `active` itself does not.'
    );
  }

  /** The label of the step the wizard is showing. Throws when there is no current step. */
  async getActiveLabel(): Promise<string> {
    const steps = await this.getSteps();
    return steps[await this.getActiveIndex()].getLabel();
  }

  /** The labels of the steps shown as done, in order. Derived completion and overrides both. */
  async getCompletedLabels(): Promise<string[]> {
    const steps = await this.getSteps({ completed: true });
    return Promise.all(steps.map(step => step.getLabel()));
  }

  /**
   * The labels of the headers a Tab press can reach, in order.
   *
   * A stepper does NOT rove focus: unlike a tab strip, the header list is not one tab
   * stop with arrow keys inside it — every reachable header is its own stop, and the
   * component authors no `tabindex` at all. So the question "which step is active" has
   * two different answers, and this is the other one: the current step is not
   * necessarily in this list. A step disabled by its own input keeps
   * `aria-current="step"` while its button drops out of the tab order entirely, and a
   * `linear` stepper takes every locked header off the keyboard the same way.
   */
  async getTabStopLabels(): Promise<string[]> {
    const steps = await this.getSteps({ reachable: true });
    return Promise.all(steps.map(step => step.getLabel()));
  }

  /** The label of the header that currently has focus, or `null` when focus is elsewhere. */
  async getFocusedLabel(): Promise<string | null> {
    for (const step of await this.getSteps()) {
      if (await step.isFocused()) return step.getLabel();
    }
    return null;
  }

  /**
   * Whether the wizard would let a user navigate to this step right now — the question
   * a `linear` stepper exists to answer `false` to.
   *
   * Throws for an index that is not a step, rather than answering `false`: "you cannot
   * go there" and "there is no there" are different findings.
   */
  async canGoTo(index: number): Promise<boolean> {
    return (await this.stepAt(index)).isReachable();
  }

  /**
   * Navigate to the step at `index` by clicking its header.
   *
   * Throws when the wizard refuses, naming the cause — the step's own `disabled`, or
   * the `linear` gate and which earlier step is holding it shut. Silence would be
   * worse than a failure here: the component drops a click on a locked header without
   * a sound, so a spec would go on to assert against the step it was already showing.
   */
  async goTo(index: number): Promise<void> {
    const step = await this.stepAt(index);

    if (!(await step.isReachable())) {
      throw new Error(
        `WrStepperHarness.goTo(${index}): the header for "${await step.getLabel()}" refuses a click — ` +
          `${await this.refusal(index)}. Note that \`WrStepper.goTo()\` and \`next()\` move anyway: the gate is ` +
          "on the header click, so a wizard's own Next button has to check for itself."
      );
    }

    await step.select();

    if (!(await step.isActive())) {
      throw new Error(
        `WrStepperHarness.goTo(${index}): the header for "${await step.getLabel()}" was clicked and the wizard ` +
          'is still showing another step — its `active` model reached nothing, so a two-way `[(active)]` binding ' +
          'is overwriting it or the click is not wired.'
      );
    }
  }

  /**
   * Navigate to the step with this label — a string matches exactly, a RegExp is
   * tested. Throws naming the labels that do exist when nothing matches.
   */
  async goToLabel(label: string | RegExp): Promise<void> {
    const labels = await this.getStepLabels();
    for (let index = 0; index < labels.length; index++) {
      if (await HarnessPredicate.stringMatches(labels[index], label)) return this.goTo(index);
    }

    throw new Error(
      `WrStepperHarness.goToLabel(): no step is labelled ${JSON.stringify(String(label))}. This wizard has: ` +
        `${labels.join(', ')}.`
    );
  }

  /**
   * Move to the next step through its header — subject to the same gate a user is.
   *
   * In a `linear` wizard that gate is shut until the CURRENT step reports itself
   * complete (its own `completed` input; derived completion only ever covers steps
   * before the active one), so this throws there. That is not the harness being
   * strict: it is the header a user has, and the reason a linear wizard needs its own
   * Next button, which calls `WrStepper.next()` and is not gated at all.
   *
   * Throws on the last step, where the component's own `next()` clamps in silence.
   */
  async next(): Promise<void> {
    const index = await this.getActiveIndex();
    const steps = await this.getSteps();

    if (index === steps.length - 1) {
      throw new Error(
        `WrStepperHarness.next(): the wizard is already on its last step ("${await steps[index].getLabel()}") — ` +
          'there is nothing after it. `WrStepper.next()` clamps silently instead of saying so.'
      );
    }

    await this.goTo(index + 1);
  }

  /**
   * Move to the previous step through its header. Throws on the first step, where
   * `WrStepper.prev()` clamps in silence.
   *
   * Going back is normally allowed even in a `linear` wizard — every step at or before
   * the active one is reachable — but a step its own input disabled stays out of
   * reach in both directions.
   */
  async previous(): Promise<void> {
    const index = await this.getActiveIndex();

    if (index === 0) {
      throw new Error(
        'WrStepperHarness.previous(): the wizard is already on its first step — there is nothing before it. ' +
          '`WrStepper.prev()` clamps silently instead of saying so.'
      );
    }

    await this.goTo(index - 1);
  }

  /**
   * The text of the step body the wizard is showing.
   *
   * Which body shows is CSS-only: every `<wr-step>` renders, and the stepper hides all
   * but one with `display: none` through the `--active` class. So this reads the class,
   * and in a unit test it has to — jsdom loads no stylesheet, which makes
   * `fixture.nativeElement.textContent` the text of ALL the steps at once and any
   * "is the body showing" assertion built on it meaningless.
   */
  async getActiveStepText(): Promise<string> {
    const active = await this.locatorForOptional('.wr-stepper__body .wr-step--active')();
    if (!active) {
      throw new Error(
        'WrStepperHarness.getActiveStepText(): no step body is showing — the bound `active` index is outside ' +
          'the step list, or this stepper has no <wr-step> children.'
      );
    }
    return wrStepperHarnessText(await active.text());
  }

  /**
   * The text of EVERY step body, in order, showing or not.
   *
   * The list being complete is the point: a step is hidden by a class rather than
   * dropped by an `@if`, so it mounts once and keeps its state — a half-filled form on
   * step 1 is still filled after a trip to step 3. Anything that turned the body into
   * a conditional block would keep every other assertion in a spec passing and quietly
   * reset the wizard.
   */
  async getStepTexts(): Promise<string[]> {
    const bodies = await this.locatorForAll('.wr-stepper__body > wr-step')();
    return Promise.all(bodies.map(async body => wrStepperHarnessText(await body.text())));
  }

  /** The step at `index`, or a failure that says how long the wizard is. */
  private async stepAt(index: number): Promise<WrStepHarness> {
    const steps = await this.getSteps();
    const step = steps[index];
    if (!step) {
      throw new Error(
        `WrStepperHarness: there is no step ${index} — this wizard has ${steps.length} ` +
          `${steps.length === 1 ? 'step' : 'steps'}${steps.length ? `: ${(await this.getStepLabels()).join(', ')}` : ''}.`
      );
    }
    return step;
  }

  /** Why the header at `index` is refusing a click, in the component's own order of causes. */
  private async refusal(index: number): Promise<string> {
    const steps = await this.getSteps();

    // The step's own input wins in the component too: `isReachable()` answers `false`
    // for a disabled step before it ever looks at the gate.
    if (await steps[index].isDisabled()) return 'the step carries `disabled`';

    if (await this.isLinear()) {
      for (let before = 0; before < index; before++) {
        if (!(await steps[before].isCompleted())) {
          return (
            'the stepper is `linear` and step ' +
            `${before + 1} ("${await steps[before].getLabel()}") has not reported itself complete`
          );
        }
      }
    }

    return 'its header button is disabled';
  }
}
