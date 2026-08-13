/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrFuzzyTextHarnessFilters } from './interfaces';

/**
 * Test harness for `<wr-fuzzy-text>` — a headline drawn into a canvas, one row of pixels
 * at a time, with a random offset per row.
 *
 * **The drawing is out of reach and the accessible half is not, which is the whole shape
 * of this harness.** There is no 2D context in a unit test — `getContext('2d')` returns
 * `null`, and the component's `init()` gives up on the line after — so nothing downstream
 * of that ever happens: no font load, no animation frame, no canvas listeners, no sizing.
 * What survives is the markup, and the markup is the part that regressed: everything this
 * component rendered used to be a canvas, so a screen reader got an empty element where
 * the page showed a headline. {@link getText} and {@link isDecorative} are that fix,
 * asserted as the PAIR it has to be — a readable copy plus a hidden pixel copy. Reading
 * one without the other passes just as happily on a component that announces the headline
 * twice.
 *
 * **The canvas is selected by tag, not by a class.** It carries no BEM name, unlike the
 * two sibling animation canvases — this entry point ships no stylesheet at all, which is
 * also why {@link isTextVisuallyHidden} is a real question rather than a formality.
 *
 * Nothing about the animation is offered, and none of it is a gap that could be closed by
 * trying harder. There is no `getIntensity()` / `isFuzzing()` / `isGlitching()`: those are
 * closure variables inside `init()` that only ever manifest as pixels, and in a test the
 * function returns before they exist. No `hover()` / `click()` / `getHoverIntensity()`:
 * the pointer listeners are attached only after a real context AND a resolved
 * `document.fonts` — neither of which a unit test has — so a dispatched event would land
 * on nothing and the assertion would pass vacuously; the hit test also measures the canvas
 * box, which is all zeros. No `getCanvasSize()`, which would be asserting jsdom's untouched
 * 300×150 default rather than the component's layout maths. No `getColor()` /
 * `getFontSize()` / `getFontFamily()` / `getGradient()`: every one of those becomes a
 * canvas font string or a fill style and never reaches the DOM. No `getRenderedText()` or
 * `readPixel()` — there are no pixels, and faking a context would change what every spec
 * here is testing. And no `isReducedMotion()`: the preference is honoured by taking a
 * different DRAWING path, with identical markup, classes and attributes either way, so the
 * method would answer the same for a component that honoured it and one that ignored it.
 *
 * @example
 * ```ts
 * const headline = await loader.getHarness(WrFuzzyTextHarness.with({ text: '404' }));
 *
 * expect(await headline.getText()).toBe('404');
 * expect(await headline.isDecorative()).toBe(true);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrFuzzyTextHarness extends ComponentHarness {
  static hostSelector = 'wr-fuzzy-text';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrFuzzyTextHarnessFilters = {}): HarnessPredicate<WrFuzzyTextHarness> {
    return new HarnessPredicate(WrFuzzyTextHarness, options).addOption('text', options.text, (harness, text) =>
      HarnessPredicate.stringMatches(harness.getText(), text)
    );
  }

  private readonly srOnly = this.locatorFor('.wr-fuzzy-text__sr-only');
  private readonly canvas = this.locatorForOptional('canvas');

  /**
   * The headline as TEXT, trimmed.
   *
   * From the screen-reader span, which is the only place the string exists as characters —
   * the visible copy is glyphs painted into a canvas. This is the single assertion that
   * separates the component from an empty box for anyone not looking at the screen, and it
   * is the one that has already regressed once.
   *
   * There is no letter-by-letter split to worry about here, unlike the other text
   * animations in the library: the span holds one text node, so what a reader announces is
   * what {@link WrFuzzyTextHarness.getText} returns.
   */
  async getText(): Promise<string> {
    return (await this.srOnly()).text();
  }

  /**
   * Whether the pixel copy stays out of the accessibility tree.
   *
   * The other half of {@link getText}. The canvas has no text and no name, so without its
   * `aria-hidden` a reader meets an anonymous element next to the headline it already
   * read — or, if the span ever goes away again, only the anonymous element. Asserting the
   * two together is what pins the arrangement; asserting either alone does not.
   */
  async isDecorative(): Promise<boolean> {
    const canvas = await this.canvas();
    if (!canvas) {
      throw new Error(
        'WrFuzzyTextHarness.isDecorative(): there is no <canvas> in this headline at all, so there is nothing to ' +
          'keep out of the accessibility tree. That is a different failure from an announced canvas — ask ' +
          'hasCanvas() to tell the two apart.'
      );
    }
    return (await canvas.getAttribute('aria-hidden')) === 'true';
  }

  /**
   * Whether the drawing surface is in the markup.
   *
   * True even where it can never be painted — under SSR, in a prerender, in a browser that
   * refuses a 2D context, and in every unit test — because the element is rendered
   * unconditionally and only the drawing depends on a context. That is precisely the state
   * the readable copy exists to cover, so this is the method that says "the fallback is
   * carrying the page right now".
   */
  async hasCanvas(): Promise<boolean> {
    return (await this.canvas()) !== null;
  }

  /**
   * Whether the readable copy hides itself without a stylesheet.
   *
   * This entry point ships no CSS. The span is therefore hidden with inline declarations
   * rather than an `.sr-only` class, and that is load-bearing rather than a style choice:
   * move the block into a class and every consumer who imported no CSS sees the headline
   * twice — once as pixels, once as a stray line of markup underneath.
   *
   * Three of the declarations are checked, not one, because they fail apart: `position`
   * takes the span out of flow, the 1px box collapses it, and `clip-path` is what keeps
   * the character still reachable by a reader instead of `display: none`-ing it away.
   */
  async isTextVisuallyHidden(): Promise<boolean> {
    const span = await this.srOnly();
    const [position, width, clipPath] = await Promise.all([
      span.getCssValue('position'),
      span.getCssValue('width'),
      span.getCssValue('clip-path'),
    ]);
    return position === 'absolute' && width === '1px' && clipPath === 'inset(50%)';
  }
}
