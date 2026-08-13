/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrMarqueeItemHarnessFilters } from './interfaces';

/**
 * Test harness for one entry of a `<wr-marquee>`.
 *
 * **Reach these through `WrMarqueeHarness.getItems()`, which scopes them to the first
 * copy.** The strip duplicates its whole sequence to make the loop seamless, so asking
 * the document loader for all of these returns one per entry per copy — at least twice
 * everything, and a count assertion that quietly multiplies. The parent harness is the
 * only place that knows which copy is the original.
 *
 * An entry is built from an image or from a projected template, and it may or may not be
 * a link. That is the reason to ask a harness rather than the DOM: the same question —
 * what does this announce, is it decoration — is answered from a different attribute in
 * each of those shapes, and {@link getAccessibleName} and {@link isDecorative} pick the
 * right one.
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrMarqueeItemHarness extends ComponentHarness {
  static hostSelector = '.wr-marquee__item';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrMarqueeItemHarnessFilters = {}): HarnessPredicate<WrMarqueeItemHarness> {
    return new HarnessPredicate(WrMarqueeItemHarness, options)
      .addOption('name', options.name, (harness, name) =>
        HarnessPredicate.stringMatches(harness.getAccessibleName(), name)
      )
      .addOption('link', options.link, async (harness, link) => (await harness.isLink()) === link);
  }

  private readonly link = this.locatorForOptional('a.wr-marquee__link');
  private readonly image = this.locatorForOptional('img');
  private readonly node = this.locatorForOptional('.wr-marquee__node');

  /**
   * What this entry announces, without the caller needing to know how it was built.
   *
   * A linked entry answers with the link's own name, which is the end of a four-step
   * ladder — the item's `ariaLabel`, then its `title`, then an image's `alt`, then the
   * catalog's `marquee.link`. An unlinked image answers with its `alt`, where `''` means
   * the logo is decoration and announces nothing. Anything else answers with its text.
   */
  async getAccessibleName(): Promise<string | null> {
    const link = await this.link();
    if (link) return link.getAttribute('aria-label');

    const image = await this.image();
    if (image) return image.getAttribute('alt');

    return (await this.host()).text();
  }

  /** Whether this entry became a link — `[items]` carries `href` per entry, optionally. */
  async isLink(): Promise<boolean> {
    return (await this.link()) !== null;
  }

  /** The `href` exactly as the entry declared it, unresolved, or `null` when it is not a link. */
  async getHref(): Promise<string | null> {
    const link = await this.link();
    return link ? link.getAttribute('href') : null;
  }

  /**
   * Whether the link opens in a new tab AND says so safely: `target="_blank"` with both
   * `noreferrer` and `noopener` in `rel`.
   *
   * One question rather than two, because half of it is a reverse-tabnabbing hole that
   * nothing visual would ever show. The library hard-codes the safe pair, so this is a
   * regression check on the template rather than on the caller's data.
   *
   * Throws for an entry that is not a link, where a `false` would read as "it opens in
   * this tab" — an answer about safety that is not true of anything.
   */
  async opensInNewTab(): Promise<boolean> {
    const link = await this.link();
    if (!link) {
      throw new Error(
        `WrMarqueeItemHarness.opensInNewTab(): "${await this.getAccessibleName()}" is not a link — its entry in ` +
          '[items] carries no `href`, so there is no target or rel to check. Ask isLink() first.'
      );
    }

    const rel = (await link.getAttribute('rel')) ?? '';
    return (await link.getAttribute('target')) === '_blank' && rel.includes('noreferrer') && rel.includes('noopener');
  }

  /**
   * Whether this entry's content is kept out of the accessible tree, leaving whatever
   * wraps it to do the announcing.
   *
   * The marker depends on how the entry was built, which is the whole reason to ask here:
   * a projected template inside a named link carries `aria-hidden`, so the link's own name
   * is not read twice, while an image says the same thing with `alt=""`. It describes the
   * CONTENT — a decorative logo inside a link is still announced, by the link, and that
   * name is {@link getAccessibleName}.
   *
   * Throws for an entry that rendered neither, which should not happen — every entry of
   * `[items]` is one or the other.
   */
  async isDecorative(): Promise<boolean> {
    const node = await this.node();
    if (node) return (await node.getAttribute('aria-hidden')) === 'true';

    const image = await this.image();
    if (image) return (await image.getAttribute('alt')) === '';

    throw new Error(
      'WrMarqueeItemHarness.isDecorative(): this entry rendered neither a projected node nor an image, so there ' +
        'is nothing carrying a decorative marker. Every entry of [items] is one or the other.'
    );
  }
}
