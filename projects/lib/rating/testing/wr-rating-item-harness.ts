/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrRatingItemHarnessFilters } from './interfaces';

/** The star's own box, once it is known to have one. */
interface WrRatingItemBox {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Test harness for one star of a `<wr-rating>`.
 *
 * A star is invisible to a screen reader — the row above it is the `slider` and
 * owns the whole accessible story — but it carries the state the eye reads: how
 * far it is filled, whether it is still a click target, and, while the pointer is
 * over the row, the PREVIEW rather than the committed value. That is the reason
 * this exists as a harness of its own.
 *
 * The fill is read from `--wr-rating-fill`, the per-star custom property the
 * component sets and the stylesheet clips the filled glyph with — a public token,
 * and the only place a half star exists in the DOM.
 *
 * @example
 * ```ts
 * const rating = await loader.getHarness(WrRatingHarness.with({ label: 'Overall' }));
 * const [, , third] = await rating.getItems();
 *
 * expect(await third.isPartiallyFilled()).toBe(true);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrRatingItemHarness extends ComponentHarness {
  static hostSelector = '.wr-rating__slot';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrRatingItemHarnessFilters = {}): HarnessPredicate<WrRatingItemHarness> {
    return new HarnessPredicate(WrRatingItemHarness, options)
      .addOption('fill', options.fill, async (harness, fill) => (await harness.getFill()) === fill)
      .addOption(
        'interactive',
        options.interactive,
        async (harness, interactive) => (await harness.isInteractive()) === interactive
      );
  }

  /**
   * How much of this star is painted, `0` to `1`.
   *
   * While the pointer is over the rating this is the PREVIEW — the component
   * paints `hoverValue ?? value`, so a hovered star reads full before anything is
   * committed. `WrRatingHarness.getValue()` is the committed one.
   */
  async getFill(): Promise<number> {
    const raw = (await (await this.host()).getCssValue('--wr-rating-fill')).trim();
    const fill = Number.parseFloat(raw);
    if (Number.isNaN(fill)) {
      throw new Error(
        `WrRatingItemHarness: could not read this star's fill — \`--wr-rating-fill\` computed to "${raw}". ` +
          'The rating sets it per star; an environment that drops custom properties cannot answer this.'
      );
    }
    return fill;
  }

  /** Whether the star is painted whole. */
  async isFilled(): Promise<boolean> {
    return (await this.getFill()) >= 1;
  }

  /**
   * Whether the star is painted part-way — a half star.
   *
   * Any fractional value paints one, not only `step="0.5"`: the step governs the
   * keyboard and the pointer, but a fraction written straight into `value` is only
   * clamped to `[0, count]`, never snapped — so `[value]="3.5"` half-fills star four
   * on a whole-star rating.
   */
  async isPartiallyFilled(): Promise<boolean> {
    const fill = await this.getFill();
    return fill > 0 && fill < 1;
  }

  /** Whether the star still takes the pointer — a readonly or disabled rating drops the modifier. */
  async isInteractive(): Promise<boolean> {
    return (await this.host()).hasClass('wr-rating__slot--interactive');
  }

  /**
   * Click this star, picking it whole — star three sets the value to `3`.
   *
   * Clicking the value the rating ALREADY holds clears it instead; that is the
   * component's toggle-off, not an accident of this harness.
   *
   * Needs real layout: the component snaps the value from where the pointer sits
   * inside the star, so this aims at the star's trailing edge. In jsdom every
   * element is 0×0 and a pointer position over one cannot mean anything — this
   * throws rather than committing the `NaN` such a click computes. Reach for
   * `WrRatingHarness.setValue()` there, which drives the keyboard.
   */
  async click(): Promise<void> {
    const { width, height } = await this.box();
    await (await this.host()).click(width, height / 2);
  }

  /**
   * Click the leading half of this star — `2.5` on star three.
   *
   * On a whole-star rating this is the same as {@link click}: the component snaps
   * UP to its `step`, so half of star three is still three stars. Carries the same
   * layout requirement.
   */
  async clickHalf(): Promise<void> {
    const { width, height } = await this.box();
    await (await this.host()).click(width / 2, height / 2);
  }

  /**
   * Move the pointer onto this star, previewing it whole.
   *
   * Sends `mousemove` rather than the `TestElement.hover()` pair: the rating
   * tracks the pointer's x across a star to decide whether it is over the half or
   * the whole, so `mouseenter` alone tells it nothing and leaves the preview
   * unchanged. `WrRatingHarness.unhover()` ends it. Carries the same layout
   * requirement as {@link click}.
   */
  async hover(): Promise<void> {
    const { left, top, width, height } = await this.box();
    await (await this.host()).dispatchEvent('mousemove', { clientX: left + width, clientY: top + height / 2 });
  }

  /** The star's box, or a failure that names the reason it has none. */
  private async box(): Promise<WrRatingItemBox> {
    const { left, top, width, height } = await (await this.host()).getDimensions();
    if (!width) {
      throw new Error(
        'WrRatingItemHarness: this star has no layout, so a pointer position over it means nothing — the ' +
          'rating reads the value off where the pointer sits INSIDE the star. Every element is 0×0 in jsdom: ' +
          'use `WrRatingHarness.setValue()`, which drives the keyboard, or stub `getBoundingClientRect`.'
      );
    }
    return { left, top, width, height };
  }
}
