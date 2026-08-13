/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrFallingTextHarnessFilters } from './interfaces';

/** Read one declaration out of an inline `style` attribute, or `null` when it is not there. */
function inlineStyle(style: string | null, property: string): string | null {
  for (const declaration of (style ?? '').split(';')) {
    const colon = declaration.indexOf(':');
    if (colon === -1) continue;
    if (declaration.slice(0, colon).trim() !== property) continue;
    return declaration.slice(colon + 1).trim();
  }
  return null;
}

/**
 * Test harness for `<wr-falling-text>`.
 *
 * **The assertion that matters here is that the animation did not eat the text.** The
 * component cuts the sentence into one span per word so a physics loop can throw them
 * around, and {@link getText} is the check that a screen reader still gets prose out of
 * the other end. It normalises whitespace on the way, because the separators are real
 * `&nbsp;` characters rather than plain spaces — so `textContent` is never byte-identical
 * to the `[text]` input, and a spec comparing the two raw would fail on a component that
 * works perfectly.
 *
 * The rest of the readable surface is the split itself: {@link getWords} pins the rule
 * (split on spaces, empty tokens dropped) and {@link getHighlightedWords} pins the
 * prefix match, which is genuine logic — `grav` highlights `gravity`, and a whole-word
 * implementation would satisfy every naive test but not this one.
 *
 * **Nothing positional is offered, and that is not a jsdom concession.** The words'
 * `transform` values are one frame of a loop that never stops, seeded by `Math.random()`,
 * so they are not reproducible even in a real browser; there is no rest state to call
 * settled; the drag path needs `setPointerCapture` and AABB hit-testing over boxes that
 * a unit test measures as 0×0 at the origin, where every word contains every point. Nor
 * is `[gravity]` or `[trigger]` readable — neither reaches the DOM, and answering them
 * would mean reaching into the component instance. There is no `isReducedMotion()`
 * either: under reduced motion the component simply returns before touching anything, so
 * the only honest proxy is {@link hasReleased}, which reports what it did rather than
 * what it was told.
 *
 * **{@link hasReleased} and {@link release} have a precondition, and without it they are
 * worthless.** The simulator measures the host and each word before it starts, and bails
 * on a zero-sized box — which is every box in a test with no layout. So the spec has to
 * give them one, and it has to do it BEFORE the trigger fires: the component marks itself
 * started on the way past that guard, and the trigger listener is `{ once: true }`, so a
 * failed first attempt is permanent.
 *
 * ```ts
 * // In your spec, on a fixture mounted with trigger="click", before calling release():
 * const box = { width: 300, height: 120, left: 0, top: 0, right: 300, bottom: 120 } as DOMRect;
 * for (const el of fixture.nativeElement.querySelectorAll('wr-falling-text, .wr-falling-text__word')) {
 *   el.getBoundingClientRect = () => box;
 * }
 * ```
 *
 * Assert `hasReleased()` is `true` in that control case before you assert it is `false`
 * anywhere else, or a spec proves only that the guard fired.
 *
 * @example
 * ```ts
 * const loader = TestbedHarnessEnvironment.loader(fixture);
 * const text = await loader.getHarness(WrFallingTextHarness);
 *
 * expect(await text.getText()).toBe('gravity pulls every word down');
 * expect(await text.getHighlightedWords()).toEqual(['gravity']);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrFallingTextHarness extends ComponentHarness {
  static hostSelector = 'wr-falling-text';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrFallingTextHarnessFilters = {}): HarnessPredicate<WrFallingTextHarness> {
    return new HarnessPredicate(WrFallingTextHarness, options).addOption('text', options.text, (harness, text) =>
      HarnessPredicate.stringMatches(harness.getText(), text)
    );
  }

  private readonly wordEls = this.locatorForAll('.wr-falling-text__word');

  /**
   * The whole sentence, as a screen reader reads it: whitespace collapsed and trimmed.
   *
   * The one assertion worth making about a component that dismantles a paragraph. The
   * words are separated by `.wr-falling-text__space` spans holding U+00A0, so this
   * collapses them back to ordinary spaces — losing those spans would be invisible to
   * every other check here while turning the announcement into one run-on word.
   *
   * DOM order never changes once the physics starts. The words are absolutely positioned
   * and scattered on screen, but they are still read in the order they were typeset, so
   * this answers the same before and after {@link release}.
   */
  async getText(): Promise<string> {
    return (await (await this.host()).text()).replace(/\s+/g, ' ').trim();
  }

  /**
   * Each word, in DOM order.
   *
   * Pins the split rule: on a literal space, with empty tokens dropped. Each of these is
   * also one body in the simulator, so the length is the body count — which is why there
   * is no separate `getWordCount()`, a method that would invite asserting how many
   * without asserting which.
   */
  async getWords(): Promise<string[]> {
    return Promise.all((await this.wordEls()).map(word => word.text()));
  }

  /**
   * The words carrying the highlight, in DOM order.
   *
   * `[highlightWords]` is matched as a PREFIX and case-sensitively, so `['grav']` picks
   * up `gravity` and `['Grav']` picks up nothing. The highlight is colour alone with no
   * non-visual counterpart, which is acceptable only because it adds no meaning the
   * sentence does not already carry.
   */
  async getHighlightedWords(): Promise<string[]> {
    return Promise.all((await this.locatorForAll('.wr-falling-text__word--hl')()).map(word => word.text()));
  }

  /**
   * Whether one word is highlighted — for asserting a keyword without depending on the
   * order or the completeness of the whole list.
   *
   * Takes the word as it is rendered, not the keyword that matched it: ask for `gravity`,
   * not for `grav`. Throws for a word the sentence does not contain, since `false` there
   * would read as "present and not highlighted" and quietly survive a typo. A word that
   * appears twice is answered once, which is safe — matching is on the text alone, so
   * both copies always agree.
   */
  async isHighlighted(word: string): Promise<boolean> {
    const words = await this.wordEls();
    const texts = await Promise.all(words.map(el => el.text()));
    const index = texts.indexOf(word);

    if (index === -1) {
      throw new Error(
        `WrFallingTextHarness.isHighlighted(): there is no word "${word}" in "${await this.getText()}". The text ` +
          'is split on spaces, so ask for a single word rather than a phrase, and for the word as rendered ' +
          'rather than the prefix that highlights it.'
      );
    }
    return words[index].hasClass('wr-falling-text__word--hl');
  }

  /**
   * The font size as the consumer wrote it — `'2rem'`, not `'32px'`.
   *
   * Read off the inline `style` attribute rather than through `getCssValue()`. The two
   * agree here and would part company in a real browser, which resolves `font-size` to
   * pixels; `[fontSize]` takes a CSS length and handing back a different unit than the
   * one that went in is the sort of green unit test that hides a broken assertion.
   *
   * Throws when nothing is written, which takes an empty `[fontSize]` — the component
   * writes this on every render otherwise, default included.
   */
  async getFontSize(): Promise<string> {
    const words = await this.locatorFor('.wr-falling-text__words')();
    const size = inlineStyle(await words.getAttribute('style'), 'font-size');

    if (size === null) {
      throw new Error(
        'WrFallingTextHarness.getFontSize(): the words carry no inline font-size. The component writes one from ' +
          '[fontSize] on every render — an empty string is the only binding that removes it, and it leaves the ' +
          'text at whatever the page inherits.'
      );
    }
    return size;
  }

  /**
   * Whether the simulator has taken the words over.
   *
   * Reads the `position: absolute` the component writes onto every word before its first
   * frame — a value it wrote itself, not a measurement, and the only difference in the
   * DOM between "the physics is running" and "the words are still in normal flow". That
   * makes it the way to observe the trigger contract and the reduced-motion escape, since
   * neither leaves anything else behind.
   *
   * **It is `false` by default in a test, for a reason that has nothing to do with the
   * component.** Without layout every box measures 0×0 and the simulator refuses to start
   * — see this class's docs for the stub, and assert a `true` before you trust a `false`.
   *
   * Throws for a component rendering no words at all, where the question does not apply.
   */
  async hasReleased(): Promise<boolean> {
    const words = await this.wordEls();

    if (words.length === 0) {
      throw new Error(
        'WrFallingTextHarness.hasReleased(): there are no words. Empty [text] renders nothing, and the simulator ' +
          'has nothing to take over — check getWords() instead.'
      );
    }
    return inlineStyle(await words[0].getAttribute('style'), 'position') === 'absolute';
  }

  /**
   * Fire the events a `click` or `hover` trigger is waiting for.
   *
   * Both, because the harness cannot tell which one it is: `[trigger]` never reaches the
   * DOM. The component consumes at most one — its listener is registered `{ once: true }`
   * and the simulator refuses to start twice — so this is safe to call whatever the
   * trigger is, and safe to call again.
   *
   * It does nothing for `auto`, which released on mount, and nothing for `scroll`, which
   * waits on an `IntersectionObserver`: jsdom has none, so a spec has to stub the global
   * and fire the callback itself. Same precondition as {@link hasReleased} — stub the
   * boxes BEFORE calling this, because a start that bails on a zero-sized host still
   * burns the trigger.
   *
   * Both are dispatched as bare events rather than through the harness's `click()` and
   * `hover()` helpers, which would bring a whole pointer sequence with them. Released
   * words listen for `pointerdown` so they can be picked up and thrown, and that handler
   * calls `setPointerCapture` — which a unit environment does not implement, so the
   * realistic version of this method would throw the moment the simulator was running.
   */
  async release(): Promise<void> {
    const host = await this.host();
    await host.dispatchEvent('click');
    await host.dispatchEvent('mouseenter');
  }
}
