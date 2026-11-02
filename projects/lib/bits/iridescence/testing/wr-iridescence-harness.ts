/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrIridescenceHarnessFilters } from './types';

/** `--wr-iridescence-color: …` on the host's own `style` attribute, a value as published. */
const PUBLISHED_COLOR = /(?:^|;)\s*--wr-iridescence-color\s*:\s*([^;]+)/;

/**
 * Test harness for `<wr-iridescence>` — folded silk on a WebGL2 canvas.
 *
 * **The picture is unreadable and always will be.** It is a fragment shader's output,
 * and jsdom has no WebGL2 to run one. What the component publishes to the DOM is small
 * and deliberate: the handover flag {@link isPainted}, the colour {@link getColor} it
 * hands the CSS stand-in, and the surface itself.
 *
 * The colour is read from the host's inline declaration, never computed: the stylesheet
 * declares `--wr-iridescence-color` too, as the theme's own default, so a computed read
 * would answer on a component that had stopped publishing anything, the break the method
 * exists to catch.
 *
 * There is no `getPhase()`: the phases live in a frame loop, step by the real frame
 * delta and leave the component only as a uniform, so any number would be a stale copy
 * of an implementation detail. No pixel reads: a stub context paints nothing, and with
 * no stub there is no context. No `isAnimating()`: a loop that is running and a loop
 * that was never started look the same from the DOM, and a frame that would repeat the
 * last one draws nothing either way. And no `stir()`: the pointer's easing runs on
 * frames and its result goes to a uniform, so a method that moved it could report
 * nothing it had done.
 *
 * @example
 * ```ts
 * const silk = await loader.getHarness(WrIridescenceHarness);
 *
 * expect(await silk.hasCanvas()).toBe(true);
 * expect(await silk.isDecorative()).toBe(true);
 * expect(await silk.getColor()).toBe('var(--wr-color-primary)');
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrIridescenceHarness extends ComponentHarness {
  static hostSelector = 'wr-iridescence';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrIridescenceHarnessFilters = {}): HarnessPredicate<WrIridescenceHarness> {
    return new HarnessPredicate(WrIridescenceHarness, options).addOption(
      'painted',
      options.painted,
      async (harness, painted) => (await harness.isPainted()) === painted
    );
  }

  private readonly canvas = this.locatorFor('.wr-iridescence__canvas');

  /**
   * Whether the canvas has drawn a frame and is fading in over the CSS stand-in.
   *
   * **In a plain unit test this is `false`, and asserting exactly that is the point.**
   * jsdom hands back no WebGL2 context, so the component must leave the stand-in up
   * rather than declare itself painted over a blank box: the flag is set inside the draw
   * for that reason, not at the end of the boot. A spec that stubs a context and runs a
   * frame gets `true`, and a lost context takes it back to `false`.
   */
  async isPainted(): Promise<boolean> {
    return (await this.host()).hasClass('wr-iridescence--painted');
  }

  /**
   * The colour written onto the host's own hook for the stand-in, or `null` when none is:
   * `[color]` unset, empty or blank, which leaves the stylesheet's value in charge, or an
   * expression built on the hook itself, which written there would be a cycle.
   *
   * It is the input as authored, a `var()` or a `light-dark()` included, not what it
   * resolves to: what reaches the shader is a uniform, which the DOM does not carry. A
   * stand-in tinted one colour while the canvas arrives in another is what this catches.
   */
  async getColor(): Promise<string | null> {
    const style = (await (await this.host()).getAttribute('style')) ?? '';
    return PUBLISHED_COLOR.exec(style)?.[1].trim() ?? null;
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
   * It is there in every state, including the ones where nothing is ever drawn on it
   * (prerendered, no WebGL2, a shader the driver refused), so the stand-in has something
   * to sit behind and {@link isPainted} has something to answer about.
   */
  async hasCanvas(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-iridescence__canvas')()) !== null;
  }
}
