/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrToastType } from 'ngwr/toast';

import type { WrToastHarnessFilters } from './interfaces';

const TYPES: readonly WrToastType[] = ['info', 'success', 'warning', 'danger'];

/**
 * Test harness for a toast shown with `WrToast.show()`.
 *
 * Toasts live in the overlay, so load this from
 * `TestbedHarnessEnvironment.documentRootLoader()`. What is worth asserting on a
 * toast is mostly what it ANNOUNCES: `getRole()` and `getLiveLevel()` are how a
 * screen-reader user learns something happened, and they escalate with the
 * intent — a `danger` toast interrupts, an `info` toast waits its turn.
 *
 * @example
 * ```ts
 * const rootLoader = TestbedHarnessEnvironment.documentRootLoader(fixture);
 * const toast = await rootLoader.getHarness(WrToastHarness.with({ type: 'danger' }));
 *
 * expect(await toast.getMessage()).toBe('Could not save');
 * expect(await toast.getRole()).toBe('alert');
 * await toast.dismiss();
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrToastHarness extends ComponentHarness {
  static hostSelector = 'wr-toast';

  /** Build a predicate that narrows the query — several toasts are usually stacked. */
  static with(options: WrToastHarnessFilters = {}): HarnessPredicate<WrToastHarness> {
    return new HarnessPredicate(WrToastHarness, options)
      .addOption('message', options.message, (harness, message) =>
        HarnessPredicate.stringMatches(harness.getMessage(), message)
      )
      .addOption('title', options.title, (harness, title) => HarnessPredicate.stringMatches(harness.getTitle(), title))
      .addOption('type', options.type, async (harness, type) => (await harness.getType()) === type);
  }

  /** The toast's message line. */
  async getMessage(): Promise<string> {
    return (await this.locatorFor('.wr-toast__message')()).text();
  }

  /** The toast's title, or `null` when it was shown without one. */
  async getTitle(): Promise<string | null> {
    const title = await this.locatorForOptional('.wr-toast__title')();
    return title ? title.text() : null;
  }

  /** The intent, read from the `wr-toast--*` modifier. */
  async getType(): Promise<WrToastType | null> {
    const host = await this.host();
    for (const type of TYPES) {
      if (await host.hasClass(`wr-toast--${type}`)) return type;
    }
    return null;
  }

  /** `'alert'` for a danger toast, `'status'` otherwise — how urgently it interrupts. */
  async getRole(): Promise<string | null> {
    return (await this.host()).getAttribute('role');
  }

  /** `'assertive'` for danger and warning, `'polite'` otherwise. */
  async getLiveLevel(): Promise<string | null> {
    return (await this.host()).getAttribute('aria-live');
  }

  /** Whether the toast offers a dismiss button. */
  async isDismissible(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-toast__action--close')()) !== null;
  }

  /** Whether the toast offers a copy button. */
  async hasCopyAction(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-toast__action--copy')()) !== null;
  }

  /** Click the dismiss button. Throws on a toast shown `dismissible: false`. */
  async dismiss(): Promise<void> {
    await (await this.locatorFor('.wr-toast__action--close')()).click();
  }

  /** Click the copy button. Throws unless the toast was shown `showCopy: true`. */
  async copy(): Promise<void> {
    await (await this.locatorFor('.wr-toast__action--copy')()).click();
  }

  /** Whether the auto-dismiss progress bar is showing. */
  async hasProgressBar(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-toast__progress')()) !== null;
  }

  /** Hover the toast — which is what pauses its auto-dismiss timer. */
  async hover(): Promise<void> {
    return (await this.host()).hover();
  }

  /** Move the pointer away again, resuming the timer. */
  async mouseAway(): Promise<void> {
    return (await this.host()).mouseAway();
  }
}
