/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ContentContainerComponentHarness, HarnessPredicate, type TestElement, TestKey } from '@angular/cdk/testing';

import type { WrDialogHarnessFilters } from './types';

/**
 * Test harness for a dialog opened with `WrDialog.open()`.
 *
 * A dialog is never inside the fixture — `WrDialog` attaches it to the overlay
 * container — so load this from `TestbedHarnessEnvironment.documentRootLoader()`
 * rather than from `loader()`. The harness is a CONTENT CONTAINER, which is what
 * makes the interesting assertions possible: the buttons and fields it holds are
 * the consumer's own components, so `dialog.getHarness(WrButtonHarness…)` reads
 * them without the spec ever touching the overlay.
 *
 * @example
 * ```ts
 * const rootLoader = TestbedHarnessEnvironment.documentRootLoader(fixture);
 * const dialog = await rootLoader.getHarness(WrDialogHarness);
 *
 * expect(await dialog.getTitleText()).toBe('Delete this item?');
 * await (await dialog.getHarness(WrButtonHarness.with({ text: 'Delete' }))).click();
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrDialogHarness extends ContentContainerComponentHarness {
  /** The overlay panel `WrDialog` creates. */
  static hostSelector = '.wr-dialog-panel';

  /** Build a predicate that narrows the query — useful when two dialogs are stacked. */
  static with(options: WrDialogHarnessFilters = {}): HarnessPredicate<WrDialogHarness> {
    return new HarnessPredicate(WrDialogHarness, options).addOption('title', options.title, (harness, title) =>
      HarnessPredicate.stringMatches(harness.getTitleText(), title)
    );
  }

  /** The `[wrDialogTitle]` text, or `null` when the dialog has no title. */
  async getTitleText(): Promise<string | null> {
    const title = await this.locatorForOptional('.wr-dialog__title')();
    return title ? title.text() : null;
  }

  /** The `[wrDialogContent]` text, or `null` when the dialog projects no content region. */
  async getContentText(): Promise<string | null> {
    const content = await this.locatorForOptional('.wr-dialog__content')();
    return content ? content.text() : null;
  }

  /**
   * The role and modality the dialog announces.
   *
   * Worth asserting rather than assuming: `WrDialog` sets these on the OVERLAY
   * element, not on the component it renders, so a consumer looking for them on
   * their own host would not find them.
   */
  async getRole(): Promise<string | null> {
    return (await this.host()).getAttribute('role');
  }

  /** Whether the dialog is marked `aria-modal`. */
  async isModal(): Promise<boolean> {
    return (await (await this.host()).getAttribute('aria-modal')) === 'true';
  }

  /** Whether the built-in dismiss button is present (`closable`, the default). */
  async isClosable(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-dialog__close')()) !== null;
  }

  /** The dismiss button's accessible name — the string a screen reader reads out. */
  async getCloseLabel(): Promise<string | null> {
    const close = await this.locatorForOptional('.wr-dialog__close')();
    return close ? close.getAttribute('aria-label') : null;
  }

  /** Click the built-in dismiss button. Throws when the dialog was opened `closable: false`. */
  async close(): Promise<void> {
    await (await this.locatorFor('.wr-dialog__close')()).click();
  }

  /** Press Escape. A dialog opened `closeOnEscape: false` ignores it — assert, do not assume. */
  async sendEscape(): Promise<void> {
    await (await this.host()).sendKeys(TestKey.ESCAPE);
  }

  /** Whether this is a `WrDialog.confirm()` dialog, the one `confirm()` and `cancel()` answer. */
  async isConfirm(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-dialog-confirm__action--confirm')()) !== null;
  }

  /** Whether this is a `WrDialog.alert()` dialog, the one `ok()` dismisses. */
  async isAlert(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-dialog-confirm__action--ok')()) !== null;
  }

  /**
   * The `intent` a `confirm()` or an `alert()` dialog shows as an icon, or
   * `null` when it has none. Read off the icon's modifier class, which is all
   * the intent leaves in the DOM: the icon is decorative.
   */
  async getIntent(): Promise<'info' | 'success' | 'warning' | 'danger' | null> {
    const icon = await this.locatorForOptional('.wr-dialog-confirm__icon')();
    if (!icon) return null;
    for (const intent of ['info', 'success', 'warning', 'danger'] as const) {
      if (await icon.hasClass(`wr-dialog-confirm__icon--${intent}`)) return intent;
    }
    return null;
  }

  /** Press the button of a `WrDialog.alert()` dialog. Throws on any other dialog. */
  async ok(): Promise<void> {
    await (await this.answer('ok')).click();
  }

  /** Press the confirm button of a `WrDialog.confirm()` dialog. Throws on any other dialog. */
  async confirm(): Promise<void> {
    await (await this.answer('confirm')).click();
  }

  /** Press the cancel button of a `WrDialog.confirm()` dialog. Throws on any other dialog. */
  async cancel(): Promise<void> {
    await (await this.answer('cancel')).click();
  }

  private async answer(which: 'confirm' | 'cancel' | 'ok'): Promise<TestElement> {
    const button = await this.locatorForOptional(`.wr-dialog-confirm__action--${which}`)();
    if (!button) {
      const method = which === 'ok' ? 'alert' : 'confirm';
      const opener = (await this.isAlert()) ? 'alert' : (await this.isConfirm()) ? 'confirm' : 'open';
      throw new Error(
        `WrDialogHarness: ${which}() answers a WrDialog.${method}() dialog; this one was opened with ${opener}()`
      );
    }
    return button;
  }

  /** Whether focus is currently somewhere inside the dialog, where the trap should keep it. */
  async isFocusTrapped(): Promise<boolean> {
    return (await this.host()).matchesSelector(':focus-within');
  }
}
