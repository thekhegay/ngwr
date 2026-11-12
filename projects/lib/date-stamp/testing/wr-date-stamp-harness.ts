/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrDateStampHarnessFilters } from './types';

/**
 * Test harness for one `<wr-date-stamp>`: a date over a time.
 *
 * It answers from what the component renders: the two lines as text and the
 * `datetime` attribute of the `<time>` around them. The lines are written in
 * the locale and the time zone of the test's own providers, so a spec that
 * must not depend on either asserts {@link getDateTime}, which is the instant.
 *
 * @example
 * ```ts
 * const loader = TestbedHarnessEnvironment.loader(fixture);
 * const created = await loader.getHarness(WrDateStampHarness);
 *
 * expect(await created.getDateTime()).toBe('2026-11-12T08:45:00.000Z');
 * expect(await created.getTime()).toBe('13:45');
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrDateStampHarness extends ComponentHarness {
  static hostSelector = 'wr-date-stamp';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrDateStampHarnessFilters = {}): HarnessPredicate<WrDateStampHarness> {
    return new HarnessPredicate(WrDateStampHarness, options)
      .addOption('date', options.date, (harness, date) => HarnessPredicate.stringMatches(harness.getDate(), date))
      .addOption('empty', options.empty, async (harness, empty) => (await harness.isEmpty()) === empty);
  }

  private readonly time = this.locatorForOptional('time.wr-date-stamp__value');

  /** The first line, or `null` when the stamp is empty. */
  async getDate(): Promise<string | null> {
    return (await (await this.locatorForOptional('.wr-date-stamp__date')())?.text()) ?? null;
  }

  /** The second line, or `null` when the stamp is empty or shows a date-only value. */
  async getTime(): Promise<string | null> {
    return (await (await this.locatorForOptional('.wr-date-stamp__time')())?.text()) ?? null;
  }

  /**
   * The `datetime` attribute: the instant in ISO 8601 (UTC), or `yyyy-MM-dd` for a
   * date-only value. `null` when the stamp is empty.
   */
  async getDateTime(): Promise<string | null> {
    return (await (await this.time())?.getAttribute('datetime')) ?? null;
  }

  /** Whether the value is empty: no `<time>`, the placeholder in its place. */
  async isEmpty(): Promise<boolean> {
    return (await this.time()) === null;
  }

  /** The placeholder an empty value shows (`emptyLabel`). Throws when there is a value. */
  async getEmptyText(): Promise<string> {
    const empty = await this.locatorForOptional('.wr-date-stamp__empty')();
    if (!empty) {
      throw new Error(
        'WrDateStampHarness.getEmptyText(): the component shows a date, so it renders no placeholder. ' +
          'Ask getDate() instead.'
      );
    }
    return empty.text();
  }
}
