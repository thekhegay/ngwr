/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, TestKey } from '@angular/cdk/testing';

import type { WrCompareHarnessFilters } from './types';

/**
 * Test harness for `<wr-compare>`, the before/after slider.
 *
 * The position is read from the slider's `aria-valuenow`, in whole percent,
 * and written with the keyboard. There is no `dragTo()`: a drag divides the
 * pointer's offset by the host's measured width, a unit test has no layout, and
 * the component keeps its position when the host measures zero, so a dragging
 * method would resolve having moved nothing.
 *
 * @example
 * ```ts
 * const compare = await loader.getHarness(WrCompareHarness);
 *
 * await compare.setPosition(30);
 * expect(await compare.getPosition()).toBe(30);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrCompareHarness extends ComponentHarness {
  static hostSelector = 'wr-compare';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrCompareHarnessFilters = {}): HarnessPredicate<WrCompareHarness> {
    return new HarnessPredicate(WrCompareHarness, options)
      .addOption('label', options.label, (harness, label) => HarnessPredicate.stringMatches(harness.getLabel(), label))
      .addOption(
        'orientation',
        options.orientation,
        async (harness, orientation) => (await harness.getOrientation()) === orientation
      )
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled);
  }

  private readonly slider = this.locatorFor('.wr-compare__surface[role="slider"]');

  /** The divider position in whole percent, from `aria-valuenow`. */
  async getPosition(): Promise<number> {
    return this.numeric('aria-valuenow');
  }

  /** The lowest position the divider may reach, from `aria-valuemin`. */
  async getMinPosition(): Promise<number> {
    return this.numeric('aria-valuemin');
  }

  /** The highest position the divider may reach, from `aria-valuemax`. */
  async getMaxPosition(): Promise<number> {
    return this.numeric('aria-valuemax');
  }

  /** The axis the divider moves along, from `aria-orientation`. */
  async getOrientation(): Promise<'horizontal' | 'vertical'> {
    return (await (await this.slider()).getAttribute('aria-orientation')) === 'vertical' ? 'vertical' : 'horizontal';
  }

  /** The slider's accessible name. */
  async getLabel(): Promise<string | null> {
    return (await this.slider()).getAttribute('aria-label');
  }

  /** Whether the slider refuses interaction, from `aria-disabled`. */
  async isDisabled(): Promise<boolean> {
    return (await (await this.slider()).getAttribute('aria-disabled')) === 'true';
  }

  /** Whether the round drag handle is drawn on the divider (`showHandle`). */
  async hasHandle(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-compare__handle')()) !== null;
  }

  /** The text of the "before" layer, trimmed. */
  async getBeforeText(): Promise<string> {
    return (await this.locatorFor('.wr-compare__layer--before')()).text();
  }

  /** The text of the "after" layer, trimmed. */
  async getAfterText(): Promise<string> {
    return (await this.locatorFor('.wr-compare__layer--after')()).text();
  }

  /** Move keyboard focus to the slider. */
  async focus(): Promise<void> {
    return (await this.slider()).focus();
  }

  /** Whether the slider holds focus. */
  async isFocused(): Promise<boolean> {
    return (await this.slider()).isFocused();
  }

  /**
   * Walk the divider to `target` with the keys a user has: Home and End for the
   * bounds, Shift+arrow for tens, an arrow for ones.
   *
   * Which arrow grows the position depends on the orientation and on the reading
   * direction, which a harness cannot read, so the walk watches where each press
   * lands and turns around when the first one went the wrong way.
   *
   * Throws for a target outside `[min, max]`, for a fractional one (a key lands
   * on a whole percent) and when the divider stops moving, which is what a
   * disabled slider does.
   */
  async setPosition(target: number): Promise<void> {
    const [min, max] = [await this.getMinPosition(), await this.getMaxPosition()];
    if (target < min || target > max || !Number.isInteger(target)) {
      throw new Error(
        `WrCompareHarness.setPosition(${target}): unreachable. This slider accepts whole percents in ${min}–${max}.`
      );
    }

    const slider = await this.slider();
    const before = await this.getPosition();
    if (target === min) await slider.sendKeys(TestKey.HOME);
    else if (target === max) await slider.sendKeys(TestKey.END);
    else {
      const vertical = (await this.getOrientation()) === 'vertical';
      let [grow, shrink] = vertical
        ? [TestKey.DOWN_ARROW, TestKey.UP_ARROW]
        : [TestKey.RIGHT_ARROW, TestKey.LEFT_ARROW];

      let now = before;
      let turned = false;
      // Bounded: the range is 101 values wide, and a turn costs two presses.
      for (let press = 0; now !== target && press < 64; press++) {
        const gap = target - now;
        const [key, back] = gap > 0 ? [grow, shrink] : [shrink, grow];
        await (Math.abs(gap) >= 10 ? slider.sendKeys({ shift: true }, key) : slider.sendKeys(key));
        const next = await this.getPosition();

        if (Math.sign(next - now) === Math.sign(gap)) {
          now = next;
          continue;
        }
        // Nothing moved, or it moved away: the page reads right to left, or the
        // slider is inert. Put a wrong step back, and turn around once.
        if (next !== now) await (Math.abs(gap) >= 10 ? slider.sendKeys({ shift: true }, back) : slider.sendKeys(back));
        now = await this.getPosition();
        if (turned) break;
        turned = true;
        [grow, shrink] = [shrink, grow];
      }
    }

    const landed = await this.getPosition();
    if (landed !== target) {
      throw new Error(
        `WrCompareHarness.setPosition(${target}): the divider stopped at ${landed}, from ${before}. A disabled ` +
          'slider ignores its keys, which is the usual reason.'
      );
    }
  }

  private async numeric(attribute: string): Promise<number> {
    const raw = await (await this.slider()).getAttribute(attribute);
    return raw === null ? Number.NaN : Number(raw);
  }
}
