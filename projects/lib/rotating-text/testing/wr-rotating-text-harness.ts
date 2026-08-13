/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, type TestElement } from '@angular/cdk/testing';

import type { WrRotatingTextHarnessFilters } from './interfaces';

/** One animated piece — a grapheme, a word or a line, depending on `splitBy`. */
const CHAR = '.wr-rotating-text__char';

/** The whole animated layer, and the one element taken out of the a11y tree. */
const INNER = '.wr-rotating-text__inner';

/** The readable copy of the string showing now, carried once outside the animated layer. */
const SR_ONLY = '.wr-rotating-text__sr-only';

/** A word group — kept whether the word is drawn whole or exploded into characters. */
const WORD = '.wr-rotating-text__word';

/**
 * An inline `opacity: 1` — the end state the enter step commits on every piece.
 *
 * Matched off the `style` ATTRIBUTE, never through `getCssValue`: a computed style would
 * answer `1` for a piece nobody ever wrote to, which is the exact case worth telling
 * apart from a piece the component finished with.
 */
const SETTLED_OPACITY = /(?:^|;)\s*opacity\s*:\s*1\s*(?:;|$)/;

/** Exactly what the element holds — untrimmed, unlike `TestElement.text()`. */
async function rawText(element: TestElement): Promise<string> {
  return (await element.getProperty<string | null>('textContent')) ?? '';
}

