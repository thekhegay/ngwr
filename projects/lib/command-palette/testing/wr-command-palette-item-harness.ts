/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrCommandPaletteItemHarnessFilters } from './interfaces';

/**
 * Test harness for one command inside an open `<wr-command-palette>`.
 *
 * An item is an `option` in the palette's listbox, and it is never focused — the
 * search input keeps focus and points at the highlighted row with
 * `aria-activedescendant` — so `aria-selected` and the row's `id` are the whole
 * story a screen reader is told, and both are read here rather than the
 * `--active` class that paints it.
 *
 * @example
 * ```ts
 * const palette = await loader.getHarness(WrCommandPaletteHarness);
 * const [first] = await palette.getItems();
 *
 * expect(await first.getLabel()).toBe('Open file');
 * expect(await first.getShortcut()).toBe('⌘O');
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrCommandPaletteItemHarness extends ComponentHarness {
  /** The row the palette renders per command — also the `role="option"`. */
  static hostSelector = '.wr-command-palette__option';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrCommandPaletteItemHarnessFilters = {}): HarnessPredicate<WrCommandPaletteItemHarness> {
    return new HarnessPredicate(WrCommandPaletteItemHarness, options)
      .addOption('text', options.text, (harness, text) => HarnessPredicate.stringMatches(harness.getLabel(), text))
      .addOption('active', options.active, async (harness, active) => (await harness.isActive()) === active);
  }

  /**
   * The item's primary label.
   *
   * Read from the label element rather than from the host's text: the host also
   * holds the description, the shortcut hint, and whatever text sits inside a
   * registered icon's SVG (`<title>`, most often) — an icon with one would
   * otherwise turn up in the middle of the answer.
   */
  async getLabel(): Promise<string> {
    return (await this.locatorFor('.wr-command-palette__option-label')()).text();
  }

  /** The secondary line under the label, or `null` when the item declares none. */
  async getDescription(): Promise<string | null> {
    const description = await this.locatorForOptional('.wr-command-palette__option-description')();
    return description ? description.text() : null;
  }

  /**
   * The shortcut hint painted on the right, or `null` when the item declares none.
   *
   * A hint only — the palette draws whatever string it was given and binds
   * nothing. Only `trigger` is a real keybinding.
   */
  async getShortcut(): Promise<string | null> {
    const shortcut = await this.locatorForOptional('.wr-command-palette__option-shortcut')();
    return shortcut ? shortcut.text() : null;
  }

  /**
   * The leading icon's registered name, or `null` when the item declares no icon.
   *
   * The icon SLOT is always painted — an item without one gets a blank span so
   * every label stays on the same left edge — so the query is for the `<wr-icon>`
   * itself. It reflects the name it was asked for as `data-icon` whether or not
   * that name is registered, so this answers what the item MEANT to draw.
   */
  async getIconName(): Promise<string | null> {
    const icon = await this.locatorForOptional('wr-icon.wr-command-palette__option-icon')();
    return icon ? icon.getAttribute('data-icon') : null;
  }

  /** The role the item announces — `option`. */
  async getRole(): Promise<string | null> {
    return (await this.host()).getAttribute('role');
  }

  /**
   * Whether this item is the highlighted one.
   *
   * From `aria-selected`, not the `wr-command-palette__option--active` class:
   * both are public and the template paints them from the same predicate, but the
   * attribute is what a screen reader acts on — and it is the one
   * `aria-activedescendant` has to agree with. See
   * `WrCommandPaletteHarness.isActiveItemAnnounced()`.
   */
  async isActive(): Promise<boolean> {
    return (await (await this.host()).getAttribute('aria-selected')) === 'true';
  }

  /** The row's `id` — what the search input points at while this item is highlighted. */
  async getId(): Promise<string> {
    const id = await (await this.host()).getAttribute('id');
    if (!id) {
      throw new Error(
        `WrCommandPaletteItemHarness.getId(): "${await this.getLabel()}" has no id, so no search input can ` +
          'point at it with `aria-activedescendant` — the palette assigns one per rendered row.'
      );
    }
    return id;
  }

  /**
   * Run this command — the pointer path.
   *
   * The palette commits on `mousedown` rather than on `click`, so that a press
   * inside the panel never lets the input lose focus first; the CDK's click
   * sequence opens with one, so this drives the real handler. It needs no
   * coordinates, which is what makes it usable in jsdom at all.
   *
   * With `closeOnPick` left at its default this also closes the palette, taking
   * every item harness — including this one — out of the DOM.
   */
  async click(): Promise<void> {
    return (await this.host()).click();
  }

  /**
   * Move the pointer onto this item, which highlights it.
   *
   * The palette follows the pointer as well as the keyboard, but only the
   * keyboard scrolls the row into view — hovering deliberately leaves the scroll
   * position alone, since moving it would fight the pointer that caused the move.
   */
  async hover(): Promise<void> {
    return (await this.host()).hover();
  }
}
