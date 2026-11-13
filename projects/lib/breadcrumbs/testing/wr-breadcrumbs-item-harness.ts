/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrBreadcrumbsItemHarnessFilters } from './types';

/**
 * Test harness for one `<wr-breadcrumbs-item>`: a link, or the current page.
 *
 * A crumb with neither `href` nor `routerLink` is the current page. It is
 * still an `<a>`, with `aria-current="page"` and out of the tab order, so
 * {@link isCurrent} reads the attribute and never the tag.
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrBreadcrumbsItemHarness extends ComponentHarness {
  static hostSelector = 'wr-breadcrumbs-item';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrBreadcrumbsItemHarnessFilters = {}): HarnessPredicate<WrBreadcrumbsItemHarness> {
    return new HarnessPredicate(WrBreadcrumbsItemHarness, options)
      .addOption('text', options.text, (harness, text) => HarnessPredicate.stringMatches(harness.getText(), text))
      .addOption('current', options.current, async (harness, current) => (await harness.isCurrent()) === current);
  }

  private readonly anchor = this.locatorFor('a.wr-breadcrumbs__link, a.wr-breadcrumbs__current');

  /** The crumb's text, trimmed. */
  async getText(): Promise<string> {
    return (await this.anchor()).text();
  }

  /** Whether this crumb is the current page, from `aria-current="page"`. */
  async isCurrent(): Promise<boolean> {
    return (await (await this.anchor()).getAttribute('aria-current')) === 'page';
  }

  /** Whether this crumb navigates somewhere: it was given an `href` or a `routerLink`. */
  async isLink(): Promise<boolean> {
    return (await this.anchor()).hasClass('wr-breadcrumbs__link');
  }

  /** The `href` the anchor carries, as written: `null` for the current page. */
  async getHref(): Promise<string | null> {
    return (await this.anchor()).getAttribute('href');
  }

  /** Whether the link opens in a new tab (`external`). */
  async isExternal(): Promise<boolean> {
    return (await (await this.anchor()).getAttribute('target')) === '_blank';
  }

  /** Whether the crumb draws a leading icon. */
  async hasIcon(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-breadcrumbs__icon')()) !== null;
  }

  /**
   * Click the crumb. Throws for the current page, which is text and goes
   * nowhere: a click that resolved there would read as a navigation.
   */
  async click(): Promise<void> {
    if (!(await this.isLink())) {
      throw new Error(`WrBreadcrumbsItemHarness.click(): "${await this.getText()}" is the current page, not a link.`);
    }
    await (await this.anchor()).click();
  }
}
