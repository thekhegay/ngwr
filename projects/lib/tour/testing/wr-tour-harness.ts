/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import { WrButtonHarness } from 'ngwr/button/testing';

import type { WrTourHarnessFilters, WrTourProgress } from './interfaces';

/**
 * Test harness for the card `WrTour` shows beside the spotlit element.
 *
 * `WrTour` is a service with no element of its own, so there is nothing in your
 * fixture to load: the popup is a portal in the NGWR overlay container, and this
 * comes from `TestbedHarnessEnvironment.documentRootLoader()`. **One card exists at
 * a time** — the service tears the whole step down before opening the next — so a
 * harness held across {@link next} is pointed at a detached element, and a fresh one
 * has to be fetched per step.
 *
 * **The card is rebuilt per step, and that is what makes `getHarnessOrNull` the way
 * to ask whether a tour is running.** There is no "closed" state to read: the popup,
 * the overlay and the spotlight all go away together.
 *
 * **What "last" means here is not `current === total`.** A step whose target is not
 * on the page is skipped, so a tour of three steps can show two, and the service
 * looks AHEAD for a reachable one to decide what the primary button says.
 * {@link getProgress} reports the printed count, {@link getPrimaryLabel} what the
 * button actually reads — asserting the second is what catches a card that says
 * "Next" and then ends the tour.
 *
 * @example
 * ```ts
 * const rootLoader = TestbedHarnessEnvironment.documentRootLoader(fixture);
 * tour.start(steps);
 * await fixture.whenStable();
 *
 * const card = await rootLoader.getHarness(WrTourHarness);
 * expect(await card.getTitle()).toBe('Search');
 * await card.next();
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrTourHarness extends ComponentHarness {
  static hostSelector = '.wr-tour-popup';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrTourHarnessFilters = {}): HarnessPredicate<WrTourHarness> {
    return new HarnessPredicate(WrTourHarness, options)
      .addOption('title', options.title, (harness, title) => HarnessPredicate.stringMatches(harness.getTitle(), title))
      .addOption('content', options.content, (harness, content) =>
        HarnessPredicate.stringMatches(harness.getContent(), content)
      );
  }

  /**
   * Whether this card is still on the page.
   *
   * For a harness you are already HOLDING: moving to another step disposes the
   * overlay, so this flips to `false` where a fresh `getHarnessOrNull()` answers
   * with the NEW card rather than with nothing.
   */
  async isShowing(): Promise<boolean> {
    return (await this.host()).matchesSelector('body .wr-tour-popup');
  }

  /** The step's heading, or `null` for a step given no `title`. */
  async getTitle(): Promise<string | null> {
    const title = await this.locatorForOptional('.wr-tour-popup__title')();
    return title ? title.text() : null;
  }

  /** The step's body copy. */
  async getContent(): Promise<string> {
    return (await this.locatorFor('.wr-tour-popup__content')()).text();
  }

  /** The progress line as printed, e.g. `Step 2 of 4`. */
  async getProgressText(): Promise<string> {
    return (await this.locatorFor('.wr-tour-popup__progress')()).text();
  }

  /**
   * The two numbers out of the progress line, or `null` when it does not hold two.
   *
   * Parsed from the rendered string rather than asked of the service, because the
   * service is not something a harness can reach — and the string is what the user
   * actually gets. A catalog that spells the numbers as words, or reverses them,
   * makes this `null` instead of a wrong answer; assert {@link getProgressText} in
   * that case.
   *
   * `total` is how many steps the tour was STARTED with, not how many it will show:
   * a step whose target is missing is skipped and still counted here, which is the
   * component's own choice and worth knowing before writing an assertion on it.
   */
  async getProgress(): Promise<WrTourProgress | null> {
    const digits = (await this.getProgressText()).match(/\d+/g);
    if (!digits || digits.length < 2) return null;
    return { current: Number(digits[0]), total: Number(digits[1]) };
  }

  /**
   * The name the card announces — its title and the progress line, or just the
   * progress line for an untitled step.
   *
   * The card is an `aria-modal` dialog, so it needs a name; the progress line is
   * what an untitled step has instead of one.
   */
  async getAccessibleName(): Promise<string | null> {
    return (await this.host()).getAttribute('aria-label');
  }

  /** Whether the card announces itself as a modal dialog. */
  async isModal(): Promise<boolean> {
    const host = await this.host();
    return (await host.getAttribute('role')) === 'dialog' && (await host.getAttribute('aria-modal')) === 'true';
  }

  /**
   * Whether the card offers a Back button — which is the same question as "is this
   * the first step", since the button is only rendered past it.
   */
  async hasBack(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-tour-popup__action--back')()) !== null;
  }

  /**
   * What the primary button READS — the "next" label, or the "done" one on the last
   * step the user will see.
   *
   * The assertion worth writing, and not derivable from the count: the service looks
   * ahead for a step whose target is still on the page, so a tour whose last step is
   * hidden ends one card early and this is the only place that shows.
   */
  async getPrimaryLabel(): Promise<string> {
    return (await this.primary()).getText();
  }

  /** The Skip button's label. */
  async getSkipLabel(): Promise<string> {
    return (await this.skip()).getText();
  }

  /** The Back button's label. Throws on the first step, where there is none. */
  async getBackLabel(): Promise<string> {
    return (await this.backButton('getBackLabel')).getText();
  }

  /**
   * Press the primary button — the next step, or the end of the tour.
   *
   * Composed through {@link WrButtonHarness} rather than clicking an element: these
   * are `wr-btn`s, and that harness already knows how one reports being off.
   */
  async next(): Promise<void> {
    await (await this.primary()).click();
  }

  /** Press Back. Throws on the first step, where the button is not rendered. */
  async back(): Promise<void> {
    await (await this.backButton('back')).click();
  }

  /** Press Skip — ending the tour without finishing it. */
  async skipTour(): Promise<void> {
    await (await this.skip()).click();
  }

  private async primary(): Promise<WrButtonHarness> {
    return this.locatorFor(WrButtonHarness.with({ selector: '.wr-tour-popup__action--next' }))();
  }

  private async skip(): Promise<WrButtonHarness> {
    return this.locatorFor(WrButtonHarness.with({ selector: '.wr-tour-popup__action--skip' }))();
  }

  private async backButton(method: string): Promise<WrButtonHarness> {
    const button = await this.locatorForOptional(WrButtonHarness.with({ selector: '.wr-tour-popup__action--back' }))();
    if (!button) {
      throw new Error(
        `WrTourHarness.${method}(): this card has no Back button — the tour is on its first step, where it is ` +
          'not rendered at all.'
      );
    }
    return button;
  }
}
