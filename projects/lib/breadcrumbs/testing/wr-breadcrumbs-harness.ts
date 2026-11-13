/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrBreadcrumbsHarnessFilters, WrBreadcrumbsItemHarnessFilters } from './types';
import { WrBreadcrumbsItemHarness } from './wr-breadcrumbs-item-harness';

/**
 * Test harness for `<wr-breadcrumbs>`, the trail of {@link WrBreadcrumbsItemHarness} crumbs.
 *
 * The glyph between crumbs is generated content, drawn by the stylesheet from a
 * custom property the component writes on the host. {@link getSeparator} reads
 * that property: it says which glyph was asked for, and a unit test, which
 * loads no stylesheet, has no way to say it was drawn.
 *
 * @example
 * ```ts
 * const trail = await loader.getHarness(WrBreadcrumbsHarness);
 *
 * expect(await trail.getItems()).toEqual(['Home', 'Docs', 'Testing']);
 * expect(await trail.getCurrent()).toBe('Testing');
 * await trail.clickItem('Docs');
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrBreadcrumbsHarness extends ComponentHarness {
  static hostSelector = 'wr-breadcrumbs';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrBreadcrumbsHarnessFilters = {}): HarnessPredicate<WrBreadcrumbsHarness> {
    return new HarnessPredicate(WrBreadcrumbsHarness, options).addOption('label', options.label, (harness, label) =>
      HarnessPredicate.stringMatches(harness.getLabel(), label)
    );
  }

  /** The accessible name of the `<nav>` landmark. */
  async getLabel(): Promise<string | null> {
    return (await this.locatorFor('nav.wr-breadcrumbs__nav')()).getAttribute('aria-label');
  }

  /**
   * The separator the component asked the stylesheet to draw, from the
   * `--wr-breadcrumbs-separator` it wrote on the host, unquoted and unescaped.
   */
  async getSeparator(): Promise<string | null> {
    const style = (await (await this.host()).getAttribute('style')) ?? '';
    const quoted = /--wr-breadcrumbs-separator:\s*"((?:[^"\\]|\\.)*)"/.exec(style)?.[1];
    if (quoted === undefined) return null;
    return quoted
      .replace(/\\([0-9a-f]{1,6}) ?/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
      .replace(/\\(.)/g, '$1');
  }

  /** The text of every crumb, in order. */
  async getItems(): Promise<string[]> {
    const items = await this.getItemHarnesses();
    return Promise.all(items.map(item => item.getText()));
  }

  /** The crumbs themselves, in order, for what the texts do not say. */
  async getItemHarnesses(filters: WrBreadcrumbsItemHarnessFilters = {}): Promise<WrBreadcrumbsItemHarness[]> {
    return this.locatorForAll(WrBreadcrumbsItemHarness.with(filters))();
  }

  /** The first crumb with this text, or a failure naming the crumbs that exist. */
  async getItem(text: string | RegExp): Promise<WrBreadcrumbsItemHarness> {
    const [item] = await this.getItemHarnesses({ text });
    if (!item) {
      throw new Error(
        `WrBreadcrumbsHarness.getItem(): no crumb matched ${String(text)}. This trail holds: ` +
          `${(await this.getItems()).join(', ')}.`
      );
    }
    return item;
  }

  /**
   * The text of the current page, or `null` when no crumb is marked.
   *
   * Throws when more than one is: a trail announcing two current pages is the
   * bug, and answering with the first would hide it.
   */
  async getCurrent(): Promise<string | null> {
    const current = await this.getItemHarnesses({ current: true });
    if (current.length > 1) {
      const texts = await Promise.all(current.map(item => item.getText()));
      throw new Error(
        `WrBreadcrumbsHarness.getCurrent(): ${current.length} crumbs are marked current: ${texts.join(', ')}.`
      );
    }
    return current[0]?.getText() ?? null;
  }

  /** Click the first crumb with this text. Throws when nothing matched, or when it is the current page. */
  async clickItem(text: string | RegExp): Promise<void> {
    await (await this.getItem(text)).click();
  }
}
