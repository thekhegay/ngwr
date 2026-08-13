/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, type TestElement } from '@angular/cdk/testing';

import type { WrCircularTextHarnessFilters } from './interfaces';

/** One grapheme of the ring, placed by an inline transform the component writes itself. */
const CHAR = '.wr-circular-text__char';

/** The wrapper the rotation is applied to, and the one element taken out of the a11y tree. */
const SPIN = '.wr-circular-text__spin';

/** The readable copy of the string, carried once outside the ring. */
const SR_ONLY = '.wr-circular-text__sr-only';

/**
 * The placement each character carries: a rotation about the centre, then a push outward.
 *
 * Matched off the `style` ATTRIBUTE rather than through `getCssValue`. A computed style
 * would fold in whatever the stylesheet said — and a unit test loads no stylesheet, so it
 * would answer `none` for a character the component placed perfectly well. The attribute
 * is the component's own writing, which is the only thing worth pinning.
 */
const PLACEMENT = /^\s*rotate\(\s*(-?[\d.]+)deg\s*\)\s+(.+?)\s*$/;

/** Exactly what the element holds — untrimmed, unlike `TestElement.text()`. */
async function rawText(element: TestElement): Promise<string> {
  return (await element.getProperty<string | null>('textContent')) ?? '';
}

/** The `transform` declaration out of an element's own `style` attribute, or `null`. */
function inlineTransform(style: string | null): string | null {
  const declaration = /(?:^|;)\s*transform\s*:\s*([^;]+)/.exec(style ?? '');
  return declaration ? declaration[1].trim() : null;
}

