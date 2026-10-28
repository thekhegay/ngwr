/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrRippleGridHarnessFilters } from './types';

/** `--wr-ripple-grid-<name>: 40px` on the host's own `style` attribute — a value as published. */
const published = (name: string): RegExp => new RegExp(`(?:^|;)\\s*--wr-ripple-grid-${name}\\s*:\\s*([^;]+)`);

/**
 * Test harness for `<wr-ripple-grid>` — grid lines the pointer sends ripples through.
 *
 * **The lines and the ripples are unreadable and always will be.** They are strokes on
 * a 2D canvas, laid out from the host's measured box and bent by rings that exist only
 * while frames run; a unit test has no box and no drawing context, so there is nothing
 * to count and nothing to compare. What the component publishes to the DOM is small
 * and deliberate: the handover flag {@link isPainted}, the cell {@link getCellSizePx}
 * and line width {@link getLineWidthPx} the CSS stand-in grid draws at before the
 * canvas takes over, and the surface itself.
 *
 * Both numbers are read from the host's inline declaration, never computed: the
 * stylesheet declares `--wr-ripple-grid-cell-size` and `--wr-ripple-grid-line-width`
 * too, as the stand-in's own defaults, so a computed read would answer `40` and `1` on
 * a component that had stopped publishing anything — the break the methods exist to
 * catch.
 *
 * There is no `getLineCount()`, `getRipples()` or `getCanvasSize()`: the grid is laid
 * out from the host's layout box, which is 0×0 here, and the rings live in a frame
 * loop jsdom never runs. No `getLineColor()` or `getRippleColor()` — they are canvas
 * strokes resolved from themed custom properties that only a stylesheet supplies. No
 * `press()` or `moveTo()`: the pointer listeners go on only once a context exists, and
 * what they move is canvas pixels. No `isIdle()`: the idle ring is a timer and a frame,
 * and neither leaves a trace in the DOM. And no `isReducedMotion()`: the still grid is
 * drawn through the same code and sets the same flag, so the DOM is identical either
 * way and any answer would be a guess.
 *
 * @example
 * ```ts
 * const grid = await loader.getHarness(WrRippleGridHarness);
 *
 * expect(await grid.hasCanvas()).toBe(true);
 * expect(await grid.isDecorative()).toBe(true);
 * expect(await grid.getCellSizePx()).toBe(40);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrRippleGridHarness extends ComponentHarness {
  static hostSelector = 'wr-ripple-grid';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrRippleGridHarnessFilters = {}): HarnessPredicate<WrRippleGridHarness> {
    return new HarnessPredicate(WrRippleGridHarness, options).addOption(
      'painted',
      options.painted,
      async (harness, painted) => (await harness.isPainted()) === painted
    );
  }

  private readonly canvas = this.locatorFor('.wr-ripple-grid__canvas');

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
    return (await this.host()).hasClass('wr-ripple-grid--painted');
  }

  /**
   * The distance between grid lines, in pixels, as the component publishes it —
   * `[cellSize]`, floored at the 12px the canvas lays the grid out at.
   *
   * The canvas half of `[cellSize]` is invisible here, but the stand-in half is not,
   * and a stand-in drawing at one cell while the canvas arrives at another moves every
   * line under the reader on hydration.
   */
  async getCellSizePx(): Promise<number> {
    return this.publishedPx('cell-size', 'getCellSizePx', '[cellSize]', '40px');
  }

  /**
   * The line width, in pixels, as the component publishes it for the stand-in —
   * `[lineWidth]`, floored at the 0.25px the canvas strokes at.
   */
  async getLineWidthPx(): Promise<number> {
    return this.publishedPx('line-width', 'getLineWidthPx', '[lineWidth]', '1px');
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
    return (await this.locatorForOptional('.wr-ripple-grid__canvas')()) !== null;
  }

  private async publishedPx(name: string, method: string, input: string, fallback: string): Promise<number> {
    const style = (await (await this.host()).getAttribute('style')) ?? '';
    const match = published(name).exec(style);
    const value = match ? Number.parseFloat(match[1]) : Number.NaN;
    if (Number.isNaN(value)) {
      throw new Error(
        `WrRippleGridHarness.${method}(): the host publishes no \`--wr-ripple-grid-${name}\` (style: "${style}"). ` +
          `The component writes it from \`${input}\` on every render, so its absence means the stand-in grid has ` +
          `fallen back to the stylesheet's own ${fallback} and no longer follows the input.`
      );
    }
    return value;
  }
}