/**
 * Test harness for `<wr-rotating-text>`.
 *
 * **What is announced and what is drawn are two questions, and this component is worth a
 * harness mostly because it answers them separately.** The string showing now is carried
 * verbatim in a visually-hidden span; the animated layer beside it is one span per
 * grapheme, word or line and is `aria-hidden` as a whole, so a screen reader hears `one`
 * rather than `o. n. e.` {@link getAccessibleText} is the first, {@link getRenderedText}
 * and {@link getPieces} the second, and {@link isAnimatedLayerHidden} together with
 * {@link hasAccessibleCopy} is the pairing that regresses silently when someone
 * restructures the template — pieces hidden AND no readable copy is an element with no
 * accessible text at all, which reads as a pass on either check alone.
 *
 * **The sr-only span is deliberately not a live region, and no method here implies
 * otherwise.** `auto` advances every two seconds by default, and the APG's answer for
 * self-advancing content is silence, not an announcement on a timer. What the harness
 * pins is that the announced copy TRACKS the current word — nothing about it being
 * spoken.
 *
 * **There is no `getIndex()`, and no `next()` / `previous()` / `jumpTo()` / `reset()`.**
 * The index appears nowhere in the DOM — no attribute, no data hook — so deriving it
 * would mean matching the shown string against a list the harness was never given, and
 * guessing between duplicates. And the component renders no controls at all: rotation is
 * a timer or a method call on the instance, so a harness "click" would have nothing to
 * click and reaching into the component would make this a wrapper around the class rather
 * than a reader of the DOM. Drive it from the spec — through the instance, or by
 * advancing the interval — and assert the `nextChange` output for the index.
 *
 * **Nothing here reports the tween.** `duration`, `easing`, `staggerDuration` and
 * `staggerFrom` are passed straight into Web Animation options and never written to the
 * document; `delayFor()` is arithmetic with no rendered trace. So no `getDuration()`, no
 * `getStagger()`, no `isAnimating()`. The pieces do carry inline `opacity` and
 * `transform`, but on the animated path those are the FIRST keyframe — `opacity: 0` on
 * text the user can see perfectly well — which is why the only reading offered is
 * {@link isSettled}, and why it is spelled as a commitment rather than as a state of
 * motion. The host's `overflow: hidden` clipping is layout, and every rect in a unit test
 * is 0×0, so there is no `isClipped()` either.
 *
 * jsdom implements no Web Animations API, so the animated path throws on the first
 * `el.animate` — before any assertion runs. Every spec supplies one half or the other:
 *
 * ```ts
 * // Either: mount under reduced motion, where each swap is instant and nothing tweens.
 * // (jsdom has no matchMedia, so WrPlatform must be provided as a value.)
 * TestBed.configureTestingModule({ providers: [{ provide: WrPlatform, useValue: reducedMotion }] });
 *
 * // Or: stub the API — and remember a stub that never fires `onfinish` never resolves
 * // the exit step, so the rotator stops after one swap.
 * Reflect.set(Element.prototype, 'animate', () => ({ cancel: () => undefined, onfinish: null }));
 * ```
 *
 * @example
 * ```ts
 * const rotator = await loader.getHarness(WrRotatingTextHarness);
 *
 * expect(await rotator.getAccessibleText()).toBe('design');
 * expect(await rotator.getPieces()).toEqual(['d', 'e', 's', 'i', 'g', 'n']);
 * expect(await rotator.isAnimatedLayerHidden()).toBe(true);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrRotatingTextHarness extends ComponentHarness {
  static hostSelector = 'wr-rotating-text';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrRotatingTextHarnessFilters = {}): HarnessPredicate<WrRotatingTextHarness> {
    return new HarnessPredicate(WrRotatingTextHarness, options)
      .addOption('text', options.text, (harness, text) =>
        HarnessPredicate.stringMatches(harness.getAccessibleText(), text)
      )
      .addOption('wordCount', options.wordCount, async (harness, count) => (await harness.getWordCount()) === count);
  }

  private readonly chars = this.locatorForAll(CHAR);

  /**
   * The string showing right now, as the one readable copy holds it.
   *
   * Literally what a screen reader gets, the animated layer being out of the tree — and
   * the thing to assert a rotation against, since it is where `next()`, `previous()`, a
   * clamped `jumpTo()`, `reset()`, the wrap at either end, the stop when `loop` is off and
   * the shrinking-list clamp all become visible.
   *
   * Throws when the copy is missing rather than answering with the pieces' text: an empty
   * string is what a rotator holding an empty list correctly reports, so a plausible
   * nothing here is indistinguishable from the component having lost its accessible name
   * entirely. Ask {@link hasAccessibleCopy} when presence is the question.
   */
  async getAccessibleText(): Promise<string> {
    const copy = await this.locatorForOptional(SR_ONLY)();

    if (!copy) {
      throw new Error(
        'WrRotatingTextHarness.getAccessibleText(): this <wr-rotating-text> renders no ' +
          `${SR_ONLY} span, so it has no accessible text at all — every piece it draws is aria-hidden. ` +
          'Reading the pieces instead would report a healthy-looking string for a component a screen ' +
          'reader cannot see.'
      );
    }

    return rawText(copy);
  }

  /**
   * Everything the animated layer draws, in document order, as one string.
   *
   * A different fact from {@link getAccessibleText}, and the comparison between them is
   * the point: a split that drops its spacer renders `hellothere` while the readable copy
   * stays perfect, and nothing else in the DOM says so.
   *
   * The spacer between words is a non-breaking space (`&nbsp;`), which is a rendering
   * choice rather than a contract, so it is normalized to a plain space here — otherwise
   * every round-trip assertion would have to spell U+00A0 out to pass against a working
   * component. Note that `splitBy="lines"` genuinely does not round-trip: the newline the
   * readable copy carries is drawn as that same spacer.
   */
  async getRenderedText(): Promise<string> {
    return (await rawText(await this.locatorFor(INNER)())).replace(/\u00a0/g, ' ');
  }

  /**
   * The animated pieces, in document order.
   *
   * The granularity actually applied: one piece per grapheme for `splitBy="characters"`,
   * one per word for `"words"`, one per line for `"lines"`. It is also where the grapheme
   * contract shows — `a🚀b` must come back as three pieces, not four with two broken
   * halves of a surrogate pair.
   */
  async getPieces(): Promise<string[]> {
    return Promise.all((await this.chars()).map(rawText));
  }

  /**
   * How many word groups the split produced.
   *
   * Word boundaries survive every granularity: three words stay three groups even when
   * each is exploded into characters, which is what keeps the line wrapping sane. A
   * splitter that flattened the grouping would leave {@link getPieces} correct and break
   * only this.
   */
  async getWordCount(): Promise<number> {
    return (await this.locatorForAll(WORD)()).length;
  }

  /**
   * Whether the animated layer is out of the accessibility tree.
   *
   * ONE attribute answers it — `aria-hidden` sits on the `__inner` wrapper, so the pieces
   * inherit it and none carries it itself, which keeps the attribute off the nodes the
   * tween writes to. Asserting it per piece would fail on a component that is behaving.
   *
   * If it regresses, every rotation is spelled out letter by letter beside the copy that
   * was already read, and nothing changes on screen — so no other check catches it.
   */
  async isAnimatedLayerHidden(): Promise<boolean> {
    return (await (await this.locatorFor(INNER)()).getAttribute('aria-hidden')) === 'true';
  }

  /**
   * Whether the readable copy is rendered at all.
   *
   * The other half of {@link isAnimatedLayerHidden}, and it exists as a separate question
   * because the failure the two catch together is invisible to each alone: a layer
   * correctly hidden with no readable copy beside it is a control with no accessible text
   * whatsoever, and `isAnimatedLayerHidden() === true` is exactly what it reports.
   */
  async hasAccessibleCopy(): Promise<boolean> {
    return (await this.locatorForOptional(SR_ONLY)()) !== null;
  }

  /**
   * Whether the enter step committed its end state on every piece — NOT whether an
   * animation finished.
   *
   * The component writes `opacity: 1` inline on each piece when the swap settles: instantly
   * under reduced motion, and from the tween's `onfinish` otherwise. So this answers "the
   * new word was actually taken over", which is the bug the deferred enter exists to
   * prevent — a swap that animates the OLD spans leaves the new ones staged at `opacity: 0`
   * and the text invisible, while the readable copy reports the new word correctly.
   *
   * It is all-or-nothing: one piece left staged is one invisible glyph in the middle of a
   * word. On the animated path it stays `false` until each tween finishes, which in a unit
   * test means forever, since a stubbed `Element.animate` never fires anything — that is
   * an honest answer about a swap that never landed, not a limitation to work around.
   *
   * Throws when there are no pieces: "every piece is settled" is true of none of them,
   * and that is also what a component that stopped rendering its text would report.
   */
  async isSettled(): Promise<boolean> {
    const pieces = await this.chars();

    if (pieces.length === 0) {
      throw new Error(
        'WrRotatingTextHarness.isSettled(): this <wr-rotating-text> drew no pieces, so "settled" would be ' +
          'vacuously true — the same answer a rotator that stopped rendering its text would give. Check ' +
          '`texts` is not empty, or ask getPieces().'
      );
    }

    const styles = await Promise.all(pieces.map(piece => piece.getAttribute('style')));
    return styles.every(style => SETTLED_OPACITY.test(style ?? ''));
  }
}