/**
 * Test harness for `<wr-circular-text>`.
 *
 * **The ring's geometry is the component's real output, and it is exact without a
 * browser.** Each character is placed by an inline `transform` the component computes —
 * `rotate(360 / N × i deg)` and then a push outward by the orbit radius — so
 * {@link getCharacterAngles} reads the entire layout back as numbers. A broken circle
 * shows up as uneven angles, as an offset that varies per character, or as a surrogate
 * pair torn into two glyphs, and none of those need a single measured pixel.
 *
 * **The spin does not exist in the DOM, and every method that would report it is absent
 * on purpose.** The rotation is one Web Animation on the ring wrapper, advanced by a
 * compositor, and `spinDuration` reaches nothing but that animation's `duration` option
 * — so there is no `getSpinDurationSeconds()` (it would report whatever the spec's own
 * `animate` stub recorded, which is the test reading back its own fixture), no
 * `isSpinning()` and no `getRotationAngle()` (both live on `Animation.currentTime`, in an
 * API jsdom does not implement). There is no `hover()` either: hovering swaps that
 * duration through listeners on the host and changes not one attribute, so a harness
 * hover would appear to work and assert nothing. `pause()` / `resume()` are missing for
 * the same reason — the state is the private `Animation` object, never the document.
 * `respectsReducedMotion()` is the same shape once more: the component honours it by NOT
 * calling `animate`, which is a spec assertion against a stub rather than something a
 * harness can read.
 *
 * **The radius is exposed as text, not as pixels.** `--wr-circular-text-size` and
 * `--wr-circular-text-radius` are declared in the stylesheet, so a test running no
 * stylesheets reads them back empty — hence {@link getOrbitOffsets} hands over the CSS
 * each character carries verbatim instead of a `getRadiusPx()` nobody could compute, and
 * there is no `getCharacterPositions()`: every rect in a unit test is 0×0.
 *
 * **{@link isBonkers} is the one hover mode with a DOM footprint, and the INPUT sets it,
 * not the pointer.** `onHover="goBonkers"` puts the modifier on the host at render time;
 * the scale it enables is a CSS `:hover` rule the harness cannot see. Reading it as "the
 * pointer is over the ring" is exactly backwards.
 *
 * **What is announced and what is drawn are two questions.** The string is carried once
 * in a visually-hidden span, and the ring as a whole is `aria-hidden` so a screen reader
 * hears the word rather than spelling it out — {@link getAccessibleText} is the first,
 * {@link getText} the second, and a spec that read only the second would pass on a
 * component announcing `N. G. W. R.`
 *
 * jsdom implements no Web Animations API and this component animates on mount, so a spec
 * has to supply one of the two halves before the fixture is created — either the API, or
 * a reason not to reach for it:
 *
 * ```ts
 * // Either: mount under reduced motion, where the component never animates at all.
 * // (jsdom has no matchMedia, so WrPlatform must be provided as a value.)
 * TestBed.configureTestingModule({ providers: [{ provide: WrPlatform, useValue: reducedMotion }] });
 *
 * // Or: stub the API. Save the descriptor and put it back by hand in afterEach — this
 * // is an assignment, not a spy, so it leaks into whichever file vitest runs next.
 * Reflect.set(Element.prototype, 'animate', () => ({ cancel: () => undefined }));
 * ```
 *
 * @example
 * ```ts
 * const ring = await loader.getHarness(WrCircularTextHarness.with({ text: 'NGWR' }));
 *
 * expect(await ring.getCharacters()).toEqual(['N', 'G', 'W', 'R']);
 * expect(await ring.getCharacterAngles()).toEqual([0, 90, 180, 270]);
 * expect(await ring.getText()).toBe(await ring.getAccessibleText());
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrCircularTextHarness extends ComponentHarness {
  static hostSelector = 'wr-circular-text';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrCircularTextHarnessFilters = {}): HarnessPredicate<WrCircularTextHarness> {
    return new HarnessPredicate(WrCircularTextHarness, options)
      .addOption('text', options.text, (harness, text) =>
        HarnessPredicate.stringMatches(harness.getAccessibleText(), text)
      )
      .addOption(
        'characterCount',
        options.characterCount,
        async (harness, count) => (await harness.getCharacterCount()) === count
      );
  }

  private readonly chars = this.locatorForAll(CHAR);

  /**
   * The whole string, as the one readable copy holds it.
   *
   * All a screen reader gets, the ring itself being out of the tree — lose this span and
   * the component becomes a nameless pile of hidden letters, with no other symptom
   * anywhere in the DOM.
   *
   * Untrimmed, deliberately: a ring is usually given a separator-padded string like
   * `'HELLO * NGWR * '`, whose trailing space is a real character that takes a slot on
   * the circle. {@link getText} is meant to compare equal to this, and a trimmed read on
   * either side would forgive losing it.
   */
  async getAccessibleText(): Promise<string> {
    return rawText(await this.locatorFor(SR_ONLY)());
  }

  /**
   * The characters laid out around the circle, in DOM order.
   *
   * Pins the splitting rule — `Array.from(text())`, so a surrogate pair is ONE slot and
   * not two broken halves, and a space is its own slot rather than being collapsed away.
   * DOM order is the only order there is: every character is absolutely positioned, so
   * the sequence here is what the angles below are indexed by.
   */
  async getCharacters(): Promise<string[]> {
    return Promise.all((await this.chars()).map(rawText));
  }

  /**
   * Everything the ring draws, put back together in DOM order.
   *
   * The assertion this exists for is `getText() === getAccessibleText()`: the split has
   * to be lossless. Read from the character spans rather than from the host, because the
   * host also holds the readable copy and would report the string twice over.
   */
  async getText(): Promise<string> {
    return (await this.getCharacters()).join('');
  }

  /** How many slots the circle was divided into — the divisor every angle is derived from. */
  async getCharacterCount(): Promise<number> {
    return (await this.chars()).length;
  }

  /**
   * Where each character sits on the circle, in degrees, in DOM order.
   *
   * The component's whole geometric output, and the one thing that tells a ring from a
   * crowded arc: the angles must start at 0 and be exactly `360 / N` apart. Empty text
   * yields an empty array — no characters, no angles.
   *
   * Throws for a character carrying no rotation of its own rather than reporting `0` or
   * `NaN` for it. Both of those describe a ring collapsed onto a single point as though
   * nothing were wrong, and that is precisely the failure this method exists to catch.
   */
  async getCharacterAngles(): Promise<number[]> {
    return (await this.placements()).map(placement => placement.angle);
  }

  /**
   * How far each character is pushed out from the centre, as the CSS the component wrote.
   *
   * A string rather than a number, and that is the honest answer: the distance is
   * `calc(-1 * var(--wr-circular-text-radius))`, a custom property the STYLESHEET
   * declares, so there is no pixel value to resolve in a test that loads no stylesheet.
   * What matters is assertable anyway — every character must be pushed out by the SAME
   * offset, along the same axis. A per-character or axis-mixed one is the classic bug
   * that turns the ring into a diagonal line, and it survives every other check here
   * because the angles stay perfect while it happens.
   *
   * Throws on the same unplaced character {@link getCharacterAngles} does, for the same
   * reason.
   */
  async getOrbitOffsets(): Promise<string[]> {
    return (await this.placements()).map(placement => placement.offset);
  }

  /**
   * Whether the host carries the `wr-circular-text--bonkers` modifier.
   *
   * Set from the `onHover` INPUT being `'goBonkers'` — at render time, before anyone has
   * hovered anything — which is the one assumption a spec author makes backwards here.
   * It is also the only one of the four hover modes with any DOM footprint at all; the
   * other three exist purely as a number handed to a Web Animation.
   */
  async isBonkers(): Promise<boolean> {
    return (await this.host()).hasClass('wr-circular-text--bonkers');
  }

  /**
   * Whether the ring is out of the accessibility tree.
   *
   * ONE attribute answers this, and that is the contract rather than an approximation:
   * `aria-hidden` sits on the `__spin` wrapper, so the letters underneath inherit it and
   * none of them carries the attribute itself — which keeps it off the nodes the rotation
   * touches. Asserting it per character would fail on a component that is behaving.
   *
   * Answers for the wrapper even when the text is empty, and that is deliberate: the
   * wrapper is always rendered, so there is no vacuous case to guard against — a ring
   * with nothing in it is still correctly hidden or incorrectly readable.
   *
   * Assert it together with {@link getAccessibleText}: hidden letters AND no readable
   * copy is an element with no accessible name at all, which passes either check alone.
   */
  async areCharactersHiddenFromAssistiveTech(): Promise<boolean> {
    return (await (await this.locatorFor(SPIN)()).getAttribute('aria-hidden')) === 'true';
  }

  /** Each character's placement, parsed once out of the inline transform it carries. */
  private async placements(): Promise<{ angle: number; offset: string }[]> {
    const styles = await Promise.all((await this.chars()).map(char => char.getAttribute('style')));

    return styles.map((style, index) => {
      const transform = inlineTransform(style);
      const placement = transform === null ? null : PLACEMENT.exec(transform);

      if (!placement) {
        throw new Error(
          `WrCircularTextHarness: character ${index} is not placed — its own inline transform is ` +
            `${transform === null ? 'absent' : `"${transform}"`}, which carries no rotate(<n>deg). The placement ` +
            'is the whole of what this component computes, so answering 0° here would describe a ring collapsed ' +
            'onto a single point as though it were fine.'
        );
      }

      return { angle: Number.parseFloat(placement[1]), offset: placement[2] };
    });
  }
}
