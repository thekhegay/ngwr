/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrDotGridHarnessFilters } from './types';

/** `--wr-dot-grid-<name>: 24px` on the host's own `style` attribute — a value as published. */
const published = (name: string): RegExp => new RegExp(`(?:^|;)\\s*--wr-dot-grid-${name}\\s*:\\s*([^;]+)`);

/**
 * Test harness for `<wr-dot-grid>` — a field of dots that light up and move aside
 * near the pointer.
 *
 * **The dots themselves are unreadable and always will be.** They are fills on a 2D
 * canvas, laid out from the host's measured box; a unit test has no box and no
 * drawing context, so there is nothing to count and nothing to compare. What the
 * component publishes to the DOM is small and deliberate: the handover flag
 * {@link isPainted}, the pitch {@link getGapPx} and size {@link getDotSizePx} the CSS
 * stand-in grid draws at before the canvas takes over, and the surface itself.
 *
 * Both numbers are read from the host's inline declaration, never computed: the
 * stylesheet declares `--wr-dot-grid-gap` and `--wr-dot-grid-dot-size` too, as the
 * stand-in's own defaults, so a computed read would answer `24` and `3` on a
 * component that had stopped publishing anything — the break the methods exist to
 * catch.
 *
 * There is no `getDotCount()`, `getDotPositions()` or `getCanvasSize()`: the grid is
 * laid out from `getBoundingClientRect()`, which is 0×0 here, and what falls out of
 * that describes nothing. No `getDotColor()` or `getActiveColor()` — they are canvas
 * fills resolved from themed custom properties that only a stylesheet supplies. No
 * `hover()` or `moveTo()`: the pointer listeners go on only once a context exists,
 * and what they move is canvas pixels. And no `isReducedMotion()`: the still grid is
 * drawn through the same code and sets the same flag, so the DOM is identical either
 * way and any answer would be a guess.
 *
 * @example
 * ```ts
 * const grid = await loader.getHarness(WrDotGridHarness);
 *
 * expect(await grid.hasCanvas()).toBe(true);
 * expect(await grid.isDecorative()).toBe(true);
 * expect(await grid.getGapPx()).toBe(24);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrDotGridHarness extends ComponentHarness {
  static hostSelector = 'wr-dot-grid';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrDotGridHarnessFilters = {}): HarnessPredicate<WrDotGridHarness> {
    return new HarnessPredicate(WrDotGridHarness, options).addOption(
      'painted',
      options.painted,
      async (harness, painted) => (await harness.isPainted()) === painted
    );
  }

  private readonly canvas = this.locatorFor('.wr-dot-grid__canvas');

  /**
   * Whether the canvas has drawn a frame and retired the CSS stand-in grid.
   *
   * **In a unit test this is always `false`, and asserting exactly that is the point.**
   * jsdom hands back no 2D context, so the component must leave the stand-in up rather
   * than declare itself painted over a blank box — the flag is set inside the draw for
   * that reason, not at the end of the boot. A spec that waits for this to turn `true`
   * waits forever.
   */
  async isPainted(): Promise<boolean> {
    return (await this.host()).hasClass('wr-dot-grid--painted');
  }

  /**
   * The distance between dot centres, in pixels, as the component publishes it —
   * `[gap]`, floored at the 4px the canvas lays the grid out at.
   *
   * The canvas half of `[gap]` is invisible here, but the stand-in half is not, and a
   * stand-in drawing at one pitch while the canvas arrives at another changes the
   * grid under the reader on hydration.
   */
  async getGapPx(): Promise<number> {
    return this.publishedPx('gap', 'getGapPx', '[gap]', '24px');
  }

  /** The dot diameter, in pixels, as the component publishes it for the stand-in — `[dotSize]`. */
  async getDotSizePx(): Promise<number> {
    return this.publishedPx('dot-size', 'getDotSizePx', '[dotSize]', '3px');
  }

  /**
   * Whether the grid is hidden from assistive tech.
   *
   * A background canvas has nothing to announce, so losing this leaves a screen reader
   * stopping on a nameless graphic in front of the section's actual content.
   */
  async isDecorative(): Promise<boolean> {
    return (await (await this.canvas()).getAttribute('aria-hidden')) === 'true';
  }

  /**
   * Whether the drawing surface is in the markup.
   *
   * It is there in every state, including the ones where nothing is ever drawn on it —
   * prerendered, no 2D context, reduced motion — so the stand-in has something to sit
   * behind and {@link isPainted} has something to answer about.
   */
  async hasCanvas(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-dot-grid__canvas')()) !== null;
  }

  private async publishedPx(name: string, method: string, input: string, fallback: string): Promise<number> {
    const style = (await (await this.host()).getAttribute('style')) ?? '';
    const match = published(name).exec(style);
    const value = match ? Number.parseFloat(match[1]) : Number.NaN;
    if (Number.isNaN(value)) {
      throw new Error(
        `WrDotGridHarness.${method}(): the host publishes no \`--wr-dot-grid-${name}\` (style: "${style}"). The ` +
          `component writes it from \`${input}\` on every render, so its absence means the stand-in grid has ` +
          `fallen back to the stylesheet's own ${fallback} and no longer follows the input.`
      );
    }
    return value;
  }
}
