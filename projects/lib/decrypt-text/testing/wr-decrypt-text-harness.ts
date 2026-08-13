/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, type TestElement } from '@angular/cdk/testing';

import type { WrDecryptTextHarnessFilters } from './interfaces';

/** The readable copy of the string, carried once and hidden with CSS. */
const SR_ONLY = '.wr-decrypt-text__sr-only';

/** One span per CODE POINT of whatever is on screen this frame. */
const CHAR = '.wr-decrypt-text__char';

/** The modifier that carries the entire progress model. */
const ENCRYPTED = '.wr-decrypt-text__char--encrypted';

/**
 * The wrapper holding every scramble character.
 *
 * Addressed structurally because it is the one element in this template with no BEM
 * class of its own — see {@link WrDecryptTextHarness.isAnimatedLayerHidden}, which
 * exists precisely because a selector this fragile should be written down once rather
 * than assumed in every spec.
 */
const SCRAMBLE = `${SR_ONLY} + span`;

/** Exactly what the element holds — untrimmed, unlike `TestElement.text()`. */
async function rawText(element: TestElement): Promise<string> {
  return (await element.getProperty<string | null>('textContent')) ?? '';
}

/**
 * Test harness for `<wr-decrypt-text>`.
 *
 * **Two layers, two questions, and they are meant to disagree.** The component renders
 * the real string once in a visually-hidden span and the scramble in a parallel
 * `aria-hidden` layer, so {@link getAccessibleText} is what a screen reader hears and
 * {@link getRenderedText} is what a sighted reader sees. Mid-reveal the second is
 * literal gibberish while the first must be untouched — that is the contract, and it is
 * the half nobody looks at. A spec asserting only the visible glyphs would pass on a
 * component that announced `XQ#PZ`.
 *
 * **Prefer the class over the glyphs.** {@link getRevealedIndices},
 * {@link getEncryptedCount} and {@link isFullyRevealed} read
 * `.wr-decrypt-text__char--encrypted`, which is deterministic with no stubbing at all —
 * they are what tell `revealDirection` `'start'` from `'end'` from `'center'`, one index
 * per tick. {@link getRenderedText} reads the glyphs themselves, which are a fresh
 * `Math.random()` draw per tick, so stub it (`vi.spyOn(Math, 'random')
 * .mockReturnValue(0)`) before asserting a string.
 *
 * **The clock is the spec's, not the harness's.** The reveal is a `setInterval` this
 * class does not own, so there is no `advance(ms)` and no `waitUntilRevealed()`: one
 * would flake on a loaded machine and the other would silently require fake timers to
 * have been installed. Fake `setInterval` / `clearInterval` and nothing else — faking
 * the microtask queue freezes the stabilization every `await harness.*()` runs through —
 * then advance the clock yourself between reads.
 *
 * **There is no keyboard path, and this harness does not pretend there is one.**
 * {@link hover}, {@link mouseAway} and {@link click} are the component's only triggers;
 * with `animateOn="click"` the host takes a click handler while carrying no role, no
 * `tabindex` and no keydown handler, so a `focus()` / `sendKeys(Enter)` affordance here
 * would make a spec pass while a keyboard or switch user could not reveal the text at
 * all. There is no `enterViewport()` either: `'view'` and `'inViewHover'` hang off an
 * `IntersectionObserver` jsdom does not implement, so the spec stubs the global and
 * fires it.
 *
 * **Also deliberately absent:** `isAnimating()` — the component has such a signal and it
 * never reaches the DOM, and deriving it from "something is encrypted" would be wrong in
 * exactly the interesting case, since `animateOn="click"` rests fully encrypted and
 * perfectly still. `getSpeed()` / `getMaxIterations()` / `getRevealDirection()` /
 * `getClickMode()` / `getAnimateOn()` — inputs that are never reflected anywhere, so
 * reporting them would mean reading the component instance rather than the rendered
 * control; they are observable as behaviour, which is what the methods above measure.
 * `getScrambleAlphabet()` — the pool is internal and each frame shows one random draw
 * from it, so any reconstruction is a guess that gets worse the shorter the string.
 * `getCharColors()` / `isDimmed()` — the `--encrypted` rule is deliberately EMPTY, a
 * styling hook for consumers, so there is nothing painted to read in any environment.
 *
 * @example
 * ```ts
 * const secret = await loader.getHarness(WrDecryptTextHarness.with({ text: 'Hello' }));
 *
 * await secret.hover();
 * vi.advanceTimersByTime(50);
 *
 * expect(await secret.getRevealedIndices()).toEqual([0]);   // sequential, from the start
 * expect(await secret.getAccessibleText()).toBe('Hello');   // untouched throughout
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrDecryptTextHarness extends ComponentHarness {
  static hostSelector = 'wr-decrypt-text';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrDecryptTextHarnessFilters = {}): HarnessPredicate<WrDecryptTextHarness> {
    return new HarnessPredicate(WrDecryptTextHarness, options)
      .addOption('text', options.text, (harness, text) =>
        HarnessPredicate.stringMatches(harness.getAccessibleText(), text)
      )
      .addOption('revealed', options.revealed, async (harness, revealed) => {
        // Not `isFullyRevealed()`, which refuses to answer for an instance that rendered
        // no characters. A predicate is the wrong place to throw — a single empty
        // instance would take down every query on the page — so the vacuous case is
        // spelled out here instead, and matches neither `true` nor `false`.
        if ((await harness.getCharCount()) === 0) return false;
        return ((await harness.getEncryptedCount()) === 0) === revealed;
      });
  }

  private readonly chars = this.locatorForAll(CHAR);
  private readonly encrypted = this.locatorForAll(ENCRYPTED);

  /**
   * The real string, as the one readable copy holds it.
   *
   * The single highest-value assertion here: it must stay equal to the `text` input on
   * every frame, while the visible layer is unreadable by design. Lose this span and the
   * component announces nothing at all — every drawn character sits under `aria-hidden`,
   * so no other part of the DOM would change.
   *
   * Untrimmed, so that it can be compared against {@link getRenderedText} without one
   * side of the comparison quietly forgiving a lost leading space.
   */
  async getAccessibleText(): Promise<string> {
    return rawText(await this.locatorFor(SR_ONLY)());
  }

  /**
   * What is on screen this frame — scramble glyphs and all, in document order.
   *
   * Plain before anything triggers it, gibberish mid-reveal, and the real string once it
   * settles; comparing it against {@link getAccessibleText} is how a spec says which of
   * those it is looking at. `useOriginalCharsOnly` is visible only here — every glyph
   * has to be one the text really contains.
   *
   * Nondeterministic unless the spec stubs `Math.random`, because each unrevealed
   * position is an independent draw from the pool. When the assertion does not actually
   * need the glyphs, {@link getRevealedIndices} answers the same progress question off
   * the class and needs no stub.
   */
  async getRenderedText(): Promise<string> {
    return (await Promise.all((await this.chars()).map(rawText))).join('');
  }

  /**
   * How many characters the animation walks.
   *
   * CODE POINTS, not UTF-16 units: `'a🚀b'` is 3 here, and the indices
   * {@link getRevealedIndices} returns line up with `[...text]` rather than with plain
   * `text[i]`. That distinction is not pedantry — counting units gave a sequential
   * reveal extra ticks with no character to spend them on, and made "everything is
   * revealed" disagree with what was on screen.
   */
  async getCharCount(): Promise<number> {
    return (await this.chars()).length;
  }

  /**
   * The positions that have settled on their real character, ascending.
   *
   * The payload method, and the deterministic one: it reads the `--encrypted` modifier
   * rather than the glyphs, so no `Math.random` stub is involved. It is the only thing
   * that separates `revealDirection` `'start'` (`[0]`, `[0, 1]`, …) from `'end'`
   * (`[4]`, `[3, 4]`, …) from `'center'` (`[2]`, `[1, 2]`, …), and one index per tick is
   * what makes a sequential reveal sequential.
   *
   * Ascending by position, NOT in the order the reveal visited them — the DOM records
   * which characters have landed, never the path taken to them. Assert the set after
   * each tick to pin an order.
   */
  async getRevealedIndices(): Promise<number[]> {
    const chars = await this.chars();
    const states = await Promise.all(chars.map(char => char.hasClass('wr-decrypt-text__char--encrypted')));
    return states.flatMap((isEncrypted, index) => (isEncrypted ? [] : [index]));
  }

  /**
   * How many characters are still scrambled.
   *
   * The coarse progress read, and the cheapest way to say "scrambled on hover", "plain on
   * leave", or "a reader who asked for less motion never saw a scramble at all". Class-
   * based like {@link getRevealedIndices}, so it too is random-proof.
   */
  async getEncryptedCount(): Promise<number> {
    return (await this.encrypted()).length;
  }

  /**
   * Whether every character has settled.
   *
   * Deliberately does NOT also compare {@link getRenderedText} against
   * {@link getAccessibleText}: folding two conditions into one boolean hides which of
   * them broke, and a spec that wants both should write both lines.
   *
   * Throws when nothing was rendered. "No character is encrypted" is true of no
   * characters, which is the same answer a component that stopped rendering its text
   * would give — and this is the method most likely to be the only assertion in a test.
   */
  async isFullyRevealed(): Promise<boolean> {
    const total = await this.getCharCount();

    if (total === 0) {
      throw new Error(
        'WrDecryptTextHarness.isFullyRevealed(): this <wr-decrypt-text> rendered no characters, so "nothing is ' +
          'encrypted" is vacuously true — the same answer a component that stopped rendering its text would ' +
          'give. Check `text` is set, or ask getCharCount().'
      );
    }

    return (await this.getEncryptedCount()) === 0;
  }

  /**
   * Whether the scramble layer is out of the accessibility tree.
   *
   * The contract that keeps a screen reader from spelling out `XQ#PZ` beside the real
   * string it already read. Worth a method rather than an assumption because the wrapper
   * holding the characters carries NO class — it can only be addressed as the readable
   * span's next sibling, which any template reshuffle breaks.
   *
   * Throws when that structural selector finds nothing, rather than returning `false`: a
   * missing wrapper and an unhidden one are different failures, and the answer to
   * "is the scramble hidden" when there is no scramble layer at all is not `false`.
   */
  async isAnimatedLayerHidden(): Promise<boolean> {
    const scramble = await this.locatorForOptional(SCRAMBLE)();

    if (!scramble) {
      throw new Error(
        'WrDecryptTextHarness.isAnimatedLayerHidden(): no scramble layer found. It carries no class of its own, ' +
          `so it is addressed structurally as \`${SCRAMBLE}\` — a template that moved either span out from ` +
          'under that selector breaks this read, and "false" would report the layer as ANNOUNCED rather than as ' +
          'missing.'
      );
    }

    return (await scramble.getAttribute('aria-hidden')) === 'true';
  }

  /**
   * Point at it — the trigger for `animateOn` `'hover'` and `'inViewHover'`.
   *
   * Drives the component the way a user does, and works in a test because the trigger is
   * an event rather than a gesture: `TestElement.hover()` dispatches `pointerenter`,
   * `mouseover` and `mouseenter`, and the component listens for the last of those. A
   * hand-rolled pointer-only dispatch would not reach it.
   *
   * Does nothing in the other two modes, exactly as a real pointer does nothing there.
   */
  async hover(): Promise<void> {
    return (await this.host()).hover();
  }

  /**
   * Move the pointer off — the other half of hover mode.
   *
   * Pins the promise that leaving mid-scramble restores the real text IMMEDIATELY rather
   * than letting the reveal play out: the reader took the effect away, so the string has
   * to come back at once.
   */
  async mouseAway(): Promise<void> {
    return (await this.host()).mouseAway();
  }

  /**
   * Click the host — the `animateOn="click"` trigger, and the only way to tell
   * `clickMode` `'once'` from `'toggle'`.
   *
   * There is no keyboard equivalent, and that is a statement about the component rather
   * than about this harness: in click mode the host carries a click handler with no role,
   * no `tabindex` and no keydown handler, so a keyboard or switch user cannot reveal the
   * text at all. A `sendKeys(Enter)` here would invent an affordance that does not exist
   * and let a spec pass over the top of it.
   */
  async click(): Promise<void> {
    return (await this.host()).click();
  }
}
