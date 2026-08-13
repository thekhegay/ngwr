/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, type TestElement } from '@angular/cdk/testing';

import type { WrBlurTextHarnessFilters } from './interfaces';

/** The animated pieces — one per word or per character, whitespace excluded. */
const PIECE = '.wr-blur-text__piece';

/** The whitespace runs between them, rendered but never staggered. */
const SPACE = '.wr-blur-text__space';

/** The readable copy of the string, carried once and hidden with CSS. */
const SR_ONLY = '.wr-blur-text__sr-only';

/**
 * An inline `opacity` declaration — the one property the reveal writes on every path.
 *
 * It is staged before the tween starts and re-committed when it finishes, so its
 * presence is the durable evidence that the component touched a piece at all. Matched
 * off the `style` ATTRIBUTE rather than through `getCssValue`, which would answer from
 * a computed style and report `1` for a piece nobody ever wrote to.
 */
const INLINE_OPACITY = /(?:^|;)\s*opacity\s*:/;

/** Exactly what the element holds — untrimmed, unlike `TestElement.text()`. */
async function rawText(element: TestElement): Promise<string> {
  return (await element.getProperty<string | null>('textContent')) ?? '';
}

/**
 * Test harness for `<wr-blur-text>`.
 *
 * **Most of what this component does cannot be read from a test, and the methods that
 * are missing are missing on purpose.** The reveal is a Web Animations tween per piece
 * — blur, vertical offset and opacity, staggered — started by an `IntersectionObserver`.
 * A unit test has no layout, no compositor and no WAAPI, so there is no
 * `getOpacity()`, no `getBlurRadius()` and no `getOffset()`: each would report the
 * staged from-state forever in jsdom, and in a real browser it would report the inline
 * value while the compositor paints a different one. There is no `isAnimating()` and no
 * `whenAnimationComplete()` either — nothing in the DOM says a tween is running, and
 * completion is the `animationComplete` OUTPUT, which the host binds. Nor is there an
 * `enterViewport()` / `scrollIntoView()`: the trigger is an observer, which a
 * `TestElement` cannot reach, and a method that pretended to scroll would do nothing in
 * jsdom and something untimed in a browser. The inputs that shape the tween —
 * `direction`, `delay`, `stepDuration`, `easing` — never reach the DOM at all; they live
 * in a keyframe array and an effect timing, and neither is a document.
 *
 * **What is real is the split and the accessible layer, and they are two questions.**
 * The string is carried once in a visually-hidden span, and every animated piece is
 * `aria-hidden` so a screen reader does not spell the text out letter by letter — so
 * {@link getAccessibleText} is what is heard and {@link getPieces} is what is drawn, and
 * a spec that only asserted the second would pass on a component that announces
 * `W. e. l. c. o. m. e.` {@link getRenderedText} closes the loop: the split has to be
 * lossless, and comparing it against the accessible copy is what catches a dropped space
 * or a halved surrogate pair. (Whether the hidden copy is really off-screen is CSS —
 * `clip-path` and a 1px box — and a test running no stylesheets cannot tell a correctly
 * hidden span from one printing the string twice, so nothing here claims to.)
 *
 * **{@link hasStagedMotion} is the one thing about the tween worth pinning**, and it
 * reports that the pieces were taken over rather than that anything is moving. Under
 * reduced motion the component returns before touching them, which is the promise: a
 * reader who asked for less motion must never be left with text staged at `opacity: 0`
 * by an animation that then never runs.
 *
 * Driving the reveal is the spec's job, since jsdom supplies neither half of it:
 *
 * ```ts
 * // Before TestBed.createComponent — keep the callbacks so the spec can fire them.
 * vi.stubGlobal('IntersectionObserver', StubObserver);
 * // Otherwise `el.animate(...)` throws mid-stagger and leaves the DOM half-staged.
 * Reflect.set(Element.prototype, 'animate', () => ({ cancel: () => undefined, onfinish: null }));
 * ```
 *
 * @example
 * ```ts
 * const text = await loader.getHarness(WrBlurTextHarness.with({ text: 'Welcome to ngwr' }));
 *
 * expect(await text.getPieces()).toEqual(['Welcome', 'to', 'ngwr']);
 * expect(await text.getRenderedText()).toBe(await text.getAccessibleText());
 * expect(await text.isTextHidden()).toBe(true);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrBlurTextHarness extends ComponentHarness {
  static hostSelector = 'wr-blur-text';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrBlurTextHarnessFilters = {}): HarnessPredicate<WrBlurTextHarness> {
    return new HarnessPredicate(WrBlurTextHarness, options)
      .addOption('text', options.text, (harness, text) =>
        HarnessPredicate.stringMatches(harness.getAccessibleText(), text)
      )
      .addOption('pieceCount', options.pieceCount, async (harness, count) => (await harness.getPieceCount()) === count);
  }

  private readonly pieces = this.locatorForAll(PIECE);
  private readonly spaces = this.locatorForAll(SPACE);

  /**
   * The whole string, as the one readable copy holds it.
   *
   * The only thing a screen reader gets, since every drawn piece is out of the tree —
   * lose this span and the component becomes a nameless pile of hidden spans with no
   * other symptom anywhere in the DOM.
   *
   * Untrimmed, deliberately. Leading and trailing whitespace is content the split has to
   * carry through, and {@link getRenderedText} is meant to compare equal to this; a
   * trimmed read on one side of that comparison would quietly forgive the case it exists
   * to catch.
   */
  async getAccessibleText(): Promise<string> {
    return rawText(await this.locatorFor(SR_ONLY)());
  }

  /**
   * The animated pieces, in document order — one per word or one per character.
   *
   * This is the split the stagger runs over: `['Hi', 'there']` for `animateBy="words"`
   * against `['H', 'i', 't', 'h', 'e', 'r', 'e']` for `"chars"`, and `['a', '🚀']` for a
   * surrogate pair the code-point split kept whole rather than halved into two broken
   * glyphs. Whitespace is not here — it is rendered separately and never staggered, so
   * see {@link getSpaceCount}.
   */
  async getPieces(): Promise<string[]> {
    return Promise.all((await this.pieces()).map(rawText));
  }

  /**
   * How many pieces the stagger runs over.
   *
   * `delay` × this is the whole length of the effect, and it is the only number about
   * the animation that exists in the document.
   */
  async getPieceCount(): Promise<number> {
    return (await this.pieces()).length;
  }

  /**
   * How many whitespace runs sit between the pieces.
   *
   * Worth a method of its own because whitespace is deliberately NOT a staggered piece:
   * a regression that reclassified spaces as pieces would leave {@link getRenderedText}
   * identical, change the stagger count and the rhythm of the reveal, and show up
   * nowhere else.
   */
  async getSpaceCount(): Promise<number> {
    return (await this.spaces()).length;
  }

  /**
   * Everything the component drew, pieces and spaces together, in document order.
   *
   * The assertion this exists for is `getRenderedText() === getAccessibleText()`: the
   * split must be lossless. A swallowed space, a re-split that dropped a character, or a
   * surrogate pair cut in half all leave the accessible copy untouched and are invisible
   * from anywhere else.
   */
  async getRenderedText(): Promise<string> {
    const parts = await this.locatorForAll(`${PIECE}, ${SPACE}`)();
    return (await Promise.all(parts.map(rawText))).join('');
  }

  /**
   * Whether every drawn piece is out of the accessibility tree.
   *
   * The defect this component exists to avoid is a screen reader reading
   * `W. e. l. c. o. m. e.`, and one piece missing `aria-hidden` is enough to bring it
   * back — so this is all-or-nothing, and across both element kinds: a stray readable
   * space is heard as a pause in the middle of a word.
   *
   * Throws when the split produced nothing at all. An empty run of elements satisfies
   * "every one of them is hidden" without anything being hidden, which is the answer a
   * component that stopped rendering its pieces would also give.
   */
  async isTextHidden(): Promise<boolean> {
    const parts = await this.locatorForAll(`${PIECE}, ${SPACE}`)();

    if (parts.length === 0) {
      throw new Error(
        'WrBlurTextHarness.isTextHidden(): this <wr-blur-text> drew no pieces, so there is nothing to be ' +
          'hidden from a screen reader and "true" would be a vacuous answer — the same one a component that ' +
          'stopped splitting its text would give. Check `text` is set, or ask getPieceCount().'
      );
    }

    const hidden = await Promise.all(parts.map(part => part.getAttribute('aria-hidden')));
    return hidden.every(value => value === 'true');
  }

  /**
   * Whether the reveal has taken the pieces over — NOT whether anything is animating.
   *
   * Read off the inline `style` attribute the component writes itself, so it stays
   * `true` after the reveal finishes: the tween commits its end state back to the same
   * inline properties on `onfinish`. Anyone reaching for `isAnimating()` wants a frame,
   * and there are no frames here.
   *
   * `false` is the answer worth asserting. It means no piece was written to at all,
   * which is both the pre-trigger state and the reduced-motion promise — the component
   * returns before staging anything, so a reader who asked for less motion cannot be
   * left staring at text parked at `opacity: 0` by an animation that never runs.
   *
   * ANY piece counts, not all of them, and that is the conservative reading rather than
   * a loose one: a stagger that stages the first piece and then throws leaves exactly one
   * piece invisible, which is a real failure and one jsdom reproduces whenever
   * `Element.prototype.animate` is missing.
   */
  async hasStagedMotion(): Promise<boolean> {
    const styles = await Promise.all((await this.pieces()).map(piece => piece.getAttribute('style')));
    return styles.some(style => INLINE_OPACITY.test(style ?? ''));
  }
}
