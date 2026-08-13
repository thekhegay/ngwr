/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, TestKey } from '@angular/cdk/testing';

import type { WrColorPickerTriggerHarnessFilters } from './interfaces';
import { WrColorPickerHarness } from './wr-color-picker-harness';

/**
 * Test harness for `[wrColorPickerTrigger]` — the element that opens a
 * `<wr-color-picker>` in an overlay.
 *
 * The trigger stays in your fixture; the picker it opens does not. So this harness
 * is loaded from the fixture loader like any element, and {@link getPicker} reaches
 * ACROSS into the overlay container for you — scoped by the panel id the trigger
 * publishes through `aria-controls`, never by `.wr-color-picker-overlay`, which
 * answers with whichever trigger opened first.
 *
 * @example
 * ```ts
 * const trigger = await loader.getHarness(WrColorPickerTriggerHarness);
 * const picker = await trigger.open();
 *
 * await picker.setHex('#3969e2');
 * await trigger.sendEscape();
 * expect(await trigger.isOpen()).toBe(false);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrColorPickerTriggerHarness extends ComponentHarness {
  static hostSelector = '[wrColorPickerTrigger]';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrColorPickerTriggerHarnessFilters = {}): HarnessPredicate<WrColorPickerTriggerHarness> {
    return new HarnessPredicate(WrColorPickerTriggerHarness, options)
      .addOption('text', options.text, (harness, text) => HarnessPredicate.stringMatches(harness.getText(), text))
      .addOption('open', options.open, async (harness, open) => (await harness.isOpen()) === open);
  }

  /** The trigger's own text, trimmed. */
  async getText(): Promise<string> {
    return (await this.host()).text();
  }

  /** Whether the picker is showing, from the trigger's `aria-expanded`. */
  async isOpen(): Promise<boolean> {
    return (await (await this.host()).getAttribute('aria-expanded')) === 'true';
  }

  /**
   * Whether the trigger refuses to open.
   *
   * From `aria-disabled`, which the directive writes for its own `disabled` input.
   * The host is usually a `<button>`, but the directive does not touch its `disabled`
   * PROPERTY — a consumer who binds that as well turns the element off at the DOM
   * level, which is a stronger thing and reads here too.
   */
  async isDisabled(): Promise<boolean> {
    const host = await this.host();
    return (await host.getAttribute('aria-disabled')) === 'true' || (await host.getProperty<boolean>('disabled'));
  }

  /**
   * The picker this trigger opened, or `null` while it is closed.
   *
   * Scoped by the id in `aria-controls`, so two triggers open at once — which
   * nothing in the component prevents, since only an outside click closes one —
   * answer with their own panels rather than with whichever came first.
   */
  async getPicker(): Promise<WrColorPickerHarness | null> {
    const id = await (await this.host()).getAttribute('aria-controls');
    if (!id) return null;

    return this.documentRootLocatorFactory().locatorForOptional(WrColorPickerHarness.with({ ancestor: `#${id}` }))();
  }

  /**
   * Open the picker and hand it back. An already-open trigger is left alone.
   *
   * Throws on a disabled trigger rather than answering `null` three lines later:
   * `toggle()` returns early while `disabled` is set, so the click lands and nothing
   * happens at all.
   */
  async open(): Promise<WrColorPickerHarness> {
    if (!(await this.isOpen())) {
      if (await this.isDisabled()) {
        throw new Error(
          `WrColorPickerTriggerHarness.open(): "${await this.getText()}" is disabled — the directive turns its ` +
            'own toggle away, so the click would land and change nothing.'
        );
      }
      await (await this.host()).click();
    }

    const picker = await this.getPicker();
    if (!picker) {
      throw new Error(
        'WrColorPickerTriggerHarness.open(): the trigger reports itself open but published no panel to find. ' +
          'That is a broken `aria-controls` pairing, not a timing problem.'
      );
    }
    return picker;
  }

  /** Close the picker. An already-closed trigger is left alone. */
  async close(): Promise<void> {
    if (!(await this.isOpen())) return;
    await (await this.host()).click();
  }

  /** Click the trigger once, whichever way that takes it. */
  async toggle(): Promise<void> {
    await (await this.host()).click();
  }

  /**
   * Press Escape.
   *
   * Sent to the TRIGGER, and it still reaches the picker: the overlay listens through
   * the CDK's keyboard dispatcher, which keeps one document listener and routes to
   * the top-most overlay — so this does not depend on where focus happens to be.
   */
  async sendEscape(): Promise<void> {
    await (await this.host()).sendKeys(TestKey.ESCAPE);
  }

  /** The role the trigger claims to open — `dialog`. */
  async getHasPopup(): Promise<string | null> {
    return (await this.host()).getAttribute('aria-haspopup');
  }
}
