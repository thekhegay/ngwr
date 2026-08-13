/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, TestKey } from '@angular/cdk/testing';

import type { WrKnobHarnessFilters } from './interfaces';

/** The two arrow keys that raise the value, and the two that lower it. */
type Arrow = 'left' | 'right' | 'up' | 'down';

const ARROWS: Record<Arrow, TestKey> = {
  left: TestKey.LEFT_ARROW,
  right: TestKey.RIGHT_ARROW,
  up: TestKey.UP_ARROW,
  down: TestKey.DOWN_ARROW,
};

/** Enough presses to cross any sane range; a stall throws long before this. */
const WALK_LIMIT = 400;

/**
 * Test harness for `<wr-knob>` — the radial dial.
 *
 * **Driven by the keyboard, and the drag is not merely unsupported.** Turning the
 * dial with a pointer takes `getBoundingClientRect()`, measures the angle from the
 * centre to the cursor, and maps it onto a 270° arc. jsdom lays nothing out, so the
 * centre is `(0, 0)` and every synthetic gesture writes the same corner of the arc
 * whatever coordinates it is given — a `turnTo()` built on one would pass while
 * proving nothing. The arrows reach every value on the grid and are the accessible
 * path anyway.
 *
 * **Two questions about the value, not one.** {@link getValue} is the number
 * `aria-valuenow` carries; {@link getDisplayValue} is the string in the middle of the
 * dial, which the `suffix` input can make `"50%"` while the announced value stays
 * `50`. They are separate methods because they can disagree, and because
 * `showValue` can remove the text entirely without touching the value.
 *
 * @example
 * ```ts
 * const knob = await loader.getHarness(WrKnobHarness);
 *
 * await knob.setValue(60);
 * expect(await knob.getValue()).toBe(60);
 * expect(await knob.getDisplayValue()).toBe('60%');
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrKnobHarness extends ComponentHarness {
  static hostSelector = 'wr-knob';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrKnobHarnessFilters = {}): HarnessPredicate<WrKnobHarness> {
    return new HarnessPredicate(WrKnobHarness, options)
      .addOption('label', options.label, (harness, label) => HarnessPredicate.stringMatches(harness.getLabel(), label))
      .addOption('value', options.value, async (harness, value) => (await harness.getValue()) === value)
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled)
      .addOption('readonly', options.readonly, async (harness, readonly) => (await harness.isReadonly()) === readonly);
  }

  private readonly surface = this.locatorFor('.wr-knob__surface');

  /** The value the dial announces, from `aria-valuenow`. */
  async getValue(): Promise<number> {
    return this.numeric('aria-valuenow');
  }

  /** The bottom of the range, from `aria-valuemin`. */
  async getMin(): Promise<number> {
    return this.numeric('aria-valuemin');
  }

  /** The top of the range, from `aria-valuemax`. */
  async getMax(): Promise<number> {
    return this.numeric('aria-valuemax');
  }

  /**
   * The text printed in the middle of the dial, suffix included, or `null` when the
   * knob was built with `[showValue]="false"`.
   *
   * Not the same question as {@link getValue}: with a `suffix` the two disagree by
   * design, and a screen reader is told the bare number — the component publishes no
   * `aria-valuetext`, so `50` is what gets announced for a dial that reads `50%`.
   */
  async getDisplayValue(): Promise<string | null> {
    const text = await this.locatorForOptional('.wr-knob__text')();
    return text ? text.text() : null;
  }

  /** The suffix alone, or `null` when there is none (or no value text at all). */
  async getSuffix(): Promise<string | null> {
    const suffix = await this.locatorForOptional('.wr-knob__suffix')();
    if (!suffix) return null;
    const text = await suffix.text();
    return text === '' ? null : text;
  }

  /** The dial's accessible name — `role="slider"` needs one. */
  async getLabel(): Promise<string | null> {
    return (await this.surface()).getAttribute('aria-label');
  }

  /** Whether the dial is disabled, from `aria-disabled`. */
  async isDisabled(): Promise<boolean> {
    return (await (await this.surface()).getAttribute('aria-disabled')) === 'true';
  }

  /** Whether the dial is read-only, from `aria-readonly`. */
  async isReadonly(): Promise<boolean> {
    return (await (await this.surface()).getAttribute('aria-readonly')) === 'true';
  }

  /**
   * Whether the dial is a tab stop.
   *
   * The component drops it out of the tab order for BOTH disabled and read-only,
   * which is worth knowing: a read-only slider that a keyboard user cannot reach is
   * also one they cannot read, and this is the method that says so.
   */
  async isFocusable(): Promise<boolean> {
    return (await (await this.surface()).getAttribute('tabindex')) === '0';
  }

  /** Move keyboard focus to the dial. */
  async focus(): Promise<void> {
    return (await this.surface()).focus();
  }

  /** Whether the dial currently holds focus. */
  async isFocused(): Promise<boolean> {
    return (await this.surface()).isFocused();
  }

  /** Blur the dial — which is what emits `touch` for a knob moved with the keyboard. */
  async blur(): Promise<void> {
    return (await this.surface()).blur();
  }

  /**
   * Press one arrow key.
   *
   * Right and Up raise the value, Left and Down lower it — all four are live on this
   * component, which has one axis and no mirroring to do. `shift` multiplies the step
   * by ten.
   */
  async pressArrow(arrow: Arrow, options: { shift?: boolean } = {}): Promise<void> {
    const surface = await this.surface();
    await (options.shift ? surface.sendKeys({ shift: true }, ARROWS[arrow]) : surface.sendKeys(ARROWS[arrow]));
  }

  /** Press Home — the bottom of the range. */
  async pressHome(): Promise<void> {
    return (await this.surface()).sendKeys(TestKey.HOME);
  }

  /**
   * Press End — the top of the range, or the last value ON the grid below it: a range
   * that is not a whole number of steps cannot reach its own maximum.
   */
  async pressEnd(): Promise<void> {
    return (await this.surface()).sendKeys(TestKey.END);
  }

  /**
   * Walk the dial to a value with the arrow keys, and assert it landed there.
   *
   * It measures the step as it goes rather than being told it — `step` is an input
   * with no DOM presence, and the value can arrive off the grid, since an external
   * write is clamped but never snapped. So the first press may move by less than a
   * step (it snaps onto the grid) and the walk adapts, which also means the ten-step
   * hops only start once a real step has been seen.
   *
   * Throws rather than half-arriving, and the two reasons read differently: a target
   * outside `[min, max]` is refused before anything moves, while a target BETWEEN two
   * grid points is only discovered by overshooting it, and says where it landed. A
   * dial that will not move at all — disabled, read-only — is the third.
   */
  async setValue(target: number): Promise<void> {
    const [min, max] = [await this.getMin(), await this.getMax()];
    if (target < min || target > max) {
      throw new Error(
        `WrKnobHarness.setValue(${target}): out of range — this dial accepts ${min}–${max}. The component ` +
          'clamps, so the walk would stop at the bound and never reach the number asked for.'
      );
    }

    if (target === min) return this.pressHome();
    if (target === max) return this.pressEnd();

    await this.focus();
    let step: number | null = null;

    for (let guard = 0; guard < WALK_LIMIT; guard++) {
      const current = await this.getValue();
      if (current === target) return;

      const forward = target > current;
      const coarse = step !== null && Math.abs(target - current) >= step * 10;

      await this.pressArrow(forward ? 'right' : 'left', { shift: coarse });
      const now = await this.getValue();

      if (now === current) {
        throw new Error(
          `WrKnobHarness.setValue(${target}): the dial stopped moving at ${now}. A disabled or read-only ` +
            'knob ignores its arrows, which is the usual reason.'
        );
      }
      if (!coarse) step = Math.abs(now - current);
      if (now === target) return;

      if (forward ? now > target : now < target) {
        throw new Error(
          `WrKnobHarness.setValue(${target}): the walk stepped from ${current} to ${now}, straight past the ` +
            'target — it is not on the step grid, which the component measures from `min` rather than from zero.'
        );
      }
    }

    throw new Error(
      `WrKnobHarness.setValue(${target}): gave up after ${WALK_LIMIT} presses at ${await this.getValue()}.`
    );
  }

  /**
   * Where the handle dot sits, in the SVG's own 100×100 viewBox units.
   *
   * The dial's whole visual state is an arc path and this dot, and neither can be
   * measured in a unit test — but the dot's centre is written as plain `cx` / `cy`
   * attributes, so it reads with no layout at all. That makes it the evidence that
   * the drawing followed the value: at `min` the handle is at the 7 o'clock end of
   * the arc, at `max` the 5 o'clock end.
   */
  async getHandlePosition(): Promise<{ x: number; y: number }> {
    const handle = await this.locatorFor('.wr-knob__handle')();
    return {
      x: Number(await handle.getAttribute('cx')),
      y: Number(await handle.getAttribute('cy')),
    };
  }

  private async numeric(attribute: string): Promise<number> {
    const raw = await (await this.surface()).getAttribute(attribute);
    return raw === null ? Number.NaN : Number(raw);
  }
}
