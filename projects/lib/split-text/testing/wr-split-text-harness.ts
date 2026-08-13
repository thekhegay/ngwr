/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, type TestElement } from '@angular/cdk/testing';

import type { WrSplitTextHarnessFilters } from './interfaces';

/** The animated pieces — one per character or per word, whitespace excluded. */
const PIECE = '.wr-split-text__piece';

/** The whitespace runs between them, rendered but never staggered. */
const SPACE = '.wr-split-text__space';

/** The readable copy of the string, carried once and hidden with CSS. */
const SR_ONLY = '.wr-split-text__sr-only';

/**
 * An inline `opacity` declaration — written on every piece the tween touches.
 *
 * `motionToStyle` always produces an opacity, whether or not `from` declared one, and
 * the same property is re-committed when the tween finishes. Matched off the `style`
 * ATTRIBUTE, never through `getCssValue`: a computed style answers `1` for a piece
 * nothing was ever written to, which is the exact case this has to distinguish.
 */
const INLINE_OPACITY = /(?:^|;)\s*opacity\s*:/;

/** The host's own alignment declaration, as the host binding wrote it. */
const INLINE_TEXT_ALIGN = /(?:^|;)\s*text-align\s*:\s*([^;]+)/;

/** Exactly what the element holds — untrimmed, unlike `TestElement.text()`. */
async function rawText(element: TestElement): Promise<string> {
  return (await element.getProperty<string | null>('textContent')) ?? '';
}

