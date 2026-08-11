/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrSliderValue } from 'ngwr/slider';

import type { WrSliderHarnessFilters, WrSliderThumbHarnessFilters } from './interfaces';
import { WrSliderThumbHarness } from './wr-slider-thumb-harness';

/** Element-wise comparison for the `value` filter — a tuple never matches a plain number. */
function sameValue(actual: WrSliderValue, expected: WrSliderValue): boolean {
  if (typeof actual === 'number') return actual === expected;
  if (typeof expected === 'number') return false;
  return actual[0] === expected[0] && actual[1] === expected[1];
}

/**
 * Test harness for `<wr-slider>` — single-thumb and `range`.
 *
 * Every NUMBER it reads comes off the thumbs' ARIA range trio (`aria-valuenow`,
 * `aria-valuemin`, `aria-valuemax`), which is what a screen reader is told and
 * the only place the slider publishes its value. The mode comes off the host's
 * `wr-slider--range` class and {@link getLabelText} off the rendered text.
 *
 * Everything it WRITES is a key press. A slider is a pointer control, but a
 * pointer control cannot be driven by coordinates in jsdom — there is no layout,
 * so the track measures 0×0 and the component divides every offset by that
 * width: a positive one writes the slider's MAX and `clientX: 0` writes `NaN`,
 * neither of them the value asked for. The keyboard is both the accessible path
 * and the only honest one here; {@link WrSliderThumbHarness.setValue} spells out
 * what the walk costs.
 *
 * The `step` is deliberately not readable: the component publishes it nowhere in
 * the DOM (ARIA has no attribute for it), so a spec that needs the number should
 * measure it — `stepUp()` moves by exactly one step.
 *
 * @example
 * ```ts
 * const volume = await loader.getHarness(WrSliderHarness);
 *
 * await volume.setValue(70);
 * expect(await volume.getValue()).toBe(70);
 *
 * const span = await loader.getHarness(WrSliderHarness.with({ range: true }));
 * await span.setRange(30, 60);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrSliderHarness extends ComponentHarness {
  static hostSelector = 'wr-slider';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrSliderHarnessFilters = {}): HarnessPredicate<WrSliderHarness> {
    return new HarnessPredicate(WrSliderHarness, options)
      .addOption('value', options.value, async (harness, value) => sameValue(await harness.getValue(), value))
      .addOption('range', options.range, async (harness, range) => (await harness.isRange()) === range)
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled)
      .addOption('labelText', options.labelText, (harness, text) =>
        HarnessPredicate.stringMatches(harness.getLabelText(), text)
      );
  }

  /** Whether the slider has two thumbs and answers with a `[low, high]` tuple. */
  async isRange(): Promise<boolean> {
    return (await this.host()).hasClass('wr-slider--range');
  }

  /**
   * Whether the slider refuses interaction.
   *
   * Read from the thumb's native `disabled` rather than from the
   * `wr-slider--disabled` class: the class is paint, while `disabled` on the
   * button is what takes the thumb out of the tab order and what assistive tech
   * reports.
   */
  async isDisabled(): Promise<boolean> {
    return (await this.getLowThumb()).isDisabled();
  }

  /**
   * The current value, in the shape the model uses: a plain number for one
   * thumb, `[low, high]` for two.
   */
  async getValue(): Promise<WrSliderValue> {
    const values = await Promise.all((await this.getThumbs()).map(thumb => thumb.getValue()));
    return values.length > 1 ? ([values[0], values[1]] as const) : values[0];
  }

  /** The slider's lower bound. */
  async getMin(): Promise<number> {
    return (await this.getThumbs())[0].getMin();
  }

  /**
   * The slider's upper bound.
   *
   * Taken from the LAST thumb, because in range mode the thumbs bound each
   * other: the lower one's `aria-valuemax` is wherever the upper one is
   * standing, so only the upper thumb knows the real ceiling.
   */
  async getMax(): Promise<number> {
    const thumbs = await this.getThumbs();
    return thumbs[thumbs.length - 1].getMax();
  }

  /**
   * The text the slider prints under the track, or `null` when `showLabel` is
   * off.
   *
   * A range slider joins its ends with an EN DASH — `'20 – 80'`, U+2013 — so an
   * assertion typed with a hyphen will not match.
   */
  async getLabelText(): Promise<string | null> {
    const label = await this.locatorForOptional('.wr-slider__label')();
    return label ? label.text() : null;
  }

  /** The slider's thumbs in DOM order: the lower one first. */
  async getThumbs(filters: WrSliderThumbHarnessFilters = {}): Promise<WrSliderThumbHarness[]> {
    return this.locatorForAll(WrSliderThumbHarness.with(filters))();
  }

  /** The only thumb of a single-thumb slider, or the lower one of a range slider. */
  async getLowThumb(): Promise<WrSliderThumbHarness> {
    return this.locatorFor(WrSliderThumbHarness.with({ position: 'low' }))();
  }

  /** The upper thumb. Throws on a single-thumb slider, which has no such part. */
  async getHighThumb(): Promise<WrSliderThumbHarness> {
    const thumb = await this.locatorForOptional(WrSliderThumbHarness.with({ position: 'high' }))();
    if (!thumb) {
      throw new Error('WrSliderHarness.getHighThumb(): this slider has one thumb — only a `range` slider has two.');
    }
    return thumb;
  }

  /**
   * Walk the slider to `value` from the keyboard.
   *
   * Single-thumb only — {@link setRange} moves both ends. See
   * {@link WrSliderThumbHarness.setValue} for what the walk costs and when it
   * throws.
   */
  async setValue(value: number): Promise<void> {
    return (await this.single('setValue')).setValue(value);
  }

  /**
   * Walk both ends of a range slider to `[low, high]`.
   *
   * The far end moves FIRST. The thumbs bound each other, so writing `[90, 95]`
   * over `[20, 80]` lower-end-first would be refused outright — 90 is outside
   * the `[0, 80]` window the upper thumb leaves the lower one.
   */
  async setRange(low: number, high: number): Promise<void> {
    if (!(await this.isRange())) {
      throw new Error('WrSliderHarness.setRange(): this slider has one thumb — add `range` to it, or call setValue().');
    }
    if (low > high) {
      throw new Error(`WrSliderHarness.setRange(): ${low} is above ${high}, and the thumbs cannot cross.`);
    }

    const lowThumb = await this.getLowThumb();
    const highThumb = await this.getHighThumb();

    if (high >= (await highThumb.getValue())) {
      await highThumb.setValue(high);
      await lowThumb.setValue(low);
      return;
    }

    await lowThumb.setValue(low);
    await highThumb.setValue(high);
  }

  /** One step up (`ArrowRight`). Single-thumb only. A disabled slider does not move. */
  async stepUp(): Promise<void> {
    return (await this.single('stepUp')).stepUp();
  }

  /** One step down (`ArrowLeft`). Single-thumb only. A disabled slider does not move. */
  async stepDown(): Promise<void> {
    return (await this.single('stepDown')).stepDown();
  }

  /** `Home` — jump to the slider's `min`. Single-thumb only. */
  async toMin(): Promise<void> {
    return (await this.single('toMin')).toMin();
  }

  /** `End` — jump to the slider's `max`. Single-thumb only. */
  async toMax(): Promise<void> {
    return (await this.single('toMax')).toMax();
  }

  /**
   * Move keyboard focus to the slider's first thumb. A range slider's thumbs are
   * two separate tab stops (both are plain buttons — there is no roving
   * `tabindex`), so reach the other one through {@link getHighThumb}.
   */
  async focus(): Promise<void> {
    return (await this.getLowThumb()).focus();
  }

  /** Whether any of the slider's thumbs holds focus. */
  async isFocused(): Promise<boolean> {
    const focused = await Promise.all((await this.getThumbs()).map(thumb => thumb.isFocused()));
    return focused.includes(true);
  }

  /**
   * The one thumb a single-thumb convenience call means.
   *
   * Range mode gets an error rather than a guess: "step this slider up" has two
   * possible answers there, and picking one silently is how a spec ends up
   * asserting against the end it did not move.
   */
  private async single(caller: string): Promise<WrSliderThumbHarness> {
    if (await this.isRange()) {
      throw new Error(
        `WrSliderHarness.${caller}(): this slider has two thumbs — use setRange(), or reach for one end ` +
          'with getLowThumb() / getHighThumb().'
      );
    }
    return this.getLowThumb();
  }
}
