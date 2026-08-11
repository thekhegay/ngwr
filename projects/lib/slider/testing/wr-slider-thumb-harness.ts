/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, TestKey } from '@angular/cdk/testing';

import type { WrSliderThumbHarnessFilters, WrSliderThumbPosition } from './interfaces';

/** How many key presses {@link WrSliderThumbHarness.setValue} spends before it gives up. */
const MAX_PRESSES = 1000;

/**
 * Test harness for one thumb of a `<wr-slider>`.
 *
 * A single-thumb slider has exactly one; a `range` one has two, and each thumb
 * is the other's limit — the lower thumb's `aria-valuemax` is wherever the upper
 * thumb is standing, and vice versa. So {@link getMin} / {@link getMax} answer
 * the room THIS thumb has, not the slider's bounds, which is exactly what a
 * screen reader announces and exactly the window {@link setValue} can reach.
 *
 * Every write here is a KEY PRESS, because a drag is not something a unit test
 * can perform — see {@link setValue}.
 *
 * Every press is on the BLOCK axis — `ArrowUp` / `ArrowDown`, `PageUp` /
 * `PageDown`, `Home` / `End` — so the harness means the same thing in both
 * reading directions. That is not a detail: the component's ← / → follow the
 * VISUAL track, so under `dir="rtl"` a right-arrow LOWERS the value, and a
 * harness that pressed it would have `stepUp()` stepping down while every LTR
 * spec stayed green. It cannot detect the direction to compensate either —
 * `Directionality` is injected, not published to the DOM — so it stays on the
 * axis `dir` does not govern.
 *
 * @example
 * ```ts
 * const upper = await slider.getHighThumb();
 *
 * await upper.setValue(90);
 * expect(await upper.getValue()).toBe(90);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrSliderThumbHarness extends ComponentHarness {
  /**
   * The thumb is a real `<button role="slider">`, so it is focusable without a
   * `tabindex` and leaves the tab order by itself when disabled. Anchored on the
   * BEM class rather than on `[role="slider"]`: the class also carries the
   * `--low` / `--high` modifier this harness reads.
   */
  static hostSelector = '.wr-slider__thumb';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrSliderThumbHarnessFilters = {}): HarnessPredicate<WrSliderThumbHarness> {
    return new HarnessPredicate(WrSliderThumbHarness, options)
      .addOption('position', options.position, async (harness, position) => (await harness.getPosition()) === position)
      .addOption('value', options.value, async (harness, value) => (await harness.getValue()) === value)
      .addOption('label', options.label, (harness, label) => HarnessPredicate.stringMatches(harness.getLabel(), label));
  }

  /** Which end this thumb is. A single-thumb slider's thumb is the `'low'` one. */
  async getPosition(): Promise<WrSliderThumbPosition> {
    return (await (await this.host()).hasClass('wr-slider__thumb--high')) ? 'high' : 'low';
  }

  /** Where the thumb is standing, from `aria-valuenow` — the number a screen reader reads out. */
  async getValue(): Promise<number> {
    return this.numeric('aria-valuenow');
  }

  /**
   * The lowest value THIS thumb can reach (`aria-valuemin`).
   *
   * On a range slider's upper thumb that is the lower thumb, not the slider's
   * `min` — the two cannot cross, so the neighbour is the real floor.
   */
  async getMin(): Promise<number> {
    return this.numeric('aria-valuemin');
  }

  /**
   * The highest value THIS thumb can reach (`aria-valuemax`).
   *
   * On a range slider's lower thumb that is the upper thumb, not the slider's
   * `max`.
   */
  async getMax(): Promise<number> {
    return this.numeric('aria-valuemax');
  }

  /** The thumb's accessible name — `'Value'`, or `'Lower value'` / `'Upper value'` in range mode. */
  async getLabel(): Promise<string | null> {
    return (await this.host()).getAttribute('aria-label');
  }

  /** What a screen reader is told this control is. The role is why the arrows mean anything here. */
  async getRole(): Promise<string | null> {
    return (await this.host()).getAttribute('role');
  }

  /** Whether the thumb refuses the keyboard. Read from the button's native `disabled`. */
  async isDisabled(): Promise<boolean> {
    return (await this.host()).getProperty<boolean>('disabled');
  }

  async focus(): Promise<void> {
    return (await this.host()).focus();
  }

  async isFocused(): Promise<boolean> {
    return (await this.host()).isFocused();
  }

  /**
   * One step up (`ArrowUp`). A disabled thumb does not move.
   *
   * `ArrowRight` is the same key press in an LTR slider and the OPPOSITE one in
   * an RTL slider, so the vertical arrow is the one that means "up" everywhere.
   */
  async stepUp(): Promise<void> {
    return this.press(TestKey.UP_ARROW);
  }

  /** One step down (`ArrowDown`; `ArrowLeft` only agrees in LTR — see {@link stepUp}). */
  async stepDown(): Promise<void> {
    return this.press(TestKey.DOWN_ARROW);
  }

  /** Ten steps up (`PageUp`; `Shift`+arrow is the same stride). */
  async largeStepUp(): Promise<void> {
    return this.press(TestKey.PAGE_UP);
  }

  /** Ten steps down (`PageDown`; `Shift`+arrow is the same stride). */
  async largeStepDown(): Promise<void> {
    return this.press(TestKey.PAGE_DOWN);
  }

  /**
   * `Home` — jump to the lowest value this thumb can reach.
   *
   * On a range slider's UPPER thumb that lands on the lower thumb, not on the
   * slider's `min`: the component asks for `min` and then refuses to let the
   * ends cross, so the range collapses instead of inverting.
   */
  async toMin(): Promise<void> {
    return this.press(TestKey.HOME);
  }

  /**
   * `End` — jump to the highest value this thumb can reach.
   *
   * On a range slider's LOWER thumb that lands on the upper thumb, not on the
   * slider's `max`, for the same reason as {@link toMin}.
   */
  async toMax(): Promise<void> {
    return this.press(TestKey.END);
  }

  /**
   * Walk the thumb to `value` FROM THE KEYBOARD — `PageUp` / `PageDown` for the
   * distance, arrows for the last stretch, `Home` / `End` for the bounds. That
   * is the accessible path, and the only one a unit test can trust.
   *
   * There is deliberately no drag. jsdom has no layout: the track measures 0×0
   * and `getBoundingClientRect()` answers all zeros, while the component turns a
   * pointer into a value by dividing the offset by the track width. Every
   * positive offset therefore divides by zero, clamps to a ratio of 1 and writes
   * the slider's MAX — quietly, with no error to notice. A coordinate cannot
   * mean anything here.
   *
   * It costs one press per stride, so the walk is not free: crossing most of a
   * 0–100 range costs ~19 presses at `step="1"` and ~109 at `step="0.1"`.
   * Landing exactly on a bound is one press, whatever the step. The walk gives
   * up after 1000 presses — a 0–100 range reaches that at `step="0.01"` or finer
   * — and throws rather than spin.
   *
   * A bound the step grid misses is announced but not reachable: `aria-valuemax`
   * is the `max` input, while the component snaps every key press onto whole
   * steps from `min`, so `max="100" step="3"` stops at 99. That is the off-grid
   * throw, arriving for `setValue(100)`.
   *
   * Either the thumb ends up exactly on `value` or this throws: when `value` is
   * outside the thumb's window (the other thumb is one end of it in range mode),
   * when the thumb is disabled, and when `value` is not on the step grid — on
   * the last one the thumb is left at the nearest value it could reach.
   */
  async setValue(value: number): Promise<void> {
    if (await this.isDisabled()) {
      throw new Error('WrSliderThumbHarness.setValue(): the slider is disabled, so the keyboard cannot move it.');
    }

    const [min, max] = [await this.getMin(), await this.getMax()];
    if (value < min || value > max) {
      throw new Error(
        `WrSliderThumbHarness.setValue(): ${value} is outside the [${min}, ${max}] window this thumb can ` +
          'reach. On a range slider the other thumb is one end of that window — move it first.'
      );
    }

    let current = await this.getValue();
    if (current === value) return;
    // The bounds are one key press, and on a range thumb `Home` / `End` stop at
    // the neighbour — which is precisely this window's end. The landing is still
    // checked: a `max` that is not a whole number of steps from `min` is
    // announced by `aria-valuemax` and refused by the component's snapping.
    if (value === min || value === max) {
      await (value === min ? this.toMin() : this.toMax());
      return this.assertSettled(await this.getValue(), value, min);
    }

    let presses = 0;
    // Start on the ten-step stride: neither stride is published to the DOM, so
    // the only way to learn one is to take it and look. One overshoot is pressed
    // back off and the rest of the walk goes a single step at a time.
    let striding = true;

    while (current !== value) {
      if (presses >= MAX_PRESSES) {
        throw new Error(
          `WrSliderThumbHarness.setValue(): gave up walking to ${value} after ${MAX_PRESSES} key presses ` +
            `(reached ${current}). A step this fine is not something a keyboard reaches — write the ` +
            'slider through its `[(value)]` model instead.'
        );
      }

      // Re-derived every pass so the walk follows wherever the thumb actually
      // landed rather than where a stride aimed. It never has to reverse: the
      // window check above keeps the target inside [min, max], so pressing back
      // off an overshoot lands at or short of where the stride began — on the
      // same side of the target it started on.
      const direction: 1 | -1 = value > current ? 1 : -1;
      await this.press(this.strideKey(direction, striding));
      presses++;

      const next = await this.getValue();
      // Nothing moved: the thumb is pinned against a bound or its neighbour, and
      // pressing again would only spin. The final check below reports where.
      if (next === current) break;

      const overshot = direction === 1 ? next > value : next < value;
      current = next;
      if (!overshot) continue;

      await this.press(this.strideKey(direction === 1 ? -1 : 1, striding));
      presses++;
      current = await this.getValue();

      // Single steps straddling the target means it is not on the step grid.
      if (!striding) break;
      striding = false;
    }

    this.assertSettled(current, value, min);
  }

  /**
   * The landing check every path through {@link setValue} ends on: exactly the
   * value asked for, or an error naming where the thumb stopped instead.
   */
  private assertSettled(current: number, value: number, min: number): void {
    if (current === value) return;
    throw new Error(
      `WrSliderThumbHarness.setValue(): the keyboard settled on ${current} instead of ${value}. The thumb ` +
        `moves in whole steps from ${min}, so only values on that grid are reachable.`
    );
  }

  /** The key that moves the thumb one stride in `direction`. */
  private strideKey(direction: 1 | -1, striding: boolean): TestKey {
    if (striding) return direction === 1 ? TestKey.PAGE_UP : TestKey.PAGE_DOWN;
    // The vertical arrows, for the reason {@link stepUp} gives: the horizontal
    // pair swaps meaning under `dir="rtl"`, which would send the fine stretch of
    // the walk away from its target.
    return direction === 1 ? TestKey.UP_ARROW : TestKey.DOWN_ARROW;
  }

  /**
   * Press a key on the thumb.
   *
   * `sendKeys` focuses the element first, so this is the whole gesture a user
   * makes — the component listens for `keydown` on the thumb itself.
   */
  private async press(key: TestKey): Promise<void> {
    return (await this.host()).sendKeys(key);
  }

  /**
   * One of the ARIA range attributes as a number.
   *
   * Throws instead of handing back `NaN`: a slider whose `aria-valuenow` is not
   * a number is broken in a way every later assertion would describe badly.
   */
  private async numeric(attribute: string): Promise<number> {
    const raw = await (await this.host()).getAttribute(attribute);
    const value = raw === null ? Number.NaN : Number.parseFloat(raw);

    if (Number.isNaN(value)) {
      throw new Error(`WrSliderThumbHarness: the thumb's ${attribute} is ${JSON.stringify(raw)}, not a number.`);
    }
    return value;
  }
}
