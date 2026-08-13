/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrMarqueeHarnessFilters, WrMarqueeLink } from './interfaces';
import { WrMarqueeItemHarness } from './wr-marquee-item-harness';

/** Copy 0 is the original sequence; every other `.wr-marquee__list` is a clone of it. */
const FIRST_COPY = '.wr-marquee__list[data-copy="0"]';

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
 * Test harness for `<wr-marquee>`.
 *
 * **Almost everything worth asserting about a marquee is structural, not animated.** The
 * strip duplicates its sequence so the loop has no seam, and only the first copy is left
 * in the accessible tree — {@link getAnnouncedCopyCount} is the assertion that catches
 * the regression that matters, because a duplicate leaking in makes a screen reader read
 * the whole logo strip twice and changes nothing on screen. The other half is the naming
 * ladder on linked entries, which is real logic with a real bug in its history: the
 * fallback used to be the hard-coded English word "link".
 *
 * **Every list query is scoped to the first copy**, and that is the reason to use
 * {@link getItems} rather than a raw `.wr-marquee__item` query, which returns at least
 * twice as many elements as there are entries.
 *
 * Nothing about the motion is offered. The track's `translate3d` is written only when the
 * measured sequence is wider than zero, so it never appears in a test at all, and in a
 * browser it is one frame of a loop that is already stale by the time an assertion reads
 * it. `[speed]` and `[direction]` reach the DOM in no form. Neither does the hover state:
 * pausing flips a private signal with no class, attribute or property behind it, so a
 * `hover()` here would fire events that provably change nothing readable. And the
 * reduced-motion freeze is a CSS `!important` rule with no counterpart in TypeScript,
 * which means the DOM is identical either way — see `getGap` for what a harness can
 * honestly read off a stylesheet-driven component, and why it reads it where it does.
 *
 * @example
 * ```ts
 * const loader = TestbedHarnessEnvironment.loader(fixture);
 * const strip = await loader.getHarness(WrMarqueeHarness);
 *
 * expect(await strip.getAnnouncedCopyCount()).toBe(1);
 * expect(await strip.getItemCount()).toBe(logos.length);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrMarqueeHarness extends ComponentHarness {
  static hostSelector = 'wr-marquee';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrMarqueeHarnessFilters = {}): HarnessPredicate<WrMarqueeHarness> {
    return new HarnessPredicate(WrMarqueeHarness, options).addOption('ariaLabel', options.ariaLabel, (harness, label) =>
      HarnessPredicate.stringMatches(harness.getAccessibleName(), label)
    );
  }

  private readonly copies = this.locatorForAll('.wr-marquee__list');

  /**
   * The name the region announces.
   *
   * Pins the i18n ladder end to end: `'Marquee'` with no catalog loaded, the consumer's
   * `[ariaLabel]` when one is given, the localized string under a catalog. A landmark
   * with no name is an axe failure, so this is what keeps the `region` legitimate rather
   * than a decoration a screen-reader user is invited to jump to and finds unnamed.
   */
  async getAccessibleName(): Promise<string | null> {
    return (await this.host()).getAttribute('aria-label');
  }

  /**
   * The landmark role the strip claims.
   *
   * Static in the template and one attribute away from being dropped in a refactor, which
   * is exactly why a consumer asserting their page's landmark structure should be able to
   * see it from here.
   */
  async getRole(): Promise<string | null> {
    return (await this.host()).getAttribute('role');
  }

  /**
   * How many copies of the sequence are rendered.
   *
   * The seamless loop is built by repeating the whole list until it covers the container,
   * so the count is decided by measurement — which means it stays at the floor of 2 in a
   * test with no layout, whatever the container would really be. Assert `>= 2`; the
   * growth needs a browser.
   */
  async getCopyCount(): Promise<number> {
    return (await this.copies()).length;
  }

  /**
   * How many copies are left in the accessible tree. Must be exactly 1.
   *
   * The one assertion here that catches a silent regression: every copy after the first
   * carries `aria-hidden="true"`, and losing that makes a screen reader read the whole
   * strip once per copy while the page looks unchanged.
   *
   * Note the first copy carries the literal `aria-hidden="false"` rather than no
   * attribute at all, so this compares against the string `'true'` — testing the
   * attribute for presence would count nothing at all as announced.
   */
  async getAnnouncedCopyCount(): Promise<number> {
    const copies = await this.copies();
    const hidden = await Promise.all(copies.map(copy => copy.getAttribute('aria-hidden')));
    return hidden.filter(value => value !== 'true').length;
  }

  /** The entries of the first copy, in order — one per entry of `[items]`. */
  async getItems(): Promise<WrMarqueeItemHarness[]> {
    return this.locatorForAll(WrMarqueeItemHarness.with({ ancestor: FIRST_COPY }))();
  }

  /**
   * How many entries the strip drew, counting the first copy only.
   *
   * One per entry of `[items]` — the mapping a consumer's own data pipeline is really
   * being tested for.
   */
  async getItemCount(): Promise<number> {
    return (await this.locatorForAll(`${FIRST_COPY} .wr-marquee__item`)()).length;
  }

  /**
   * The `alt` of each image in the first copy, in order.
   *
   * `null` in this list is the thing to look for: it means the attribute is MISSING, which
   * is a serious axe violation and announces the file name. An empty string is the
   * opposite — a deliberately decorative logo — and the template's `alt || ''` is what
   * keeps the two apart. A method typed `string[]` would have had to flatten them.
   */
  async getImageAlts(): Promise<(string | null)[]> {
    const images = await this.locatorForAll(`${FIRST_COPY} img`)();
    return Promise.all(images.map(image => image.getAttribute('alt')));
  }

  /**
   * Every linked entry of the first copy: where it goes and what it announces.
   *
   * The name is the interesting half. It walks a ladder ending in the catalog's
   * `marquee.link`, so an unlabelled logo announces a localized word rather than nothing
   * — real component logic rather than an echo of the input.
   */
  async getLinks(): Promise<WrMarqueeLink[]> {
    const links = await this.locatorForAll(`${FIRST_COPY} a.wr-marquee__link`)();
    return Promise.all(
      links.map(async link => ({ href: await link.getAttribute('href'), name: await link.getAttribute('aria-label') }))
    );
  }

  /**
   * Whether the edge fades are on.
   *
   * The fades themselves are `::before` / `::after` gradients, which no unit environment
   * can see — so the modifier class is the observable, and it is public API a consumer
   * may be styling against in any case.
   */
  async hasFade(): Promise<boolean> {
    return (await this.host()).hasClass('wr-marquee--fade');
  }

  /**
   * The fade colour as the component passed it through — a CSS value such as
   * `'var(--wr-color-success)'`, not a resolved colour — or `null` when none was given.
   *
   * Worth asserting next to {@link hasFade}: a colour with no fade modifier renders
   * nothing at all, which is a consumer mistake this pairing makes visible.
   */
  async getFadeColor(): Promise<string | null> {
    return this.hostStyle('--wr-marquee-fade-color');
  }

  /**
   * Whether entries scale up under the pointer.
   *
   * A `:hover` transform, so again the modifier is the only honest read — and it earns
   * its place by doing more than the name suggests: it also changes the strip's vertical
   * padding, so a lost class shifts the layout as well as the hover.
   */
  async hasScaleOnHover(): Promise<boolean> {
    return (await this.host()).hasClass('wr-marquee--scale-hover');
  }

  /** The gap between entries in pixels — the seam width the stylesheet reads. */
  async getGap(): Promise<number> {
    return this.pixels('--wr-marquee-gap', 'getGap');
  }

  /**
   * The entry height in pixels.
   *
   * It drives the image height AND the entry font size, so a binding that stops arriving
   * collapses the whole strip rather than merely resizing it.
   */
  async getItemHeight(): Promise<number> {
    return this.pixels('--wr-marquee-height', 'getItemHeight');
  }

  /**
   * Read a custom property off the host's inline `style`, rather than through
   * `getCssValue()`.
   *
   * Not a jsdom workaround — the opposite. The stylesheet declares its own
   * `--wr-marquee-gap: 32px` and `--wr-marquee-height: 28px` on `.wr-marquee`, so a
   * computed read in a real browser answers with the stylesheet's default when the host
   * binding is the very thing that broke. The inline value is what the component wrote,
   * and nothing else can forge it.
   */
  private async hostStyle(property: string): Promise<string | null> {
    return inlineStyle(await (await this.host()).getAttribute('style'), property);
  }

  /**
   * Parse a `<n>px` custom property, refusing anything that lost its unit.
   *
   * The refusal is the point. `[gap]` and `[itemHeight]` are numbers that the host binding
   * turns into lengths, and the stylesheet uses them raw — a bare `32` is an invalid
   * declaration, so the property falls back to the stylesheet default and the strip looks
   * merely a little different. A `parseFloat` would report 32 either way and hide it.
   */
  private async pixels(property: string, method: string): Promise<number> {
    const raw = await this.hostStyle(property);
    const match = /^(-?\d*\.?\d+)px$/.exec(raw ?? '');

    if (!match) {
      throw new Error(
        `WrMarqueeHarness.${method}(): \`${property}\` reads "${raw}" rather than a px length. The stylesheet ` +
          'uses this value as a raw CSS length, so anything without the unit is an invalid declaration and the ' +
          'strip silently falls back to the default in the stylesheet.'
      );
    }
    return Number(match[1]);
  }
}
