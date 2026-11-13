/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrPullToRefreshHarnessFilters } from './types';

/** How far past any sane `threshold` the finger travels before `pull()` gives up, in pixels. */
const FARTHEST_PULL = 4096;

/**
 * Test harness for `<wr-pull-to-refresh>`.
 *
 * The component is a controlled spinner: a pull only fires `(refresh)`, and the
 * indicator stays open while the host binds `refreshing`. So {@link pull}
 * proves the gesture reached the handler, and {@link isRefreshing} proves the
 * handler set the flag. A spec that wants both asserts both.
 *
 * The gesture is sent as `touchstart`, `touchmove` and `touchend` events
 * carrying the one field the component reads, a `touches` list with a
 * `clientY`. That is what a unit test can send; the feel of the rubber band
 * needs a device. A pull starts only while the wrapper is scrolled to its top,
 * which is where every element is in a test with no layout.
 *
 * There is no `isDisabled()`: `disabled` writes nothing to the page. Pull, and
 * read what happened.
 *
 * @example
 * ```ts
 * const list = await loader.getHarness(WrPullToRefreshHarness);
 *
 * await list.pull();
 * expect(reload).toHaveBeenCalledOnce();
 * expect(await list.isRefreshing()).toBe(true);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrPullToRefreshHarness extends ComponentHarness {
  static hostSelector = 'wr-pull-to-refresh';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrPullToRefreshHarnessFilters = {}): HarnessPredicate<WrPullToRefreshHarness> {
    return new HarnessPredicate(WrPullToRefreshHarness, options).addOption(
      'refreshing',
      options.refreshing,
      async (harness, refreshing) => (await harness.isRefreshing()) === refreshing
    );
  }

  private readonly indicator = this.locatorForOptional('.wr-pull-to-refresh__indicator');

  /**
   * Whether a refresh is in flight: the indicator is drawn while no finger is
   * on the wrapper. At rest the component closes the indicator unless
   * `refreshing` holds it open, so the two together mean the bound flag is set.
   */
  async isRefreshing(): Promise<boolean> {
    return (await this.indicator()) !== null && !(await this.isPulling());
  }

  /** Whether a pull is under way, from the host losing its `wr-pull-to-refresh--animating` modifier. */
  async isPulling(): Promise<boolean> {
    return !(await (await this.host()).hasClass('wr-pull-to-refresh--animating'));
  }

  /**
   * How far the indicator is open, in pixels, from the height the component
   * wrote on it: `0` when it is closed.
   */
  async getPullDistance(): Promise<number> {
    const style = (await (await this.indicator())?.getAttribute('style')) ?? '';
    return Number.parseFloat(/(?:^|;)\s*height:\s*([\d.]+)px/.exec(style)?.[1] ?? '0');
  }

  /**
   * Whether a pull under way has reached the threshold, so letting go would
   * refresh. Read from the spinner's opacity, which the component writes as the
   * pull's progress and which reaches `1` at the threshold. `false` with no
   * finger down: a refresh in flight holds the spinner at full opacity too.
   */
  async isArmed(): Promise<boolean> {
    if (!(await this.isPulling())) return false;
    const spinner = await this.locatorForOptional('.wr-pull-to-refresh__spinner')();
    const style = (await spinner?.getAttribute('style')) ?? '';
    return Number.parseFloat(/(?:^|;)\s*opacity:\s*([\d.]+)/.exec(style)?.[1] ?? '0') >= 1;
  }

  /** The projected content, trimmed. */
  async getContentText(): Promise<string> {
    return (await this.locatorFor('.wr-pull-to-refresh__content')()).text();
  }

  /**
   * Put a finger down at the top and drag it `travel` pixels down, without
   * letting go. The indicator opens by half the travel. Follow with
   * {@link release} or {@link cancel}.
   */
  async pullBy(travel: number): Promise<void> {
    const host = await this.host();
    await host.dispatchEvent('touchstart', { touches: [{ clientY: 0 }] });
    await host.dispatchEvent('touchmove', { touches: [{ clientY: travel }] });
  }

  /** Lift the finger. An armed pull fires `(refresh)`; a shorter one closes. */
  async release(): Promise<void> {
    await (await this.host()).dispatchEvent('touchend', { touches: [] });
  }

  /** Abandon the pull the way the system does (`touchcancel`): nothing refreshes. */
  async cancel(): Promise<void> {
    await (await this.host()).dispatchEvent('touchcancel', { touches: [] });
  }

  /**
   * A whole pull: drag down until the indicator arms, then let go, which fires
   * `(refresh)` once.
   *
   * The `threshold` is not on the page, so the drag lengthens until the
   * component says it is armed. Throws when it never does, which is what a
   * disabled wrapper, one already refreshing and one scrolled away from its top
   * all do.
   */
  async pull(): Promise<void> {
    const host = await this.host();
    await host.dispatchEvent('touchstart', { touches: [{ clientY: 0 }] });
    for (let travel = 64; travel <= FARTHEST_PULL; travel *= 2) {
      await host.dispatchEvent('touchmove', { touches: [{ clientY: travel }] });
      if (await this.isArmed()) return this.release();
    }
    await this.cancel();
    throw new Error(
      'WrPullToRefreshHarness.pull(): the pull never armed. The wrapper is disabled, already refreshing, ' +
        'or scrolled away from its top, and each of those ignores the gesture.'
    );
  }
}
