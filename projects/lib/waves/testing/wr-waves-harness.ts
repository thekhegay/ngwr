/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrWavesHarnessFilters } from './interfaces';

/** `--wr-waves-x-gap: 40px` on the host's own `style` attribute — the pitch, as published. */
const X_GAP = /(?:^|;)\s*--wr-waves-x-gap\s*:\s*([^;]+)/;

/**
 * Test harness for `<wr-waves>` — a field of lines drifting on perlin noise.
 *
 * **The lines themselves are unreadable and always will be.** They are strokes on a 2D
 * canvas, seeded from the host's measured box and redrawn every frame; a unit test has
 * no box and no drawing context, so there is nothing to count and nothing to compare.
 * What the component publishes to the DOM is small, deliberate and worth pinning: the
 * handover flag {@link isPainted}, the pitch {@link getLineGapPx} that the CSS stand-in
 * grid draws at before the canvas takes over, and the surface itself.
 *
 * Two style reads, taken two different ways, and the difference is the point.
 * {@link getBackgroundColor} is computed, because nothing but the component declares
 * that property and the resolved value is what gets painted. {@link getLineGapPx} is
 * read from the inline declaration, because the stylesheet declares
 * `--wr-waves-x-gap` too — as the stand-in's own 10px fallback — so a computed read
 * would answer `10px` on a component that had stopped publishing anything, which is
 * precisely the break the method exists to catch.
 *
 * There is no `getLineCount()`, `getPoints()` or `getCanvasSize()`: the grid is seeded
 * from `getBoundingClientRect()`, which is 0×0 here, and the numbers that fall out of
 * that describe nothing. No `getLineColor()` either — it is a canvas `strokeStyle`
 * resolved from a themed custom property that only a stylesheet can supply. No
 * `moveMouse()`: the pointer listeners are on `window` and are only installed once a
 * context exists. And no `isReducedMotion()`, which is the sharpest of them — the
 * reduced-motion path draws one static grid through the same code and sets the same
 * flag, so the DOM is identical either way and any answer would be a guess.
 *
 * @example
 * ```ts
 * const waves = await loader.getHarness(WrWavesHarness);
 *
 * expect(await waves.hasCanvas()).toBe(true);
 * expect(await waves.isDecorative()).toBe(true);
 * expect(await waves.getLineGapPx()).toBe(10);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrWavesHarness extends ComponentHarness {
  static hostSelector = 'wr-waves';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrWavesHarnessFilters = {}): HarnessPredicate<WrWavesHarness> {
    return new HarnessPredicate(WrWavesHarness, options).addOption(
      'painted',
      options.painted,
      async (harness, painted) => (await harness.isPainted()) === painted
    );
  }

  private readonly canvas = this.locatorFor('.wr-waves__canvas');

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
    return (await this.host()).hasClass('wr-waves--painted');
  }

  /**
   * The horizontal gap between lines, in pixels, as the component publishes it.
   *
   * `[xGap]` feeds the canvas maths, which is invisible here — but it is also published
   * to the stand-in grid, and that is the half a spec can hold: a field whose stand-in
   * draws at 10px and whose canvas then arrives at 40px changes pitch under the reader
   * on hydration, a visible pop that nothing else can catch.
   */
  async getLineGapPx(): Promise<number> {
    const style = (await (await this.host()).getAttribute('style')) ?? '';
    const match = X_GAP.exec(style);
    const gap = match ? Number.parseFloat(match[1]) : Number.NaN;
    if (Number.isNaN(gap)) {
      throw new Error(
        `WrWavesHarness.getLineGapPx(): the host publishes no \`--wr-waves-x-gap\` (style: "${style}"). The ` +
          'component writes it from `[xGap]` on every render, so its absence means the stand-in grid has fallen ' +
          "back to the stylesheet's own 10px and no longer follows the input."
      );
    }
    return gap;
  }

  /**
   * The fill behind the lines, resolved.
   *
   * Comes back as the browser reports it rather than as it was authored — the default
   * `'transparent'` reads as `'rgba(0, 0, 0, 0)'` and `'#5227ff'` as
   * `'rgb(82, 39, 255)'` — which is true in jsdom and in a real browser alike, so an
   * assertion written against it travels. Worth pinning because the alternative
   * implementation is to fill the canvas instead, and a canvas fill is invisible to
   * everything until it has painted: the background has to be a real declaration on the
   * host so the field is the right colour from the prerendered HTML onwards.
   */
  async getBackgroundColor(): Promise<string> {
    return (await this.host()).getCssValue('background-color');
  }

  /**
   * Whether the field is hidden from assistive tech.
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
   * prerendered, no 2D context, reduced motion. That is the contract: the element goes
   * up and the component stops, so the stand-in grid has something to sit behind and
   * {@link isPainted} has something to answer about.
   */
  async hasCanvas(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-waves__canvas')()) !== null;
  }
}
