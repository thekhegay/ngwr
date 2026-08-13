/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrGradientTextDirection } from 'ngwr/gradient-text';

import type { WrGradientTextHarnessFilters } from './interfaces';

const GRADIENT = /^linear-gradient\((.*)\)$/s;

/** Split a gradient's argument list on top-level commas — a stop may be `rgb(1, 2, 3)`. */
function splitStops(args: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';

  for (const character of args) {
    if (character === '(') depth++;
    if (character === ')') depth--;

    if (character === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }

  parts.push(current.trim());
  return parts;
}

/**
 * Test harness for `<wr-gradient-text>`.
 *
 * **The gradient string is the component.** Everything `[colors]` and `[direction]`
 * decide ends up in one inline custom property — the angle keyword, the stop list, and
 * the first colour repeated at the end, which is what makes the loop seamless instead of
 * snapping back at the wrap. {@link getColors} returns that list AS WRITTEN, wrap stop
 * included, because the duplicate is the thing worth asserting and stripping it would
 * hide the day it goes missing.
 *
 * **Direction is two facts, not one.** The modifier class says which way the gradient
 * travels and {@link getBackgroundSize} says which axis it was stretched along, and they
 * are computed separately: a direction change that forgets the size leaves every class
 * looking right while the effect is squashed flat. Note too that `horizontal` writes NO
 * class at all — {@link getDirection} resolves the absence, which is the mapping a
 * refactor breaks most easily.
 *
 * **What the harness deliberately does not offer**, and why. There is no `isAnimating()`
 * / `isPaused()`: the sweep is a stylesheet keyframe, and a unit test loads no
 * stylesheet, so the answer would be the same constant for a working component and a
 * broken one. There is no `getBackgroundPosition()`: the swept value exists only
 * mid-animation, and the static declaration it would return corresponds to no frame the
 * user ever sees. {@link pausesOnHover} claims the CLASS and not the pause, deliberately
 * — `:hover` is a selector, and the DOM after a dispatched mouse event is identical to
 * the DOM before it. There is no `respectsReducedMotion()`: the only handling is a
 * `@media` block with no TypeScript counterpart, so nothing in the DOM changes in either
 * state. And there is nothing that reports the painted text colour: the fill comes from
 * `background-clip: text` over a `color: transparent` declared in the stylesheet, so a
 * read would describe the inherited colour and call the text readable where the browser
 * paints a gradient.
 *
 * @example
 * ```ts
 * const gradient = await loader.getHarness(WrGradientTextHarness);
 *
 * expect(await gradient.getColors()).toEqual(['#111111', '#222222', '#111111']);
 * expect(await gradient.getBackgroundSize()).toBe('300% 100%');
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrGradientTextHarness extends ComponentHarness {
  static hostSelector = 'wr-gradient-text';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrGradientTextHarnessFilters = {}): HarnessPredicate<WrGradientTextHarness> {
    return new HarnessPredicate(WrGradientTextHarness, options)
      .addOption('text', options.text, (harness, text) => HarnessPredicate.stringMatches(harness.getText(), text))
      .addOption(
        'direction',
        options.direction,
        async (harness, direction) => (await harness.getDirection()) === direction
      )
      .addOption('border', options.border, async (harness, border) => (await harness.hasBorderRing()) === border);
  }

  private readonly text = this.locatorFor('.wr-gradient-text__text');
  private readonly ring = this.locatorForOptional('.wr-gradient-text__border');

  /**
   * The projected text, trimmed.
   *
   * Read from the text span rather than from the host, so the answer stays correct on the
   * day the decorative ring gains content of its own — it is a sibling of this span, and
   * the host's text would include both.
   */
  async getText(): Promise<string> {
    return (await this.text()).text();
  }

  /**
   * Which way the gradient travels.
   *
   * `horizontal` is reported for the absence of both modifiers, because the component
   * writes no `--horizontal` class — there is nothing to read for the default, only the
   * two exceptions.
   */
  async getDirection(): Promise<WrGradientTextDirection> {
    const host = await this.host();
    if (await host.hasClass('wr-gradient-text--vertical')) return 'vertical';
    if (await host.hasClass('wr-gradient-text--diagonal')) return 'diagonal';
    return 'horizontal';
  }

  /**
   * The whole gradient the component computed, as written.
   *
   * Unresolved on purpose: a consumer may pass theme tokens, and resolving `var()` needs
   * the stylesheet. The stops come back spelled as they were written — a custom property
   * holds an unparsed token stream, so `#111111` stays `#111111` rather than being
   * re-serialised as `rgb()` the way it would be inside a standard `background-image`.
   * Whitespace is the exception, so prefer {@link getColors} over string-equalling the
   * whole gradient.
   */
  async getGradient(): Promise<string> {
    return (await (await this.host()).getCssValue('--wr-gradient-text-image')).trim();
  }

  /**
   * The gradient's colour stops, in order, INCLUDING the repeated first colour at the end.
   *
   * So the list is one longer than the `[colors]` input, and that extra entry is the
   * point: it is what lets the sweep wrap without a visible snap, and nothing else in the
   * DOM records it. An empty `[colors]` falls back to the three built-in stops, which
   * shows up here as four entries rather than one.
   *
   * Throws rather than guessing when the property holds something that is not a
   * `linear-gradient()` — an empty read means the host binding is gone, and a list of
   * fragments parsed out of the wreckage would look like a colour set.
   */
  async getColors(): Promise<string[]> {
    const gradient = await this.getGradient();
    const match = GRADIENT.exec(gradient);

    if (!match) {
      throw new Error(
        `WrGradientTextHarness.getColors(): \`--wr-gradient-text-image\` computed to "${gradient}", which is not ` +
          'a linear-gradient(). The component writes that property inline on the host on every render, so an ' +
          'empty value means the binding is gone rather than that the gradient has no stops.'
      );
    }

    // The first argument is the angle keyword ('to right' / 'to bottom' / 'to bottom right').
    return splitStops(match[1]).slice(1);
  }

  /**
   * How far the gradient is stretched, as the `background-size` pair.
   *
   * The other half of direction: the gradient has to be oversized along the axis it
   * travels — `300% 100%` horizontal, `100% 300%` vertical, `300% 300%` diagonal — or
   * there is nothing outside the box to slide in. Worth asserting beside
   * {@link getDirection}, since the two are computed independently and only agree by
   * intent.
   */
  async getBackgroundSize(): Promise<string> {
    return (await (await this.host()).getCssValue('--wr-gradient-text-size')).trim();
  }

  /**
   * One full sweep in seconds, from `[animationSpeed]`.
   *
   * Proves the input reaches CSS at all, `numAttr` coercion included — a string attribute
   * arrives as a number and garbage falls back to the documented default. Throws when the
   * property holds no number, which is the only way the read can fail.
   */
  async getAnimationDurationSeconds(): Promise<number> {
    const raw = (await (await this.host()).getCssValue('--wr-gradient-text-duration')).trim();
    const seconds = Number.parseFloat(raw);

    if (Number.isNaN(seconds)) {
      throw new Error(
        `WrGradientTextHarness.getAnimationDurationSeconds(): \`--wr-gradient-text-duration\` computed to ` +
          `"${raw}", which is not a number of seconds. The component writes it inline on the host from ` +
          '`[animationSpeed]`; an empty value means that binding is gone.'
      );
    }
    return seconds;
  }

  /**
   * Whether the decorative ring element was rendered (`showBorder`).
   *
   * Strictly more than the `wr-gradient-text--border` class says: the class is a host
   * binding and the ring is an `@if` branch in the template, two mechanisms reading one
   * input, and they can drift. This asks whether the element that paints the pill is
   * actually there.
   */
  async hasBorderRing(): Promise<boolean> {
    return (await this.ring()) !== null;
  }

  /**
   * Whether the ring is hidden from assistive tech, or `null` when there is no ring.
   *
   * The ring is an empty, nameless span. Paired with {@link hasBorderRing} this is the
   * component's whole a11y contract: if it ever loses `aria-hidden`, a screen reader stops
   * on an element with nothing to say. `null` rather than `false` for the absent case, so
   * "no ring" cannot be mistaken for "an exposed ring".
   */
  async isBorderDecorative(): Promise<boolean | null> {
    const ring = await this.ring();
    return ring === null ? null : (await ring.getAttribute('aria-hidden')) === 'true';
  }

  /**
   * Whether the sweep bounces instead of restarting (`yoyo`).
   *
   * Defaults to `true` here, unlike every other boolean on this component and unlike the
   * same-named input on `wr-shiny-text` — worth pinning in both directions. The class is
   * the only thing the `animation-direction: alternate` rule keys off.
   */
  async isYoyo(): Promise<boolean> {
    return (await this.host()).hasClass('wr-gradient-text--yoyo');
  }

  /**
   * Whether the opt-in reached the class the `:hover` rule needs.
   *
   * Named for the class and not for the pause on purpose: the pause itself is a CSS
   * selector match, which no unit test can observe. What this catches is the input never
   * arriving, which is the half that can go wrong in TypeScript.
   */
  async pausesOnHover(): Promise<boolean> {
    return (await this.host()).hasClass('wr-gradient-text--pause-on-hover');
  }
}
