/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrMentionOptionHarnessFilters } from './interfaces';

/**
 * Test harness for one suggestion inside a `[wrMention]` panel.
 *
 * Reach these through {@link WrMentionHarness.getOptions}, never off the document:
 * the panel is a portal in the shared overlay container, so a bare query answers
 * with whichever mention field opened first.
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrMentionOptionHarness extends ComponentHarness {
  /** One `<li role="option">` in the panel's listbox. */
  static hostSelector = '.wr-mention-panel__option';

  /** Build a predicate that narrows the query. */
  static with(options: WrMentionOptionHarnessFilters = {}): HarnessPredicate<WrMentionOptionHarness> {
    return new HarnessPredicate(WrMentionOptionHarness, options)
      .addOption('text', options.text, (harness, text) => HarnessPredicate.stringMatches(harness.getText(), text))
      .addOption('active', options.active, async (harness, active) => (await harness.isActive()) === active);
  }

  /** The suggestion's label — whatever `displayWith` returned for the item. */
  async getText(): Promise<string> {
    return (await this.host()).text();
  }

  /**
   * Whether the cursor is on this suggestion.
   *
   * Read from `aria-selected` rather than from the `--active` modifier class. The
   * two are set from the same index, so they agree — but the ARIA state is what a
   * screen reader is told, and the class is only what the highlight is painted
   * with.
   */
  async isActive(): Promise<boolean> {
    return (await (await this.host()).getAttribute('aria-selected')) === 'true';
  }

  /**
   * The suggestion's id — the value the field names in `aria-activedescendant`.
   *
   * The only link between the two DOM trees: the panel is in the overlay
   * container, not inside the field, so this id is how the reference reaches it
   * at all.
   */
  async getId(): Promise<string | null> {
    return (await this.host()).getAttribute('id');
  }

  /**
   * Pick this suggestion with the mouse.
   *
   * Needs no layout, so it works here: the panel commits on `mousedown` —
   * deliberately, so the field never loses focus and the caret stays put — and
   * the CDK's no-arg click dispatches `mousedown` at the head of its sequence
   * without any hit test.
   */
  async click(): Promise<void> {
    return (await this.host()).click();
  }

  /**
   * Move the pointer onto this suggestion, which makes it the active one.
   *
   * Hover and the arrow keys drive the same single cursor, so a spec can assert
   * the mouse path through {@link WrMentionHarness.getActiveOptionLabel} exactly
   * as it does the keyboard one.
   */
  async hover(): Promise<void> {
    return (await this.host()).hover();
  }
}