/**
 * Test harness for `<wr-split-text>`.
 *
 * **The tween is unreadable from a test, and the absent methods are absent for that
 * reason.** Each piece is animated from a `from` motion state to a `to` one through the
 * Web Animations API, started by an `IntersectionObserver`. A unit test has no layout,
 * no compositor and no WAAPI, so there is no `getOpacity()` and no `getTransform()`:
 * both would report the frozen staged value in jsdom and a value the compositor is not
 * painting in a browser. There is no `getFromState()` / `getToState()` either — those
 * objects only reach the DOM as staged inline styles, on the one path that throws here,
 * so reporting them would mean re-deriving an input from a string the component may
 * never have written. No `isAnimating()`, no `whenAnimationComplete()`: nothing in the
 * document says a tween is running, and completion is the `animationComplete` OUTPUT,
 * which the host binds. No `enterViewport()` / `trigger()`, because an observer is not
 * reachable from a `TestElement` — and observation here is additionally gated behind
 * `document.fonts.ready`, which jsdom does not have, so a `waitForFonts()` would resolve
 * instantly and prove nothing about the gating it claimed to test. Nothing measures
 * either: `getLineCount()` / `didItWrap()` would need layout (and `lines` is not a split
 * this port supports), and the `overflow: hidden` mask with its descender compensation
 * is a stylesheet, which a test runs none of.
 *
 * **What is real is the split, the accessible layer and the alignment.** The string is
 * carried once in a visually-hidden span and every drawn piece is `aria-hidden`, so
 * {@link getAccessibleText} is what is heard while {@link getPieces} is what is drawn —
 * two questions, and a spec asserting only the second would pass on a component that
 * spells the text out letter by letter. {@link getRenderedText} closes the loop by
 * putting the pieces and the spaces back together: the split has to be lossless, and
 * that comparison is what catches a dropped space or a halved surrogate pair. Whether
 * the hidden copy is genuinely off-screen is CSS, so nothing here claims to know.
 *
 * **{@link getTextAlign} is the one input this component reflects**, written straight
 * onto the host as an inline style — an honest read with no layout involved, unlike
 * anything else about how the text is arranged. And {@link hasStagedMotion} is the one
 * fact about the tween worth pinning: that the pieces were taken over, not that anything
 * is moving.
 *
 * Driving the reveal is the spec's job — jsdom supplies neither half of it, and the font
 * gate defers observation by a microtask:
 *
 * ```ts
 * // Before TestBed.createComponent — keep the callbacks so the spec can fire them.
 * vi.stubGlobal('IntersectionObserver', StubObserver);
 * // Otherwise `el.animate(...)` throws mid-stagger and leaves the DOM half-staged.
 * Reflect.set(Element.prototype, 'animate', () => ({ cancel: () => undefined, onfinish: null }));
 * // …and always settle before tearing down: observation is queued off a promise, and
 * // landing after destroy() registers a teardown on a dead DestroyRef (NG0911).
 * await fixture.whenStable();
 * ```
 *
 * @example
 * ```ts
 * const hero = await loader.getHarness(WrSplitTextHarness.with({ textAlign: 'center' }));
 *
 * expect(await hero.getPieces()).toEqual(['H', 'e', 'l', 'l', 'o']);
 * expect(await hero.getRenderedText()).toBe(await hero.getAccessibleText());
 * expect(await hero.isTextHidden()).toBe(true);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrSplitTextHarness extends ComponentHarness {
  static hostSelector = 'wr-split-text';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrSplitTextHarnessFilters = {}): HarnessPredicate<WrSplitTextHarness> {
    return new HarnessPredicate(WrSplitTextHarness, options)
      .addOption('text', options.text, (harness, text) =>
        HarnessPredicate.stringMatches(harness.getAccessibleText(), text)
      )
      .addOption('pieceCount', options.pieceCount, async (harness, count) => (await harness.getPieceCount()) === count)
      .addOption('textAlign', options.textAlign, async (harness, align) => (await harness.getTextAlign()) === align);
  }

  private readonly pieces = this.locatorForAll(PIECE);
  private readonly spaces = this.locatorForAll(SPACE);

  /**
   * The whole string, as the one readable copy holds it.
   *
   * All a screen reader gets, since every drawn piece is out of the tree — lose this
   * span and the component becomes a nameless pile of hidden spans, with no other
   * symptom anywhere in the DOM.
   *
   * Untrimmed, deliberately: leading and trailing whitespace is content the split has to
   * carry, and {@link getRenderedText} is meant to compare equal to this. A trimmed read
   * on one side of that comparison would forgive the case it exists to catch.
   */
  async getAccessibleText(): Promise<string> {
    return rawText(await this.locatorFor(SR_ONLY)());
  }

  /**
   * The animated pieces, in document order — one per character, or one per word.
   *
   * The split the stagger runs over: `['H', 'i']` at the default `splitType="chars"`
   * against `['Hi', 'there']` for `"words"`, and `['a', '🚀']` for a surrogate pair the
   * code-point split kept whole instead of halving into two broken glyphs. Whitespace is
   * not here — it is drawn separately and never staggered, so see {@link getSpaceCount}.
   */
  async getPieces(): Promise<string[]> {
    return Promise.all((await this.pieces()).map(rawText));
  }

  /**
   * How many pieces the stagger runs over.
   *
   * `delay` × this is the real length of the effect, and the only number about the
   * animation present in the document.
   */
  async getPieceCount(): Promise<number> {
    return (await this.pieces()).length;
  }

  /**
   * How many whitespace runs sit between the pieces.
   *
   * Its own method because whitespace is deliberately excluded from the animated set:
   * reclassifying spaces as pieces would leave {@link getRenderedText} identical, change
   * the stagger count and the rhythm of the reveal, and show up nowhere else.
   */
  async getSpaceCount(): Promise<number> {
    return (await this.spaces()).length;
  }

  /**
   * Everything the component drew, pieces and spaces together, in document order.
   *
   * The assertion this exists for is `getRenderedText() === getAccessibleText()`: the
   * split must be lossless. A swallowed space, a re-split that dropped a character or a
   * surrogate pair cut in half all leave the accessible copy intact and are invisible
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
   * `H. e. l. l. o.`, and one piece missing `aria-hidden` brings it back — so this is
   * all-or-nothing, across both element kinds: a readable space is heard as a pause in
   * the middle of a word.
   *
   * Throws when the split produced nothing at all. An empty run of elements satisfies
   * "every one of them is hidden" without anything being hidden, which is also what a
   * component that stopped rendering its pieces would report.
   */
  async isTextHidden(): Promise<boolean> {
    const parts = await this.locatorForAll(`${PIECE}, ${SPACE}`)();

    if (parts.length === 0) {
      throw new Error(
        'WrSplitTextHarness.isTextHidden(): this <wr-split-text> drew no pieces, so there is nothing to be ' +
          'hidden from a screen reader and "true" would be a vacuous answer — the same one a component that ' +
          'stopped splitting its text would give. Check `text` is set, or ask getPieceCount().'
      );
    }

    const hidden = await Promise.all(parts.map(part => part.getAttribute('aria-hidden')));
    return hidden.every(value => value === 'true');
  }

  /**
   * The alignment the host was given, as the component wrote it.
   *
   * Off the inline `style` attribute rather than through `getCssValue`, and the
   * difference is not pedantry: computed style answers for an element nobody wrote to —
   * with the inherited or user-agent value — so a host that stopped reflecting the input
   * altogether would keep reporting a plausible `left` or `start`. The attribute is the
   * fact being asserted.
   *
   * `null` means the host carries no alignment at all, which the component never does:
   * the binding is unconditional and the input defaults to `'center'`.
   */
  async getTextAlign(): Promise<string | null> {
    const match = INLINE_TEXT_ALIGN.exec((await (await this.host()).getAttribute('style')) ?? '');
    return match ? match[1].trim() : null;
  }

  /**
   * Whether the reveal has taken the pieces over — NOT whether anything is animating.
   *
   * Read off the inline `style` attribute the component writes itself, so it stays
   * `true` once the reveal has finished: the tween commits its end state back to the
   * same inline properties on `onfinish`. Anyone reaching for `isAnimating()` wants a
   * frame, and there are no frames here.
   *
   * `false` is the answer worth asserting. It means no piece was written to, which is
   * both the pre-trigger state and the reduced-motion promise — the component returns
   * before staging anything, so a reader who asked for less motion cannot be left with
   * text parked at `from.opacity: 0` by a tween that never runs.
   *
   * ANY piece counts, not all of them, and that is the conservative reading rather than
   * a loose one: a stagger that stages the first piece and then throws leaves exactly
   * one glyph invisible, which is a real failure — and one jsdom reproduces every time
   * `Element.prototype.animate` is missing.
   */
  async hasStagedMotion(): Promise<boolean> {
    const styles = await Promise.all((await this.pieces()).map(piece => piece.getAttribute('style')));
    return styles.some(style => INLINE_OPACITY.test(style ?? ''));
  }
}
