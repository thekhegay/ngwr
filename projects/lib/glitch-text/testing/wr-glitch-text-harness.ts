/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrGlitchTextColourSplit, WrGlitchTextDurations, WrGlitchTextHarnessFilters } from './interfaces';

/**
 * Test harness for `<wr-glitch-text>`.
 *
 * **The one thing worth testing here is the pairing.** The two torn clones are
 * `::before` / `::after` pseudo-elements whose glyphs come from `content:
 * attr(data-text)`, so the string has to be in `__label`'s text node AND in the
 * `data-text` attribute on `__clones`. Drop either binding and the visible text stays
 * flawless while the effect disappears — no error, no missing element, nothing else in
 * the DOM changes. {@link isCloneTextInSync} is that assertion in one call.
 *
 * **Why they are two elements**, which is also why `data-text` is not on the host:
 * generated content is exposed to the accessibility tree, so pseudos on the host made
 * the string announce three times. `__clones` carries the `aria-hidden`;
 * {@link isCloneLayerHidden} is the assertion that keeps it there.
 *
 * **Everything else the harness reads is an inline custom property**, because that is
 * everything the component writes: the two clone durations, the two colour-split
 * shadows and the optional slice background. They are worth pinning for the unit
 * transforms — a duration that loses its `s`, or two clones that end up on the same
 * multiple and tear in lockstep, is a regression that changes no class, no attribute
 * and no text.
 *
 * **What the harness deliberately does not offer**, and why. There is no
 * `isGlitching()`: the tear is a `@keyframes` animation on a pseudo-element, applied by
 * a stylesheet a unit test never loads, so the only available answer is a class name
 * repackaged as a state. There is no `hover()` / `isGlitchingOnHover()`: the gate is a
 * `:hover` SELECTOR, and the DOM after a dispatched mouse event is byte-identical to
 * the DOM before it — a spec built on that would pass against a component whose hover
 * rules had been deleted. There is no `getCloneOffset()` / `getClipPath()`: the ±10px
 * offsets and the tear bands live in the stylesheet and are pure layout besides. There
 * is no `respectsReducedMotion()`: the handling is a `@media` block with no TypeScript
 * counterpart, so the DOM is identical in both states and there is nothing to read.
 * There is no resolver for the shadow colours — they hold `var(--wr-color-info)` /
 * `var(--wr-color-danger)`, and resolving those needs the theme stylesheet. And there
 * is no `getSpeed()`: the input is never written to the DOM, only its two products are,
 * and dividing one back would invent a precision the component never published (at
 * `[speed]="0.3"` the after-duration is literally `0.8999999999999999s`).
 *
 * @example
 * ```ts
 * const glitch = await loader.getHarness(WrGlitchTextHarness);
 *
 * expect(await glitch.isCloneTextInSync()).toBe(true);
 * expect((await glitch.getDurations()).after).toBeCloseTo(3);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrGlitchTextHarness extends ComponentHarness {
  static hostSelector = 'wr-glitch-text';

  /** The readable copy of the string — the only part of the component in the a11y tree. */
  private readonly label = this.locatorFor('.wr-glitch-text__label');

  /** The `aria-hidden` layer the two pseudo-clones hang off. */
  private readonly clones = this.locatorFor('.wr-glitch-text__clones');

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrGlitchTextHarnessFilters = {}): HarnessPredicate<WrGlitchTextHarness> {
    return new HarnessPredicate(WrGlitchTextHarness, options)
      .addOption('text', options.text, (harness, text) => HarnessPredicate.stringMatches(harness.getText(), text))
      .addOption(
        'hoverOnly',
        options.hoverOnly,
        async (harness, hoverOnly) => (await harness.isHoverOnly()) === hoverOnly
      );
  }

  /**
   * The rendered text, trimmed.
   *
   * The half a sighted user reads, and the half every other check would notice
   * breaking. Read off `__label`, which is the whole of the component's accessible
   * content — the clone layer beside it is `aria-hidden` and empty in the DOM.
   */
  async getText(): Promise<string> {
    return (await this.label()).text();
  }

  /**
   * The string the two clone layers draw from — `data-text` on `__clones`.
   *
   * The half nothing else notices. `content: attr(data-text)` is how both pseudo-clones
   * get their glyphs, so this attribute IS the effect. `null` means the mirror is gone
   * and the component is rendering plain text with extra classes.
   */
  async getCloneText(): Promise<string | null> {
    return (await this.clones()).getAttribute('data-text');
  }

  /**
   * Whether the clone attribute still mirrors the rendered text.
   *
   * The component's defining silent failure, as a single assertion — two separate reads
   * are two things a spec can forget to write together. Compared raw on both sides,
   * with no trimming: `__label` holds the bare interpolation, so its text node and the
   * attribute are byte-identical or the mirror is broken. An empty `text` is legal and
   * counts as in sync — `data-text=""` is a mirror of nothing, not a missing binding,
   * which is why {@link getCloneText} reports the absent case as `null` instead.
   */
  async isCloneTextInSync(): Promise<boolean> {
    const label = await this.label();
    return (await label.getProperty<string>('textContent')) === (await (await this.clones()).getAttribute('data-text'));
  }

  /**
   * Whether the clone layer is still hidden from assistive technology.
   *
   * The reason the component is two elements rather than one. `content: attr(data-text)`
   * is exposed to the accessibility tree, so with the pseudos on the host the string was
   * announced three times and a wrapping heading or link computed its name as
   * "404 404 404". Nothing visual changes if the `aria-hidden` is dropped, and neither
   * a11y gate in this repo can see it: `check:a11y` reads prerendered HTML with no
   * stylesheets, and axe has no rule for duplicated generated content.
   */
  async isCloneLayerHidden(): Promise<boolean> {
    return (await (await this.clones()).getAttribute('aria-hidden')) === 'true';
  }

  /**
   * Whether the effect idles until the pointer arrives (`enableOnHover`).
   *
   * The `wr-glitch-text--hover-only` class is the only DOM trace of that input, the gate
   * itself being a `:hover` rule. It defaults to `true`, so this is also how a spec
   * catches the day someone "fixes" the default to match the component's own JSDoc,
   * which describes the opposite.
   */
  async isHoverOnly(): Promise<boolean> {
    return (await this.host()).hasClass('wr-glitch-text--hover-only');
  }

  /**
   * How long each clone takes to complete a cycle, in seconds.
   *
   * The two must NOT be equal: they run at 2× and 3× the `speed` multiplier so the tears
   * fall out of phase, and clones tearing in lockstep read as one shifted copy rather
   * than as a glitch. That regression changes no class, no attribute and no text, and no
   * visual gate in this repo can see it either.
   *
   * These are raw JavaScript floats — `[speed]="0.3"` writes `0.8999999999999999s` —
   * so compare with `toBeCloseTo`, never against a formatted string.
   */
  async getDurations(): Promise<WrGlitchTextDurations> {
    return {
      before: await this.seconds('--wr-glitch-text-before-duration'),
      after: await this.seconds('--wr-glitch-text-after-duration'),
    };
  }

  /**
   * Whether the red / cyan colour split is switched on (`enableShadows`).
   *
   * The component writes the literal `none` rather than removing the properties when the
   * split is off, so "disabled" and "never set" stay distinguishable — an absent property
   * would mean a broken binding, and this reports that as no split either.
   */
  async hasColourSplit(): Promise<boolean> {
    const { before, after } = await this.getColourSplit();
    return before !== 'none' && after !== 'none' && before !== '' && after !== '';
  }

  /**
   * The two clone `text-shadow`s, exactly as written — `var()` tokens and all.
   *
   * Returned unresolved on purpose: resolving `var(--wr-color-info)` needs the theme
   * stylesheet, and a unit test that answered with a colour would be inventing one.
   * What the raw pair does prove is the thing a copy-paste breaks — the offsets must
   * have OPPOSITE signs and the two tints must be DIFFERENT intents. Give both clones
   * the same colour, or the same sign, and the chromatic aberration is gone while every
   * other reading stays green.
   */
  async getColourSplit(): Promise<WrGlitchTextColourSplit> {
    return {
      before: await this.inlineVar('--wr-glitch-text-before-shadow'),
      after: await this.inlineVar('--wr-glitch-text-after-shadow'),
    };
  }

  /**
   * The masking colour behind the clone slices, or `null` when none was given.
   *
   * The binding emits `null` for an empty input, so the property is ABSENT rather than
   * set to `transparent`, and the stylesheet's own `var(--wr-glitch-text-bg, transparent)`
   * fallback does the work. A component that started writing `transparent` inline would
   * look identical and break nothing until a consumer relied on that fallback — which is
   * the whole reason this reports the absent case as `null` instead of as a colour.
   */
  async getSliceBackground(): Promise<string | null> {
    const raw = await this.inlineVar('--wr-glitch-text-bg');
    return raw === '' ? null : raw;
  }

  /**
   * One custom property off the host's `style` ATTRIBUTE.
   *
   * Not `getCssValue()`, which is `getComputedStyle`: with the entry point's own
   * stylesheet loaded that resolves the sheet's declaration, so the method
   * answers plausibly at exactly the moment the host binding — the thing under
   * test — is what broke. The attribute holds only what the component wrote.
   */
  private async inlineVar(property: string): Promise<string> {
    const attr = (await (await this.host()).getAttribute('style')) ?? '';
    const found = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`).exec(attr);
    return (found?.[1] ?? '').trim();
  }

  /** One of the host's inline duration properties, as a number of seconds. */
  private async seconds(property: string): Promise<number> {
    const raw = await this.inlineVar(property);
    const value = Number.parseFloat(raw);

    if (Number.isNaN(value)) {
      throw new Error(
        `WrGlitchTextHarness.getDurations(): \`${property}\` computed to "${raw}", which is not a number of ` +
          'seconds. The component writes it inline on the host as a multiple of `[speed]`; an empty value means ' +
          'that binding is gone, and there is no honest duration to report in its place.'
      );
    }
    return value;
  }
}
