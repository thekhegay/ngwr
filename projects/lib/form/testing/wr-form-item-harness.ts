/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ContentContainerComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrFormItemHarnessFilters } from './interfaces';

/**
 * Test harness for `<wr-form-item>` — the layout-only field row.
 *
 * Deliberately a much smaller surface than {@link WrFormFieldHarness}, because
 * the component is a much smaller thing: it discovers no control, generates no
 * id, wires no `for` and no `aria-describedby`, and reads no validity. It paints
 * the error state it is TOLD to paint, via `[hasError]`, and everything else in
 * it belongs to the consumer — including the `<label>`, which is named here
 * rather than linked (nothing wires it; the consumer's own `for` is the only
 * thing that can).
 *
 * The one behavioural trap it is worth a harness for: a `<wr-form-error>` inside
 * a form-item renders UNCONDITIONALLY. `key` has no effect at all — the gating
 * lives in the surrounding `<wr-form-field>`, and with no field to ask, every
 * message decides it is the one to show. Markup moved from a field into an item
 * therefore starts printing every sentence at once, and {@link getErrorTexts}
 * is what says so.
 *
 * @example
 * ```ts
 * const item = await loader.getHarness(WrFormItemHarness.with({ label: 'Email' }));
 *
 * expect(await item.isInvalid()).toBe(true);
 * expect(await item.getErrorTexts()).toEqual(['Invalid email']);
 * await (await item.getHarness(WrInputHarness)).setValue('ada@example.test');
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrFormItemHarness extends ContentContainerComponentHarness {
  static hostSelector = 'wr-form-item';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrFormItemHarnessFilters = {}): HarnessPredicate<WrFormItemHarness> {
    return new HarnessPredicate(WrFormItemHarness, options)
      .addOption('label', options.label, (harness, label) => HarnessPredicate.stringMatches(harness.getLabel(), label))
      .addOption('invalid', options.invalid, async (harness, invalid) => (await harness.isInvalid()) === invalid)
      .addOption('errorText', options.errorText, async (harness, text) => {
        for (const shown of await harness.getErrorTexts()) {
          if (await HarnessPredicate.stringMatches(shown, text)) return true;
        }
        return false;
      });
  }

  /**
   * The text of the item's own `<label>` child, or `null` when it has none.
   *
   * Direct child only — that is what the item styles (`> label` is what turns red
   * in the error state), so a label nested deeper is the consumer's own business
   * and answering with it would describe something the item never touches.
   */
  async getLabel(): Promise<string | null> {
    const label = await this.locatorForOptional(':scope > label')();
    return label ? label.text() : null;
  }

  /**
   * Whether the item is painting the error state.
   *
   * The `wr-form-item--error` modifier, which is driven entirely by the
   * consumer's `[hasError]` — the item runs no validity check of its own, so this
   * answers what it was told, not what the control thinks.
   */
  async isInvalid(): Promise<boolean> {
    return (await this.host()).hasClass('wr-form-item--error');
  }

  /**
   * Every `<wr-form-error>` in the item, as text, in DOM order.
   *
   * All of them: nothing is gated here, `key` or no `key`. Nothing is ever
   * hidden either, so there is no suppressed-message counterpart to this — see
   * the class docs.
   */
  async getErrorTexts(): Promise<string[]> {
    const errors = await this.locatorForAll('wr-form-error')();
    return Promise.all(errors.map(error => error.text()));
  }
}
