/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import { WrButtonHarness } from 'ngwr/button/testing';
import type { WrLoadStateStatus } from 'ngwr/load-state';

import type { WrLoadStateHarnessFilters } from './types';

const STATES: readonly WrLoadStateStatus[] = ['loading', 'error', 'empty', 'ready'];

/**
 * Test harness for one `<wr-load-state>`: which of its four states is on screen,
 * whether a load is in flight behind it, and the retry the default failure offers.
 *
 * The state is read from the host's `wr-load-state--<state>` modifier, which is
 * public API and the one thing all four states have in common; what each state
 * draws is the consumer's own template or another component with a harness of
 * its own, so this one does not reach into it. `isBusy()` reads `aria-busy`, the
 * attribute a screen reader acts on, rather than the `--busy` modifier beside it.
 *
 * There is no `getContentText()`: the content is whatever the consumer's template
 * draws, and a spec that wants it queries for it under the wrapper's host. There
 * is no `getErrorText()` either, for the same reason, and because the default
 * failure's title is a catalog string a spec would be pinning for nothing.
 *
 * @example
 * ```ts
 * const loader = TestbedHarnessEnvironment.loader(fixture);
 * const orders = await loader.getHarness(WrLoadStateHarness);
 *
 * expect(await orders.getState()).toBe('error');
 * await orders.retry();
 * expect(await orders.isRetrying()).toBe(true);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrLoadStateHarness extends ComponentHarness {
  static hostSelector = 'wr-load-state';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrLoadStateHarnessFilters = {}): HarnessPredicate<WrLoadStateHarness> {
    return new HarnessPredicate(WrLoadStateHarness, options).addOption(
      'state',
      options.state,
      async (harness, state) => (await harness.getState()) === state
    );
  }

  private readonly retryButton = this.locatorForOptional(WrButtonHarness.with({ selector: '.wr-load-state__retry' }));

  /** Which state is drawn, from the host's `wr-load-state--<state>` modifier. */
  async getState(): Promise<WrLoadStateStatus> {
    const host = await this.host();
    for (const state of STATES) {
      if (await host.hasClass(`wr-load-state--${state}`)) return state;
    }
    throw new Error('WrLoadStateHarness.getState(): the host carries no `wr-load-state--<state>` modifier.');
  }

  /**
   * Whether a load is in flight, from the host's `aria-busy`. `true` for the first
   * load, for a reload behind the content and for a retry behind the failure.
   */
  async isBusy(): Promise<boolean> {
    return (await (await this.host()).getAttribute('aria-busy')) === 'true';
  }

  /**
   * The default failure's retry button.
   *
   * Throws unless the wrapper is in its `error` state AND draws the default
   * failure: a consumer's own `wrLoadStateError` template owns whatever button
   * it draws, and a harness that answered with some other button would be
   * asserting the wrong control.
   */
  async getRetryButton(): Promise<WrButtonHarness> {
    const button = await this.retryButton();
    if (!button) {
      throw new Error(
        `WrLoadStateHarness.getRetryButton(): no default retry button. The wrapper is in its ` +
          `"${await this.getState()}" state; the button exists only in the \`error\` state, and only when no ` +
          '`wrLoadStateError` template replaces the default failure.'
      );
    }
    return button;
  }

  /** Whether a retry is in flight, from the default retry button's loading state. */
  async isRetrying(): Promise<boolean> {
    return (await this.getRetryButton()).isLoading();
  }

  /**
   * Press the default retry button. A press while a retry is in flight starts
   * nothing, so assert {@link isRetrying} rather than counting presses.
   */
  async retry(): Promise<void> {
    return (await this.getRetryButton()).click();
  }
}
