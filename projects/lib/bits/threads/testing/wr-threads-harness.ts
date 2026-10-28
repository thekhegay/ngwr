/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrThreadsHarnessFilters } from './types';

/** `--wr-threads-count: 18` on the host's own `style` attribute — the count, as published. */
const COUNT = /(?:^|;)\s*--wr-threads-count\s*:\s*([^;]+)/;

/** `--wr-threads-line-width: 1px` on the host's own `style` attribute — the width, as published. */
const LINE_WIDTH = /(?:^|;)\s*--wr-threads-line-width\s*:\s*([^;]+)/;

/**
 * Test harness for `<wr-threads>` — thin lines flowing across a box like strands in a
 * current.
 *
 * **The threads themselves are unreadable and always will be.** They are strokes on a
 * 2D canvas, laid out from the host's measured box and redrawn every frame; a unit test
 * has no box, and plain jsdom no drawing context, so there is nothing to count and
 * nothing to compare. What the component publishes to the DOM is small, deliberate and worth
 * pinning: the handover flag {@link isPainted}, the geometry the CSS stand-in draws at
 * before the canvas takes over ({@link getLineCount}, {@link getLineWidthPx}), and the
 * surface itself.
 *
 * Both geometry reads come from the host's inline declarations, never from a computed
 * style: the stylesheet declares `--wr-threads-count` and `--wr-threads-line-width` too,
 * as the stand-in's own fallbacks, so a computed read would answer `18` and `1px` on a
 * component that had stopped publishing anything — precisely the break the methods
 * exist to catch. And both report what the canvas DRAWS, which is not always what was
 * bound: the count is rounded and held between 1 and 100, the width kept at 0.25px or
 * more, so `[lineCount]="0"` reads back as `1`.
 *
 * There is no `getColor()`: the colour is a canvas `strokeStyle` resolved from a themed
 * custom property that only a stylesheet can supply. No `getPoints()` or
 * `getCanvasSize()`: both fall out of the host's layout box, which is 0×0 here. No
 * `movePointer()`: the pointer listener is on `window`, installed only once a context
 * exists, and what it moves is canvas strokes. And no `isReducedMotion()`, the sharpest
 * of them — the reduced-motion path draws its one still frame through the same code and
 * sets the same flag, so the DOM is identical either way and any answer would be a
 * guess.
 *
 * @example
 * ```ts
 * const threads = await loader.getHarness(WrThreadsHarness);
 *
 * expect(await threads.hasCanvas()).toBe(true);
 * expect(await threads.isDecorative()).toBe(true);
 * expect(await threads.getLineCount()).toBe(18);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrThreadsHarness extends ComponentHarness {
  static hostSelector = 'wr-threads';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrThreadsHarnessFilters = {}): HarnessPredicate<WrThreadsHarness> {
    return new HarnessPredicate(WrThreadsHarness, options).addOption(
      'painted',
      options.painted,
      async (harness, painted) => (await harness.isPainted()) === painted
    );
  }

  private readonly canvas = this.locatorFor('.wr-threads__canvas');

  /**
   * Whether the canvas has drawn a frame and retired the CSS stand-in threads.
   *
   * **`false` for as long as the environment gives no 2D context, and that is correct.**
   * Plain jsdom hands back none, so the component leaves the stand-in up rather than
   * declare itself painted over a blank box — the flag is set inside the draw for that
   * reason, not at the end of the boot. Where a context exists — a spec that stubs
   * `getContext('2d')`, or jsdom with the `canvas` package installed — it turns `true`
   * once the first frame is drawn: at once under reduced motion, on the first animation
   * frame otherwise.
   */
  async isPainted(): Promise<boolean> {
    return (await this.host()).hasClass('wr-threads--painted');
  }

  /**
   * How many threads the canvas draws, as the component publishes it for the stand-in.
   *
   * A stand-in drawing eighteen lines that the canvas then replaces with six changes
   * the picture under the reader on hydration — a visible pop nothing else can catch.
   */
  async getLineCount(): Promise<number> {
    return this.published(COUNT, 'getLineCount', '--wr-threads-count', '`[lineCount]`');
  }

  /** The stroke width of each thread, in pixels, as the component publishes it for the stand-in. */
  async getLineWidthPx(): Promise<number> {
    return this.published(LINE_WIDTH, 'getLineWidthPx', '--wr-threads-line-width', '`[lineWidth]`');
  }

  /**
   * Whether the background is hidden from assistive tech.
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
   * prerendered, no 2D context, reduced motion before its frame. That is the contract:
   * the element goes up and the component stops, so the stand-in has something to sit
   * behind and {@link isPainted} has something to answer about.
   */
  async hasCanvas(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-threads__canvas')()) !== null;
  }

  private async published(pattern: RegExp, method: string, property: string, input: string): Promise<number> {
    const style = (await (await this.host()).getAttribute('style')) ?? '';
    const match = pattern.exec(style);
    const value = match ? Number.parseFloat(match[1]) : Number.NaN;
    if (Number.isNaN(value)) {
      throw new Error(
        `WrThreadsHarness.${method}(): the host publishes no \`${property}\` (style: "${style}"). The ` +
          `component writes it from ${input} on every render, so its absence means the stand-in has fallen ` +
          "back to the stylesheet's own default and no longer follows the input."
      );
    }
    return value;
  }
}
