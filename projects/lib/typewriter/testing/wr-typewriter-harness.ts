/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, type TestElement } from '@angular/cdk/testing';

import type { WrTypewriterHarnessFilters } from './interfaces';

/** The one text node the state machine writes into — the whole of its observable output. */
const CONTENT = '.wr-typewriter__content';

/** The caret. Not hidden when it is unwanted — removed from the document entirely. */
const CURSOR = '.wr-typewriter__cursor';

/**
 * A `color:` declaration in an inline `style` attribute.
 *
 * The run has to start at the beginning or just after a `;` so that `background-color`
 * — or any other `-color` longhand a consumer's own style attribute might carry — cannot
 * be mistaken for it.
 */
const INLINE_COLOR = /(?:^|;)\s*color\s*:\s*([^;]+)/;

/** Exactly what the element holds — untrimmed, unlike `TestElement.text()`. */
async function rawText(element: TestElement): Promise<string> {
  return (await element.getProperty<string | null>('textContent')) ?? '';
}

/**
 * Test harness for `<wr-typewriter>`.
 *
 * **The typed string is the entire component, and it is a moving target.**
 * {@link getText} reads the one text node the machine writes into, which mid-run holds
 * a FRAGMENT — `'Hell'` on the way to `'Hello'` — and between sentences holds whatever
 * is left of the previous one. That is not a limitation to work around; it is what the
 * component renders, and pinning it tick by tick is what proves the machine types one
 * character at a time, deletes one at a time, pauses, cycles, and stops when told not to
 * loop. Install fake timers for `setTimeout` / `clearTimeout` only and advance the clock
 * yourself before every read — awaiting a harness method flushes microtasks, never
 * timers, so an unadvanced read answers with the previous frame.
 *
 * **What is typed is also what is announced, and no second copy exists.** There is
 * deliberately no `getAccessibleText()` here: the component renders one plain text node
 * and nothing else, so a screen reader landing mid-word hears the fragment. (Its sibling
 * `wr-rotating-text` carries a visually-hidden copy of the whole phrase; this one does
 * not, and inventing a method that implied otherwise would report an accessible layer
 * that is not there.) The single a11y decision the component does make is the caret, and
 * {@link isCursorDecorative} is how a spec holds it: without `aria-hidden` every phrase
 * is announced as `Hello pipe`, and nothing else in the DOM would change.
 *
 * **The methods that are missing are missing on purpose.** There is no `isTyping()` or
 * `getPhase()` — the phase is a private signal that never reaches the document, and its
 * only proxy, the caret vanishing, exists solely when `hideCursorWhileTyping` is set, so
 * the method would report "not typing" for the DEFAULT configuration while the machine
 * types. No `isComplete()` / `isFinished()`: a machine stopped on its last sentence and
 * one pausing between sentences render the identical string and the identical caret, so
 * assert the `sentenceComplete` output instead. No `isCursorBlinking()` /
 * `getCursorOpacity()`: the blink is a `@keyframes` rule from a stylesheet a unit test
 * never loads, and a mid-animation opacity is a number that means nothing.
 * No `isVisible()` / `waitForVisible()`: `startOnVisible` hangs off an
 * `IntersectionObserver` jsdom does not implement, so any answer would be the spec's own
 * stub echoing back. And no `getTypingSpeed()` / `getDeletingSpeed()` /
 * `getPauseDuration()` / `getInitialDelay()`: none of them is ever written to the DOM, so
 * reading them would mean reading the component instance rather than the rendered
 * control. They are observable exactly once — as the cadence of {@link getText}.
 *
 * What DOES survive a test with no layout, besides the string: the caret's presence,
 * glyph and `aria-hidden`, and the two values the host writes inline —
 * {@link getColor} and {@link getCursorBlinkDuration}.
 *
 * ```ts
 * // jsdom implements no IntersectionObserver, so `[startOnVisible]` throws on boot.
 * vi.stubGlobal('IntersectionObserver', StubObserver);
 * // Fake these two and no more: faking the microtask queue deadlocks `whenStable`,
 * // which is where the machine boots and where every harness read stabilizes.
 * vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
 * ```
 *
 * @example
 * ```ts
 * const typewriter = await loader.getHarness(WrTypewriterHarness);
 *
 * vi.advanceTimersByTime(0);            // the first tick is scheduled at `initialDelay`
 * expect(await typewriter.getText()).toBe('H');
 *
 * vi.advanceTimersByTime(50);
 * expect(await typewriter.getText()).toBe('He');
 * expect(await typewriter.isCursorDecorative()).toBe(true);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrTypewriterHarness extends ComponentHarness {
  static hostSelector = 'wr-typewriter';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrTypewriterHarnessFilters = {}): HarnessPredicate<WrTypewriterHarness> {
    return new HarnessPredicate(WrTypewriterHarness, options)
      .addOption('text', options.text, (harness, text) => HarnessPredicate.stringMatches(harness.getText(), text))
      .addOption(
        'hasCursor',
        options.hasCursor,
        async (harness, hasCursor) => (await harness.hasCursor()) === hasCursor
      );
  }

  private readonly content = this.locatorFor(CONTENT);
  private readonly cursor = this.locatorForOptional(CURSOR);

  /**
   * One custom property off the host's `style` ATTRIBUTE.
   *
   * Not `getCssValue()`, which is `getComputedStyle`: with the entry point's own
   * stylesheet loaded that resolves the sheet's declaration, so the method
   * answers plausibly at exactly the moment the host binding — the thing under
   * test — is what broke. The sibling reader below already says this; the
   * blink duration was reading the computed value anyway.
   */
  private async inlineVar(property: string): Promise<string> {
    const attr = (await (await this.host()).getAttribute('style')) ?? '';
    const found = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`).exec(attr);
    return (found?.[1] ?? '').trim();
  }

  /**
   * What has been typed so far — a FRAGMENT while the machine is running.
   *
   * This is the whole state machine in one string, and every timing input is observable
   * only through it: one character per `typingSpeed`, one fewer per `deletingSpeed`, the
   * `pauseDuration` gap, the swap to the next entry in `[texts]`, and the stop that
   * `[loop]="false"` puts on the last sentence. `reverseMode` shows up here too, and
   * `[...await getText()].length` is what proves the reversal counted CODE POINTS: a
   * `split('')` reversal turns one emoji into two lone surrogates, which is a pair of
   * broken glyphs on screen and the same character count as a correct answer.
   *
   * Untrimmed, because the fragment is what it is: a phrase typed as far as `'Hello '`
   * genuinely has a trailing space, and trimming would make that frame indistinguishable
   * from the one before it.
   *
   * The empty string is a real state, not a failure — nothing has been typed until the
   * first tick fires, and a deletion run passes back through it on its way to the next
   * sentence.
   */
  async getText(): Promise<string> {
    return rawText(await this.content());
  }

  /**
   * Whether a caret is in the document at all.
   *
   * The component removes the element rather than hiding it, which makes this two
   * questions at once. Statically it answers `showCursor`. While the machine runs it
   * also answers `hideCursorWhileTyping` — and the caret going away is the ONLY evidence
   * anywhere in the DOM that the component considers itself mid-phase, since the phase
   * signal is private. Do not read that as `isTyping()`, though: with
   * `hideCursorWhileTyping` off, which is the default, the caret stays put from the first
   * character to the last.
   */
  async hasCursor(): Promise<boolean> {
    return (await this.cursor()) !== null;
  }

  /**
   * The caret glyph, or `null` when there is no caret.
   *
   * `null` rather than `''` on purpose: "no cursor element" and "a cursor element
   * rendering nothing" are different failures, and an interpolated glyph that stopped
   * arriving is exactly the second one. Untrimmed, since a caret can legitimately be a
   * space-padded glyph and `TestElement.text()` would erase it.
   */
  async getCursorCharacter(): Promise<string | null> {
    const cursor = await this.cursor();
    return cursor ? rawText(cursor) : null;
  }

  /**
   * Whether the caret is kept out of the accessibility tree.
   *
   * The component's one deliberate a11y decision, and a silent one to lose: drop the
   * attribute and nothing on screen changes while every phrase starts being announced as
   * `Hello pipe`.
   *
   * Throws when there is no caret. `false` would read as "the caret is announced", which
   * is the opposite of what an absent caret means — and it is the answer a component that
   * stopped rendering its cursor entirely would also give. Ask {@link hasCursor} first
   * when the caret's presence is itself in question.
   */
  async isCursorDecorative(): Promise<boolean> {
    const cursor = await this.cursor();

    if (!cursor) {
      throw new Error(
        'WrTypewriterHarness.isCursorDecorative(): this <wr-typewriter> has no cursor element, so there is ' +
          'nothing to be hidden from a screen reader and "false" would read as "the cursor is announced" — the ' +
          'opposite of what an absent cursor means. `showCursor` is off, or `hideCursorWhileTyping` has taken ' +
          'it away for this phase; ask hasCursor().'
      );
    }

    return (await cursor.getAttribute('aria-hidden')) === 'true';
  }

  /**
   * The caret's blink half-cycle in seconds, from the custom property the host writes.
   *
   * The blink itself is a CSS keyframe and unobservable, so this custom property is the
   * only channel `[cursorBlinkDuration]` has into it — a binding that quietly stopped
   * writing it would leave the blink stuck at the stylesheet's default with no other
   * symptom anywhere.
   *
   * Throws rather than answering when the property is missing or unparseable, and says
   * which it was. The stylesheet's own `0.5s` fallback is never applied in a test that
   * loads no stylesheets, so an absent property reads as the empty string here — and
   * `0.5` returned from a `parseFloat('')` would be indistinguishable from the component
   * writing the default correctly.
   */
  async getCursorBlinkDuration(): Promise<number> {
    const raw = await this.inlineVar('--wr-typewriter-cursor-blink');
    const seconds = Number.parseFloat(raw);

    if (!Number.isFinite(seconds)) {
      throw new Error(
        `WrTypewriterHarness.getCursorBlinkDuration(): --wr-typewriter-cursor-blink reads ${JSON.stringify(raw)}, ` +
          'which is not a number of seconds. The component writes this property inline on every render; the ' +
          'stylesheet default behind it never applies in a test, so an empty read means the binding stopped ' +
          'reaching the DOM rather than that the caret blinks at 0.5s.'
      );
    }

    return seconds;
  }

  /**
   * The colour the host paints the phrase in, exactly as it is written inline.
   *
   * `[textColors]` cycles per SENTENCE, so this is how a spec pins that the colour index
   * follows the sentence index rather than drifting; and with no colours given the
   * component writes the literal `inherit`, which is a value worth asserting rather than
   * an absence.
   *
   * Read off the `style` ATTRIBUTE rather than through `getCssValue`, which would answer
   * from a computed style. jsdom hands `inherit` straight back, so `getCssValue` would
   * agree here and lie in a real browser, where the keyword resolves to whatever rgb
   * triple the parent happens to carry.
   *
   * Throws when the host carries no `color` declaration: the component writes one on
   * every render, so its absence means the binding is gone, and any string returned in
   * its place would be a guess at what the page inherits.
   */
  async getColor(): Promise<string> {
    const style = (await (await this.host()).getAttribute('style')) ?? '';
    const declaration = INLINE_COLOR.exec(style);

    if (!declaration) {
      throw new Error(
        `WrTypewriterHarness.getColor(): the host carries no inline color — its style attribute is ` +
          `${JSON.stringify(style)}. The component writes one on every render, "inherit" when [textColors] is ` +
          'empty, so nothing there means the binding stopped reaching the DOM.'
      );
    }

    return declaration[1].trim();
  }
}
