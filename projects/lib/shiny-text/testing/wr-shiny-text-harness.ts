/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrShinyTextHarnessFilters, WrShinyTextSweepDirection } from './interfaces';

const GRADIENT = /^linear-gradient\((.*)\)$/s;
const DEGREES = /^(-?[\d.]+)deg$/;
const STOP_POSITION = /\s+-?[\d.]+%$/;

/** Split a declaration list or an argument list on top-level separators only. */
function splitTopLevel(value: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';

  for (const character of value) {
    if (character === '(') depth++;
    if (character === ')') depth--;

    if (character === separator && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }

  parts.push(current.trim());
  return parts;
}

/** The colour half of a `<colour> <position>` gradient stop. */
function stopColour(stop: string): string {
  return stop.replace(STOP_POSITION, '').trim();
}

/**
 * Test harness for `<wr-shiny-text>`.
 *
 * **The duration is the assertion that matters.** The pause between sweeps is not
 * `animation-delay` and not a second animation — it is folded INTO `animation-duration`,
 * because the keyframe finishes at 50% and holds there. So `[speed]="2"` with
 * `[delay]="3"` has to read 5 seconds, and anyone reimplementing the pause the obvious
 * way passes every other check here and fails {@link getCycleDurationSeconds}.
 *
 * **The stripe is five stops and only one of them is the shine.** The base colour fills
 * 0%, 35%, 65% and 100%; the highlight sits alone at 50%. {@link getBaseColor} and
 * {@link getShineColor} are offered as a pair because swapping the two inputs is
 * otherwise undetectable — the gradient stays well-formed, the angle is unchanged, and
 * the text simply stops shimmering.
 *
 * **Both gradient reads come off the inline `style` attribute**, not through computed
 * style. Unset colours fall through to the literal `var(--wr-shiny-text-base)` /
 * `var(--wr-shiny-text-shine)` tokens, which is exactly what makes the dark-theme
 * override work — and a computed read resolves those tokens in a real browser while
 * handing them back verbatim in a unit test. Reading what the component wrote gives the
 * same answer in both places.
 *
 * The colours still pass through the CSSOM on their way back out, and it has its own
 * spelling: a hex literal is re-serialised, so `[color]="'#444'"` reads
 * `rgb(68, 68, 68)`. Functional notations and `var()` tokens survive untouched. Assert
 * the form the CSSOM returns, not the one the template passed in.
 *
 * There is no inner element to query: the template is the bare interpolation, so the text
 * is a node on the host. A locator copied from the gradient-text harness finds nothing.
 *
 * **What the harness deliberately does not offer**, and why. There is no `isAnimating()`
 * / `getBackgroundPosition()`: the sweep is a stylesheet keyframe over
 * `background-position`, and a unit test neither loads the sheet nor runs the animation.
 * There is no `getAnimationName()` / `getIterationCount()` / `getPlayState()`: every
 * animation property except the duration lives in the stylesheet, so those reads answer
 * the same empty string for a working component and a deleted one. {@link isPaused} and
 * {@link pausesOnHover} claim the CLASSES and not the pauses — `:hover` is a selector and
 * `animation-play-state` is a stylesheet rule, so what they honestly pin is that the
 * input arrived. There is no `respectsReducedMotion()`: the handling is a `@media` block
 * with no TypeScript counterpart. And there is nothing reporting the painted text colour,
 * because `-webkit-text-fill-color: transparent` is a stylesheet declaration and a read
 * would report the inherited colour as if the text were solid.
 *
 * The `[wrShimmer]` directive shipped from the same entry point has no harness: it adds
 * one static class and nothing else, so a harness could only restate its own selector.
 *
 * @example
 * ```ts
 * const shiny = await loader.getHarness(WrShinyTextHarness);
 *
 * expect(await shiny.getCycleDurationSeconds()).toBe(5);
 * expect(await shiny.getShineColor()).toBe('var(--wr-shiny-text-shine)');
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrShinyTextHarness extends ComponentHarness {
  static hostSelector = 'wr-shiny-text';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrShinyTextHarnessFilters = {}): HarnessPredicate<WrShinyTextHarness> {
    return new HarnessPredicate(WrShinyTextHarness, options)
      .addOption('text', options.text, (harness, text) => HarnessPredicate.stringMatches(harness.getText(), text))
      .addOption('paused', options.paused, async (harness, paused) => (await harness.isPaused()) === paused)
      .addOption(
        'direction',
        options.direction,
        async (harness, direction) => (await harness.getDirection()) === direction
      );
  }

  /** The rendered text, trimmed. It is a text node on the host — there is no inner span. */
  async getText(): Promise<string> {
    return (await this.host()).text();
  }

  /**
   * The whole stripe gradient the component computed, as written.
   *
   * Unresolved on purpose. With no `[color]` / `[shineColor]` given this string contains
   * the theme's own custom-property tokens rather than colours, and that is the working
   * state, not a gap — resolving them would need the stylesheet, and the resolved answer
   * would differ between a unit test and a browser.
   */
  async getGradient(): Promise<string> {
    return this.require('getGradient', 'background-image');
  }

  /**
   * The gradient's angle in degrees, from `[spread]`.
   *
   * The only observable effect that input has, `numAttr` coercion included. Note the name
   * is inherited vocabulary and describes the ANGLE, not the width of the bright stripe:
   * the stop positions are hard-coded, so no input narrows the shine.
   */
  async getSpreadDegrees(): Promise<number> {
    const [angle] = await this.gradientArguments('getSpreadDegrees');
    const match = DEGREES.exec(angle);

    if (!match) {
      throw new Error(
        `WrShinyTextHarness.getSpreadDegrees(): the gradient starts with "${angle}", which is not an angle in ` +
          'degrees. The component writes `<spread>deg` as the first argument of the gradient; anything else ' +
          'means the angle is no longer coming from that input.'
      );
    }
    return Number.parseFloat(match[1]);
  }

  /**
   * The colour outside the bright stripe — the 0% stop.
   *
   * The same colour fills 35%, 65% and 100%; only the 50% stop differs. Assert it next to
   * {@link getShineColor}: a `[color]` that lands in the shine slot instead leaves a
   * perfectly valid gradient that no longer shimmers.
   */
  async getBaseColor(): Promise<string> {
    return stopColour((await this.gradientStops('getBaseColor'))[0]);
  }

  /** The highlight colour — the lone 50% stop the stripe is made of. */
  async getShineColor(): Promise<string> {
    return stopColour((await this.gradientStops('getShineColor'))[2]);
  }

  /**
   * One full cycle in seconds — the sweep AND the pause after it.
   *
   * `[delay]` is not `animation-delay` and not a second animation: the keyframe reaches
   * its end at 50% and holds, so the wait is bought by making the animation twice as long.
   * That is why this reads `speed + delay` and why the method is named for the cycle
   * rather than for the sweep.
   *
   * Read from the inline declaration rather than from computed style, so a missing binding
   * is reported as missing instead of being answered from the stylesheet.
   */
  async getCycleDurationSeconds(): Promise<number> {
    const raw = await this.require('getCycleDurationSeconds', 'animation-duration');
    const seconds = Number.parseFloat(raw);

    if (Number.isNaN(seconds)) {
      throw new Error(
        `WrShinyTextHarness.getCycleDurationSeconds(): \`animation-duration\` is "${raw}", which is not a number ` +
          'of seconds. The component writes `[speed] + [delay]` there — the pause is folded into the duration ' +
          'rather than expressed as a delay.'
      );
    }
    return seconds;
  }

  /**
   * Whether the animation is stopped (`disabled`).
   *
   * Three names for one thing, which is why this method exists rather than a spec reading
   * the class: the input is `disabled`, its JSDoc says "pause", and the DOM contract is
   * `wr-shiny-text--paused`. Only the last of those is public API.
   */
  async isPaused(): Promise<boolean> {
    return (await this.host()).hasClass('wr-shiny-text--paused');
  }

  /** Whether the opt-in reached the class the `:hover` rule needs. */
  async pausesOnHover(): Promise<boolean> {
    return (await this.host()).hasClass('wr-shiny-text--pause-on-hover');
  }

  /**
   * Whether the stripe bounces instead of restarting (`yoyo`).
   *
   * Defaults to `false` here — the opposite of the same-named input on `wr-gradient-text`,
   * which is worth pinning in a spec that uses both. Together with {@link getDirection}
   * this is the whole four-way matrix the stylesheet derives `animation-direction` from.
   */
  async isYoyo(): Promise<boolean> {
    return (await this.host()).hasClass('wr-shiny-text--yoyo');
  }

  /** Which way the stripe travels — `'left'` is the absence of the reverse modifier. */
  async getDirection(): Promise<WrShinyTextSweepDirection> {
    return (await (await this.host()).hasClass('wr-shiny-text--reverse')) ? 'right' : 'left';
  }

  /** The five stops of the stripe, positions attached, in gradient order. */
  private async gradientStops(caller: string): Promise<string[]> {
    const [, ...stops] = await this.gradientArguments(caller);

    if (stops.length !== 5) {
      throw new Error(
        `WrShinyTextHarness.${caller}(): the gradient has ${stops.length} stops, not the five the stripe is made ` +
          'of (base at 0% / 35%, shine at 50%, base at 65% / 100%). Reading a colour out of a differently ' +
          'shaped gradient would report a stop that means something else.'
      );
    }
    return stops;
  }

  /** The gradient's arguments — the angle first, then the stops. */
  private async gradientArguments(caller: string): Promise<string[]> {
    const gradient = await this.require(caller, 'background-image');
    const match = GRADIENT.exec(gradient);

    if (!match) {
      throw new Error(
        `WrShinyTextHarness.${caller}(): \`background-image\` is "${gradient}", which is not a linear-gradient(). ` +
          'The stripe IS that gradient, so anything else means the component is no longer painting one.'
      );
    }
    return splitTopLevel(match[1], ',');
  }

  /** One of the host's two inline declarations, or a failure that says which one is missing. */
  private async require(caller: string, property: string): Promise<string> {
    const style = (await (await this.host()).getAttribute('style')) ?? '';

    for (const declaration of splitTopLevel(style, ';')) {
      const colon = declaration.indexOf(':');
      if (colon !== -1 && declaration.slice(0, colon).trim() === property) {
        return declaration.slice(colon + 1).trim();
      }
    }

    throw new Error(
      `WrShinyTextHarness.${caller}(): the host carries no inline \`${property}\` (style: "${style}"). The ` +
        'component writes it on every render, so its absence is a broken host binding rather than a default — ' +
        'and it is read inline, not through computed style, precisely so the stylesheet cannot answer for it.'
    );
  }
}
