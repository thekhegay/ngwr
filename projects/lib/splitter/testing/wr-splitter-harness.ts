/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, TestKey } from '@angular/cdk/testing';

import type { WrSplitterArrowKey, WrSplitterHarnessFilters, WrSplitterPaneSizes } from './interfaces';

const ARROWS: Record<WrSplitterArrowKey, TestKey> = {
  left: TestKey.LEFT_ARROW,
  right: TestKey.RIGHT_ARROW,
  up: TestKey.UP_ARROW,
  down: TestKey.DOWN_ARROW,
};

/**
 * Test harness for `<wr-splitter>` — two panes and the divider between them.
 *
 * **Everything here is the keyboard, and that is not a workaround.** The divider is
 * dragged with a pointer in a browser, but the drag reads
 * `getBoundingClientRect()` and turns a client coordinate into a percentage; jsdom
 * lays nothing out, so every rect is 0×0 and a synthetic drag writes `NaN` into the
 * position. The arrow keys reach the same state, are the accessible path anyway, and
 * are what the WAI-ARIA separator pattern is judged on.
 *
 * **Two words for the axis, and they are opposites.** The component's
 * `orientation="horizontal"` means the panes sit side by side, which needs a
 * VERTICAL divider — so that is what `aria-orientation` says. {@link getOrientation}
 * answers the component's word and {@link getDividerOrientation} the divider's; both
 * are here because a spec that conflated them would look right and assert nothing.
 *
 * **Arrows follow the VISUAL axis.** Under `dir="rtl"` the start pane is the one on
 * the right, so ArrowRight SHRINKS the position. {@link pressArrow} takes the key a
 * user presses rather than a semantic direction, which is the only way a spec can
 * pin that mirroring; {@link setPosition} walks with whichever key currently grows
 * the number, and reports where it landed.
 *
 * @example
 * ```ts
 * const splitter = await loader.getHarness(WrSplitterHarness);
 *
 * expect(await splitter.getPosition()).toBe(50);
 * await splitter.setPosition(70);
 * expect(await splitter.getPaneSizes()).toEqual({ start: 70, end: 30 });
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrSplitterHarness extends ComponentHarness {
  static hostSelector = 'wr-splitter';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrSplitterHarnessFilters = {}): HarnessPredicate<WrSplitterHarness> {
    return new HarnessPredicate(WrSplitterHarness, options)
      .addOption(
        'orientation',
        options.orientation,
        async (harness, orientation) => (await harness.getOrientation()) === orientation
      )
      .addOption('dividerLabel', options.dividerLabel, (harness, label) =>
        HarnessPredicate.stringMatches(harness.getDividerLabel(), label)
      )
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled);
  }

  private readonly divider = this.locatorFor('.wr-splitter__divider');

  /**
   * The splitter's own axis: `horizontal` when the panes sit side by side.
   *
   * Read from the host modifier rather than from `aria-orientation`, which says the
   * opposite thing about the same layout — see {@link getDividerOrientation}.
   */
  async getOrientation(): Promise<'horizontal' | 'vertical'> {
    return (await (await this.host()).hasClass('wr-splitter--vertical')) ? 'vertical' : 'horizontal';
  }

  /**
   * What the divider announces — the INVERSE of {@link getOrientation}, and correct:
   * a separator's orientation is the line it draws, not the axis it travels along.
   */
  async getDividerOrientation(): Promise<string | null> {
    return (await this.divider()).getAttribute('aria-orientation');
  }

  /** The divider's position as a percentage, from `aria-valuenow`. */
  async getPosition(): Promise<number> {
    return this.numeric('aria-valuenow');
  }

  /** The lowest position the divider will accept, from `aria-valuemin`. */
  async getMinPosition(): Promise<number> {
    return this.numeric('aria-valuemin');
  }

  /** The highest position the divider will accept, from `aria-valuemax`. */
  async getMaxPosition(): Promise<number> {
    return this.numeric('aria-valuemax');
  }

  /**
   * What each pane is asking for, in percent, from the `flex-basis` the component
   * writes inline.
   *
   * This is the only evidence a spec without layout has that the panes followed the
   * divider — a measured width is zero for both. They should always sum to 100:
   * the end pane is `100 - position`, so a pair that does not is a component bug
   * rather than a rounding artefact.
   */
  async getPaneSizes(): Promise<WrSplitterPaneSizes> {
    const start = await this.locatorFor('.wr-splitter__pane--start')();
    const end = await this.locatorFor('.wr-splitter__pane--end')();

    return {
      start: Number.parseFloat(await start.getCssValue('flex-basis')),
      end: Number.parseFloat(await end.getCssValue('flex-basis')),
    };
  }

  /** The start pane's projected text, trimmed. */
  async getStartText(): Promise<string> {
    return (await this.locatorFor('.wr-splitter__pane--start')()).text();
  }

  /** The end pane's projected text, trimmed. */
  async getEndText(): Promise<string> {
    return (await this.locatorFor('.wr-splitter__pane--end')()).text();
  }

  /** The divider's accessible name — a focusable separator is a widget and needs one. */
  async getDividerLabel(): Promise<string | null> {
    return (await this.divider()).getAttribute('aria-label');
  }

  /**
   * Whether the splitter refuses to resize.
   *
   * From the divider's `aria-disabled`, which is the half a screen reader acts on.
   * The component also drops the divider out of the tab order and paints a modifier
   * on the host, and {@link isDividerFocusable} answers the first of those — worth
   * asking separately, because a divider that is announced as disabled and still a
   * tab stop is a control the keyboard can reach and not use.
   */
  async isDisabled(): Promise<boolean> {
    return (await (await this.divider()).getAttribute('aria-disabled')) === 'true';
  }

  /** Whether the divider is a tab stop (`tabindex="0"`). */
  async isDividerFocusable(): Promise<boolean> {
    return (await (await this.divider()).getAttribute('tabindex')) === '0';
  }

  /** Move keyboard focus to the divider. */
  async focusDivider(): Promise<void> {
    return (await this.divider()).focus();
  }

  /** Whether the divider currently holds focus. */
  async isDividerFocused(): Promise<boolean> {
    return (await this.divider()).isFocused();
  }

  /**
   * Press one arrow key on the divider.
   *
   * The key rather than a direction, deliberately: which way the position moves is a
   * function of the key AND the reading direction, and a `grow()` / `shrink()` pair
   * would hide exactly the behaviour worth asserting. An arrow off the splitter's own
   * axis does nothing at all — the horizontal splitter ignores Up and Down.
   *
   * `shift` is the coarse step: 10 instead of 1.
   */
  async pressArrow(arrow: WrSplitterArrowKey, options: { shift?: boolean } = {}): Promise<void> {
    const divider = await this.divider();
    await (options.shift ? divider.sendKeys({ shift: true }, ARROWS[arrow]) : divider.sendKeys(ARROWS[arrow]));
  }

  /** Press Home — jumping to `minPosition`, whatever the reading direction. */
  async pressHome(): Promise<void> {
    return (await this.divider()).sendKeys(TestKey.HOME);
  }

  /** Press End — jumping to `maxPosition`. Semantic, so it never mirrors under RTL. */
  async pressEnd(): Promise<void> {
    return (await this.divider()).sendKeys(TestKey.END);
  }

  /**
   * Walk the divider to a position with the keyboard, and assert it landed there.
   *
   * Ten-unit hops first, then single steps — the same two strides a user has. It
   * walks rather than assigning, because assigning would prove the harness can write
   * a signal and nothing about the component: the clamp, the min / max and the
   * mirroring all live on this path.
   *
   * Throws rather than half-arriving. A target outside `[min, max]` is unreachable by
   * construction, and so is any target the walk cannot hit exactly — the position is a
   * float that a previous drag may have left mid-step, and whole-unit keys cannot get
   * off a fractional offset. Both say so, with where it actually stopped.
   */
  async setPosition(target: number): Promise<void> {
    const [min, max] = [await this.getMinPosition(), await this.getMaxPosition()];
    if (target < min || target > max) {
      throw new Error(
        `WrSplitterHarness.setPosition(${target}): out of range — this splitter accepts ${min}–${max}. ` +
          'The component clamps, so the walk would stop at the bound and never reach the number asked for.'
      );
    }

    if (target === min) return this.pressHome();
    if (target === max) return this.pressEnd();

    await this.focusDivider();
    // The block axis never mirrors, so only the horizontal splitter needs the probe.
    const vertical = (await this.getOrientation()) === 'vertical';
    const [grow, shrink]: [WrSplitterArrowKey, WrSplitterArrowKey] = vertical
      ? ['down', 'up']
      : (await this.growsWithRight())
        ? ['right', 'left']
        : ['left', 'right'];

    for (const shift of [true, false]) {
      const step = shift ? 10 : 1;
      // Recomputed each pass: the coarse hops clamp at the bounds, so the remaining
      // distance is not what simple arithmetic on the starting point would predict.
      let delta = target - (await this.getPosition());

      while (Math.abs(delta) >= step) {
        const before = await this.getPosition();
        await this.pressArrow(delta > 0 ? grow : shrink, { shift });
        const now = await this.getPosition();

        if (now === before) {
          throw new Error(
            `WrSplitterHarness.setPosition(${target}): the divider stopped moving at ${now}. A disabled ` +
              'splitter ignores its arrows, which is the usual reason this happens.'
          );
        }
        delta = target - now;
      }
    }

    const landed = await this.getPosition();
    if (landed !== target) {
      throw new Error(
        `WrSplitterHarness.setPosition(${target}): the walk stopped at ${landed}. The arrows move in whole ` +
          'units, so a position left on a fraction by a drag cannot be walked onto a whole number.'
      );
    }
  }

  /**
   * Whether ArrowRight is currently the key that GROWS the position — true in LTR,
   * false in RTL, where the start pane is the one on the right.
   *
   * Probed rather than read off `Directionality`, which a harness has no access to:
   * press, look, and put it back. At the top of the range a growing press is clamped
   * and would prove nothing, so the probe presses the other way there instead. The
   * undo is conditional — a press that moved nothing has nothing to undo, and undoing
   * it anyway would move the divider by one in the direction the probe was testing.
   */
  private async growsWithRight(): Promise<boolean> {
    const before = await this.getPosition();
    const atCeiling = before >= (await this.getMaxPosition());
    const [probe, undo]: [WrSplitterArrowKey, WrSplitterArrowKey] = atCeiling ? ['left', 'right'] : ['right', 'left'];

    await this.pressArrow(probe);
    const after = await this.getPosition();
    if (after !== before) await this.pressArrow(undo);

    return atCeiling ? after < before : after > before;
  }

  private async numeric(attribute: string): Promise<number> {
    const raw = await (await this.divider()).getAttribute(attribute);
    return raw === null ? Number.NaN : Number(raw);
  }
}
