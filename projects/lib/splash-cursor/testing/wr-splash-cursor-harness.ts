/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrSplashCursorHarnessFilters } from './interfaces';

/**
 * Test harness for `<wr-splash-cursor>` — a WebGL fluid that splashes dye under the
 * pointer.
 *
 * **This is a deliberately small surface, and the reason is the component.** The
 * simulation is GL programs and framebuffers driven by `window` pointer listeners; the
 * layout is `position: fixed`, `inset: 0`, `z-index: 50` and a `100dvh` canvas, all of
 * it in the stylesheet. A unit test gets no WebGL context — the simulation is never
 * constructed — and loads no stylesheet, so asking `getCssValue('position')` would
 * answer `static` about a component whose whole layout contract is `fixed`. Three
 * questions survive that, and they are the three below.
 *
 * There is no `isSimulating()`, `getSplatCount()` or `splat()`: the simulation returns
 * `null` the moment the context is refused, so every one of those would report on
 * something that was never built. No `moveMouse()` either — the listeners live on
 * `window` and are only attached once a context exists, so a dispatched move reaches
 * nothing. And no `isReducedMotion()` or `hasWebGL()`: the component renders
 * byte-identical DOM whether it is running, standing down for reduced motion, or on a
 * machine with no WebGL at all, so any answer would be the same for a working component
 * and a broken one.
 *
 * @example
 * ```ts
 * const splash = await loader.getHarness(WrSplashCursorHarness);
 *
 * expect(await splash.isFullscreen()).toBe(true);
 * expect(await splash.isDecorative()).toBe(true);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrSplashCursorHarness extends ComponentHarness {
  static hostSelector = 'wr-splash-cursor';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrSplashCursorHarnessFilters = {}): HarnessPredicate<WrSplashCursorHarness> {
    return new HarnessPredicate(WrSplashCursorHarness, options).addOption(
      'fullscreen',
      options.fullscreen,
      async (harness, fullscreen) => (await harness.isFullscreen()) === fullscreen
    );
  }

  /**
   * Whether the effect covers the whole viewport, rather than filling the nearest
   * positioned ancestor.
   *
   * The component's one behavioural switch: fullscreen is a fixed, click-through
   * overlay above the page, contained is an absolutely positioned box whose walls the
   * dye collides with. Note what is being read — there is no `--fullscreen` class, only
   * a `--contained` one written from a NEGATED binding, so this method answers the
   * absence of a class. That inversion is exactly the kind that gets flipped in a
   * refactor and looks fine on a page where the effect is full-viewport anyway, which
   * is the whole reason the method exists.
   */
  async isFullscreen(): Promise<boolean> {
    return !(await (await this.host()).hasClass('wr-splash-cursor--contained'));
  }

  /**
   * Whether the effect is hidden from assistive tech.
   *
   * It has no text and nothing to say, and at full size it sits in front of the entire
   * page — so losing this puts a nameless graphic over everything a screen reader is
   * trying to get through.
   */
  async isDecorative(): Promise<boolean> {
    return (await (await this.locatorFor('.wr-splash-cursor__canvas')()).getAttribute('aria-hidden')) === 'true';
  }

  /**
   * Whether the drawing surface is in the markup.
   *
   * It is there in all three states where nothing is ever drawn on it — prerendered on
   * the server, WebGL refused, or reduced motion — because the documented contract is
   * that the component renders nothing VISIBLE and stops, never that it renders no
   * element and never that it throws on a null context.
   */
  async hasCanvas(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-splash-cursor__canvas')()) !== null;
  }
}
