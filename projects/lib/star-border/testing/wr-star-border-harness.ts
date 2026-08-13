/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrStarBorderHarnessFilters } from './interfaces';

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
 * Test harness for `<wr-star-border>` and for the `[wr-star-border]` attribute form.
 *
 * **There is no `getRayCount()`, and no `hasTopRay()`.** `rays="single"` does not remove
 * the top ray: both spans are always in the DOM and the stylesheet hides one with
 * `display: none`. A count would answer 2 in both modes — flatly contradicting the input
 * that was set — so the variant is read as {@link isSingleRay}, off the modifier class
 * the CSS itself keys on. That class is public API, and it is the honest observable.
 *
 * Nothing here reports on the motion either. The sweep is a `@keyframes` rule in a
 * stylesheet a unit test never loads, so `animationName` is `''` and `getAnimations()` is
 * empty whether the component works or not; `mode="hover"` is a bare `:hover` selector
 * with no state behind it, which is why there is no `hover()` to pair with anything; and
 * the reduced-motion escape is a media query with no mirror in TypeScript, so the DOM is
 * identical for a user who asked for less motion and one who did not.
 *
 * **The inline values are read off the `style` attribute rather than through
 * `getCssValue()`, and that is not a jsdom concession.** The stylesheet declares its own
 * `--wr-star-border-color` and `--wr-star-border-speed` on `.wr-star-border`, so in a
 * real browser a computed read answers with the stylesheet's default at exactly the
 * moment the host binding is the thing that broke. What the component wrote is the only
 * value nothing else can forge.
 *
 * On the attribute form the host's `[class]` binding MERGES with the classes the consumer
 * already put there, so read the variants through {@link isHoverOnly} and
 * {@link isSingleRay} rather than comparing a whole `className` — the latter passes only
 * as long as the host happens to carry nothing else.
 *
 * @example
 * ```ts
 * const loader = TestbedHarnessEnvironment.loader(fixture);
 * const border = await loader.getHarness(WrStarBorderHarness);
 *
 * expect(await border.getText()).toBe('Upgrade');
 * expect(await border.getSpeedSeconds()).toBe(6);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrStarBorderHarness extends ComponentHarness {
  static hostSelector = 'wr-star-border, [wr-star-border]';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrStarBorderHarnessFilters = {}): HarnessPredicate<WrStarBorderHarness> {
    return new HarnessPredicate(WrStarBorderHarness, options).addOption('text', options.text, (harness, text) =>
      HarnessPredicate.stringMatches(harness.getText(), text)
    );
  }

  /**
   * The projected content's text, trimmed.
   *
   * Read from the inner panel rather than from the host, which would pick up anything the
   * rays ever came to hold. They are empty spans today, so the two agree — but the panel
   * is the slot the content was put in, and it is the thing a reader actually sees.
   */
  async getText(): Promise<string> {
    return (await this.locatorFor('.wr-star-border__inner')()).text();
  }

  /** Whether the rays wait for the pointer (`mode="hover"`) instead of running always. */
  async isHoverOnly(): Promise<boolean> {
    return (await this.host()).hasClass('wr-star-border--hover');
  }

  /**
   * Whether only the bottom ray is drawn (`rays="single"`).
   *
   * From the modifier class, because the DOM cannot be asked: both ray spans are rendered
   * in both modes and the top one is hidden in CSS. See this class's docs.
   */
  async isSingleRay(): Promise<boolean> {
    return (await this.host()).hasClass('wr-star-border--single');
  }

  /**
   * The ray colour as the consumer passed it — a CSS value, not a resolved one — or
   * `null` when none was given.
   *
   * `null` is the common case and a real answer rather than a missing one: with no
   * `[color]` the theme decides, primary on a light surface and white on a dark one, and
   * a component that started writing a colour of its own there would silently take that
   * choice away.
   */
  async getRayColor(): Promise<string | null> {
    return this.hostStyle('--wr-star-border-color');
  }

  /**
   * How long one ray sweep takes, in seconds.
   *
   * Refuses a value that lost its unit rather than parsing the number out of it. The
   * component builds this string from a plain number input and the stylesheet drops it
   * straight into `animation-duration`, where a bare `6` is invalid — the declaration is
   * discarded, the stylesheet's own default takes over, and nothing about the page looks
   * wrong. A `parseFloat` would report 6 either way.
   */
  async getSpeedSeconds(): Promise<number> {
    const raw = await this.hostStyle('--wr-star-border-speed');
    const match = /^(-?\d*\.?\d+)s$/.exec(raw ?? '');

    if (!match) {
      throw new Error(
        `WrStarBorderHarness.getSpeedSeconds(): \`--wr-star-border-speed\` reads "${raw}" rather than a value in ` +
          'seconds. The stylesheet uses it as an animation-duration, so anything without the unit is an invalid ' +
          'declaration and the rays fall back to the default sweep.'
      );
    }
    return Number(match[1]);
  }

  /**
   * How far the rays bleed past the inner panel, in pixels.
   *
   * Read off the host's `padding`, which is where `[thickness]` lands: the component
   * writes the SHORTHAND, `<n>px 0`. Worth knowing on the attribute form — an inline
   * shorthand wins the cascade, so a `<button wr-star-border>` loses whatever padding its
   * own classes gave it, horizontal included. The visible padding lives on the inner
   * panel, so this is a bleed measurement rather than a spacing one.
   *
   * Throws when the host's padding is not that shape, which means either the binding
   * stopped arriving or something else is writing the property inline.
   */
  async getThickness(): Promise<number> {
    const raw = await this.hostStyle('padding');
    const match = /^(-?\d*\.?\d+)px\s+0(?:px)?$/.exec(raw ?? '');

    if (!match) {
      throw new Error(
        `WrStarBorderHarness.getThickness(): the host's inline padding reads "${raw}" rather than the ` +
          '`<n>px 0` shorthand the component writes from [thickness]. Either the binding is gone, or something ' +
          'else is setting padding inline on the same element.'
      );
    }
    return Number(match[1]);
  }

  /**
   * Whether every ray is kept out of the accessible tree.
   *
   * The one question worth asking about both spans at once — not how many there are, but
   * whether either has stopped being decoration. They carry no text and mean nothing, so
   * a ray that reached a screen reader would be an empty announcement in the middle of a
   * button. Answered for all of them together, so one ray losing the attribute is enough
   * to report `false`.
   */
  async areRaysDecorative(): Promise<boolean> {
    const rays = await this.locatorForAll('.wr-star-border__ray')();

    if (rays.length === 0) {
      throw new Error(
        'WrStarBorderHarness.areRaysDecorative(): there are no rays at all. Both spans are rendered in every ' +
          'mode — `rays="single"` hides one in CSS rather than dropping it — so none of them is a broken template ' +
          'rather than a variant.'
      );
    }

    const hidden = await Promise.all(rays.map(ray => ray.getAttribute('aria-hidden')));
    return hidden.every(value => value === 'true');
  }

  /** Read one declaration off the host's inline `style` — see this class's docs for why not `getCssValue()`. */
  private async hostStyle(property: string): Promise<string | null> {
    return inlineStyle(await (await this.host()).getAttribute('style'), property);
  }
}
